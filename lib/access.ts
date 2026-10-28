import 'server-only';
import { Principal } from './session';
import { Proposal } from './types';
import { getSessionsAsync } from './store';

export function ownsProposal(p: Principal, proposal: Proposal): boolean {
  return p.role === 'ADMIN' || Boolean(p.dept && proposal.assigned_department === p.dept);
}
export async function departmentSessionIds(): Promise<Set<string>> {
  const sessions = await getSessionsAsync();
  return new Set(sessions.filter(s => (s.stage || 'STAGE_0') === 'STAGE_0' && s.status !== 'DRAFT').map(s => s.id));
}
export async function visibleProposals(principal: Principal, proposals: Proposal[]) {
  if (principal.role === 'ADMIN') return proposals;
  const sessions = await departmentSessionIds();
  return proposals.filter(p => ownsProposal(principal, p) && sessions.has(p.session_id));
}
