import { Proposal } from '@/lib/types';
const labels: Record<string,string> = { REQUEST:'이관 신청', APPROVE:'승인', REJECT:'반려', CANCEL:'신청 취소', NOTE:'검토 의견 추가', LEGACY:'기존 처리' };
export default function TransferHistory({ proposal }: { proposal: Proposal }) {
  const history = proposal.transfer_history || [];
  if (!proposal.transfer_status && !history.length) return null;
  const last = history.slice().reverse().find(e => e.action !== 'NOTE');
  const status = proposal.transfer_requested ? '심사 대기' : last?.action === 'CANCEL' ? '신청 취소' : proposal.transfer_status === 'APPROVED' ? '승인' : '반려';
  return <section className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-3 text-sm">
    <h4 className="font-bold text-slate-900">이관 처리 기록 · {status}</h4>
    {!history.length && <p className="text-slate-600">기존 {status} 건입니다. 당시 처리자·검토 의견은 기록되지 않았습니다.</p>}
    {!history.some(e => e.action === 'REQUEST') && <p className="text-slate-600 whitespace-pre-wrap">기존 신청 사유: {proposal.transfer_reason || '-'} / 희망 부서: {proposal.transfer_target_dept || '-'}<br />신청 일시: {proposal.transfer_requested_at ? new Date(proposal.transfer_requested_at).toLocaleString('ko-KR', {timeZone:'Asia/Seoul'}) : '기록 없음'}</p>}
    <ol className="space-y-3">{history.map(event => <li key={event.id} className="rounded-lg bg-white border border-slate-200 p-3 space-y-1">
      <div className="font-bold">{labels[event.action] || event.action} · {event.actor}</div>
      <div className="text-xs text-slate-500">{new Date(event.at).toLocaleString('ko-KR', {timeZone:'Asia/Seoul'})} (한국시간)</div>
      <div>{event.from_department} → {event.target_department || '-'}</div>
      {event.request_reason && <p className="whitespace-pre-wrap">신청 사유: {event.request_reason}</p>}
      {event.comment && <p className="whitespace-pre-wrap text-slate-800">관리자 검토 의견: {event.comment}</p>}
    </li>)}</ol>
  </section>;
}
