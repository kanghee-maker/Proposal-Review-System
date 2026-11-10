import 'server-only';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { supabase } from './supabaseClient';
import { CommitteeScore } from './types';

const prefix = 'stage1-score-v1-';

function storageKey(): Buffer {
  const value = process.env.STAGE1_STORAGE_KEY;
  if (!value || !/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error('Stage 1 storage requires a stable 32-byte hexadecimal key');
  }
  return Buffer.from(value, 'hex');
}

function idPart(key: Buffer, scope: string, value: string) {
  return createHmac('sha256', key).update(`${scope}:${value}`).digest('hex');
}

function recordPrefix(key: Buffer, sessionId?: string, proposalId?: string) {
  if (!sessionId) return prefix;
  const sessionPrefix = prefix + idPart(key, 'session', sessionId) + '-';
  return proposalId ? sessionPrefix + idPart(key, 'proposal', proposalId) + '-' : sessionPrefix;
}

function encryptScore(key: Buffer, id: string, score: CommitteeScore) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(id));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(score), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}

function decryptScore(key: Buffer, id: string, description: string): CommitteeScore {
  const payload = Buffer.from(description, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, payload.subarray(0, 12));
  decipher.setAAD(Buffer.from(id));
  decipher.setAuthTag(payload.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString('utf8'));
}

export async function getCommitteeScoresAsync(
  sessionId?: string,
  proposalId?: string,
  judgeName?: string,
  includeDrafts = false
): Promise<CommitteeScore[]> {
  const key = storageKey();
  const idPrefix = recordPrefix(key, sessionId, proposalId);
  const scores: CommitteeScore[] = [];
  const pageSize = 500;
  let lastId = '';
  for (;;) {
    let query = supabase.from('organization_charts').select('id,description')
      .like('id', idPrefix + '%').order('id').limit(pageSize);
    if (lastId) query = query.gt('id', lastId);
    const { data, error } = await query;
    if (error) throw error;
    for (const row of data) {
      const score = decryptScore(key, row.id, row.description);
      if ((!sessionId || score.session_id === sessionId) &&
          (!proposalId || score.proposal_id === proposalId) &&
          (!judgeName || score.judge_name === judgeName) &&
          (includeDrafts || !score.is_draft)) scores.push(score);
    }
    if (data.length < pageSize) return scores;
    lastId = data[data.length - 1].id;
  }
}

export async function saveCommitteeScoresAsync(scores: CommitteeScore[]) {
  if (scores.length === 0) return;
  const key = storageKey();
  const records = scores.map(score => {
    const id = recordPrefix(key, score.session_id, score.proposal_id) +
      idPart(key, 'judge', score.judge_name) + (score.is_draft ? '-draft' : '-final');
    return { id, name: 'STAGE1_SCORE', version: '1', description: encryptScore(key, id, score) };
  });
  const { data, error } = await supabase.from('organization_charts').upsert(records).select('id');
  if (error || data?.length !== records.length) throw error ?? new Error('Stage 1 score write was not confirmed');
}
