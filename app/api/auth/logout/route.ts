import { NextResponse } from 'next/server';
import { sameOrigin, logoutResponse } from '@/lib/session';
export async function POST(req: Request) {
  if (!sameOrigin(req) || !req.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ success: false }, { status: 403 });
  return logoutResponse();
}
