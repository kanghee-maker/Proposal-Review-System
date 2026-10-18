import { NextResponse } from 'next/server';
import { getProposalsAsync, getEvaluationsAsync } from '@/lib/store';
import * as XLSX from 'xlsx';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id') || undefined;

    const proposals = await getProposalsAsync(sessionId);
    const evaluations = await getEvaluationsAsync(sessionId);
    const evalMap = new Map(evaluations.map(e => [e.proposal_id, e]));

    const exportRows = proposals.map(p => {
      const ev = evalMap.get(p.id);
      const result = ev?.answers?.result || (ev?.is_submitted ? '미기재' : '미평가');
      const opinion = ev?.answers?.opinion || '';
      const submittedAt = ev?.submitted_at ? new Date(ev.submitted_at).toLocaleString('ko-KR') : '';

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
        '0차_부서평가상태': p.status,
        '0차_부서검토결과(Result)': result,
        '0차_부서검토의견(Opinion)': opinion,
        '0차_평가제출일시': submittedAt
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);

    ws['!cols'] = [
      { wch: 6 },  { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 15 }, { wch: 18 }, { wch: 16 }, { wch: 10 },
      { wch: 14 }, { wch: 15 }, { wch: 18 }, { wch: 16 },
      { wch: 20 }, { wch: 45 }, { wch: 14 }, { wch: 20 },
      { wch: 45 }, { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, '0차_부서평가_최종결과');
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
  }
}
