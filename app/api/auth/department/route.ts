import { NextRequest, NextResponse } from 'next/server';
import { verifyDepartmentPassword, verifyAdminPassword } from '@/lib/auth';
import { accessDenied, clearAccess, getAccess, setAccess } from '@/lib/accessSession';
import { DEFAULT_STAGE1_JUDGES } from '@/lib/types';

export function GET() {
  const access = getAccess();
  if (!access) return accessDenied(access);
  return NextResponse.json(access, { headers: { 'Cache-Control': 'no-store' } });
}

export function DELETE() {
  return clearAccess();
}

export async function POST(req: NextRequest) {
  try {
    const { dept, password } = await req.json();
    const judge = DEFAULT_STAGE1_JUDGES.find(candidate => candidate.name === dept);
    if (!judge || typeof password !== 'string' || !password) {
      return NextResponse.json({ success: false, message: '1차 심사위원과 비밀번호를 확인해 주세요.' }, { status: 400 });
    }

    const fallbackDept = judge.title
      .replace(/부장$/, '부')
      .replace('사업계획부', '사업기획부')
      .replace('청렴감사단장', '경영감사실')
      .replace('안전총괄단장', '안전관리부') || judge.dept;
    const isTestMode = verifyAdminPassword(password);
    const isValid = isTestMode || await verifyDepartmentPassword(judge.name, password) ||
      await verifyDepartmentPassword(fallbackDept, password);

    if (!isValid) {
      return NextResponse.json({ success: false, message: '비밀번호가 일치하지 않습니다. 관리자에게 문의바랍니다.' }, { status: 401 });
    }

    return setAccess(NextResponse.json({ success: true, isTestMode }), { role: 'judge', judge: judge.name });
  } catch {
    return NextResponse.json({ success: false, message: '인증 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
