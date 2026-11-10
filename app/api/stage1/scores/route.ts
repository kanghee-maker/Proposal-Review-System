import { NextResponse } from 'next/server';
import { accessDenied, getAccess } from '@/lib/accessSession';
import { getCommitteeScoresAsync, saveCommitteeScoresAsync } from '@/lib/committeeScores';
import { getProposalsAsync, getSessionsAsync, updateProposalAsync } from '@/lib/store';
import { CommitteeJudge, CommitteeScore, DEFAULT_STAGE1_JUDGES } from '@/lib/types';

const noStore = { 'Cache-Control': 'private, no-store' };

function failure(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status, headers: noStore });
}

export async function GET(req: Request) {
  const access = getAccess();
  if (!access || access.role === 'stats') return accessDenied(access);
  const params = new URL(req.url).searchParams;
  const sessionId = params.get('session_id') || undefined;
  const proposalId = params.get('proposal_id') || undefined;
  try {
    const judge = access.role === 'judge' ? access.judge : undefined;
    const includeDrafts = Boolean(judge && proposalId && params.get('include_draft') === '1');
    const scores = await getCommitteeScoresAsync(sessionId, proposalId, judge, includeDrafts);
    return NextResponse.json(scores, { headers: noStore });
  } catch (error) {
    console.error('Stage 1 score read failed:', error);
    return failure('1차 심사 점수를 불러오지 못했습니다. 다시 시도해 주세요.', 503);
  }
}

function toScore(input: Partial<CommitteeScore>, judge: CommitteeJudge, proposalId: string, sessionId: string, isDraft: boolean): CommitteeScore | null {
  const fields = ['creativity', 'feasibility', 'effectiveness', 'dissemination'] as const;
  const values = fields.map(field => Number(input[field]));
  if (values.some((value, index) => !Number.isInteger(value) || value < 0 || value > (index === 3 ? 10 : 30))) return null;
  const [creativity, feasibility, effectiveness, dissemination] = values;
  return {
    id: `cs-${proposalId}-${judge.name}${isDraft ? '-draft' : ''}`,
    proposal_id: proposalId,
    session_id: sessionId,
    judge_name: judge.name,
    judge_dept: judge.dept,
    judge_title: judge.title || '제안1차심사자',
    creativity, feasibility, effectiveness, dissemination,
    total_score: creativity + feasibility + effectiveness + dissemination,
    opinion: typeof input.opinion === 'string' ? input.opinion : '',
    submitted_at: new Date().toISOString(),
    is_draft: isDraft
  };
}

export async function POST(req: Request) {
  const access = getAccess();
  if (!access || access.role === 'stats') return accessDenied(access);
  try {
    const body = await req.json();
    const { proposal_id: proposalId, session_id: sessionId } = body;
    if (typeof proposalId !== 'string' || typeof sessionId !== 'string') {
      return failure('심사 회차와 제안 정보를 확인해 주세요.', 400);
    }
    const session = (await getSessionsAsync()).find(s => s.id === sessionId && s.stage === 'STAGE_1');
    if (!session) return accessDenied(access);
    const proposal = (await getProposalsAsync(sessionId)).find(p => p.id === proposalId);
    if (!proposal) return accessDenied(access);

    if (Array.isArray(body.scores)) {
      if (access.role !== 'admin') return accessDenied(access);
      const judges = session.judges?.length && !session.judges.some(j => j.name === '박민호')
        ? session.judges : DEFAULT_STAGE1_JUDGES;
      const scores: CommitteeScore[] = [];
      for (const input of body.scores) {
        const judge = judges.find(j => j.name === input?.judge_name);
        const score = judge && toScore(input, judge, proposalId, sessionId, false);
        if (!score) return failure('심사위원 또는 점수 범위를 확인해 주세요.', 400);
        scores.push(score);
      }
      await saveCommitteeScoresAsync(scores);

      const saved = await getCommitteeScoresAsync(sessionId, proposalId);
      const totalAvg = saved.length ? Math.round(saved.reduce((sum, score) => sum + score.total_score, 0) / saved.length) : 0;
      await updateProposalAsync({
        ...proposal,
        stage1_avg_score: totalAvg,
        stage1_is_closed: body.stage1_is_closed ?? proposal.stage1_is_closed,
        stage1_decision: body.stage1_decision ?? (totalAvg >= 60 ? '채택' : '미결'),
        stage1_review_date: new Date().toISOString().split('T')[0],
        status: '평가완료'
      });
      return NextResponse.json({ success: true, count: scores.length }, { headers: noStore });
    }

    const judgeName = access.role === 'judge' ? access.judge : body.judge_name;
    const judge = DEFAULT_STAGE1_JUDGES.find(candidate => candidate.name === judgeName);
    if (!judge) return accessDenied(access);
    const score = toScore(body, judge, proposalId, sessionId, body.is_draft === true);
    if (!score) return failure('항목별 점수 범위를 확인해 주세요.', 400);
    await saveCommitteeScoresAsync([score]);
    return NextResponse.json({ success: true, score }, { headers: noStore });
  } catch (error) {
    console.error('Stage 1 score write failed:', error);
    return failure('점수 저장을 확인하지 못했습니다. 입력 내용을 유지한 채 다시 시도해 주세요.', 503);
  }
}
