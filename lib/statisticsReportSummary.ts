import { ChartSpec, StatisticsReportModel } from './statisticsReportModel';

export function statisticsReportSummary(model: StatisticsReportModel): ChartSpec {
 const decision=model.sections.find(s=>s.id==='decision');
 const total=Number((model.metrics[0]?.[1]||'0').replace(/[^\d]/g,''));
 const confirmed=(decision?.rows||[]).reduce((n,r)=>n+r.total,0);
 const stage1=model.sections.some(s=>s.id==='distribution');
 const pct=(n:number,d:number)=>d?`${(n/d*100).toFixed(1)}%`:'산출 불가';
 const records:string[][]=[['전체 대상',`${total}건`,'현재 회차·조회 조건 기준'],[stage1?'전원 제출 완료':'판정 확인',`${confirmed}건`,`${pct(confirmed,total)} · 전체 대상 ${total}건 기준`]];
 for(const row of decision?.rows||[])records.push([row.name,`${row.total}건`,`${pct(row.total,confirmed)} · ${stage1?'전원 제출 완료':'판정 확인'} ${confirmed}건 기준`]);
 records.push([stage1?'심사 중·연결 확인 필요':'판정 미확인',`${Math.max(0,total-confirmed)}건`,'최종 판정 비율에서 제외']);
 const accepted=decision?.rows.find(r=>r.name==='채택')?.total||0;
 const analysis=[`전체 ${total}건 중 ${stage1?'전원 제출이 완료된':'판정이 확인된'} 제안은 ${confirmed}건(${pct(confirmed,total)})입니다.`,confirmed?`판정 확인 제안 중 채택은 ${accepted}건으로, 채택률은 ${pct(accepted,confirmed)}입니다.`:'판정 확인 제안이 없어 채택률을 산출하지 않았습니다.'];
 const bins=model.sections.find(s=>s.id==='distribution')?.rows||[];
 const peak=Math.max(0,...bins.map(r=>r.total));
 if(peak>0){const names=bins.filter(r=>r.total===peak).map(r=>r.name);analysis.push(`평균총점은 ${names.join('·')} 구간이 ${names.length>1?'각각 ':''}${peak}건으로 가장 많습니다. 전원 제출 완료 제안 기준입니다.`);}
 else if(total>confirmed)analysis.push(`나머지 ${total-confirmed}건은 판정 미확인으로 구분했으며, 미제출 점수를 0점으로 처리하지 않았습니다.`);
 return {id:'executive-summary',title:'통계 분석 결과 요약',kind:'table',rows:[],columns:['구분','건수','비율 및 집계 기준'],records,note:'현재 조회 조건 전체를 요약합니다. 인쇄 항목 선택은 아래 수치를 다시 필터링하지 않습니다.',summary:analysis.join('\n')};
}
