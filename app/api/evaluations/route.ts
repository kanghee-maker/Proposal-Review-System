import { NextResponse } from 'next/server';
import { getEvaluations, saveEvaluation } from '@/lib/store';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id') || undefined;
  const proposalId = searchParams.get('proposal_id');

  const evals = getEvaluations(sessionId);
  if (proposalId) {
    const found = evals.find(e => e.proposal_id === proposalId);
    return NextResponse.json(found || null);
  }

  return NextResponse.json(evals);
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

    saveEvaluation(evaluation);
    return NextResponse.json({ success: true, evaluation });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
