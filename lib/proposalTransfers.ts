import { supabase } from './supabaseClient';
import { Proposal, TransferHistoryEntry } from './types';

const PREFIX = 'proposal_transfer_';
type Transfer = Pick<Proposal, 'transfer_requested' | 'transfer_target_dept' | 'transfer_reason' | 'transfer_requested_at' | 'transfer_status' | 'transfer_history'>;

export async function getProposalTransfers(): Promise<Record<string, Transfer>> {
  const data: {id:string; description:string; updated_at:string}[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await supabase.from('organization_charts').select('id,description,updated_at').like('id', PREFIX + '%').order('id').range(offset, offset + 499);
    if (page.error) throw new Error('이관 처리 이력 조회에 실패했습니다. 다시 시도해 주세요.');
    data.push(...(page.data || []));
    if (!page.data || page.data.length < 500) break;
  }
  const result: Record<string, Transfer> = {};
  const sorted = (data || []).filter(row => row.id.startsWith(PREFIX)).sort((a,b) => String(a.updated_at || '').localeCompare(String(b.updated_at || '')) || a.id.localeCompare(b.id));
  for (const row of sorted) {
    const parsed = JSON.parse(row.description);
    const id = parsed.proposal_id || row.id.slice(PREFIX.length);
    const history = result[id]?.transfer_history || [];
    const event: TransferHistoryEntry = parsed.event || {
      id: row.id, action: 'LEGACY', at: row.updated_at,
      actor: '기존 기록 (처리자 미기록)',
      comment: '기존 저장 상태: ' + (parsed.transfer_requested ? '심사 대기' : parsed.transfer_status === 'APPROVED' ? '승인' : '종료 (반려·취소 구분 기록 없음)') + '. 표시 일시는 기존 데이터 저장 시각이며, 당시 검토 의견은 기록되지 않았습니다.',
      from_department: '기록 없음', target_department: parsed.transfer_target_dept || '', request_reason: parsed.transfer_reason || ''
    };
    result[id] = { transfer_requested: parsed.transfer_requested, transfer_target_dept: parsed.transfer_target_dept,
      transfer_reason: parsed.transfer_reason, transfer_requested_at: parsed.transfer_requested_at, transfer_status: parsed.transfer_status,
      transfer_history: event ? [...history, event] : history };
  }
  return result;
}

// Append-only events: resubmission and new opinions never replace prior records.
export async function saveProposalTransfer(id: string, transfer: Transfer, event?: TransferHistoryEntry): Promise<void> {
  const eventId = event?.id || crypto.randomUUID();
  const { transfer_history, ...snapshot } = transfer;
  const record = { ...snapshot, proposal_id: id, event,
    transfer_requested_at: transfer.transfer_requested_at || null, transfer_status: transfer.transfer_status || null };
  const { data, error } = await supabase.from('organization_charts').upsert({
    id: PREFIX + id + '::' + eventId, name: 'PROPOSAL_TRANSFER', version: '2026-v2.0',
    description: JSON.stringify(record), updated_at: event?.at || new Date().toISOString()
  }).select('id');
  if (error || !data?.length) throw new Error('이관 처리 기록을 저장하지 못했습니다. 입력 내용을 유지한 채 다시 시도해 주세요.');
}
