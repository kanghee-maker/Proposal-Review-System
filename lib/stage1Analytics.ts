import { DashboardEntry, dashboardSummary } from './stage1Dashboard';
import taskMap from '../data/stage1-task-review-map.json';
export const taskNames = ['사규 개정 및 제도 개선', '공공AI 기반 구축 및 일하는 방식 혁신', '수익·비용 절감 및 구조개선을 위한 노력과 성과 창출 방안', '안전사고 예방을 위한 관리 강화 및 개선 방안', '지역경제 활성화 및 민간협력 강화 방안'];
const mapping: Record<string, number> = taskMap;
export const taskNotice = '본문 기준 재분류 검토용 자료입니다. 접수 시 확정 과제 분류가 아니며, 원본 등록 분야·점수·판정은 변경하지 않았습니다.';
export function taskIndex(e: DashboardEntry) {
  if (e.row.proposal.proposal_type !== '지정제안') return undefined;
  const indices = Array.from(new Set([e.row.proposal.id, ...e.row.stage1.map(p => p.id)].map(id => mapping[id]).filter(i => i !== undefined)));
  return indices.length === 1 ? indices[0] : undefined;
}
export function taskStatistics(entries: DashboardEntry[]) {
  return taskNames.map((name, index) => ({ name, ...dashboardSummary(entries.filter(e => taskIndex(e) === index)) }));
}
export function criteriaStatistics(entries: DashboardEntry[]) {
  const scores = entries.filter(e => e.complete).flatMap(e => e.scores);
  return ([['창의성', 'creativity', 30], ['실현성', 'feasibility', 30], ['효과성', 'effectiveness', 30], ['전파성', 'dissemination', 10]] as const).map(([name, key, max]) => ({
    name, max, count: scores.length, average: scores.length ? scores.reduce((n, s) => n + s[key], 0) / scores.length : null
  }));
}
export function detailedJudgeStatistics(entries: DashboardEntry[]) {
  const names = Array.from(new Set(entries.flatMap(e => e.row.judges.map(j => j.name))));
  return names.map(name => {
    const assigned = entries.filter(e => e.row.judges.some(j => j.name === name));
    const scores = assigned.flatMap(e => { const found = e.scores.filter(s => s.judge_name === name); return found.length === 1 ? found : []; });
    return { name, dept: assigned.flatMap(e => e.row.judges).find(j => j.name === name)?.dept || '기록 없음', required: assigned.length, submitted: scores.length,
      draft: assigned.filter(e => e.row.scores.some(s => s.judge_name === name && s.is_draft)).length,
      average: scores.length ? scores.reduce((n, s) => n + s.total_score, 0) / scores.length : null,
      min: scores.length ? Math.min(...scores.map(s => s.total_score)) : null,
      max: scores.length ? Math.max(...scores.map(s => s.total_score)) : null,
      under50: scores.filter(s => s.total_score < 50).length };
  });
}
