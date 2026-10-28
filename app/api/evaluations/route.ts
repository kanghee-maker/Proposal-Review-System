import { visibleProposals, ownsProposal } from '@/lib/access';
import { getProposalsAsync, getSessionsAsync } from '@/lib/store';
import { authorize } from '@/lib/session';
import { NextResponse } from 'next/server';
import { getEvaluationsAsync, saveEvaluationAsync } from '@/lib/store';

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

  const proposalId = searchParams.get('proposal_id');

  const allowed = new Set((await visibleProposals(principal, await getProposalsAsync(sessionId || undefined))).map(p => p.id));
  const evals = (await getEvaluationsAsync(sessionId || undefined)).filter(e => principal.role === 'ADMIN' || (allowed.has(e.proposal_id) && e.department_name === principal.dept));
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
  const { principal, error: authError } = await authorize(req, false);
  if (authError) return authError;
  try {
    const body = await req.json();
    if (!body.proposal_id || !body.session_id) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const proposal = (await getProposalsAsync(body.session_id)).find(p => p.id === body.proposal_id);
    const session = (await getSessionsAsync()).find(s => s.id === body.session_id);
    if (!proposal || !ownsProposal(principal, proposal)) return NextResponse.json({ success: false }, { status: 403 });
    if (!session || session.status !== 'ACTIVE' || (session.stage || 'STAGE_0') !== 'STAGE_0') return NextResponse.json({ success: false, error: '평가 기간이 아닙니다.' }, { status: 409 });
    if (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers) || typeof body.is_submitted !== 'boolean') return NextResponse.json({ success: false }, { status: 400 });
    if (body.is_submitted && session.criteria.some(c => c.required && (body.answers[c.key] === undefined || String(body.answers[c.key]).trim() === ''))) return NextResponse.json({ success: false, error: '필수 평가 항목을 입력해주세요.' }, { status: 400 });
    if (body.answers.result && !['Yes','No'].includes(body.answers.result)) return NextResponse.json({ success: false }, { status: 400 });
    const previous = (await getEvaluationsAsync(body.session_id)).find(e => e.proposal_id === body.proposal_id);
    if (principal.role !== 'ADMIN' && previous?.is_submitted) return NextResponse.json({ success: false, error: '제출된 평가의 변경은 관리자에게 요청해주세요.' }, { status: 409 });
    const evaluation = {
      id: previous?.id || `eval-${body.proposal_id}`,
      proposal_id: body.proposal_id,
      session_id: body.session_id,
      department_name: proposal.assigned_department,
      evaluator_name: body.evaluator_name || '',
      answers: body.answers || {},
      is_submitted: Boolean(body.is_submitted),
      submitted_at: body.is_submitted ? (body.submitted_at || new Date().toISOString()) : undefined,
      updated_at: new Date().toISOString()
    };

    await saveEvaluationAsync(evaluation, principal.role === 'ADMIN');
    return NextResponse.json({ success: true, evaluation });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
