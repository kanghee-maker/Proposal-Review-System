import { Proposal } from './types';
import { ResultReport } from './resultReports';
import { dashboardEntry, dashboardSummary, dashboardGroups, officeOrder, DashboardEntry } from './stage1Dashboard';
import { criteriaStatistics, detailedJudgeStatistics, taskStatistics, taskNotice } from './stage1Analytics';
import taskMap from '../data/stage1-task-review-map.json';
import { taskNames } from './stage1Analytics';

export type ChartRow = { name: string; total: number; values: Record<string, number>; completed?: number; average?: number | null; detail?: string; rateBase?: number };
export type ChartSpec = { id: string; title: string; note: string; kind: 'stack' | 'donut' | 'columns' | 'dots' | 'bullet' | 'table'; rows: ChartRow[]; sorts?: string[]; defaultSort?: string; max?: number; columns?: string[]; records?: string[][]; summary?: string };
export type StatisticsReportModel = { title: string; session: string; scope: string; filters: string; generatedAt: string; metrics: [string, string][]; sections: ChartSpec[]; rules: string; warnings: string[] };
export const reportPalette: Record<string, string> = { 채택: '#ed9408', 조건부채택: '#0891b2', 불채택: '#e34b68', 과락: '#8060d8', 미완료: '#a2afbf', '최종 제출': '#11977f', 임시저장: '#ed9408', 미제출: '#a2afbf', 건수: '#ed9408', 평균: '#6366b9' };
export const officialDepartments = ['사업계획부','판매·보상부','개발1부','개발2부','기술지원부','시설기획부','시설운영부','주차관리부','여가체육부','수영부','빙상부','볼링골프부','공원운영부','시설지원부','수련관운영부','총무행정부','재무부','회계부','인사부','미래혁신부','스마트정보부','청렴감사단','안전총괄단'];
const official = [...officeOrder, ...officialDepartments];
export function officialCompare(a: string, b: string) { const order=officialDepartments.includes(a)&&officialDepartments.includes(b)?officialDepartments:official; const ai=order.indexOf(a), bi=order.indexOf(b); return (ai<0?999:ai)-(bi<0?999:bi) || a.localeCompare(b,'ko'); }
export function sortedChartRows(spec: ChartSpec, sort: string): ChartRow[] {
 if(!spec.sorts) return [...spec.rows];
 const value = (r: ChartRow) => sort==='채택률순' ? (r.rateBase??r.total)>0 ? (r.values['채택']||0)/(r.rateBase??r.total) : -1 : sort==='채택건수순' ? r.values['채택']||0 : r.total;
 return [...spec.rows].sort((a,b)=>sort==='기본 순서' ? officialCompare(a.name,b.name) : value(b)-value(a) || officialCompare(a.name,b.name));
}
export function rankVariants(proposals: Proposal[]): ChartSpec {
 const groups=new Map<string,Map<string,number>>();
 for(const p of proposals){const raw=p.proposer_rank||'기록 없음', normalized=raw.replace(/\s+/g,'');if(!groups.has(normalized))groups.set(normalized,new Map());const g=groups.get(normalized)!;g.set(raw,(g.get(raw)||0)+1);}
 return {id:'normalization',title:'직급 띄어쓰기 통합 내역',kind:'table',note:'원본을 변경하지 않고 통계에서만 공백을 제거합니다. 직군·급수는 합치지 않습니다.',rows:[],columns:['원본 표기','통일 표기','건수'],records:Array.from(groups).flatMap(([normalized, variants])=>Array.from(variants).map(([raw,n])=>[raw,normalized,String(n)]))};
}
const rankSorts=['기본 순서','건수순','채택건수순','채택률순'];
function fromGroup(g: ReturnType<typeof dashboardGroups>[number]):ChartRow { return {name:g.name,total:g.total,completed:g.completed,rateBase:g.completed,average:g.average,values:{...Object.fromEntries(g.decisions.map(d=>[d.name,d.count])),미완료:g.total-g.completed}}; }
export function stage1ReportModel(report: ResultReport, entries: DashboardEntry[], filters: string, scope: string):StatisticsReportModel {
 const stats=dashboardSummary(entries), completed=entries.filter(e=>e.complete).sort((a,b)=>b.average!-a.average!);
 const judges=detailedJudgeStatistics(entries);
 const group=(id:string,title:string,key:'proposer_office'|'category'|'proposer_rank'):ChartSpec=>({id,title,kind:'stack',note:'제안자 소속 기준 · 채택률 분모: 전원 제출 완료 건수 · 미완료는 판정에서 제외',rows:dashboardGroups(entries,key).map(fromGroup),sorts:rankSorts,defaultSort:key==='proposer_office'?'기본 순서':'건수순'});
 const departmentGroup=(id:string,title:string,key:'assigned_department'|'proposer_department'):ChartSpec=>({id,title,kind:'stack',note:`${key==='assigned_department'?'현재 실행부서':'제안자 소속부서'} 기준 · 채택률 분모: 전원 제출 완료 건수`,sorts:rankSorts,defaultSort:'기본 순서',rows:Array.from(new Set(entries.map(e=>e.row.proposal[key]||'기록 없음'))).map(name=>fromGroup({name,...dashboardSummary(entries.filter(e=>(e.row.proposal[key]||'기록 없음')===name))}))});
 const sections:ChartSpec[]=[
 {id:'decision',title:'1차 심사 판정 비율',kind:'donut',note:`분모: 전원 제출 완료 ${stats.completed}건 · 판정은 서로 중복되지 않습니다.`,rows:stats.decisions.map(d=>({name:d.name,total:d.count,values:{[d.name]:d.count}})),summary:`심사대상 ${stats.total}건 중 전원 제출 완료 ${stats.completed}건입니다.`},
 {id:'distribution',title:'평균총점 분포',kind:'columns',note:'전원 제출 완료 제안 · 반올림 전 평균 기준 · 가로축 점수 구간 / 세로축 건수',rows:stats.bins.map(b=>({name:b.name,total:b.count,values:{건수:b.count}}))},
 group('offices','처·실·단별 제출 및 판정 현황','proposer_office'),
 departmentGroup('assigned','실행부서별 심사 결과','assigned_department'),departmentGroup('proposers','제안자 소속부서별 심사 결과','proposer_department'),
 {id:'judges',title:'심사위원별 제출 현황',kind:'stack',note:'최종 제출·임시저장만·미저장은 중복 없이 구분 · 분모: 위원별 배정 제안 수',rows:judges.map(j=>{const assigned=entries.filter(e=>e.row.judges.some(k=>k.name===j.name));const draftOnly=assigned.filter(e=>!e.scores.some(s=>s.judge_name===j.name)&&e.row.scores.some(s=>s.judge_name===j.name&&s.is_draft)).length;return {name:j.name,total:j.required,values:{'최종 제출':j.submitted,임시저장:draftOnly,미제출:Math.max(0,j.required-j.submitted-draftOnly)},detail:`${j.dept} · 최종 제출 ${j.submitted}/${j.required}`};})},
 {id:'judge-scores',title:'심사위원별 평균점수',kind:'dots',max:100,note:'최종 제출 점수만 포함 · 가로축 0~100점 · 표본 수는 위원별 제출 건수',rows:judges.map(j=>({name:j.name,total:j.submitted,average:j.average,values:{평균:j.average??0},detail:`최종 제출 ${j.submitted}건`}))},
 {id:'judge-detail',title:'심사위원별 점수·제출 상세',kind:'table',note:'평균·최저·최고·50점 미만은 최종 제출 점수 기준 · 임시저장 기록은 최종 제출 기록과 함께 남아 있을 수 있음',rows:[],columns:['심사위원','소속','배정','최종 제출','임시저장 기록','평균','최저','최고','50점 미만'],records:judges.map(j=>[j.name,j.dept,String(j.required),String(j.submitted),String(j.draft),j.average===null?'미산출':j.average.toFixed(2),j.min===null?'미산출':j.min.toFixed(2),j.max===null?'미산출':j.max.toFixed(2),String(j.under50)])},
 {id:'progress',title:'제안별 제출 진행 현황',kind:'columns',note:'분모: 현재 조건의 전체 제안 · 전원 제출 완료 / 일부 제출 / 미제출 / 연결 확인 필요를 구분',rows:[['전원 제출 완료',stats.completed],['일부 제출',entries.filter(e=>!e.issue&&!e.complete&&e.submitted>0).length],['미제출',entries.filter(e=>!e.issue&&e.submitted===0).length],['연결 확인 필요',stats.issues]].map(([name,count])=>({name:String(name),total:Number(count),values:{건수:Number(count)}}))},
 group('category','분야별 심사 결과','category'),group('rank','직급별 참여 및 심사 결과','proposer_rank'),
 {id:'criteria',title:'평가항목별 평균',kind:'bullet',max:100,note:'전원 제출 완료 제안의 위원 최종 점수 · 막대는 배점 대비 평균 비율(%)',rows:criteriaStatistics(entries).map(c=>({name:c.name,total:c.max,average:c.average,values:{평균:c.average===null?0:c.average/c.max*100},detail:`${c.average===null?'미산출':c.average.toFixed(2)} / ${c.max}점 · ${c.count}개 평가`}))},
 {id:'tasks',title:'5개 지정과제별 결과 — 재분류 검토용',kind:'stack',note:taskNotice+' · 일반제안 및 과제 미분류는 제외',rows:taskStatistics(entries).map(fromGroup)},
 {id:'ranking',title:'고득점 상위 10건',kind:'bullet',max:100,note:`전원 제출 완료 ${completed.length}건 중 상위 ${Math.min(10,completed.length)}건 · 공동순위 적용 · 전체 순위는 상세 부록`,rows:completed.slice(0,10).map(e=>({name:`${completed.findIndex(x=>x.average===e.average)+1}. ${e.row.proposal.title}`,total:100,values:{평균:e.average!},detail:`관리번호 ${e.row.proposal.board_no} · ${e.average!.toFixed(2)}점 · ${e.decision}`}))},
 rankVariants(entries.map(e=>e.row.proposal)),
 {id:'details',title:'제안별 점수 및 결과 상세',kind:'table',note:'현재 조회 조건 전체 · 상세 부록 · 긴 원문은 여러 페이지로 나눠 보존',rows:[],columns:['관리번호','제안명','소속','제출','평균총점','판정','위원별 최종 점수·의견'],records:entries.map(e=>[e.row.proposal.board_no||'',e.row.proposal.title,e.row.proposal.proposer_office||'기록 없음',`${e.submitted}/${e.required}`,e.average===null?'미산출':e.average.toFixed(2)+(e.complete?'':' (일부 제출)'),e.decision,e.row.judges.map(j=>{const s=e.scores.find(s=>s.judge_name===j.name);return `${j.name}: ${s?`${s.total_score}점 / ${s.opinion||'의견 없음'}`:'미제출'}`;}).join('\n')])}
 ];
 return {title:'1차 제안심사 통계 분석 보고서',session:report.sessions.find(s=>s.id===report.sessionId)?.title||report.sessionId,scope,filters,generatedAt:report.generatedAt,metrics:[['심사대상',`${stats.total}건`],['전원 제출 완료',`${stats.completed}건`],['채택',`${stats.decisions.find(d=>d.name==='채택')!.count}건`],['불채택',`${stats.decisions.find(d=>d.name==='불채택')!.count}건`],['과락',`${stats.decisions.find(d=>d.name==='과락')!.count}건`]],sections,rules:'최종 제출만 집계. 판정·분포·순위는 전원 제출 완료 기준. 평균 50점 미만은 불채택, 평균 50점 이상이며 50점 미만 평가위원 3명 이상은 과락. 미제출은 0점으로 계산하지 않음.',warnings:report.warnings||[]};
}
export function stage0ReportModel(proposals:Proposal[], result:(p:Proposal)=>string, opinion:(p:Proposal)=>string, session:string, scope:string, generatedAt:string):StatisticsReportModel {
 const yes=proposals.filter(p=>result(p)==='Yes').length,no=proposals.filter(p=>result(p)==='No').length;
 function group(id:string,title:string,key:keyof Proposal):ChartSpec {const names=Array.from(new Set(proposals.map(p=>String(p[key]||'기록 없음')).map(n=>key==='proposer_rank'?n.replace(/\s+/g,''):n)));return {id,title,kind:'stack',note:`${key==='assigned_office'||key==='assigned_department'?'현재 실행(평가)부서':'제안자 등록정보'} 기준 · 채택률 분모: 채택+불채택 판정 건수`,sorts:rankSorts,defaultSort:'기본 순서',rows:names.map(name=>{const ps=proposals.filter(p=>(key==='proposer_rank'?String(p[key]||'기록 없음').replace(/\s+/g,''):String(p[key]||'기록 없음'))===name),y=ps.filter(p=>result(p)==='Yes').length,n=ps.filter(p=>result(p)==='No').length;return {name,total:ps.length,completed:y+n,rateBase:y+n,values:{채택:y,불채택:n,미완료:ps.length-y-n}};})};}
 return {title:'0차 부서평가 통계 분석 보고서',session,scope,filters:'전체 조회 · 상세 목록의 검색 조건은 상세 부록에서 별도 표시',generatedAt,metrics:[['접수·배정',`${proposals.length}건`],['판정 확인',`${yes+no}건`],['채택',`${yes}건`],['불채택',`${no}건`],['판정 미확인',`${proposals.length-yes-no}건`]],rules:'기존 0차 최종 결과 판별 함수를 그대로 사용. 채택률 분모는 채택+불채택 판정 건수. 판정 미확인은 미완료로 별도 표시. 부서 이동은 저장된 이력만 표시하며 실제 이동 여부를 추정하지 않음.',warnings:[],sections:[
 {id:'decision',title:'0차 부서평가 판정 비율',kind:'donut',note:`분모: 판정 확인 ${yes+no}건 · 판정 미확인 ${proposals.length-yes-no}건 별도`,rows:[{name:'채택',total:yes,values:{채택:yes}},{name:'불채택',total:no,values:{불채택:no}}]},
 group('offices','처·실·단별 평가 및 판정 현황','assigned_office'),group('assigned','실행부서별 평가 결과','assigned_department'),group('proposers','제안자 소속부서별 결과','proposer_department'),group('category','분야별 평가 결과','category'),group('rank','직급별 참여 및 평가 결과','proposer_rank'),
 {id:'tasks',title:'5개 지정과제별 0차 결과 — 재분류 검토용',kind:'stack',note:taskNotice+` · 지정제안 중 과제 미분류 ${proposals.filter(p=>p.proposal_type==='지정제안'&&(taskMap as Record<string,number>)[p.id]===undefined).length}건 제외`,rows:taskNames.map((name,i)=>{const ps=proposals.filter(p=>p.proposal_type==='지정제안'&&(taskMap as Record<string,number>)[p.id]===i),y=ps.filter(p=>result(p)==='Yes').length,n=ps.filter(p=>result(p)==='No').length;return {name,total:ps.length,rateBase:y+n,values:{채택:y,불채택:n,미완료:ps.length-y-n}};})},
 {id:'transfers',title:'부서 이동 저장 이력',kind:'table',note:'저장된 요청·승인·반려 등 이력 원문 · 실제 이동 횟수와 동일하다고 간주하지 않음',rows:[],columns:['관리번호','제안명','저장 이력'],records:proposals.filter(p=>p.transfer_history?.length).map(p=>[p.board_no||'',p.title,JSON.stringify(p.transfer_history,null,2)])},rankVariants(proposals),
 {id:'details',title:'제안별 0차 결과·부서 검토의견',kind:'table',note:'현재 통계 범위 전체 · 원문을 생략하지 않는 상세 부록',rows:[],columns:['관리번호','제안명','제안부서','실행부서','검토결과','부서 검토의견'],records:proposals.map(p=>[p.board_no||'',p.title,p.proposer_department||'기록 없음',p.assigned_department||'기록 없음',result(p)==='Yes'?'채택':result(p)==='No'?'불채택':'판정 미확인',opinion(p)])}
 ]};
}
