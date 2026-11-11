import { NextRequest, NextResponse } from 'next/server';
import { stage1Maintenance, stage1MaintenanceMessage } from '@/lib/stage1Maintenance';

export function middleware(request: NextRequest) {
  if (!stage1Maintenance) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/evaluator/')) {
    return NextResponse.redirect(new URL('/?stage1=maintenance', request.url));
  }

  if (request.method === 'POST') {
    return NextResponse.json(
      { success: false, error: stage1MaintenanceMessage },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/evaluator/stage1/:path*', '/api/stage1/scores']
};
