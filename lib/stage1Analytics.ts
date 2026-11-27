import { DashboardEntry, dashboardSummary } from './stage1Dashboard';
import taskMap from '../data/stage1-task-review-map.json';
import reportSummary from '../data/designated-task-report-summary.json';
export const taskNames = ['사규 개정 및 제도 개선', '공공AI 기반 구축 및 일하는 방식 혁신', '수익·비용 절감 및 구조개선을 위한 노력과 성과 창출 방안', '안전사고 예방을 위한 관리 강화 및 개선 방안', '지역경제 활성화 및 민간협력 강화 방안'];
const mapping: Record<string, number> = taskMap;
export const taskNotice = '본문 기준 재분류 검토용 자료입니다. 접수 시 확정 과제 분류가 아니며, 원본 등록 분야·점수·판정은 변경하지 않았습니다.';
export function taskIndex(e: DashboardEntry) {
  if (e.row.proposal.proposal_type !== '지정제안') return undefined;
  const indices = Array.from(new Set([e.row.proposal.id, ...e.row.stage1.map(p => p.id)].map(id => mapping[id]).filter(i => i !== undefined)));
  return indices.length === 1 ? indices[0] : undefined;
}
export function taskStatistics(entries: DashboardEntry[]) {
  return taskSummaryView(entries).groups;
}
export function taskSummaryView(entries: DashboardEntry[]) {
 const selected=entries.filter(e=>e.row.proposal.proposal_type==='지정제안');
 const target=entries.some(e=>e.row.stage1.some(p=>p.session_id===reportSummary.sessionId));
 if(!target)return {approved:false,legacy:true,notice:taskNotice,groups:taskNames.map((name,index)=>({name,...dashboardSummary(entries.filter(e=>taskIndex(e)===index))}))};
 const records=new Map(reportSummary.proposals.map(p=>[p.boardNo,p]));
 const seen=new Set<string>();
 const matches=selected.length===reportSummary.proposals.length&&selected.every(e=>{
  const key=String(e.row.proposal.board_no).trim(),record=records.get(key);if(!record||seen.has(key))return false;seen.add(key);
  return e.complete&&!e.issue&&e.decision===record.decision&&record.ids.includes(e.row.proposal.id)&&e.row.stage1.length===1&&e.row.stage1[0].session_id===reportSummary.sessionId;
 });
 if(!matches)return {approved:false,legacy:false,notice:'이 회차의 5개 과제는 사용자 지정 전체 집계 기준입니다. 제안별 확정 분류가 없어 현재 필터의 과제별 건수는 산출하지 않습니다. 전체 지정제안 조건으로 조회해 주세요. 대상이나 판정이 변경된 경우 집계 기준을 다시 확인해야 합니다.',groups:[]};
 const stats=dashboardSummary(selected);
 if([stats.total,...['채택','불채택','과락'].map(name=>stats.decisions.find(d=>d.name===name)!.count)].some((n,i)=>n!==reportSummary.totals[i]))return {approved:false,legacy:false,notice:'현재 평가 결과와 결과보고서 집계 기준이 달라 과제별 통계를 표시할 수 없습니다.',groups:[]};
 return {approved:true,legacy:false,notice:'사용자 지정 결과보고서 집계 기준 · 지정제안 전체 102건 · 심사대상 16·27·10·40·9건. 원본 등록 분야와 평가 결과는 변경하지 않았으며, 제안별 과제 분류·과제별 평균점수는 추정하지 않습니다.',groups:taskNames.map((name,index)=>{const [total,yes,no,cut]=reportSummary.groups[index];return {name,...dashboardSummary([]),total,completed:total,average:null,decisions:[{name:'채택',count:yes},{name:'조건부채택',count:0},{name:'불채택',count:no},{name:'과락',count:cut}]};})};
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
