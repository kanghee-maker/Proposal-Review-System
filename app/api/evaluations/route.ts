import { NextResponse } from 'next/server';
import { getEvaluationsAsync, saveEvaluationAsync } from '@/lib/store';

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

  const proposalId = searchParams.get('proposal_id');

  const evals = await getEvaluationsAsync(sessionId || undefined);
  if (proposalId) {
    const found = evals.find(e => e.proposal_id === proposalId);
    return NextResponse.json(found || null, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  }

  return NextResponse.json(evals, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.proposal_id || !body.session_id) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const evaluation = {
      id: body.id || `eval-${body.proposal_id}`,
      proposal_id: body.proposal_id,
      session_id: body.session_id,
      department_name: body.department_name || '',
      evaluator_name: body.evaluator_name || '',
      answers: body.answers || {},
      is_submitted: Boolean(body.is_submitted),
      submitted_at: body.is_submitted ? (body.submitted_at || new Date().toISOString()) : undefined,
      updated_at: new Date().toISOString()
    };

    await saveEvaluationAsync(evaluation);
    return NextResponse.json({ success: true, evaluation });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
