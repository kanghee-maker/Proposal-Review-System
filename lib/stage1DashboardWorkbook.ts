import * as XLSX from 'xlsx';
import { ResultReport } from './resultReports';
import { DashboardEntry, dashboardSummary, dashboardGroups } from './stage1Dashboard';
import { criteriaStatistics, detailedJudgeStatistics, taskIndex, taskNames, taskNotice, taskStatistics, taskSummaryView } from './stage1Analytics';
import { buildResultWorkbook } from './resultReportWorkbook';
export function buildDashboardWorkbook(report: ResultReport, entries: DashboardEntry[], conditions: string) {
  const wb = XLSX.read(buildResultWorkbook(report, entries.map(e => e.row), conditions), { type: 'array' });
  const add = (name: string, rows: Record<string, any>[]) => {
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 안내: '조회 조건에 해당하는 자료 없음' }]);
    sheet['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 24 }));
    sheet['!autofilter'] = { ref: sheet['!ref'] || 'A1' }; XLSX.utils.book_append_sheet(wb, sheet, name);
  };
  const stats = dashboardSummary(entries), taskView = taskSummaryView(entries);
  add('1차 시각화 통계 기준', [{ 항목: '조회 회차', 값: report.sessions.find(s => s.id === report.sessionId)?.title || report.sessionId },
    { 항목: '회차 ID', 값: report.sessionId }, { 항목: '조회 조건', 값: conditions }, { 항목: '심사대상', 값: stats.total },
    { 항목: '전원제출 완료', 값: stats.completed }, { 항목: '위원 최종제출', 값: stats.submitted }, { 항목: '위원 평가 대상', 값: stats.required },
    ...stats.decisions.map(d => ({ 항목: d.name, 값: d.count })), { 항목: '과제 분류 기준', 값: taskView.notice }]);
  for (const [name, key] of [['처실단별 1차 통계', 'proposer_office'], ['직급별 1차 통계', 'proposer_rank'], ['등록분야별 1차 통계', 'category']] as const) {
    add(name, dashboardGroups(entries, key).map(g => ({ 구분: g.name, 심사대상: g.total, 완료: g.completed, 평균: g.average ?? '', ...Object.fromEntries(g.decisions.map(d => [d.name, d.count])) })));
  }
  add('심사위원별 점수 통계', detailedJudgeStatistics(entries).map(j => ({ 심사위원: j.name, 소속: j.dept, 배정: j.required, 제출: j.submitted, 미제출: Math.max(0, j.required - j.submitted), 임시저장: j.draft,
    평균: j.average ?? '', 최저: j.min ?? '', 최고: j.max ?? '', '50점미만 건수': j.under50 })));
  add(taskView.legacy ? '5개과제별 통계 검토용' : '5개과제별 통계', taskView.groups.length ? taskView.groups.map(g => ({ 과제: g.name, 분류기준: taskView.notice, 심사대상: g.total, 완료: g.completed, 평균: g.average ?? '미산출', ...Object.fromEntries(g.decisions.map(d => [d.name, d.count])) })) : [{ 안내: taskView.notice }]);
  add('과제별 분류 근거 목록', entries.map(e => ({ 원본ID: e.row.proposal.id, 게시판번호: e.row.proposal.board_no, 제안명: e.row.proposal.title,
    제안구분: e.row.proposal.proposal_type, 원본분야: e.row.proposal.category, '검토용 재분류 과제': taskView.legacy ? (taskIndex(e) === undefined ? '검토용 분류 없음' : taskNames[taskIndex(e)!]) : '개별 과제 분류 미확정(전체 합계만 지정)', 분류기준: taskView.notice })));
  add('평균점수 분포', stats.bins.map(b => ({ 구간: b.name, 건수: b.count, 분모: stats.completed, 기준: '전원 최종제출 제안의 반올림 전 평균총점' })));
  add('평가항목별 평균', criteriaStatistics(entries).map(c => ({ 평가항목: c.name, 만점: c.max, 평균: c.average ?? '', 최종제출평가수: c.count })));
  const ranked = entries.filter(e => e.complete).sort((a, b) => b.average! - a.average!);
  add('고득점 순위', ranked.map(e => ({ 순위: ranked.findIndex(x => x.average === e.average) + 1, 게시판번호: e.row.proposal.board_no, 제안명: e.row.proposal.title,
    제안자소속: e.row.proposal.proposer_office, 평균총점: e.average, 판정: e.decision, 기준: '현재 조회 조건 내 전원 최종제출 제안의 반올림 전 평균 공동순위' })));
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}
