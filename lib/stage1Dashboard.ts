import { ResultRow } from './resultReports';
import { exportStage1Decision } from './stage1Decision';

export const officeOrder = ['사업계획처', '사업개발처', '시설관리처', '시민회관체육운영처', '공원수련관관리처', '경영지원실', '미래전략실', '청렴감사단', '안전총괄단'];
export function dashboardEntry(row: ResultRow) {
  const scores = row.scores.filter(s => !s.is_draft && row.judges.some(j => j.name === s.judge_name));
  const unique = new Set(scores.map(s => s.judge_name));
  const issue = Boolean(row.linkIssue) || scores.length !== unique.size || row.stage1.length !== 1;
  const complete = !issue && row.judges.length > 0 && unique.size === row.judges.length;
  const average = !issue && scores.length ? scores.reduce((n, s) => n + s.total_score, 0) / scores.length : null;
  const decision = issue ? '연결 확인 필요' : complete
    ? exportStage1Decision(row.stage1[0], scores, row.judges.length) : '심사 중';
  return { row, scores, complete, issue, average, decision, submitted: unique.size, required: row.judges.length };
}
export type DashboardEntry = ReturnType<typeof dashboardEntry>;
export function dashboardSummary(entries: DashboardEntry[]) {
  const completed = entries.filter(e => e.complete);
  const decisions = ['채택', '조건부채택', '불채택', '과락'].map(name => ({ name, count: completed.filter(e => e.decision === name).length }));
  const bins = [{ name: '50점 미만', min: 0, max: 50 }, { name: '50~59점', min: 50, max: 60 },
    { name: '60~69점', min: 60, max: 70 }, { name: '70~79점', min: 70, max: 80 }, { name: '80점 이상', min: 80, max: 101 }]
    .map(b => ({ ...b, count: completed.filter(e => e.average !== null && e.average >= b.min && e.average < b.max).length }));
  return { total: entries.length, completed: completed.length, submitted: entries.reduce((n, e) => n + e.submitted, 0),
    required: entries.reduce((n, e) => n + e.required, 0), decisions, bins,
    average: completed.length ? completed.reduce((n, e) => n + e.average!, 0) / completed.length : null,
    issues: entries.filter(e => e.issue).length };
}
export function dashboardGroups(entries: DashboardEntry[], key: 'proposer_office' | 'proposer_rank' | 'category') {
  const names = Array.from(new Set(entries.map(e => {
    const value = e.row.proposal[key] || '기록 없음';
    return key === 'proposer_rank' ? value.replace(/\s+/g, '') : value;
  })));
  return names.map(name => {
    const selected = entries.filter(e => {
      const value = e.row.proposal[key] || '기록 없음';
      return (key === 'proposer_rank' ? value.replace(/\s+/g, '') : value) === name;
    });
    return { name, ...dashboardSummary(selected) };
  }).sort((a, b) => key === 'proposer_office'
    ? (officeOrder.includes(a.name) ? officeOrder.indexOf(a.name) : 999) - (officeOrder.includes(b.name) ? officeOrder.indexOf(b.name) : 999)
    : b.total - a.total || a.name.localeCompare(b.name, 'ko'));
}
