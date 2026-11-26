import { CommitteeScore, Proposal } from './types';

/** Export-only classification. Never writes back to evaluation records. */
export function exportStage1Decision(proposal: Proposal | undefined, scores: CommitteeScore[], required: number, uncertain = false): string {
  if (!proposal || uncertain) return stage1Decision(proposal, scores, required, uncertain);
  const finals = scores.filter(s => !s.is_draft);
  if (required > 0 && finals.length === required) {
    const average = finals.reduce((sum, s) => sum + Number(s.total_score), 0) / finals.length;
    if (average < 50) return '불채택';
  }
  return stage1Decision(proposal, scores, required, uncertain);
}

/** Display categories are exclusive; stored legacy decisions remain untouched. */
export function stage1Decision(proposal: Proposal | undefined, scores: CommitteeScore[], required: number, uncertain = false): string {
  if (!proposal) return '1차 미연계';
  if (uncertain) return '연결 확인 필요';
  const finals = scores.filter(s => !s.is_draft);
  if (finals.filter(s => Number(s.total_score) < 50).length >= 3) return '과락';
  const saved = proposal.stage1_decision;
  if (saved === '과락 불채택' || saved === '과락') return '과락';
  if (saved && !['미결', '심사대기', '심사중'].includes(saved)) return saved;
  if (required > 0 && finals.length === required) {
    const average = finals.reduce((sum, s) => sum + Number(s.total_score), 0) / finals.length;
    return average >= 50 ? '채택' : '불채택';
  }
  return saved || '심사대기';
}
