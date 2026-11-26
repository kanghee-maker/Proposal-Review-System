import { NextResponse } from 'next/server';
import { accessDenied, getAccess } from '@/lib/accessSession';
import { loadResultReport, reportSessions } from '@/lib/resultReportData';
import { emptyReportFilters, filterResultRows, ReportMode } from '@/lib/resultReports';
import { buildResultWorkbook } from '@/lib/resultReportWorkbook';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request) {
  const access = getAccess();
  if (access?.role !== 'admin') return accessDenied(access);
  const params = new URL(request.url).searchParams;
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    if (!params.has('session_id')) return NextResponse.json(await reportSessions(), { headers });
    const mode = params.get('mode') as ReportMode;
    if (!['stage0', 'stage1', 'combined'].includes(mode)) return NextResponse.json({ error: '평가 단계를 확인해 주세요.' }, { status: 400, headers });
    const report = await loadResultReport(mode, params.get('session_id') || '');
    const filters = { ...emptyReportFilters };
    for (const key of Object.keys(filters)) filters[key] = params.get(key) || '';
    const rows = filterResultRows(report.rows, filters);
    if (params.get('format') === 'xlsx') {
      const buffer = buildResultWorkbook(report, rows, JSON.stringify(filters));
      const name = `평가결과_${mode}_${report.sessionId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      return new Response(new Uint8Array(buffer), { headers: { ...headers,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}` } });
    }
    return NextResponse.json({ ...report, rows }, { headers });
  } catch (error) {
    console.error('Result report failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'DB 자료를 조회하지 못했습니다. 다시 시도해 주세요.' }, { status: 503, headers });
  }
}
