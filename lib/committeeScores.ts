import 'server-only';
import { supabase } from './supabaseClient';
import { CommitteeScore } from './types';

const prefix = 'stage1-score-';

export async function getCommitteeScoresAsync(
  sessionId?: string,
  proposalId?: string,
  judgeName?: string,
  includeDrafts = false
): Promise<CommitteeScore[]> {
  const scores: CommitteeScore[] = [];
  const pageSize = 500;
  let lastId = '';
  for (;;) {
    let query = supabase.from('evaluations').select('id,answers')
      .like('id', prefix + '%').order('id').limit(pageSize);
    if (sessionId) query = query.eq('session_id', sessionId);
    if (proposalId) query = query.eq('proposal_id', proposalId);
    if (judgeName) query = query.eq('evaluator_name', judgeName);
    if (!includeDrafts) query = query.eq('is_submitted', true);
    if (lastId) query = query.gt('id', lastId);
    const { data, error } = await query;
    if (error) throw error;
    scores.push(...data.map(row => row.answers as CommitteeScore));
    if (data.length < pageSize) return scores;
    lastId = data[data.length - 1].id;
  }
}

export async function saveCommitteeScoresAsync(scores: CommitteeScore[]) {
  if (scores.length === 0) return;
  const records = scores.map(score => ({
    id: prefix + JSON.stringify([score.session_id, score.proposal_id, score.judge_name, Boolean(score.is_draft)]),
    proposal_id: score.proposal_id,
    session_id: score.session_id,
    department_name: score.judge_dept,
    evaluator_name: score.judge_name,
    answers: score,
    is_submitted: !score.is_draft,
    submitted_at: score.is_draft ? null : score.submitted_at,
    updated_at: score.submitted_at
  }));
  const { data, error } = await supabase.from('evaluations').upsert(records).select('id');
  if (error || data?.length !== records.length) throw error ?? new Error('Stage 1 score write was not confirmed');

  // 최종 제출 시 기존 임시저장 레코드 정리 / 임시저장 전환 시 기존 최종 제출 레코드 정리
  // 주의: id에 JSON 배열 문자열(", , 포함)이 들어가므로 PostgREST .in('id', ...) 대신 컬럼 조건(.eq)으로 삭제
  await Promise.all(
    scores.map(async score => {
      const { error: delError } = await supabase
        .from('evaluations')
        .delete()
        .like('id', prefix + '%')
        .eq('session_id', score.session_id)
        .eq('proposal_id', score.proposal_id)
        .eq('evaluator_name', score.judge_name)
        .eq('is_submitted', Boolean(score.is_draft));
      if (delError) throw delError;
    })
  );
}

export async function unsubmitCommitteeScoresAsync(
  sessionId: string,
  proposalId: string,
  judgeNames?: string[]
): Promise<CommitteeScore[]> {
  const existing = await getCommitteeScoresAsync(sessionId, proposalId, undefined, true);
  const targetJudges = judgeNames && judgeNames.length > 0 ? new Set(judgeNames) : null;

  // 위원별로 최신 점수(제출본 우선)를 선택하여 임시저장(is_draft: true) 상태로 전환
  const byJudge = new Map<string, CommitteeScore>();
  for (const s of existing) {
    if (targetJudges && !targetJudges.has(s.judge_name)) continue;
    const prev = byJudge.get(s.judge_name);
    if (!prev || (!s.is_draft && prev.is_draft) || Date.parse(s.submitted_at || '') >= Date.parse(prev.submitted_at || '')) {
      byJudge.set(s.judge_name, s);
    }
  }

  const draftsToSave: CommitteeScore[] = Array.from(byJudge.values()).map(score => ({
    ...score,
    id: `cs-${proposalId}-${score.judge_name}-draft`,
    is_draft: true,
    submitted_at: new Date().toISOString()
  }));

  if (draftsToSave.length > 0) {
    await saveCommitteeScoresAsync(draftsToSave);
  }

  return draftsToSave;
}

export async function resetCommitteeScoresAsync(
  sessionId: string,
  proposalId: string,
  judgeNames: string[]
): Promise<void> {
  if (judgeNames.length === 0) return;
  await Promise.all(
    judgeNames.map(async judgeName => {
      const { error } = await supabase
        .from('evaluations')
        .delete()
        .like('id', prefix + '%')
        .eq('session_id', sessionId)
        .eq('proposal_id', proposalId)
        .eq('evaluator_name', judgeName);
      if (error) throw error;
    })
  );
}

