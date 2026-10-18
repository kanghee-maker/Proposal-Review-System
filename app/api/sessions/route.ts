import { NextResponse } from 'next/server';
import { 
  getSessionsAsync, 
  saveSessionAsync, 
  updateSessionAsync, 
  deleteSessionAsync, 
  getDefaultCriteria, 
  getDefaultStage1Criteria, 
  DEFAULT_STAGE1_JUDGES, 
  seedDefaultProposalsForSessionAsync,
  saveCustomProposalsForSessionAsync
} from '@/lib/store';

export async function GET() {
  const sessions = await getSessionsAsync();
  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const stage = body.stage || 'STAGE_0';
    const isStage1 = stage === 'STAGE_1';

    // 1차 제안심사는 직접 신규 생성 불가 (0차 부서평가 완결 후 연계 생성만 허용)
    if (isStage1 && !body.source_session_id) {
      return NextResponse.json({
        success: false,
        error: '1차 제안심사는 직접 신규 등록할 수 없습니다. 0차 부서평가 완결 후 [1차 심사 연계 생성]을 이용해주세요.'
      }, { status: 400 });
    }

    const hasCustomProposals = Array.isArray(body.proposals) && body.proposals.length > 0;
    const proposalsCount = hasCustomProposals
      ? body.proposals.length
      : (body.proposals_count !== undefined ? body.proposals_count : 137);

    const newSession = {
      id: `session-${Date.now()}`,
      title: body.title || (isStage1 ? '2026년 하반기 혁신 제안 심사 (1차 평가)' : '2026년 하반기 혁신 제안 심사 (0차 부서평가)'),
      year: body.year || '2026',
      description: body.description || '',
      stage,
      judges: isStage1 ? (body.judges || DEFAULT_STAGE1_JUDGES) : undefined,
      status: 'ACTIVE' as const,
      created_at: new Date().toISOString(),
      proposals_count: proposalsCount,
      criteria: body.criteria && body.criteria.length > 0
        ? body.criteria
        : (isStage1 ? getDefaultStage1Criteria() : getDefaultCriteria())
    };
    await saveSessionAsync(newSession);

    // 신규 업로드된 사용자 제안 데이터가 있는 경우 일괄 등록 및 Supabase 연동
    if (hasCustomProposals) {
      await saveCustomProposalsForSessionAsync(newSession.id, body.proposals);
    } else if (proposalsCount !== 0) {
      await seedDefaultProposalsForSessionAsync(newSession.id);
    }

    return NextResponse.json({ success: true, session: newSession });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: '세션 ID가 필요합니다.' }, { status: 400 });
    }

    const updated = await updateSessionAsync(body);
    if (!updated) {
      return NextResponse.json({ success: false, error: '해당 세션을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, session: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id, password } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 평가 세션 ID가 필요합니다.' }, { status: 400 });
    }

    // 관리자 비밀번호 검증 (0423)
    if (password !== '0423') {
      return NextResponse.json({ success: false, error: '관리자 비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    await deleteSessionAsync(id);
    return NextResponse.json({ success: true, message: '제안평가 건이 성공적으로 삭제되었습니다.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
