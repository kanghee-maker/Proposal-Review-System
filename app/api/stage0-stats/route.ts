import { NextResponse } from 'next/server';
import { accessDenied, getAccess } from '@/lib/accessSession';
import { getProposalTransfers } from '@/lib/proposalTransfers';
import { getEvaluationsAsync, getProposalsAsync, getSessionsAsync } from '@/lib/store';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(req: Request) {
  const access = getAccess();
  if (access?.role !== 'admin' && access?.role !== 'stats') return accessDenied(access);

  try {
    const sessions = (await getSessionsAsync()).filter(s => !s.stage || s.stage === 'STAGE_0');
    const sessionId = new URL(req.url).searchParams.get('session_id');
    if (sessionId === null) {
      return NextResponse.json(sessions.map(({ id, title, year, proposals_count }) => ({ id, title, year, proposals_count })), { headers });
    }
    if (!sessions.some(s => s.id === sessionId)) {
      return NextResponse.json({ error: '0차 평가 회차를 찾을 수 없습니다.' }, { status: 404, headers });
    }

    const [proposals, evaluations, transfers] = await Promise.all([
      getProposalsAsync(sessionId), getEvaluationsAsync(sessionId), getProposalTransfers()
    ]);
    return NextResponse.json({
      proposals: proposals.map(p => ({
        id: p.id, seq_no: p.seq_no, board_no: p.board_no, title: p.title, category: p.category,
        proposer_rank: p.proposer_rank, proposer_department: p.proposer_department, proposer_office: p.proposer_office,
        assigned_department: p.assigned_department, assigned_office: p.assigned_office,
        status: p.status, stage0_result: p.stage0_result, stage0_opinion: p.stage0_opinion,
        review_result: p.review_result, review_basis: p.review_basis,
        transfer_history: (transfers[p.id]?.transfer_history ?? p.transfer_history)?.map(({ from_department, target_department }) => ({ from_department, target_department }))
      })),
      evaluations: evaluations.map(e => ({
        proposal_id: e.proposal_id, is_submitted: e.is_submitted,
        answers: { result: e.answers?.result, opinion: e.answers?.opinion }
      }))
    }, { headers });
  } catch {
    return NextResponse.json({ error: '평가 자료를 불러오지 못했습니다.' }, { status: 503, headers });
  }
}
