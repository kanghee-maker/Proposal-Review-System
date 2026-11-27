import { ChartSpec, StatisticsReportModel } from './statisticsReportModel';

export function executiveReportFindings(model: StatisticsReportModel) {
 const decision=model.sections.find(s=>s.id==='decision');
 const total=Number((model.metrics[0]?.[1]||'0').replace(/[^\d]/g,''));
 const confirmed=(decision?.rows||[]).reduce((n,r)=>n+r.total,0);
 const adopted=decision?.rows.find(r=>r.name==='채택')?.total||0;
 const pct=(n:number,d:number)=>d?`${(n/d*100).toFixed(1)}%`:'산출 불가';
 const stage1=model.sections.some(s=>s.id==='distribution');
 const findings=[{title:'평가 진행',text:total===0?'현재 조회 조건에 해당하는 제안이 없습니다.':confirmed===total?`대상 ${total}건의 ${stage1?'위원 전원 제출':'판정 확인'}이 모두 완료됐습니다.`:`대상 ${total}건 중 ${confirmed}건의 ${stage1?'위원 전원 제출':'판정 확인'}이 완료됐고, ${total-confirmed}건은 최종 판정 전입니다.`}];
 const bins=model.sections.find(s=>s.id==='distribution')?.rows;
 if(bins&&confirmed){const middle=bins.filter(r=>['50~59점','60~69점'].includes(r.name)).reduce((n,r)=>n+r.total,0);findings.push({title:'점수 분포',text:`완료 제안 ${confirmed}건 중 50~69점 구간은 ${middle}건(${pct(middle,confirmed)})입니다. 반올림 전 평균점수 기준입니다.`});}
 else{const categories=model.sections.find(s=>s.id==='category')?.rows||[],largest=Math.max(0,...categories.map(r=>r.total));if(largest){const names=categories.filter(r=>r.total===largest).map(r=>r.name);findings.push({title:'접수 분야',text:`${names.join('·')} 분야가 ${names.length>1?'각각 ':''}${largest}건으로 가장 많습니다. 분야별 접수 규모를 비교한 결과입니다.`});}}
 const no=decision?.rows.find(r=>r.name==='불채택')?.total||0,cut=decision?.rows.find(r=>r.name==='과락')?.total||0;
 if(findings.length<2)findings.push({title:'판정 구분',text:stage1?`불채택 ${no}건과 과락 ${cut}건을 구분했습니다. 판정 비율은 전원 제출 완료 ${confirmed}건을 분모로 계산했습니다.`:`채택 ${adopted}건, 불채택 ${no}건입니다. 채택률은 판정이 확인된 ${confirmed}건을 분모로 계산했습니다.`});
 return {headline:total?`전체 ${total}건 중 ${adopted}건 채택`:'조회 조건에 해당하는 제안 없음',cards:[['심사 대상',`${total}건`],['채택률',pct(adopted,confirmed)],['평가 완료율',pct(confirmed,total)]] as [string,string][],findings};
}

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
