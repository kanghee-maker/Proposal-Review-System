import { authorize } from '@/lib/session';
import { NextResponse } from 'next/server';
import { createStage1SessionFromStage0Async } from '@/lib/store';

export async function POST(req: Request) {
  const { principal, error: authError } = await authorize(req, true);
  if (authError) return authError;
  try {
    const body = await req.json();
    if (!body.sourceSessionId) {
      return NextResponse.json({ success: false, error: '출처 0차 부서평가 세션 ID가 필요합니다.' }, { status: 400 });
    }

    const result = await createStage1SessionFromStage0Async({
      sourceSessionId: body.sourceSessionId,
      newTitle: body.newTitle,
      year: body.year,
      description: body.description,
      filterOnlyYes: body.filterOnlyYes ?? true,
      selectedProposalIds: body.selectedProposalIds,
      judges: body.judges
    });

    return NextResponse.json({
      success: true,
      session: result.session,
      proposalsCount: result.proposalsCount
    });
  } catch (err: any) {
    console.error('Error creating Stage 1 session:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
