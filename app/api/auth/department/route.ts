import { NextRequest, NextResponse } from 'next/server';
import { getDepartmentAuthStatus, verifyDepartmentPassword, setupDepartmentPassword } from '@/lib/auth';

const MASTER_ADMIN_PASS = '0423';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dept = searchParams.get('dept');

    if (!dept) {
      return NextResponse.json({ success: false, message: '부서명이 필요합니다.' }, { status: 400 });
    }

    const status = await getDepartmentAuthStatus(dept);
    return NextResponse.json({ success: true, ...status });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || '오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { dept, password, action } = await req.json();

    if (!dept || !password) {
      return NextResponse.json({ success: false, message: '부서명과 비밀번호를 입력해주세요.' }, { status: 400 });
    }

    if (password === MASTER_ADMIN_PASS) {
      return NextResponse.json({
        success: true,
        isTestMode: true,
        message: '관리자 스페셜 비밀번호(0423)로 인증되었습니다.'
      });
    }

    const status = await getDepartmentAuthStatus(dept);
    if (!status.hasPassword) {
      return NextResponse.json({ 
        success: false, 
        message: '해당 부서의 비밀번호가 아직 발급되지 않았습니다. 관리자(총무행정부 우세림) - 1192(내선번호)에게 비밀번호 설정을 요청해주세요.' 
      }, { status: 401 });
    }

    const isValid = await verifyDepartmentPassword(dept, password);
    if (isValid) {
      return NextResponse.json({ success: true, message: '인증되었습니다.' });
    } else {
      return NextResponse.json({ success: false, message: '비밀번호가 일치하지 않습니다. 관리자에게 문의바랍니다.' }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || '인증 오류가 발생했습니다.' }, { status: 500 });
  }
}
