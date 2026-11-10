import { NextResponse } from 'next/server';
import { accessDenied, getAccess } from '@/lib/accessSession';
import { getProposalsAsync, getEvaluationsAsync, getSessionsAsync } from '@/lib/store';
import { getCommitteeScoresAsync } from '@/lib/committeeScores';
import { getProposalTransfers } from '@/lib/proposalTransfers';
import { TransferHistoryEntry, DEFAULT_STAGE1_JUDGES, CommitteeJudge, Proposal } from '@/lib/types';
import * as XLSX from 'xlsx';

const ACTION_LABELS: Record<TransferHistoryEntry['action'], string> = {
  REQUEST: '이관 신청',
  APPROVE: '승인',
  REJECT: '반려',
  CANCEL: '신청 취소',
  NOTE: '검토 의견 추가',
  LEGACY: '기존 처리',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: '심사 대기(요청중)',
  APPROVED: '이관 완료(승인)',
  REJECTED: '이관 반려',
  CANCELLED: '신청 취소',
};

function formatKST(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

function formatHistoryEntry(h: TransferHistoryEntry, index: number): string {
  const actionLabel = ACTION_LABELS[h.action] || h.action;
  const timeStr = formatKST(h.at);
  const deptMove =
    h.from_department || h.target_department
      ? `${h.from_department || '-'} → ${h.target_department || '-'}`
      : '';
  const parts = [
    `${index + 1}. [${timeStr}] ${actionLabel} (${h.actor || '-'})`,
    deptMove ? `부서: ${deptMove}` : '',
    h.request_reason ? `신청사유: ${h.request_reason}` : '',
    h.comment ? `검토의견: ${h.comment}` : '',
  ].filter(Boolean);
  return parts.join(' | ');
}

export async function GET(req: Request) {
  const access = getAccess();
  if (access?.role !== 'admin') return accessDenied(access);

  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id') || undefined;
    if (!sessionId) return NextResponse.json({ error: '평가 회차를 선택해 주세요.' }, { status: 400 });

    const [sessions, rawProposals, evaluations, transfers] = await Promise.all([
      getSessionsAsync(),
      getProposalsAsync(sessionId),
      getEvaluationsAsync(sessionId),
      getProposalTransfers(),
    ]);

    const currentSession = sessionId ? sessions.find(s => s.id === sessionId) : undefined;
    if (!currentSession) return NextResponse.json({ error: '평가 회차를 찾을 수 없습니다.' }, { status: 404 });
    const isStage1 =
      currentSession?.stage === 'STAGE_1' ||
      (sessionId && String(sessionId).startsWith('session-stage1-')) ||
      searchParams.get('stage') === 'STAGE_1';

    // 1차 심사 회차인 경우 출처 0차 제안의 부서이동 이력도 매핑할 수 있도록 준비
    let sourceTransferByBoardNo = new Map<string, Partial<Proposal>>();
    if (isStage1 && currentSession?.source_session_id) {
      const sourceProposals = await getProposalsAsync(currentSession.source_session_id);
      sourceProposals.forEach(sp => {
        const t = transfers[sp.id];
        if (t && sp.board_no) {
          sourceTransferByBoardNo.set(String(sp.board_no).trim(), t);
        }
      });
    }

    const proposals = rawProposals.map(p => {
      const directTransfer = transfers[p.id];
      const fallbackTransfer = p.board_no ? sourceTransferByBoardNo.get(String(p.board_no).trim()) : undefined;
      return {
        ...p,
        ...(fallbackTransfer || {}),
        ...(directTransfer || {}),
      };
    });

    const transferHistoryRows: Record<string, string | number>[] = [];

    // =========================================================================
    // [CASE A] 1차 제안심사 (STAGE_1) 종합 결과 엑셀 다운로드
    // =========================================================================
    if (isStage1) {
      const committeeScores = await getCommitteeScoresAsync(sessionId);
      const hasLegacyJudges = currentSession?.judges?.some(j => j.name === '박민호');
      const judges: CommitteeJudge[] =
        currentSession?.judges && currentSession.judges.length > 0 && !hasLegacyJudges
          ? currentSession.judges
          : DEFAULT_STAGE1_JUDGES;

      const judgeDetailRows: Record<string, string | number>[] = [];

      const stage1ExportRows = proposals.map(p => {
        const propScores = committeeScores.filter(s => s.proposal_id === p.id);
        const scoredCount = propScores.length;

        const sumC = propScores.reduce((acc, s) => acc + Number(s.creativity || 0), 0);
        const sumF = propScores.reduce((acc, s) => acc + Number(s.feasibility || 0), 0);
        const sumE = propScores.reduce((acc, s) => acc + Number(s.effectiveness || 0), 0);
        const sumD = propScores.reduce((acc, s) => acc + Number(s.dissemination || 0), 0);
        const sumTotal = propScores.reduce((acc, s) => acc + Number(s.total_score || 0), 0);

        const avgC = scoredCount > 0 ? Number((sumC / scoredCount).toFixed(1)) : '';
        const avgF = scoredCount > 0 ? Number((sumF / scoredCount).toFixed(1)) : '';
        const avgE = scoredCount > 0 ? Number((sumE / scoredCount).toFixed(1)) : '';
        const avgD = scoredCount > 0 ? Number((sumD / scoredCount).toFixed(1)) : '';
        const avgTotal =
          scoredCount > 0
            ? Number((sumTotal / scoredCount).toFixed(1))
            : p.stage1_avg_score !== undefined
              ? p.stage1_avg_score
              : '';

        const history: TransferHistoryEntry[] = Array.isArray(p.transfer_history) ? p.transfer_history : [];
        const transferStatusLabel = p.transfer_requested
          ? '심사 대기(요청중)'
          : p.transfer_status
            ? STATUS_LABELS[p.transfer_status] || p.transfer_status
            : '';
        const initialDepartment =
          history.find(h => h.from_department && h.from_department !== '기록 없음')?.from_department || '';
        const historySummary = history.map((h, idx) => formatHistoryEntry(h, idx)).join('\n');

        history.forEach((h, idx) => {
          transferHistoryRows.push({
            '연번': p.seq_no,
            '게시판번호': p.board_no,
            '제안제목': p.title,
            '제안자': p.proposer_name,
            '현재_실행(평가)_본부/부문': p.assigned_division,
            '현재_실행(평가)_처/실/단': p.assigned_office,
            '현재_실행(평가)_부': p.assigned_department,
            '현재_이관상태': transferStatusLabel,
            '이력순번': idx + 1,
            '처리구분': ACTION_LABELS[h.action] || h.action,
            '처리주체': h.actor || '',
            '처리일시': formatKST(h.at),
            '이전부서': h.from_department || '',
            '이관대상부서': h.target_department || '',
            '신청사유': h.request_reason || '',
            '관리자_검토의견': h.comment || '',
          });
        });

        // 제안별 기본 + 종합 컬럼
        const row: Record<string, string | number> = {
          '연번': p.seq_no,
          '게시판번호': p.board_no,
          '제안자': p.proposer_name,
          '직급': p.proposer_rank,
          '제안자_본부/부문': p.proposer_division,
          '제안자_처/실/단': p.proposer_office,
          '제안자_부': p.proposer_department,
          '제안구분': p.proposal_type,
          '분야': p.category,
          '실행(평가)_본부/부문': p.assigned_division,
          '실행(평가)_처/실/단': p.assigned_office,
          '실행(평가)_부': p.assigned_department,
          '접수일자': p.submitted_at,
          '제안제목': p.title,
          '0차_부서평가_검토결과': p.stage0_result || 'Yes',
          '0차_부서평가_검토의견': p.stage0_opinion || '',
          '1차심사_마감여부': p.stage1_is_closed ? 'Y (마감완료)' : 'N (심사중)',
          '1차심사_최종판정': p.stage1_decision || (p.stage1_is_closed ? '채택' : '심사대기'),
          '1차심사_심사일자': p.stage1_review_date || '',
          '기여율(%)': p.contribution_rate ?? 100,
          '채점참여_위원수': `${scoredCount}/${judges.length}명`,
          '평균_창의성(30)': avgC,
          '평균_실현성(30)': avgF,
          '평균_효과성(30)': avgE,
          '평균_전파성(10)': avgD,
          '1차심사_평균총점(100)': avgTotal,
        };

        // 12명 심사위원 각각의 점수 및 의견 기록 + 상세 시트 행 추가
        judges.forEach(j => {
          const js = propScores.find(s => s.judge_name === j.name);
          row[`[${j.dept}] ${j.name}_총점`] = js ? js.total_score : '';
          row[`[${j.dept}] ${j.name}_의견`] = js?.opinion && js.opinion !== '-' ? js.opinion : '';

          judgeDetailRows.push({
            '연번': p.seq_no,
            '게시판번호': p.board_no,
            '제안제목': p.title,
            '실행(평가)_부': p.assigned_department,
            '심사위원_소속': j.dept,
            '심사위원_직위': j.title,
            '심사위원_성명': j.name,
            '채점상태': js ? '채점완료' : '미채점',
            '창의성(30)': js ? js.creativity : '',
            '실현성(30)': js ? js.feasibility : '',
            '효과성(30)': js ? js.effectiveness : '',
            '전파성(10)': js ? js.dissemination : '',
            '합계총점(100)': js ? js.total_score : '',
            '심사위원_검토의견': js?.opinion || '',
            '제출일시': js?.submitted_at ? formatKST(js.submitted_at) : '',
          });
        });

        row['최초_배정부서(이관전)'] = initialDepartment;
        row['부서이동_이력건수'] = history.length > 0 ? history.length : '';
        row['부서이동_상세이력'] = historySummary;

        return row;
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(stage1ExportRows);
      ws['!cols'] = [
        { wch: 6 },  { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 15 }, { wch: 18 }, { wch: 16 }, { wch: 10 },
        { wch: 14 }, { wch: 15 }, { wch: 18 }, { wch: 16 },
        { wch: 20 }, { wch: 45 }, { wch: 16 }, { wch: 40 },
        { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 10 },
        { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
        { wch: 14 }, { wch: 18 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, '제안심사(1차)_최종결과');

      const wsJudges = XLSX.utils.json_to_sheet(judgeDetailRows);
      wsJudges['!cols'] = [
        { wch: 6 },  { wch: 10 }, { wch: 42 }, { wch: 16 },
        { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 14 }, { wch: 45 }, { wch: 22 },
      ];
      XLSX.utils.book_append_sheet(wb, wsJudges, '1차심사위원_상세채점내역');

      const historyHeaders = [
        '연번', '게시판번호', '제안제목', '제안자',
        '현재_실행(평가)_본부/부문', '현재_실행(평가)_처/실/단', '현재_실행(평가)_부',
        '현재_이관상태', '이력순번', '처리구분', '처리주체', '처리일시',
        '이전부서', '이관대상부서', '신청사유', '관리자_검토의견',
      ];
      const wsHistory = transferHistoryRows.length > 0
        ? XLSX.utils.json_to_sheet(transferHistoryRows)
        : XLSX.utils.aoa_to_sheet([historyHeaders]);

      wsHistory['!cols'] = [
        { wch: 6 },  { wch: 10 }, { wch: 40 }, { wch: 10 },
        { wch: 15 }, { wch: 18 }, { wch: 16 }, { wch: 18 },
        { wch: 8 },  { wch: 14 }, { wch: 16 }, { wch: 22 },
        { wch: 18 }, { wch: 18 }, { wch: 35 }, { wch: 35 },
      ];
      XLSX.utils.book_append_sheet(wb, wsHistory, '부서이동_상세이력');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Cache-Control': 'private, no-store',
          'Content-Disposition': `attachment; filename="2026_GCUC_Proposal_Stage1_Results.xlsx"`,
        },
      });
    }

    // =========================================================================
    // [CASE B] 0차 부서평가 (STAGE_0) 종합 결과 엑셀 다운로드
    // =========================================================================
    const evalMap = new Map(evaluations.map(e => [e.proposal_id, e]));

    const exportRows = proposals.map(p => {
      const ev = evalMap.get(p.id);
      const result = ev?.answers?.result || (ev?.is_submitted ? '미기재' : '미평가');
      const opinion = ev?.answers?.opinion || '';
      const submittedAt = ev?.submitted_at ? formatKST(ev.submitted_at) : '';

      const history: TransferHistoryEntry[] = Array.isArray(p.transfer_history) ? p.transfer_history : [];
      const transferStatusLabel = p.transfer_requested
        ? '심사 대기(요청중)'
        : p.transfer_status
          ? STATUS_LABELS[p.transfer_status] || p.transfer_status
          : '';
      const initialDepartment =
        history.find(h => h.from_department && h.from_department !== '기록 없음')?.from_department || '';
      const historySummary = history.map((h, idx) => formatHistoryEntry(h, idx)).join('\n');

      history.forEach((h, idx) => {
        transferHistoryRows.push({
          '연번': p.seq_no,
          '게시판번호': p.board_no,
          '제안제목': p.title,
          '제안자': p.proposer_name,
          '현재_실행(평가)_본부/부문': p.assigned_division,
          '현재_실행(평가)_처/실/단': p.assigned_office,
          '현재_실행(평가)_부': p.assigned_department,
          '현재_이관상태': transferStatusLabel,
          '이력순번': idx + 1,
          '처리구분': ACTION_LABELS[h.action] || h.action,
          '처리주체': h.actor || '',
          '처리일시': formatKST(h.at),
          '이전부서': h.from_department || '',
          '이관대상부서': h.target_department || '',
          '신청사유': h.request_reason || '',
          '관리자_검토의견': h.comment || '',
        });
      });

      return {
        '연번': p.seq_no,
        '게시판번호': p.board_no,
        '제안자': p.proposer_name,
        '직급': p.proposer_rank,
        '제안자_본부/부문': p.proposer_division,
        '제안자_처/실/단': p.proposer_office,
        '제안자_부': p.proposer_department,
        '제안구분': p.proposal_type,
        '분야': p.category,
        '실행(평가)_본부/부문': p.assigned_division,
        '실행(평가)_처/실/단': p.assigned_office,
        '실행(평가)_부': p.assigned_department,
        '접수일자': p.submitted_at,
        '제안제목': p.title,
        '부서평가(0차)_상태': p.status,
        '부서평가(0차)_검토결과(Result)': result,
        '부서평가(0차)_검토의견(Opinion)': opinion,
        '부서평가(0차)_제출일시': submittedAt,
        '실행부서_변경요청여부': transferStatusLabel,
        '최초_배정부서(이관전)': initialDepartment,
        '희망_이관부서': p.transfer_target_dept || '',
        '부서변경_요청사유': p.transfer_reason || '',
        '부서이동_이력건수': history.length > 0 ? history.length : '',
        '부서이동_상세이력': historySummary,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);

    ws['!cols'] = [
      { wch: 6 },  { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 15 }, { wch: 18 }, { wch: 16 }, { wch: 10 },
      { wch: 14 }, { wch: 15 }, { wch: 18 }, { wch: 16 },
      { wch: 20 }, { wch: 45 }, { wch: 18 }, { wch: 24 },
      { wch: 45 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
      { wch: 18 }, { wch: 35 }, { wch: 14 }, { wch: 70 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, '부서평가(0차)_최종결과');

    const historyHeaders = [
      '연번', '게시판번호', '제안제목', '제안자',
      '현재_실행(평가)_본부/부문', '현재_실행(평가)_처/실/단', '현재_실행(평가)_부',
      '현재_이관상태', '이력순번', '처리구분', '처리주체', '처리일시',
      '이전부서', '이관대상부서', '신청사유', '관리자_검토의견',
    ];
    const wsHistory = transferHistoryRows.length > 0
      ? XLSX.utils.json_to_sheet(transferHistoryRows)
      : XLSX.utils.aoa_to_sheet([historyHeaders]);

    wsHistory['!cols'] = [
      { wch: 6 },  { wch: 10 }, { wch: 40 }, { wch: 10 },
      { wch: 15 }, { wch: 18 }, { wch: 16 }, { wch: 18 },
      { wch: 8 },  { wch: 14 }, { wch: 16 }, { wch: 22 },
      { wch: 18 }, { wch: 18 }, { wch: 35 }, { wch: 35 },
    ];

    XLSX.utils.book_append_sheet(wb, wsHistory, '부서이동_상세이력');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="2026_GCUC_Proposal_Stage0_Results.xlsx"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
