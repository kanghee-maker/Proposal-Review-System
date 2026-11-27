'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { EvaluationSession } from '@/lib/types';
import { ResultReport } from '@/lib/resultReports';
import { dashboardEntry, dashboardSummary, dashboardGroups, officeOrder } from '@/lib/stage1Dashboard';
import { buildDashboardWorkbook } from '@/lib/stage1DashboardWorkbook';
import { criteriaStatistics, detailedJudgeStatistics, taskIndex, taskNotice, taskStatistics } from '@/lib/stage1Analytics';

import { statisticsColors as colors, StatisticsHeader, StatisticsDonut, StatisticsPrintOptions } from '../stage0-stats/StatisticsVisuals';
import StatisticsReportStudio from '../stage0-stats/StatisticsReportStudio';
import { stage1ReportModel } from '@/lib/statisticsReportModel';
const format = (n: number | null) => n === null ? '미산출' : n.toFixed(2);
const sections = { overview: '핵심 지표', charts: '판정·점수 분포', offices: '부서별 통계', judges: '심사위원별 현황', groups: '분야·직급별 통계', criteria: '평가항목별 평균', tasks: '5개 과제별 검토 통계', ranking: '고득점 상위 순위', details: '제안별 상세' };
export default function Stage1Dashboard({ sessionId, embedded, designatedOnly }: { sessionId?: string; embedded?: boolean; designatedOnly?: boolean }) {
  const [sessions, setSessions] = useState<EvaluationSession[]>([]), [session, setSession] = useState('');
  const [report, setReport] = useState<ResultReport | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [type, setType] = useState(designatedOnly ? '지정제안' : ''), [office, setOffice] = useState(''), [decision, setDecision] = useState(''), [search, setSearch] = useState('');
  const [printParts, setPrintParts] = useState(Object.keys(sections)), [open, setOpen] = useState('');
  useEffect(() => {
    if (sessionId) { setSession(sessionId); return; }
    const controller = new AbortController();
    fetch('/api/result-reports', { cache: 'no-store', signal: controller.signal }).then(async r => {
      const body = await r.json(); if (!r.ok) throw Error(body.error || '회차 조회 실패');
      const list = body.filter((s: EvaluationSession) => s.stage === 'STAGE_1');
      setSessions(list); setSession(list[0]?.id || '');
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [sessionId]);
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController(); setBusy(true); setReport(null); setError(''); setOpen('');
    fetch('/api/result-reports?mode=stage1&session_id=' + encodeURIComponent(session), { cache: 'no-store', signal: controller.signal }).then(async r => {
      const body = await r.json(); if (!r.ok) throw Error(body.error || '심사 결과 조회 실패'); if (!controller.signal.aborted) setReport(body);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [session]);
  const all = useMemo(() => (report?.rows || []).map(dashboardEntry), [report]);
  const typeLabel = designatedOnly ? '지정제안' : type === '__general__' ? '일반제안(지정제안 제외)' : type || '전체 제안';
  const entries = useMemo(() => all.filter(e => (!designatedOnly || e.row.proposal.proposal_type === '지정제안') && (!type || (type === '__general__' ? e.row.proposal.proposal_type !== '지정제안' : e.row.proposal.proposal_type === type)) && (!office || e.row.proposal.proposer_office === office) &&
    (!decision || e.decision === decision) && (!search.trim() || [e.row.proposal.board_no, e.row.proposal.title, e.row.proposal.proposer_name].join(' ').toLowerCase().includes(search.trim().toLowerCase()))), [all, type, office, decision, search, designatedOnly]);
  const stats = dashboardSummary(entries), offices = dashboardGroups(entries, 'proposer_office');
  const selected = entries.find(e => e.row.proposal.id === open);
  const complete = entries.filter(e => e.complete).sort((a, b) => b.average! - a.average!);
  const judges = detailedJudgeStatistics(entries), criteria = criteriaStatistics(entries), tasks = taskStatistics(entries);
  const taskUnclassified = entries.filter(e => e.row.proposal.proposal_type === '지정제안' && taskIndex(e) === undefined).length;
  let cumulative = 0;
  const gradient = stats.decisions.filter(d => d.count).map(d => { const start = cumulative; cumulative += d.count / stats.completed * 100; return `${colors[d.name]} ${start}% ${cumulative}%`; }).join(',');
  const visible = (id: string) => 'panel ' + (printParts.includes(id) ? '' : 'skip-print');
  async function print() {
    if (!printParts.length) { setError('인쇄할 항목을 하나 이상 선택해 주세요.'); return; }
    const r = await fetch('/api/auth/admin', { cache: 'no-store' }).catch(() => null);
    if (r?.ok) window.dispatchEvent(new Event('statistics-print-request')); else setError('관리자 인증을 확인한 후 다시 인쇄해 주세요.');
  }
  function download() {
    if (!report) return;
    try {
      const bytes = buildDashboardWorkbook(report, entries, JSON.stringify({ type: typeLabel, office, decision, search }));
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a'); a.href = url; a.download = `1차심사_통계결과_${typeLabel}_${new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch { setError('엑셀 생성에 실패했습니다. 다시 시도해 주세요.'); }
  }
  return <main className="stage1-dashboard statistics-view">
    <StatisticsHeader title={designatedOnly ? '지정제안 1차 평가 통계' : '1차 제안심사 통계 조회'} subtitle={`${(report?.sessions || sessions).find(s=>s.id===session)?.title || '평가 회차 확인 중'} · ${typeLabel}`}>
      <Link href="/stage0-stats">0차 부서평가 통계</Link><Link href="/admin/result-reports">0차·1차 통합 결과</Link>
    </StatisticsHeader>
    <section className="panel screen-only"><div className="filters">
      {!embedded && <label>평가 회차<select aria-label="평가 회차" value={session} onChange={e => { setSession(e.target.value); setType(designatedOnly ? '지정제안' : ''); setOffice(''); setDecision(''); setSearch(''); }}>{sessions.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>}
      <label>제안 구분<select disabled={designatedOnly} aria-label="제안 구분" value={type} onChange={e => setType(e.target.value)}><option value="">전체 제안</option><option value="__general__">일반제안(지정제안 제외)</option>{Array.from(new Set(all.map(e => e.row.proposal.proposal_type))).filter(Boolean).map(t => <option key={t}>{t}</option>)}</select></label>
      <label>제안자 소속<select aria-label="제안자 소속" value={office} onChange={e => setOffice(e.target.value)}><option value="">전체 처·실·단</option>{Array.from(new Set([...officeOrder, ...all.map(e => e.row.proposal.proposer_office).filter(Boolean)])).map(t => <option key={t}>{t}</option>)}</select></label>
      <label>1차 판정<select aria-label="1차 판정" value={decision} onChange={e => setDecision(e.target.value)}><option value="">전체 결과</option>{['채택', '조건부채택', '불채택', '과락', '심사 중', '연결 확인 필요'].map(t => <option key={t}>{t}</option>)}</select></label>
      <label>제안 검색<input placeholder="관리번호·제안명·제안자" value={search} onChange={e => setSearch(e.target.value)} /></label>
      <button onClick={() => { setType(designatedOnly ? '지정제안' : ''); setOffice(''); setDecision(''); setSearch(''); }}>조회 조건 초기화</button>
      <button disabled={!report || busy} className="green" onClick={download}>현재 조건 엑셀 다운로드</button>
      <button disabled={!report || busy} className="blue" onClick={print}>선택 항목 인쇄</button>
    </div></section>
    <p className="criteria"><b>집계 기준</b> 현재 조건: {typeLabel} / {office || '전체 소속'} / {decision || '전체 결과'}{search && ` / 검색: ${search}`}<br />최종 제출 점수만 집계합니다. 미제출은 0점으로 계산하지 않으며, 판정·점수분포·순위는 전원 제출 완료 제안 기준입니다. 불채택은 평균 50점 미만, 과락은 평균 50점 이상이면서 50점 미만 평가위원 3명 이상입니다. 부서 통계는 제안자 소속 기준입니다.</p>
    {error && <p role="alert" className="error">{error}</p>}
    {busy && <p role="status">1차 심사 통계를 불러오고 있습니다…</p>}
    {!busy && report && <>
      <section className={visible('overview')}><h2>1차 심사 핵심 지표</h2><div className="cards stats-kpi-grid">{[
        ['심사대상 제안', `${stats.total}건`], ['전원 제출 완료', `${stats.completed}건`], ['위원 평가 제출률', `${stats.required ? (stats.submitted / stats.required * 100).toFixed(1) : '0'}%`],
        ['채택', `${stats.decisions.find(d => d.name === '채택')!.count}건`], ['불채택', `${stats.decisions.find(d => d.name === '불채택')!.count}건`], ['과락', `${stats.decisions.find(d => d.name === '과락')!.count}건`]
      ].map(([label, value], index) => <div key={label} data-metric={["total","complete","submitted","accepted","rejected","disqualified"][index]} className="metric"><span>{label}</span><strong>{value}</strong></div>)}</div><p>{stats.submitted} / {stats.required}개 위원 평가 최종 제출 · 완료 제안 평균 {format(stats.average)}점 · 심사 중 {entries.filter(e => e.decision === '심사 중').length}건 · 연결 확인 필요 {stats.issues}건</p></section>
      <StatisticsReportStudio model={stage1ReportModel(report, entries, `${typeLabel} / ${office || '전체 소속'} / ${decision || '전체 결과'}${search ? ` / 검색: ${search}` : ''}`, typeLabel)} />
      <section className={visible('details')}><h2>제안별 점수 및 결과 상세</h2><p>현재 조건 {entries.length}건 · 평균은 소수 둘째 자리 표시, 순위는 완료 제안의 반올림 전 평균 기준 공동순위입니다. 상세를 열면 위원별 점수·의견이 표시됩니다.</p><div className="table-wrap"><table><thead><tr><th>순위</th><th>관리번호</th><th>제안명</th><th>제안자 소속</th><th>제출</th><th>평균총점</th><th>판정</th><th className="screen-only">상세</th></tr></thead><tbody>{[...entries].sort((a, b) => (b.average ?? -1) - (a.average ?? -1)).map(e => <tr key={e.row.proposal.id}><td>{e.complete ? complete.findIndex(x => x.average === e.average) + 1 : '미부여'}</td><td>{e.row.proposal.board_no}</td><td>{e.row.proposal.title}</td><td>{e.row.proposal.proposer_office}</td><td>{e.submitted}/{e.required}</td><td>{format(e.average)}{!e.complete && e.average !== null && ' (일부 제출)'}</td><td><b style={{ color: colors[e.decision] }}>{e.decision}</b></td><td className="screen-only"><button onClick={() => setOpen(open === e.row.proposal.id ? '' : e.row.proposal.id)}>상세</button></td></tr>)}</tbody></table></div>
        {selected && <div className="detail"><h3>{selected.row.proposal.title}</h3><p>최종 제출 점수·의견 원문</p><table><thead><tr><th>심사위원</th><th>창의성 /30</th><th>실현성 /30</th><th>효과성 /30</th><th>전파성 /10</th><th>총점</th><th>의견</th></tr></thead><tbody>{selected.row.judges.map(j => { const s = selected.scores.find(s => s.judge_name === j.name); return <tr key={j.name}><td>{j.name}</td><td>{s?.creativity ?? '미제출'}</td><td>{s?.feasibility ?? '미제출'}</td><td>{s?.effectiveness ?? '미제출'}</td><td>{s?.dissemination ?? '미제출'}</td><td>{s?.total_score ?? '미제출'}</td><td className="opinion">{s ? s.opinion || '의견 없음' : '미제출'}</td></tr>; })}</tbody></table></div>}
      </section>{!entries.length && <p>현재 조건에 해당하는 제안이 없습니다.</p>}<p className="timestamp">조회 시각: {new Date(report.generatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>
    </>}
    <style jsx global>{`
      .stage1-dashboard{max-width:1320px;margin:auto;padding:24px;color:#162640;font-size:14px;line-height:1.6}.stage1-dashboard .panel{background:white;border:1px solid #dce4ee;border-radius:18px;padding:24px;margin-bottom:22px}.stage1-dashboard header{display:flex;justify-content:space-between;gap:20px;align-items:center}.stage1-dashboard h1{font-size:26px;font-weight:800}.stage1-dashboard h2{font-size:19px;font-weight:750;margin-bottom:8px}.stage1-dashboard h3{font-size:17px;font-weight:bold}.stage1-dashboard p{color:#60748b;margin:6px 0 16px}.stage1-dashboard .tag{color:#a45c00;background:#fff3d1;padding:4px 10px;border-radius:12px;font-weight:bold}.stage1-dashboard nav{display:flex;gap:12px;flex-wrap:wrap}.stage1-dashboard a,.stage1-dashboard button{border:1px solid #ccd8e6;border-radius:8px;padding:8px 12px;background:white;font-weight:650}.stage1-dashboard button:disabled{opacity:.5}.stage1-dashboard .filters{display:flex;gap:12px;flex-wrap:wrap;align-items:end}.stage1-dashboard label{display:flex;flex-direction:column;gap:4px}.stage1-dashboard select,.stage1-dashboard input:not([type=checkbox]){border:1px solid #c5d1df;padding:8px;border-radius:8px;max-width:320px;background:white}.stage1-dashboard .green{background:#047857;color:white}.stage1-dashboard .blue{background:#0369a1;color:white}.stage1-dashboard .print-options{display:flex;gap:14px;flex-wrap:wrap;margin-top:18px}.stage1-dashboard .print-options label{flex-direction:row;align-items:center}.stage1-dashboard .criteria{font-size:13px}.stage1-dashboard .error{color:#b91c1c;border:1px solid #fca5a5;padding:14px}.stage1-dashboard .cards{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px}.stage1-dashboard .metric{border:1px solid #dce4ee;border-radius:12px;padding:16px;display:flex;flex-direction:column;min-height:100px;justify-content:space-between}.stage1-dashboard .metric strong{font-size:28px;color:#b86b00}.stage1-dashboard .chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px}.stage1-dashboard .donut-layout{display:flex;gap:30px;align-items:center;flex-wrap:wrap}.stage1-dashboard .donut{width:190px;height:190px;border-radius:50%;padding:26px}.stage1-dashboard .donut>div{background:white;border-radius:50%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center}.stage1-dashboard .donut strong{font-size:26px}.stage1-dashboard i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px}.stage1-dashboard .bar-row{display:grid;grid-template-columns:90px 1fr 45px;align-items:center;gap:12px;margin:18px 0}.stage1-dashboard .track,.stage1-dashboard .stack{height:12px;border-radius:9px;background:#edf1f6;overflow:hidden}.stage1-dashboard .track>div,.stage1-dashboard .stack>div{height:100%}.stage1-dashboard .stack{display:flex;margin:9px 0}.stage1-dashboard .office{margin:18px 0 24px}.stage1-dashboard .office>div:first-child{display:flex;justify-content:space-between;gap:12px}.stage1-dashboard small{color:#60748b}.stage1-dashboard .group-card{padding:14px;border:1px solid #dce4ee;border-radius:12px;margin:12px 0}.stage1-dashboard table{width:100%;border-collapse:collapse}.stage1-dashboard th,.stage1-dashboard td{padding:11px 9px;border-bottom:1px solid #dce4ee;text-align:left;vertical-align:top}.stage1-dashboard th{background:#f0f5fa;font-weight:700}.stage1-dashboard .table-wrap{overflow-x:auto}.stage1-dashboard .opinion{white-space:pre-wrap;min-width:160px;overflow-wrap:anywhere}.stage1-dashboard .detail{margin-top:25px;overflow-x:auto}.stage1-dashboard .timestamp{font-size:12px}@media(max-width:800px){.stage1-dashboard{padding:12px}.stage1-dashboard .cards{grid-template-columns:repeat(2,minmax(0,1fr))}.stage1-dashboard .chart-grid{grid-template-columns:1fr}.stage1-dashboard header{align-items:start;flex-direction:column}.stage1-dashboard .panel{padding:16px}.stage1-dashboard h1{font-size:22px}}@media print{.stage1-dashboard .screen-only,.stage1-dashboard .skip-print{display:none!important}.stage1-dashboard{padding:0;font-size:10pt;max-width:none}.stage1-dashboard .panel{border:none;border-radius:0;padding:8px 0;margin:0 0 15px}.stage1-dashboard .cards{grid-template-columns:repeat(3,1fr)}.stage1-dashboard .chart-grid{grid-template-columns:1fr 1fr}.stage1-dashboard .table-wrap,.stage1-dashboard .detail{overflow:visible}.stage1-dashboard table{table-layout:fixed;font-size:8pt}.stage1-dashboard td,.stage1-dashboard th{overflow-wrap:anywhere;padding:5px}.stage1-dashboard thead{display:table-header-group}.stage1-dashboard tr,.stage1-dashboard .group-card,.stage1-dashboard .office{break-inside:avoid}.stage1-dashboard h2{break-after:avoid}.stage1-dashboard .opinion{min-width:0}.stage1-dashboard *{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
    `}</style>
  </main>;
}
