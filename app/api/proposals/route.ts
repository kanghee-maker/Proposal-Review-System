import { NextResponse } from 'next/server';
import { getProposalsAsync, updateProposalAsync } from '@/lib/store';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id') || undefined;
  const proposalId = searchParams.get('id');
  const department = searchParams.get('department');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  let list = await getProposalsAsync(sessionId);

  if (proposalId) {
    const single = list.find(p => p.id === proposalId);
    return NextResponse.json(single || null);
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

  return NextResponse.json(list);
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }
    await updateProposalAsync(body);
    return NextResponse.json({ success: true, proposal: body });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
