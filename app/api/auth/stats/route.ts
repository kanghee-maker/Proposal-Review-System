import { NextResponse } from 'next/server';
import { accessDenied, clearAccess, getAccess, setAccess } from '@/lib/accessSession';
import { verifyStatsPassword } from '@/lib/auth';

export function GET() {
  const access = getAccess();
  if (access?.role !== 'stats' && access?.role !== 'admin') return accessDenied(access);
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

export function DELETE() {
  return clearAccess();
}

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    if (!await verifyStatsPassword(password)) {
      return NextResponse.json({ error: '통계 조회 비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }
    return setAccess(NextResponse.json({ success: true }), { role: 'stats' });
  } catch {
    return NextResponse.json({ error: '통계 조회 인증에 실패했습니다. 관리자에게 문의해 주세요.' }, { status: 503 });
  }
}
