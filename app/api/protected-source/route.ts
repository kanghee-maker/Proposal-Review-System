import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { accessDenied, getAccess } from '@/lib/accessSession';
import { reportProposals, reportSessions } from '@/lib/resultReportData';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const access = getAccess();
  if (!access || access.role === 'stats') return accessDenied(access);
  const relative = new URL(request.url).searchParams.get('file') || '';
  if (!relative.startsWith('/proposal-sources/') && !relative.startsWith('/default-attachments/')) return new NextResponse(null, { status: 404 });
  try {
    if (access.role === 'judge') {
      const [proposals, sessions] = await Promise.all([reportProposals(), reportSessions()]);
      const allowedSessions = sessions.filter(s => s.stage === 'STAGE_1' && s.judges?.some(j => j.name === access.judge));
      if (!proposals.some(p => allowedSessions.some(s => s.id === p.session_id) && p.attachments?.some(a => a.static_url && decodeURIComponent(a.static_url) === relative))) return accessDenied(access);
    }
    const root = path.resolve(process.cwd(), 'public');
    const target = path.resolve(root, relative.replace(/^\/+/, ''));
    const safe = path.relative(root, target);
    if (safe.startsWith('..') || path.isAbsolute(safe) || !fs.existsSync(target)) return new NextResponse(null, { status: 404 });
    return new Response(new Uint8Array(fs.readFileSync(target)), { headers: {
      'Content-Type': target.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'
    } });
  } catch {
    return NextResponse.json({ error: '원본 첨부 조회에 실패했습니다.' }, { status: 503 });
  }
}
