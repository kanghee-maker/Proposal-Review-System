import { visibleProposals, ownsProposal } from '@/lib/access';
import { getSessionsAsync } from '@/lib/store';
import { authorize } from '@/lib/session';
import { NextResponse } from 'next/server';
import { getProposalsAsync, updateProposalAsync } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const { principal, error: authError } = await authorize(req, false);
  if (authError) return authError;
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

  let list = await visibleProposals(principal, await getProposalsAsync(sessionId || undefined));

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
  const { principal, error: authError } = await authorize(req, false);
  if (authError) return authError;
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }
    const existing = (await getProposalsAsync()).find(p => p.id === body.id);
    if (!existing || !ownsProposal(principal, existing)) return NextResponse.json({ success: false }, { status: 403 });
    let updated = body;
    if (principal.role !== 'ADMIN') {
      const session = (await getSessionsAsync()).find(s => s.id === existing.session_id);
      if (!session || session.status !== 'ACTIVE' || (session.stage || 'STAGE_0') !== 'STAGE_0' || typeof body.transfer_requested !== 'boolean') return NextResponse.json({ success: false }, { status: 403 });
      const requested = body.transfer_requested;
      updated = { ...existing, transfer_requested: requested, transfer_target_dept: requested ? String(body.transfer_target_dept || '').slice(0, 100) : '',
        transfer_reason: requested ? String(body.transfer_reason || '').trim().slice(0, 5000) : '',
        transfer_requested_at: requested ? new Date().toISOString() : undefined, transfer_status: requested ? 'PENDING' : undefined };
      if (requested && (!updated.transfer_reason || !updated.transfer_target_dept)) return NextResponse.json({ success: false }, { status: 400 });
    }
    await updateProposalAsync(updated);
    return NextResponse.json({ success: true, proposal: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
