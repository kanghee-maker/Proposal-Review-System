import { wideResultRows } from './wideResultRows';
import * as XLSX from 'xlsx';
import { departmentStatistics, finalScores, initialDepartment, judgeStatistics, reportLabels, ResultReport, ResultRow, resultSummary } from './resultReports';

const missing = '기록 없음';
function identity(row: ResultRow) {
  return { 관리번호: row.proposal.board_no || row.proposal.seq_no, 원본ID: row.proposal.id,
    원본회차ID: row.proposal.session_id, 제안제목: row.proposal.title,
    '1차ID': row.stage1.map(p => p.id).join('\n'), '1차회차ID': row.stage1.map(p => p.session_id).join('\n') };
}
function expandCells(rows: Record<string, any>[]) {
  return rows.flatMap(row => {
    const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'object' && value !== null ? JSON.stringify(value) : value ?? missing]));
    const characters = Object.fromEntries(Object.entries(normalized).map(([key, value]) => [key, typeof value === 'string' ? Array.from(value) : null]));
    const parts = Math.max(1, ...Object.values(characters).map(chars => chars ? Math.ceil(chars.length / 15000) : 1));
    return Array.from({ length: parts }, (_, index) => Object.fromEntries([
      ...Object.entries(normalized).map(([key, value]) => [key, characters[key]?.length > 15000 ? characters[key].slice(index * 15000, (index + 1) * 15000).join('') : value]),
      ['분할순서', `${index + 1}/${parts}`]
    ]));
  });
}
export function buildResultWorkbook(report: ResultReport, rows: ResultRow[], conditions: string) {
  const workbook = XLSX.utils.book_new();
  function sheet(name: string, records: Record<string, any>[]) {
    const content = expandCells(records.length ? records : [{ 안내: '해당 자료 없음' }]);
    const worksheet = XLSX.utils.json_to_sheet(content);
    worksheet['!cols'] = Object.keys(content[0]).map(() => ({ wch: 26 }));
    worksheet['!autofilter'] = { ref: worksheet['!ref'] || 'A1' };
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  }
  sheet('제안별 종합 결과', wideResultRows(report, rows));
  const summary = resultSummary(rows);
  sheet('통합 요약', [
    { 항목: '평가 단계', 값: reportLabels[report.mode] },
    { 항목: '회차', 값: report.sessions.find(s => s.id === report.sessionId)?.title },
    { 항목: '조회 조건', 값: conditions }, { 항목: '조회 시각', 값: report.generatedAt },
    ...Object.entries(summary).map(([key, 값]) => ({ 항목: ({
      proposals: '원본 제안 수', stage0Complete: '0차 완료 제안 수', accepted: '0차 채택', rejected: '0차 불채택',
      stage1Disqualified: '1차 과락 (50점 미만 평가위원 3명 이상)', stage1Rejected: '1차 불채택 (과락 제외)',
      linked: '원본 확정 연결', targets: '1차 대상', unlinked: '별도 미연결 자료', complete: '1차 전원 제출',
      partial: '1차 일부 제출', unsubmitted: '1차 미제출', transferred: '이관 승인 이력 있는 제안', moves: '이관 승인 횟수',
      required: '심사위원 평가 대상 건수', submitted: '심사위원 최종 제출 건수', issues: '연결 확인 필요'
    })[key] || key, 값 })),
    ...report.warnings.map(값 => ({ 항목: '집계 기준', 값 }))
  ]);
  sheet('제안 원문', rows.flatMap(r => [r.proposal, ...r.stage1.filter(p => p.id !== r.proposal.id)].map(p => ({ ...identity(r), 자료ID: p.id,
    제안자: p.proposer_name, 직급: p.proposer_rank, 소속: p.proposer_department || p.proposer_raw_dept,
    접수일: p.submitted_at, 추진배경: p.background, 제안내용: p.content, 기대효과: p.expected_effect,
    첨부안내: p.attachment_note, 추가시트: p.extra_sheets, 전체등록정보: p
  }))));
  sheet('0차 부서평가 상세', rows.flatMap(r => r.evaluations.length ? r.evaluations.map(e => ({ ...identity(r), 평가ID: e.id,
    평가부서: e.department_name, 평가자: e.evaluator_name, 수용여부: e.answers?.result,
    부서의견: e.answers?.opinion, 전체문항응답: e.answers, 최종제출: e.is_submitted, 제출시각: e.submitted_at, 수정시각: e.updated_at
  })) : [{ ...identity(r), 평가ID: missing, 부서의견: r.proposal.stage0_opinion || missing }]));
  sheet('부서 이동 이력', rows.flatMap(r => r.transfers.map(t => ({ ...identity(r), 이력ID: t.id,
    처리구분: t.action, 실제배정변경기록: t.action === 'APPROVE' ? '승인' : '변경 확정 기록 아님', 일시: t.at,
    처리자: t.actor, 이동전부서: t.from_department, 희망부서: t.target_department,
    요청사유: t.request_reason, 처리의견: t.comment }))));
  sheet('1차 심사 상세', rows.flatMap(r => r.scores.map(s => ({ ...identity(r), 점수ID: s.id, 평가대상ID: s.proposal_id,
    심사위원: s.judge_name, 소속: s.judge_dept, 직위: s.judge_title, 창의성: s.creativity,
    실현성: s.feasibility, 효과성: s.effectiveness, 전파성: s.dissemination, 총점: s.total_score,
    심사의견: s.opinion, 제출상태: s.is_draft ? '임시저장' : '최종제출', 제출시각: s.submitted_at }))));
  sheet('부서별 통계', departmentStatistics(rows).map(d => ({ 부서: d.name, 접수소속제안: d.proposed, 현재배정제안: d.proposals,
    부서평가기록수: d.departmentEvaluations, '0차완료': d.stage0Complete, '0차채택': d.accepted, '0차불채택': d.rejected, '1차연계': d.linked })));
  sheet('심사위원별 제출 현황', judgeStatistics(rows).map(j => ({ 심사위원: j.name, 대상제안: j.required, 최종제출: j.submitted, 미제출: Math.max(0, j.required - j.submitted), 임시저장: j.draft })));
  sheet('첨부파일 목록', rows.flatMap(r => [r.proposal, ...r.stage1.filter(p => p.id !== r.proposal.id)].flatMap(p => (p.attachments || []).map(a => ({
    ...identity(r), 자료ID: p.id, 첨부ID: a.id, 파일명: a.name, 크기: a.size, 업로드일: a.uploaded_at,
    링크: `/api/proposals/attachments?id=${encodeURIComponent(a.id)}&download=1`, 저장경로: a.static_url || 'DB 첨부'
  })))));
  sheet('미완료·연결 확인 목록', rows.filter(r => !r.stage0Complete || r.linkIssue || (report.mode !== 'stage0' && (r.stage1.length ? r.state !== '1차 심사 완료' : r.stage0Result === 'Yes'))).map(r => ({
    ...identity(r), 상태: r.state, 미제출심사위원: r.missingJudges.join('\n'), 연결문제: r.linkIssue || '없음',
    '0차평가완료': r.stage0Complete, '0차결과': r.stage0Result
  })));
  return new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
}
