import { NextRequest, NextResponse } from 'next/server';
import { getAllDepartmentPasswordsAsync, setupDepartmentPassword, saveAllDepartmentPasswords } from '@/lib/auth';
import { getOrganizationChartAsync } from '@/lib/store';
import { accessDenied, getAccess } from '@/lib/accessSession';
import { DEFAULT_STAGE1_JUDGES, getStage1PasswordDepartment } from '@/lib/types';

const inheritedJudges = new Set(DEFAULT_STAGE1_JUDGES.filter(getStage1PasswordDepartment).map(j => j.name));

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const access = getAccess();
  if (access?.role !== 'admin') return accessDenied(access);
  try {
    const orgChart = await getOrganizationChartAsync();
    const departments = orgChart.departments || [];

    const passwords = await getAllDepartmentPasswordsAsync();

    const deptsWithPasswords = departments.map((d: any) => {
      const pass = passwords[d.department] || '';
      return {
        ...d,
        password: pass,
        hasPassword: Boolean(pass)
      };
    });

    const judgesWithPasswords = DEFAULT_STAGE1_JUDGES.map((j) => {
      const inheritedDepartment = getStage1PasswordDepartment(j);
      const pass = passwords[inheritedDepartment ?? j.name] || '';
      return {
        code: j.id,
        division: j.dept,
        office: j.title,
        department: j.name,
        name: `[${j.dept}] ${j.title} (${j.name})`,
        inheritedDepartment,
        password: pass,
        hasPassword: Boolean(pass)
      };
    });

    return NextResponse.json({
      success: true,
      departments: deptsWithPasswords,
      judges: judgesWithPasswords,
      totalCount: deptsWithPasswords.length,
      assignedCount: deptsWithPasswords.filter((d: any) => d.hasPassword).length
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const access = getAccess();
  if (access?.role !== 'admin') return accessDenied(access);
  try {
    const body = await req.json();

    // 1. 일괄 저장 (Bulk)
    const bulkData = body.passwords || body.allPasswords;
    if (bulkData && typeof bulkData === 'object') {
      if (Object.keys(bulkData).some(key => inheritedJudges.has(key))) {
        return NextResponse.json({ error: '0차와 연동된 비밀번호는 부서 비밀번호에서 변경해 주세요.' }, { status: 400 });
      }
      await saveAllDepartmentPasswords(bulkData);
      return NextResponse.json({ success: true, message: '부서 비밀번호가 일괄 저장되었습니다.' });
    }

    // 2. 단일 부서 저장
    const { dept, password } = body;
    if (!dept) {
      return NextResponse.json({ success: false, error: '부서명이 필요합니다.' }, { status: 400 });
    }
    if (inheritedJudges.has(dept)) {
      return NextResponse.json({ error: '0차와 연동된 비밀번호는 부서 비밀번호에서 변경해 주세요.' }, { status: 400 });
    }

    await setupDepartmentPassword(dept, password || '');
    return NextResponse.json({
      success: true,
      message: `[${dept}] 부서의 비밀번호가 설정되었습니다.`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
