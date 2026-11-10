import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { CommitteeScore } from './types';

function committeeScoresTable() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vkhskdtgvlwlkmgzbpyl.supabase.co';
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Stage 1 score database credentials are missing');

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  }).from('committee_scores');
}

export async function getCommitteeScoresAsync(
  sessionId?: string,
  proposalId?: string,
  judgeName?: string,
  includeDrafts = false
): Promise<CommitteeScore[]> {
  const table = committeeScoresTable();
  const scores: CommitteeScore[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    let query = table.select('*').order('id').range(offset, offset + pageSize - 1);
    if (sessionId) query = query.eq('session_id', sessionId);
    if (proposalId) query = query.eq('proposal_id', proposalId);
    if (judgeName) query = query.eq('judge_name', judgeName);
    if (!includeDrafts) query = query.eq('is_draft', false);
    const { data, error } = await query;
    if (error) throw error;
    scores.push(...data);
    if (data.length < pageSize) return scores;
  }
}

export async function saveCommitteeScoresAsync(scores: CommitteeScore[]) {
  if (scores.length === 0) return;
  const { data, error } = await committeeScoresTable().upsert(scores, {
    onConflict: 'session_id,proposal_id,judge_name,is_draft'
  }).select('id');
  if (error || data?.length !== scores.length) throw error ?? new Error('Stage 1 score write was not confirmed');
}
