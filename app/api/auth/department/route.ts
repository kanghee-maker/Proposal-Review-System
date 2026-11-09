import { NextRequest, NextResponse } from 'next/server';
import { verifyDepartmentPassword, verifyAdminPassword } from '@/lib/auth';
import { accessDenied, clearAccess, getAccess, setAccess } from '@/lib/accessSession';
import { DEFAULT_STAGE1_JUDGES, getStage1PasswordDepartment } from '@/lib/types';

export function GET() {
  const access = getAccess();
  if (access?.role !== 'judge' && access?.role !== 'admin') return accessDenied(access);
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

    const passwordKey = getStage1PasswordDepartment(judge) ?? judge.name;
    const isTestMode = verifyAdminPassword(password);
    const isValid = isTestMode || await verifyDepartmentPassword(passwordKey, password);

    if (!isValid) {
      return NextResponse.json({ success: false, message: '비밀번호가 일치하지 않습니다. 관리자에게 문의바랍니다.' }, { status: 401 });
    }

    return setAccess(NextResponse.json({ success: true, isTestMode }), { role: 'judge', judge: judge.name });
  } catch {
    return NextResponse.json({ success: false, message: '인증 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
