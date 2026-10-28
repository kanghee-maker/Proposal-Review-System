import { NextResponse } from 'next/server';
import { verifyAdminPassword, verifyDepartmentPassword } from '@/lib/auth';
import { configurationReady, sameOrigin, takeLoginAttempt, loginResponse } from '@/lib/session';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  if (!configurationReady()) return NextResponse.json({ success: false, message: '서버 인증 설정이 필요합니다.' }, { status: 503 });
  if (!sameOrigin(req) || !req.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ success: false }, { status: 403 });
  try {
    const body = await req.json();
    if (typeof body.password !== 'string' || !body.password || body.password.length > 256) return NextResponse.json({ success: false, message: '입력 내용을 확인해주세요.' }, { status: 400 });
    if (!takeLoginAttempt('admin')) return NextResponse.json({ success: false, message: '시도 횟수를 초과했습니다. 15분 후 다시 시도해주세요.' }, { status: 429, headers: { 'Retry-After': '900' } });
    const valid = verifyAdminPassword(body.password);
    if (!valid) return NextResponse.json({ success: false, message: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
    return await loginResponse('ADMIN');
  } catch { return NextResponse.json({ success: false, message: '인증 처리에 실패했습니다. 서버 설정을 확인해주세요.' }, { status: 503 }); }
}
