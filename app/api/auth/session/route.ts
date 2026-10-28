import { NextResponse } from 'next/server';
import { authorize } from '@/lib/session';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const { principal, error } = await authorize(req);
  if (error) return error;
  return NextResponse.json({ role: principal.role, dept: principal.dept }, { headers: { 'Cache-Control': 'no-store' } });
}
