import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword } from '@/lib/auth';
import { accessDenied, clearAccess, getAccess, setAccess } from '@/lib/accessSession';

export function GET() {
  const access = getAccess();
  if (access?.role !== 'admin') return accessDenied(access);
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

export function DELETE() {
  return clearAccess();
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ success: false, message: '비밀번호를 입력해주세요.' }, { status: 400 });
    }

    const isValid = verifyAdminPassword(password);
    if (isValid) {
      return setAccess(NextResponse.json({ success: true, message: '인증되었습니다.' }), { role: 'admin' });
    } else {
      return NextResponse.json({ success: false, message: '관리자 비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || '인증 오류가 발생했습니다.' }, { status: 500 });
  }
}
