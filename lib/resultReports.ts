import { CommitteeJudge, CommitteeScore, Evaluation, EvaluationSession, Proposal, TransferHistoryEntry } from './types';
import { stage1Decision } from './stage1Decision';

export type ReportMode = 'stage0' | 'stage1' | 'combined';
export interface ResultRow {
  proposal: Proposal;
  unlinkedTarget?: boolean;
  stage1: Proposal[];
  evaluations: Evaluation[];
  scores: CommitteeScore[];
  transfers: TransferHistoryEntry[];
  judges: CommitteeJudge[];
  missingJudges: string[];
  linkIssue: string;
  linkMethod: string;
  stage0Result: string;
  stage0Complete: boolean;
  state: string;
  average: number | null;
  rank: number | null;
}
export interface ResultReport {
  sessions: EvaluationSession[];
  rows: ResultRow[];
  generatedAt: string;
  sessionId: string;
  mode: ReportMode;
  warnings: string[];
}
export const reportLabels = { stage0: '0차 부서평가', stage1: '1차 제안심사', combined: '0차·1차 통합 결과' };
export function resultDecision(row: ResultRow) {
  return stage1Decision(row.stage1.length === 1 ? row.stage1[0] : undefined, finalScores(row), row.judges.length, Boolean(row.linkIssue));
}
export const departmentOrder = ['청렴감사단', '안전총괄단', '사업계획부', '판매·보상부', '개발1부', '개발2부', '기술지원부', '시설기획부', '시설운영부', '주차관리부', '여가체육부', '수영부', '빙상부', '볼링골프부', '공원운영부', '시설지원부', '수련관운영부', '총무행정부', '재무부', '회계부', '인사부', '미래혁신부', '스마트정보부'];
export function orderDepartments(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => {
    const ai = departmentOrder.indexOf(a), bi = departmentOrder.indexOf(b);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.localeCompare(b, 'ko');
  });
}
export interface ReportFilters {
  search: string; proposer: string; initial: string; department: string;
  result: string; transfer: string; state: string; judge: string; decision: string;
}
export const emptyReportFilters: ReportFilters = { search: '', proposer: '', initial: '', department: '', result: '', transfer: '', state: '', judge: '', decision: '' };
export function initialDepartment(row: ResultRow) {
  return row.transfers.find(t => t.from_department && t.from_department !== '기록 없음')?.from_department || '기록 없음';
}
export function filterResultRows(rows: ResultRow[], filters: ReportFilters) {
  return rows.filter(r => {
    const p = r.proposal;
    const text = [p.board_no, p.seq_no, p.title, p.background, p.content, p.expected_effect].join(' ').toLocaleLowerCase();
    return (!filters.search || text.includes(filters.search.toLocaleLowerCase())) &&
      (!filters.proposer || filters.proposer === (p.proposer_department || p.proposer_raw_dept)) &&
      (!filters.initial || filters.initial === initialDepartment(r)) &&
      (!filters.department || filters.department === p.assigned_department) &&
      (!filters.result || filters.result === r.stage0Result) &&
      (!filters.transfer || (filters.transfer === '이력 있음' ? r.transfers.length > 0 : filters.transfer === '이력 없음' ? r.transfers.length === 0 : r.transfers.some(t => t.action === filters.transfer))) &&
      (!filters.state || (filters.state === '연결 확인 필요' ? Boolean(r.linkIssue) : filters.state === r.state)) &&
      (!filters.judge || r.judges.some(j => j.name === filters.judge) || r.scores.some(s => s.judge_name === filters.judge)) &&
      (!filters.decision || resultDecision(r) === filters.decision);
  });
}
export function finalScores(row: ResultRow) { return row.scores.filter(s => !s.is_draft); }
export function resultSummary(rows: ResultRow[]) {
  const originals = rows.filter(r => !r.unlinkedTarget);
  const linked = rows.filter(r => r.stage1.length);
  const required = linked.reduce((n, r) => n + r.judges.length, 0);
  const submitted = linked.reduce((n, r) => n + r.judges.filter(j => finalScores(r).some(s => s.judge_name === j.name)).length, 0);
  return {
    proposals: originals.length, stage0Complete: originals.filter(r => r.stage0Complete).length,
    accepted: originals.filter(r => r.stage0Result === 'Yes').length, rejected: originals.filter(r => r.stage0Result === 'No').length,
    stage1Disqualified: linked.filter(r => resultDecision(r) === '과락').length,
    stage1Rejected: linked.filter(r => resultDecision(r) === '불채택').length,
    linked: linked.filter(r => !r.linkIssue).length, targets: linked.length, unlinked: rows.filter(r => r.unlinkedTarget).length, complete: linked.filter(r => r.state === '1차 심사 완료').length,
    partial: linked.filter(r => r.missingJudges.length && finalScores(r).length).length,
    unsubmitted: linked.filter(r => !finalScores(r).length).length,
    transferred: rows.filter(r => r.transfers.some(t => t.action === 'APPROVE')).length,
    moves: rows.reduce((n, r) => n + r.transfers.filter(t => t.action === 'APPROVE').length, 0),
    required, submitted, issues: rows.filter(r => r.linkIssue).length
  };
}
export function judgeStatistics(rows: ResultRow[]) {
  const names = Array.from(new Set(rows.flatMap(r => [...r.judges.map(j => j.name), ...r.scores.map(s => s.judge_name)])));
  return names.map(name => ({ name, required: rows.filter(r => r.judges.some(j => j.name === name)).length,
    submitted: rows.filter(r => finalScores(r).some(s => s.judge_name === name)).length,
    draft: rows.filter(r => r.scores.some(s => s.judge_name === name && s.is_draft)).length }));
}
export function departmentStatistics(rows: ResultRow[]) {
  return orderDepartments(rows.flatMap(r => [r.proposal.assigned_department, r.proposal.proposer_department])).map(name => {
    const selected = rows.filter(r => r.proposal.assigned_department === name);
    return { name, ...resultSummary(selected), departmentEvaluations: selected.filter(r => !r.unlinkedTarget).reduce((n, r) => n + r.evaluations.length, 0),
      proposed: rows.filter(r => r.proposal.proposer_department === name).length };
  });
}
