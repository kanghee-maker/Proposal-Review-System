'use client';

import { useEffect, useMemo, useState } from 'react';
import { EvaluationSession } from '@/lib/types';
import { departmentStatistics, emptyReportFilters, filterResultRows, finalScores, initialDepartment, judgeStatistics, orderDepartments, reportLabels, ReportFilters, ReportMode, ResultReport, ResultRow, resultSummary } from '@/lib/resultReports';
import { buildResultWorkbook } from '@/lib/resultReportWorkbook';
import { ReportZip } from '@/lib/reportZip';

const display = (value: any): string => value === undefined || value === null || value === '' ? '기록 없음' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function scoreAverage(row: ResultRow, key: 'creativity' | 'feasibility' | 'effectiveness' | 'dissemination') {
  const scores = finalScores(row).filter(s => row.judges.some(j => j.name === s.judge_name));
  return scores.length ? (scores.reduce((sum, s) => sum + s[key], 0) / scores.length).toFixed(2) : '미제출';
}

export default function ResultStatistics() {
  const [sessions, setSessions] = useState<EvaluationSession[]>([]);
  const [mode, setMode] = useState<ReportMode>('stage0');
  const [sessionId, setSessionId] = useState('');
  const [report, setReport] = useState<ResultReport | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({ ...emptyReportFilters });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [openId, setOpenId] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/result-reports', { cache: 'no-store', signal: controller.signal }).then(async r => {
      const body = await r.json(); if (!r.ok) throw new Error(body.error || '회차 조회 실패'); setSessions(body);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, []);
  const available = sessions.filter(s => mode === 'stage1' ? s.stage === 'STAGE_1' : s.stage !== 'STAGE_1');
  const selectedId = available.some(s => s.id === sessionId) ? sessionId : available[0]?.id || '';
  useEffect(() => {
    setReport(null); setError(''); setOpenId('');
    if (!selectedId) return;
    const controller = new AbortController(); setBusy(true);
    const query = new URLSearchParams({ mode, session_id: selectedId });
    fetch('/api/result-reports?' + query, { cache: 'no-store', signal: controller.signal }).then(async response => {
      const body = await response.json(); if (!response.ok) throw new Error(body.error || '결과 조회 실패');
      if (!controller.signal.aborted) setReport(body);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [mode, selectedId, refresh]);

  const rows = useMemo(() => filterResultRows(report?.rows || [], filters), [report, filters]);
  const summary = resultSummary(rows), departments = departmentStatistics(rows), judges = judgeStatistics(rows);
  const selected = rows.find(r => r.proposal.id === openId || r.stage1.some(p => p.id === openId));
  const all = report?.rows || [];
  const filterLabel: Record<keyof ReportFilters, string> = { search: '관리번호·제목·본문 검색', proposer: '제안자 소속', initial: '최초 배정 부서', department: '현재 담당 부서', result: '0차 수용 여부', transfer: '부서 이동', state: '연계·제출 상태', judge: '심사위원', decision: '기존 최종 판정' };
  const choices: Partial<Record<keyof ReportFilters, string[]>> = {
    proposer: orderDepartments(all.map(r => r.proposal.proposer_department || r.proposal.proposer_raw_dept)),
    initial: orderDepartments(all.map(initialDepartment)), department: orderDepartments(all.map(r => r.proposal.assigned_department)),
    result: Array.from(new Set(all.map(r => r.stage0Result))), transfer: ['이력 있음', '이력 없음', 'REQUEST', 'APPROVE', 'REJECT', 'CANCEL', 'NOTE', 'LEGACY'],
    state: [...Array.from(new Set(all.map(r => r.state))), '연결 확인 필요'], judge: Array.from(new Set(all.flatMap(r => [...r.judges.map(j => j.name), ...r.scores.map(s => s.judge_name)]))),
    decision: Array.from(new Set(all.flatMap(r => r.stage1.map(p => p.stage1_decision).filter(Boolean))))
  };
  const filename = `${reportLabels[mode]}_${selectedId}_${new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })}`;
  async function download(includeAttachments: boolean) {
    if (!report || exporting) return;
    setExporting(true); setProgress('엑셀 생성 중');
    try {
      const bytes = buildResultWorkbook(report, rows, JSON.stringify(filters));
      const excel = new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      if (!includeAttachments) { saveBlob(excel, filename + '.xlsx'); setProgress('엑셀 다운로드 완료'); return; }
      const zip = new ReportZip(); await zip.add(filename + '.xlsx', excel);
      const attachments = rows.flatMap(r => [r.proposal, ...r.stage1.filter(p => p.id !== r.proposal.id)].flatMap(p => (p.attachments || []).map(a => ({ p, a }))));
      const missing: string[] = []; const seen = new Set<string>();
      for (const [index, { p, a }] of Array.from(attachments.entries())) {
        if (seen.has(a.id)) continue; seen.add(a.id);
        setProgress(`첨부파일 확인 ${index + 1}/${attachments.length}`);
        let response: Response;
        try {
          response = await fetch(`/api/proposals/attachments?id=${encodeURIComponent(a.id)}&download=1`, { cache: 'no-store' });
        } catch {
          missing.push(`${p.id}\t${a.id}\t${a.name}\t첨부 다운로드 통신 실패`);
          continue;
        }
        if (response.status === 401 || response.status === 403) throw new Error('인증이 만료됐습니다. 다시 로그인해 주세요.');
        if (!response.ok || response.headers.get('content-type')?.includes('application/json')) {
          missing.push(`${p.id}\t${a.id}\t${a.name}\t파일 본문 다운로드 불가 HTTP ${response.status}`); continue;
        }
        const safe = (value: string) => value.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/\.{2}/g, '_');
        await zip.add(`첨부/${safe(p.id)}/${safe(a.id)}_${safe(a.name)}`, await response.blob());
      }
      await zip.add('첨부 누락 목록.txt', new Blob(['\uFEFF' + (missing.join('\n') || '누락 없음')], { type: 'text/plain;charset=utf-8' }));
      saveBlob(zip.finish(), filename + '.zip'); setProgress(`완료 · 첨부 누락 ${missing.length}건`);
    } catch (e) { setError(e instanceof Error ? e.message : '다운로드 실패'); }
    finally { setExporting(false); }
  }
  const fields = (data: Record<string, any>) => <dl className="report-fields">{Object.entries(data).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{display(value)}</dd></div>)}</dl>;
  return <main className="report-page mx-auto max-w-7xl p-4 sm:p-6 text-slate-800">
    <style>{`
      .report-page h2{font-weight:700;font-size:20px;margin:18px 0 10px}.report-page h3{font-weight:700;margin:12px 0 6px}
      .report-page button,.report-page select,.report-page input{border:1px solid #cbd5e1;border-radius:7px;padding:8px;background:white}
      .report-page button:disabled{opacity:.5}.report-page table{width:100%;border-collapse:collapse;font-size:13px}
      .report-page th,.report-page td{border:1px solid #dbe3ed;padding:8px;text-align:left;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere}
      .report-page th{background:#eef3f8}.report-page section{background:white;border:1px solid #dbe3ed;border-radius:12px;padding:16px;margin-top:16px}
      .report-fields>div{display:grid;grid-template-columns:140px 1fr;border-bottom:1px solid #e2e8f0;padding:8px;gap:10px}.report-fields dt{font-weight:600}.report-fields dd{white-space:pre-wrap;overflow-wrap:anywhere}
      .report-page .table-wrap{overflow-x:auto}.report-page .report-note{font-size:13px;color:#475569;margin:8px 0}
      @media print{.admin-shell:has(.report-page){display:block!important;min-height:0!important;padding:0!important}.admin-shell>main:has(.report-page){max-width:none!important;padding:0!important;width:100%!important}.report-page td button{border:0;padding:0;font:inherit}.report-page .result-list th:nth-child(2){width:34%}.admin-shell>header,.admin-shell>div:not(:has(.report-page)),.admin-shell>nav,.admin-shell>footer,.report-no-print{display:none!important}.report-page{max-width:none!important;padding:0!important}.report-page .table-wrap{overflow:visible}.report-page section{border:0;padding:4px}.report-page table{font-size:9pt;table-layout:fixed}.report-page thead{display:table-header-group}.report-page tr{break-inside:auto}.report-page h2,.report-page h3{break-after:avoid}.report-page .report-detail{break-before:page}.report-fields>div{break-inside:auto}body{background:white!important}@page{size:A4 landscape;margin:12mm}}
    `}</style>
    <h1 className="text-2xl font-bold">{mode === 'combined' ? '0차·1차 통합 결과·통계' : reportLabels[mode] + ' 결과·통계'}</h1>
    <div className="report-no-print flex flex-wrap gap-3 my-4">
      <label>평가 단계 <select value={mode} disabled={exporting} onChange={e => { setMode(e.target.value as ReportMode); setFilters({ ...emptyReportFilters }); }}>
        {Object.entries(reportLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      <label>평가 회차 <select value={selectedId} disabled={exporting} onChange={e => { setSessionId(e.target.value); setFilters({ ...emptyReportFilters }); }}>
        {available.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
      </select></label>
      <button disabled={busy || exporting} onClick={() => setRefresh(n => n + 1)}>결과 취합·새로고침</button>
      <button disabled={!report || busy || exporting} onClick={() => window.print()}>통계·상세 인쇄</button>
      <button disabled={!report || busy || exporting} onClick={() => download(false)}>엑셀 다운로드</button>
      <button disabled={!report || busy || exporting} onClick={() => download(true)}>전체 자료 ZIP 다운로드</button>
    </div>
    {error && <p role="alert" className="p-4 bg-red-50 text-red-800">{error}</p>}
    {busy && <p role="status">DB 결과를 취합하고 있습니다.</p>}
    {progress && <p role="status" className="report-no-print">{progress}</p>}
    {report && <>
      <p>{report.sessions.find(s => s.id === selectedId)?.title} · 조회 {new Date(report.generatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>
      <div className="report-no-print grid sm:grid-cols-3 lg:grid-cols-5 gap-3 my-4">{Object.entries(filterLabel).map(([key, label]) => <label key={key} className="text-sm">{label}
        {key === 'search' ? <input className="w-full" value={filters.search} disabled={exporting} onChange={e => setFilters({ ...filters, search: e.target.value })} /> :
          <select className="w-full" value={filters[key]} disabled={exporting} onChange={e => setFilters({ ...filters, [key]: e.target.value })}><option value="">전체</option>{choices[key]?.map(v => <option key={v} value={v}>{v}</option>)}</select>}
      </label>)}</div>
      <p className="report-note">조회 조건 {Object.entries(filters).filter(([, value]) => value).map(([key, value]) => `${filterLabel[key]} ${value}`).join(' / ') || '전체'} · 제안 {rows.length}건 / 회차 조회 {all.length}건</p>
      <p className="report-note">결과 취합은 DB 기록의 읽기 전용 집계입니다. 임시저장은 평균에서 제외하며 미제출은 0점으로 계산하지 않습니다.</p>
      <section><h2>평가 진행 현황</h2><div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries({ '조회 제안': summary.proposals, '0차 완료 제안': summary.stage0Complete, '0차 채택': summary.accepted, '0차 불채택': summary.rejected,
          '확정 연결 제안': summary.linked, '1차 대상(미연결 포함)': summary.targets, '별도 미연결 자료': summary.unlinked, '1차 전원 제출': summary.complete, '1차 일부 제출': summary.partial, '1차 미제출': summary.unsubmitted,
          '승인 이력 있는 제안': summary.transferred, '이관 승인 횟수': summary.moves, '연결 확인 필요': summary.issues }).map(([label, value]) => <div className="bg-slate-50 rounded p-3" key={label}>{label}<strong className="block text-xl">{value}</strong></div>)}
      </div><p className="report-note">1차 심사위원 제출 {summary.submitted}/{summary.required}건 ({summary.required ? (summary.submitted / summary.required * 100).toFixed(1) : '0'}%) · 제안 수와 평가 건수를 구분합니다.</p>
      <p className="report-note">0차 제출률 {summary.stage0Complete}/{summary.proposals}건 ({summary.proposals ? (summary.stage0Complete / summary.proposals * 100).toFixed(1) : '0'}%) · 채택률 {summary.accepted}/{summary.proposals}건 ({summary.proposals ? (summary.accepted / summary.proposals * 100).toFixed(1) : '0'}%)</p>
      <h3>기존 최종 판정 현황</h3>{Array.from(new Set(rows.flatMap(r => r.stage1.map(p => p.stage1_decision || '기록 없음')))).map(decision => <div key={decision}>{decision} · {rows.filter(r => r.stage1.some(p => (p.stage1_decision || '기록 없음') === decision)).length}건</div>)}
      <h3>1차 평균점수 분포</h3>{[0,20,40,60,80].map(low => { const count = rows.filter(r => r.average !== null && r.average >= low && (low === 80 ? r.average <= 100 : r.average < low + 20)).length; return <div key={low}>{low}~{low === 80 ? 100 : low + 19.99}점 · {count}건 <progress value={count} max={Math.max(1, summary.targets)} className="w-40" /></div>; })}
      </section>
      <section><h2>부서별 결과</h2><div className="table-wrap"><table><thead><tr><th>현재 실행부서</th><th>접수 소속 제안</th><th>배정 제안</th><th>0차 완료</th><th>채택 / 불채택</th><th>1차 연계</th><th>부서평가 기록 수</th></tr></thead><tbody>{departments.map(d => <tr key={d.name}><td>{d.name}</td><td>{d.proposed}</td><td>{d.proposals}</td><td>{d.stage0Complete}</td><td>{d.accepted} / {d.rejected}</td><td>{d.linked}</td><td>{d.departmentEvaluations}</td></tr>)}</tbody></table></div></section>
      {mode !== 'stage0' && <section><h2>심사위원별 제출</h2><table><thead><tr><th>심사위원</th><th>대상 제안</th><th>최종 제출</th><th>미제출</th><th>임시저장</th></tr></thead><tbody>{judges.map(j => <tr key={j.name}><td>{j.name}</td><td>{j.required}</td><td>{j.submitted}</td><td>{Math.max(0, j.required - j.submitted)}</td><td>{j.draft}</td></tr>)}</tbody></table></section>}
      <section><h2>제안별 결과</h2><div className="table-wrap"><table className="result-list"><thead><tr><th>관리번호</th><th>제안 제목</th><th>현재 부서</th><th>0차 결과</th><th>1차 제출</th><th>평균 / 순위</th><th>상태·기존 판정</th></tr></thead><tbody>{rows.map((r, i) => <tr key={r.proposal.id + i}>
        <td>{r.proposal.board_no || r.proposal.seq_no}</td><td><button className="text-blue-700" onClick={() => setOpenId(r.proposal.id)}>{r.proposal.title}</button></td><td>{r.proposal.assigned_department}</td><td>{r.stage0Result}</td>
        <td>{finalScores(r).length}/{r.judges.length}{filters.judge && <div>{filters.judge} {display(r.scores.find(s => s.judge_name === filters.judge && !s.is_draft)?.total_score)}</div>}</td>
        <td>{r.average === null ? '미산출' : r.average.toFixed(2)} / {r.rank ?? '미부여'}</td><td>{r.state}<br />{r.linkIssue && <strong className="text-red-700">{r.linkIssue}<br /></strong>}{r.stage1.map(p => p.stage1_decision || '기록 없음').join(', ')}</td>
      </tr>)}</tbody></table></div>{!rows.length && <p>조회 조건에 해당하는 자료가 없습니다.</p>}</section>
      {selected && <section className="report-detail"><h2>{selected.proposal.title}</h2>
        <button className="report-no-print" onClick={() => setOpenId('')}>상세 닫기</button>
        <h3>기본정보·원문</h3>{fields({ 관리번호: selected.proposal.board_no || selected.proposal.seq_no, 원본ID: selected.proposal.id,
          접수일: selected.proposal.submitted_at, 제안자: selected.proposal.proposer_name, 직급: selected.proposal.proposer_rank,
          소속: selected.proposal.proposer_department || selected.proposal.proposer_raw_dept, 최초배정부서: initialDepartment(selected),
          현재담당부서: selected.proposal.assigned_department, 추진배경: selected.proposal.background, 제안내용: selected.proposal.content,
          기대효과: selected.proposal.expected_effect, 추가시트: selected.proposal.extra_sheets, 첨부안내: selected.proposal.attachment_note })}
        <h3>부서 이동 이력</h3>{selected.transfers.length ? selected.transfers.map(t => <div key={t.id}>{fields({ 이력ID: t.id, 처리구분: t.action, 일시: t.at, 처리자: t.actor, 이동전부서: t.from_department, 희망부서: t.target_department, 요청사유: t.request_reason, 처리의견: t.comment })}</div>) : <p>기록 없음</p>}
        <h3>0차 부서의견·문항별 응답</h3>{selected.evaluations.length ? selected.evaluations.map(e => <div key={e.id}>{fields({ 평가부서: e.department_name, 평가자: e.evaluator_name, 수용여부: e.answers.result, 부서의견: e.answers.opinion, 전체문항응답: e.answers, 최종제출: e.is_submitted, 제출시각: e.submitted_at, 수정시각: e.updated_at })}</div>) : <p>{selected.proposal.stage0_opinion || '기록 없음'}</p>}
        <h3>1차 심사위원별 평가</h3><div className="table-wrap"><table><thead><tr><th>위원·소속·직위</th><th>창의성</th><th>실현성</th><th>효과성</th><th>전파성</th><th>총점</th><th>의견·제출상태</th></tr></thead><tbody>{selected.scores.filter(s => !filters.judge || s.judge_name === filters.judge).map(s => <tr key={s.id}><td>{s.judge_name}<br />{s.judge_dept}<br />{s.judge_title}</td><td>{s.creativity}</td><td>{s.feasibility}</td><td>{s.effectiveness}</td><td>{s.dissemination}</td><td>{s.total_score}</td><td>{display(s.opinion)}<br />{s.is_draft ? '임시저장' : '최종제출'}<br />{display(s.submitted_at)}</td></tr>)}</tbody></table></div>
        <p>미제출 {selected.missingJudges.join(', ') || '없음'}</p>
        <p>항목별 평균 · 창의성 {scoreAverage(selected, 'creativity')} / 실현성 {scoreAverage(selected, 'feasibility')} / 효과성 {scoreAverage(selected, 'effectiveness')} / 전파성 {scoreAverage(selected, 'dissemination')}</p>
        <h3>종합 결과</h3>{fields({ 상태: selected.state, 평균: selected.average, 순위: selected.rank, 연결근거: selected.linkMethod, 연결확인: selected.linkIssue || '확인', '1차자료ID': selected.stage1.map(p => p.id).join(', '), '기존최종판정': selected.stage1.map(p => p.stage1_decision || '기록 없음').join(', '), '마감상태': selected.stage1.map(p => p.stage1_is_closed ? '마감' : '미마감').join(', ') })}
        <h3>첨부파일</h3>{[selected.proposal, ...selected.stage1.filter(p => p.id !== selected.proposal.id)].flatMap(p => p.attachments || []).map(a => <div key={a.id}><a className="text-blue-700" href={`/api/proposals/attachments?id=${encodeURIComponent(a.id)}&download=1`}>{a.name}</a></div>)}
      </section>}
      <section><h2>집계 기준·자료 범위</h2>{report.warnings.map(text => <p className="report-note" key={text}>{text}</p>)}</section>
    </>}
  </main>;
}
