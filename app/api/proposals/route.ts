import { NextResponse } from 'next/server';
import { getProposals, updateProposal, addProposalsBatch } from '@/lib/store';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id') || undefined;
  const department = searchParams.get('department');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  let list = getProposals(sessionId);

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
    updateProposal(body);
    return NextResponse.json({ success: true, proposal: body });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const proposals = body.proposals || [];
    if (!Array.isArray(proposals) || proposals.length === 0) {
      return NextResponse.json({ success: false, error: 'No proposals provided' }, { status: 400 });
    }
    addProposalsBatch(proposals);
    return NextResponse.json({ success: true, count: proposals.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
