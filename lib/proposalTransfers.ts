import { supabase } from './supabaseClient';
import { Proposal } from './types';

const PREFIX = 'proposal_transfer_';
type Transfer = Pick<Proposal, 'transfer_requested' | 'transfer_target_dept' | 'transfer_reason' | 'transfer_requested_at' | 'transfer_status'>;

// One durable row per proposal avoids lost updates between different departments.
export async function getProposalTransfers(): Promise<Record<string, Transfer>> {
  const { data, error } = await supabase.from('organization_charts').select('id,description').like('id', PREFIX + '%');
  if (error) throw new Error('이관 요청 조회에 실패했습니다. 새로고침 후 다시 확인해 주세요.');
  const result: Record<string, Transfer> = {};
  for (const row of data || []) {
    if (!row.id.startsWith(PREFIX)) continue;
    result[row.id.slice(PREFIX.length)] = JSON.parse(row.description);
  }
  return result;
}

export async function saveProposalTransfer(id: string, transfer: Transfer): Promise<void> {
  const record = { ...transfer, transfer_requested_at: transfer.transfer_requested_at || null, transfer_status: transfer.transfer_status || null };
  const { data, error } = await supabase.from('organization_charts').upsert({
    id: PREFIX + id, name: 'PROPOSAL_TRANSFER', version: '2026-v1.0',
    description: JSON.stringify(record), updated_at: new Date().toISOString()
  }).select('id');
  if (error || !data?.length) throw new Error('이관 요청이 저장되지 않았습니다. 입력 내용을 유지한 채 다시 시도해 주세요.');
}
