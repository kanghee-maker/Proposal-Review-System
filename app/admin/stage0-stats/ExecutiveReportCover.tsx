'use client';
import { ChartSpec, StatisticsReportModel } from '@/lib/statisticsReportModel';
import { designatedStage1Findings, executiveReportFindings } from '@/lib/statisticsReportSummary';

export default function ExecutiveReportCover({model,spec}:{model:StatisticsReportModel;spec:ChartSpec}) {
 const facts=executiveReportFindings(model);
 const detailed=model.scope==='지정제안'&&model.sections.some(s=>s.id==='distribution');
 const designated=designatedStage1Findings(model),findings=detailed?designated.findings:facts.findings;
 const pct=(n:number,d:number)=>d?`${(n/d*100).toFixed(1)}%`:'산출 불가';
 return <div className={`executive-cover ${detailed?'executive-designated':''}`}>
  <div className="executive-headline"><span>핵심 결과</span><strong>{facts.headline}</strong></div>
  <div className="executive-cards">{facts.cards.map(([label,value],i)=><div key={label} className={`executive-card executive-card-${i}`}><span>{label}</span><b>{value}</b></div>)}</div>
  {detailed?<><div className="executive-decision-strip">{model.sections.find(s=>s.id==='decision')?.rows.map(r=><span key={r.name}>{r.name} <b>{r.total}건</b></span>)}</div><h3 className="executive-office-heading">처·실·단별 판정 현황</h3><table className="executive-table executive-office-table"><colgroup><col style={{width:'36%'}}/>{Array.from({length:designated.other?6:5},(_,i)=><col key={i}/>)}</colgroup><thead><tr><th>제안자 소속</th><th>대상</th><th>채택</th><th>불채택</th><th>과락</th>{designated.other&&<th>기타*</th>}<th>채택률</th></tr></thead><tbody>{designated.offices.map(r=><tr key={r.name}><td>{r.name}</td><td>{r.total}</td><td>{r.values['채택']||0}</td><td>{r.values['불채택']||0}</td><td>{r.values['과락']||0}</td>{designated.other&&<td>{(r.values['조건부채택']||0)+(r.values['미완료']||0)}</td>}<td>{pct(r.values['채택']||0,r.rateBase??r.total)}</td></tr>)}</tbody></table></>:<table className="executive-table"><colgroup><col style={{width:'29%'}}/><col style={{width:'16%'}}/><col style={{width:'55%'}}/></colgroup><thead><tr>{spec.columns?.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{spec.records?.map((row,i)=><tr key={i} className={row[0]==='채택'?'executive-adopted':''}>{row.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table>}
  <h3 className="executive-findings-title">주요 분석</h3><div className="executive-findings">{findings.map((f,i)=><div key={f.title} className={`executive-finding executive-finding-${i}`}><h3>{f.title}</h3><p>{f.text}</p></div>)}</div>
  <p className="executive-scope-note">{detailed?'심사대상 기준의 제안자 소속 통계입니다. 채택률 분모는 부서별 전원 제출 완료 건수입니다. 기타*는 조건부채택·미완료입니다.':'현재 회차·조회 조건 기준입니다. 인쇄 항목 선택은 집계 대상을 바꾸지 않습니다.'}</p>
  <style jsx global>{`
   /* CI logo source: public/images/logo.png — teal #00AC97, blue #0068B7, orange #F3981E. */
   .report-summary-sheet .report-page-header{border-bottom:3px solid #0068b7;color:#0068b7;min-height:42px}
   .report-summary-sheet .report-ci-logo{display:block;width:166px;height:auto;object-fit:contain}
   .report-summary-sheet .report-page-heading h2{font-size:28px!important;color:#0068b7;margin:8px 0!important}
   .report-summary-sheet .report-page-heading p{font-size:12px!important;color:#466077}
   .report-summary-sheet .report-eyebrow{color:#008c7b;font-size:11px!important;letter-spacing:.08em}
   .report-summary-sheet .report-page-heading{padding-top:12px}
   .report-summary-sheet .report-page-note{display:none}
   .executive-cover .executive-headline{display:flex;align-items:center;gap:12px;margin:10px 0 10px;border-left:5px solid #f3981e;padding:8px 12px;background:#fff7e9}
   .executive-headline>span{color:#ad6510;font-size:13px;font-weight:800;white-space:nowrap}
   .executive-headline>strong{font-size:22px;font-weight:850;color:#173a58;line-height:1.4}
   .executive-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
   .executive-card{border-radius:9px;border:1px solid #b4ded9;background:#e8f6f3;padding:11px 14px;display:flex;flex-direction:column;gap:4px}
   .executive-card>span{font-size:13px;font-weight:700;color:#247568}.executive-card>b{font-size:28px;line-height:1.25;font-weight:850;color:#008c7b}
   .executive-card-1{border-color:#bad5e9;background:#edf5fc}.executive-card-1>span,.executive-card-1>b{color:#0068b7}
   .executive-card-2{border-color:#f2d0a0;background:#fff5e7}.executive-card-2>span,.executive-card-2>b{color:#a45c08}
   .executive-table{width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid #c5d7e3}
   .statistics-view .report-summary-sheet .executive-cover .executive-table th{font-size:14px!important;font-weight:800;background:#0068b7!important;color:#fff!important;padding:9px 10px!important;border:0;line-height:1.35!important;text-align:left}
   .statistics-view .report-summary-sheet .executive-cover .executive-table td{font-size:14px!important;line-height:1.4!important;padding:6px 10px!important;border-bottom:1px solid #dce6ed;white-space:normal;overflow-wrap:anywhere;color:#233f57;vertical-align:middle}
   .executive-table tbody tr:nth-child(even){background:#f3f8fb}.executive-table .executive-adopted{background:#e8f6f3!important}.executive-table td:nth-child(2){font-size:16px!important;font-weight:800;color:#0068b7!important}
   .executive-findings{display:flex;flex-direction:column;gap:9px;margin-top:8px}.report-summary-sheet .executive-findings-title{font-size:15px!important;margin:14px 0 6px!important;color:#0068b7;font-weight:800}
   .executive-finding{display:grid;grid-template-columns:80px 1fr;gap:12px;padding:8px 12px;border:1px solid #b9ddd8;border-left:4px solid #00ac97;border-radius:8px;background:#eaf7f4}
   .executive-finding-1{border-color:#bfd7e9;border-left-color:#0068b7;background:#edf5fc}.executive-finding-2{border-color:#f0d3ac;border-left-color:#f3981e;background:#fff6e9}
   .report-summary-sheet .executive-finding h3{font-size:14px!important;line-height:1.5;margin:0!important;font-weight:800;color:#173e5d}
   .report-summary-sheet .executive-finding p{font-size:14px!important;line-height:1.6!important;margin:0!important;color:#24455e}
   .report-summary-sheet .executive-scope-note{font-size:10px!important;line-height:1.5!important;margin:10px 0 0!important;color:#627c91}
   .report-summary-sheet .report-author{font-size:16px!important;font-weight:800;text-align:right;color:#0068b7;letter-spacing:.015em;padding:10px 0 4px;margin-top:8px}
   .report-summary-sheet .report-page-footer{border-top:1px solid #bad3e5;margin-top:8px;padding-top:7px}
   .report-summary-sheet .report-page-footer p{font-size:8px!important}
   .report-landscape .report-summary-sheet .report-page-heading h2{font-size:28px!important}
   .executive-designated .executive-headline{margin:8px 0}.executive-designated .executive-cards{margin-bottom:8px}.executive-designated .executive-card{padding:8px 12px}.executive-designated .executive-card>b{font-size:26px}
   .executive-decision-strip{display:flex;gap:16px;flex-wrap:wrap;padding:7px 10px;background:#edf5fc;border-radius:6px;font-size:13px;color:#235379}.executive-decision-strip b{color:#0068b7}
   .report-summary-sheet .executive-office-heading{font-size:15px!important;font-weight:800;margin:10px 0 6px!important;color:#0068b7}
   .statistics-view .report-summary-sheet .executive-cover .executive-office-table th,.statistics-view .report-summary-sheet .executive-cover .executive-office-table td{padding:4px 6px!important;font-size:13px!important;line-height:1.4!important;text-align:center}
   .statistics-view .report-summary-sheet .executive-cover .executive-office-table th:first-child,.statistics-view .report-summary-sheet .executive-cover .executive-office-table td:first-child{text-align:left}
   .executive-designated .executive-findings{gap:6px}.executive-designated .executive-finding{padding:7px 10px;grid-template-columns:86px 1fr;gap:8px}.report-summary-sheet .executive-designated .executive-finding p{font-size:13px!important;line-height:1.5!important}.report-summary-sheet .executive-designated .executive-finding h3{font-size:13px!important}
   .report-summary-sheet .executive-designated .executive-findings-title{margin-top:10px!important}.report-summary-sheet .executive-designated .executive-scope-note{font-size:9px!important;margin-top:7px!important}
   .report-sheet.report-summary-sheet:has(.executive-designated){padding-top:9mm;padding-bottom:9mm}
   .report-summary-sheet:has(.executive-designated) .report-page-header{min-height:36px}.report-summary-sheet:has(.executive-designated) .report-page-heading{padding-top:8px}
   .statistics-view .report-summary-sheet .executive-cover .executive-office-table th,.statistics-view .report-summary-sheet .executive-cover .executive-office-table td{padding-top:3px!important;padding-bottom:3px!important}
   .report-sheet.report-summary-sheet:has(.executive-designated){padding-top:9mm!important;padding-bottom:9mm!important}
   .report-summary-sheet:has(.executive-designated) .report-page-heading>.report-eyebrow{display:none}
   .report-summary-sheet:has(.executive-designated) .report-page-heading{padding-top:4px}
   .report-summary-sheet:has(.executive-designated) .report-page-heading h2{margin-top:4px!important;margin-bottom:4px!important}
   .report-summary-sheet:has(.executive-designated) .report-author{padding-top:6px;padding-bottom:2px}
   @media print{.report-summary-sheet .executive-cover *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  `}</style>
 </div>;
}
