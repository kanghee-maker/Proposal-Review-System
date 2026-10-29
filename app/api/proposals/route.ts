import { getProposalTransfers, saveProposalTransfer } from '@/lib/proposalTransfers';
import { NextResponse } from 'next/server';
import { getProposalsAsync, updateProposalAsync } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hasSessionParam = searchParams.has('session_id');
  const sessionId = searchParams.get('session_id');

  if (hasSessionParam && (!sessionId || !sessionId.trim())) {
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  }

  const proposalId = searchParams.get('id');
  const department = searchParams.get('department');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  let list;
  try {
    const [proposals, transfers] = await Promise.all([getProposalsAsync(sessionId || undefined), getProposalTransfers()]);
    list = proposals.map(p => ({ ...p, ...transfers[p.id] }));
  } catch {
    return NextResponse.json({ success: false, error: '이관 요청을 포함한 제안 조회에 실패했습니다. 다시 시도해 주세요.' }, { status: 503 });
  }

  if (proposalId) {
    const single = list.find(p => p.id === proposalId);
    return NextResponse.json(single || null, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  }

  if (department) {
    list = list.filter(p => 
      p.assigned_department === department || 
      p.assigned_office === department ||
      p.assigned_raw_dept.includes(department)
    );
  }

  if (status && status !== '전체') {
    list = list.filter(p => p.status === status);
  }

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(p => 
      p.title.toLowerCase().includes(q) ||
      p.proposer_name.toLowerCase().includes(q) ||
      p.board_no.includes(q) ||
      p.assigned_department.toLowerCase().includes(q)
    );
  }

  return NextResponse.json(list, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  });
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }
    const existing = (await getProposalsAsync()).find(p => p.id === body.id);
    if (!existing) return NextResponse.json({ success: false, error: '제안을 찾을 수 없습니다.' }, { status: 404 });
    const transfers = await getProposalTransfers();
    const current = { ...existing, ...transfers[body.id] };
    const action = body.transfer_action || (body.transfer_requested === true && !current.transfer_requested ? 'REQUEST' : '');
    if (action) {
      if (!['REQUEST', 'CANCEL', 'APPROVE'].includes(action)) return NextResponse.json({ success: false }, { status: 400 });
      if (action === 'REQUEST' && (typeof body.transfer_target_dept !== 'string' || !body.transfer_target_dept.trim() || typeof body.transfer_reason !== 'string' || !body.transfer_reason.trim() || body.transfer_reason.length > 5000)) {
        return NextResponse.json({ success: false, error: '희망 부서와 이관 사유를 확인해 주세요.' }, { status: 400 });
      }
      if (action !== 'REQUEST' && !current.transfer_requested) return NextResponse.json({ success: false, error: '처리할 이관 요청이 없습니다. 새로고침해 주세요.' }, { status: 409 });
      if (action === 'APPROVE') {
        if (body.assigned_department !== current.transfer_target_dept) return NextResponse.json({ success: false }, { status: 400 });
        await updateProposalAsync({ ...current, assigned_division: body.assigned_division, assigned_office: body.assigned_office, assigned_department: current.transfer_target_dept!, assigned_raw_dept: body.assigned_raw_dept });
      }
      const transfer = {
        transfer_requested: action === 'REQUEST',
        transfer_target_dept: action === 'REQUEST' ? body.transfer_target_dept.trim() : current.transfer_target_dept,
        transfer_reason: action === 'REQUEST' ? body.transfer_reason.trim() : current.transfer_reason,
        transfer_requested_at: action === 'REQUEST' ? new Date().toISOString() : current.transfer_requested_at,
        transfer_status: action === 'REQUEST' ? 'PENDING' as const : action === 'APPROVE' ? 'APPROVED' as const : 'REJECTED' as const
      };
      await saveProposalTransfer(body.id, transfer);
      return NextResponse.json({ success: true, proposal: { ...(action === 'APPROVE' ? { ...current, assigned_division: body.assigned_division, assigned_office: body.assigned_office, assigned_department: current.transfer_target_dept!, assigned_raw_dept: body.assigned_raw_dept } : current), ...transfer } });
    }
    await updateProposalAsync({ ...body, transfer_requested: current.transfer_requested, transfer_target_dept: current.transfer_target_dept, transfer_reason: current.transfer_reason, transfer_requested_at: current.transfer_requested_at, transfer_status: current.transfer_status });
    return NextResponse.json({ success: true, proposal: body });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
