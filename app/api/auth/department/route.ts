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

    if (action === 'setup') {
      // 관리자 스페셜 비밀번호 (0423)인 경우: 비밀번호를 저장하지 않고 테스트 모드 로그인만 허용
      if (password === MASTER_ADMIN_PASS) {
        return NextResponse.json({
          success: true,
          isTestMode: true,
          message: '관리자 테스트 모드로 인증되었습니다. 부서 비밀번호는 미설정 상태로 안전하게 유지됩니다.'
        });
      }

      const status = await getDepartmentAuthStatus(dept);
      if (status.hasPassword) {
        return NextResponse.json({ success: false, message: '이미 비밀번호가 설정된 부서입니다. 로그인을 진행해주세요.' }, { status: 400 });
      }

      await setupDepartmentPassword(dept, password);
      return NextResponse.json({ success: true, message: '비밀번호가 성공적으로 설정되었습니다.' });
    } else {
      // login
      if (password === MASTER_ADMIN_PASS) {
        return NextResponse.json({
          success: true,
          isTestMode: true,
          message: '관리자 스페셜 비밀번호(0423)로 인증되었습니다.'
        });
      }

      const isValid = await verifyDepartmentPassword(dept, password);
      if (isValid) {
        return NextResponse.json({ success: true, message: '인증되었습니다.' });
      } else {
        return NextResponse.json({ success: false, message: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
      }
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || '인증 오류가 발생했습니다.' }, { status: 500 });
  }
}
