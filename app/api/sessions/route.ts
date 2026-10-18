import { NextResponse } from 'next/server';
import { getSessionsAsync, saveSessionAsync, updateSessionAsync, getDefaultCriteria } from '@/lib/store';

export async function GET() {
  const sessions = await getSessionsAsync();
  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newSession = {
      id: `session-${Date.now()}`,
      title: body.title || '신규 제안 심사',
      year: body.year || '2026',
      description: body.description || '',
      status: 'ACTIVE' as const,
      created_at: new Date().toISOString(),
      proposals_count: body.proposals_count || 0,
      criteria: body.criteria && body.criteria.length > 0 ? body.criteria : getDefaultCriteria()
    };
    await saveSessionAsync(newSession);
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
