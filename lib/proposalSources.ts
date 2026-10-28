import catalogData from '../data/proposal_source_catalog.json';
import { Proposal, ProposalAttachment } from './types';

const catalog: Record<string, any> = catalogData;
const excludedBoards = new Set(['23', '36', '62', '87', '100', '129', '131', '141']);
const normalized = (value: string) => String(value || '').replace(/\s+/g, '').normalize('NFC');
const boardKey = (value: string) => /^\d+$/.test(String(value).trim()) ? String(Number(value)) : '';

export function isExcludedProposal(proposal: Pick<Proposal, 'board_no'>): boolean {
  return excludedBoards.has(boardKey(proposal.board_no));
}

// Session row numbers are not identities: use board number and proposer together.
export function applyProposalSource(proposal: Proposal): Proposal {
  const board = boardKey(proposal.board_no);
  const source = catalog[board];
  if (!source || normalized(source.proposer) !== normalized(proposal.proposer_name)) return proposal;
  const attachments: ProposalAttachment[] = source.default_attachments.map((att: any, i: number) => ({
    ...att,
    id: `${proposal.id}-att-source-${board}-${i + 1}`,
    proposal_id: proposal.id
  }));
  // Keep uploaded files, replacing only the old bundled source attachments.
  const uploaded = (proposal.attachments || []).filter(a =>
    !a.static_url?.startsWith('/default-attachments/') &&
    !a.static_url?.startsWith('/proposal-sources/') &&
    !/-att-(default|source)-/.test(a.id)
  );
  return {
    ...proposal,
    title: source.title,
    background: source.background,
    content: source.content,
    expected_effect: source.expected_effect,
    attachment_note: source.attachment_note,
    extra_sheets: source.extra_sheets,
    attachments: [...attachments, ...uploaded]
  };
}

export function findSourceAttachment(id: string): ProposalAttachment | null {
  const match = id.match(/^(.*)-att-source-(\d+)-(\d+)$/);
  if (!match || excludedBoards.has(match[2])) return null;
  const source = catalog[match[2]];
  const att = source?.default_attachments[Number(match[3]) - 1];
  return att ? { ...att, id, proposal_id: match[1] } : null;
}
