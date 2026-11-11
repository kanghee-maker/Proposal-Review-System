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
}
