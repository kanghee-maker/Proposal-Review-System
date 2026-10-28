import { NextRequest, NextResponse } from 'next/server';
// Route every public source URL through the same ownership check as downloads.
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = '/api/proposals/attachments';
  url.search = '';
  const headers = new Headers(req.headers);
  headers.set('x-gcprs-source', encodeURIComponent(req.nextUrl.pathname));
  return NextResponse.rewrite(url, { request: { headers } });
}
export const config = { matcher: ['/proposal-sources/:path*', '/default-attachments/:path*'] };
