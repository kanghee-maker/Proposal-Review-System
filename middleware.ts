import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/evaluator/stage1')) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  if (request.method === 'POST') {
    return NextResponse.json(
      { success: false, error: '1차 제안심사 완료되었습니다.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/evaluator/stage1/:path*', '/api/stage1/scores']
};
