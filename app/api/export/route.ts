import { NextResponse } from 'next/server';
import { getProposalsAsync, getEvaluationsAsync } from '@/lib/store';
import { getProposalTransfers } from '@/lib/proposalTransfers';
import { TransferHistoryEntry } from '@/lib/types';
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
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id') || undefined;

    const [rawProposals, evaluations, transfers] = await Promise.all([
      getProposalsAsync(sessionId),
      getEvaluationsAsync(sessionId),
      getProposalTransfers(),
    ]);
    const proposals = rawProposals.map(p => ({ ...p, ...transfers[p.id] }));
    const evalMap = new Map(evaluations.map(e => [e.proposal_id, e]));

    const transferHistoryRows: Record<string, string | number>[] = [];

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
        'Content-Disposition': `attachment; filename="2026_GCUC_Proposal_Stage0_Results.xlsx"`
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  };
}
