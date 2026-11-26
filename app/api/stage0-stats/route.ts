import { NextResponse } from 'next/server';
import { accessDenied, getAccess } from '@/lib/accessSession';
import { loadResultReport, reportSessions } from '@/lib/resultReportData';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const access = getAccess();
  if (access?.role !== 'admin') return accessDenied(access);
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    const sessionId = new URL(request.url).searchParams.get('session_id');
    if (sessionId === null) return NextResponse.json((await reportSessions()).filter(s => s.stage !== 'STAGE_1'), { headers });
    const report = await loadResultReport('stage0', sessionId);
    return NextResponse.json({
      proposals: report.rows.map(r => r.proposal),
      evaluations: report.rows.flatMap(r => r.evaluations)
    }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '평가 자료 DB 조회 실패' }, { status: 503, headers });
  }
}
