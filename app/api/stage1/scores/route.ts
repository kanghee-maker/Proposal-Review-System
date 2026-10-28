import { authorize } from '@/lib/session';
import { NextResponse } from 'next/server';
import { getCommitteeScoresAsync, saveCommitteeScoreAsync, saveCommitteeScoresBatchAsync, updateProposalAsync, getProposalsAsync } from '@/lib/store';
import { CommitteeScore } from '@/lib/types';

export async function GET(req: Request) {
  const { principal, error: authError } = await authorize(req, true);
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id') || undefined;
    const proposalId = searchParams.get('proposal_id') || undefined;

    const scores = await getCommitteeScoresAsync(sessionId, proposalId);
    return NextResponse.json(scores);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { principal, error: authError } = await authorize(req, true);
  if (authError) return authError;
  try {
    const body = await req.json();

    // 1) 여러 건 일괄 저장인 경우
    if (body.scores && Array.isArray(body.scores)) {
      const scores: CommitteeScore[] = body.scores.map((s: any, idx: number) => ({
        id: s.id || `cs-${Date.now()}-${idx}`,
        proposal_id: s.proposal_id,
        session_id: s.session_id,
        judge_name: s.judge_name,
        judge_dept: s.judge_dept,
        judge_title: s.judge_title || '제안1차심사자',
        creativity: Number(s.creativity || 0),
        feasibility: Number(s.feasibility || 0),
        effectiveness: Number(s.effectiveness || 0),
        dissemination: Number(s.dissemination || 0),
        total_score: Number(s.creativity || 0) + Number(s.feasibility || 0) + Number(s.effectiveness || 0) + Number(s.dissemination || 0),
        opinion: s.opinion || '',
        submitted_at: s.submitted_at || new Date().toISOString()
      }));

      await saveCommitteeScoresBatchAsync(scores);

      // 제안 평균 점수 및 마감/결정 상태 함께 갱신
      if (body.proposal_id) {
        const proposals = await getProposalsAsync(body.session_id);
        const proposal = proposals.find(p => p.id === body.proposal_id);
        if (proposal) {
          const totalAvg = scores.length > 0 
            ? Math.round(scores.reduce((acc, curr) => acc + curr.total_score, 0) / scores.length) 
            : 0;
          await updateProposalAsync({
            ...proposal,
            stage1_avg_score: totalAvg,
            stage1_is_closed: body.stage1_is_closed ?? proposal.stage1_is_closed,
            stage1_decision: body.stage1_decision ?? (totalAvg >= 60 ? '채택' : '미결'),
            stage1_review_date: new Date().toISOString().split('T')[0],
            status: '평가완료'
          });
        }
      }

      return NextResponse.json({ success: true, count: scores.length });
    }

    // 2) 단일 건 저장인 경우
    const score: CommitteeScore = {
      id: body.id || `cs-${Date.now()}`,
      proposal_id: body.proposal_id,
      session_id: body.session_id,
      judge_name: body.judge_name,
      judge_dept: body.judge_dept,
      judge_title: body.judge_title || '제안1차심사자',
      creativity: Number(body.creativity || 0),
      feasibility: Number(body.feasibility || 0),
      effectiveness: Number(body.effectiveness || 0),
      dissemination: Number(body.dissemination || 0),
      total_score: Number(body.creativity || 0) + Number(body.feasibility || 0) + Number(body.effectiveness || 0) + Number(body.dissemination || 0),
      opinion: body.opinion || '',
      submitted_at: new Date().toISOString()
    };

    await saveCommitteeScoreAsync(score);
    return NextResponse.json({ success: true, score });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
