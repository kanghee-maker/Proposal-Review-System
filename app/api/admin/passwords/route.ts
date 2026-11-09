import { NextRequest, NextResponse } from 'next/server';
import { getAllDepartmentPasswordsAsync, setupDepartmentPassword, saveAllDepartmentPasswords } from '@/lib/auth';
import { getOrganizationChartAsync } from '@/lib/store';
import { accessDenied, getAccess } from '@/lib/accessSession';
import { DEFAULT_STAGE1_JUDGES } from '@/lib/types';

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
      const mappedOrgDept = j.title
        .replace(/부장$/, '부')
        .replace('사업계획부', '사업기획부')
        .replace('청렴감사단장', '경영감사실')
        .replace('안전총괄단장', '안전관리부');
      const pass = passwords[j.name] || passwords[mappedOrgDept] || passwords[j.dept] || '';
      return {
        code: j.id,
        division: j.dept,
        office: j.title,
        department: j.name,
        name: `[${j.dept}] ${j.title} (${j.name})`,
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
      await saveAllDepartmentPasswords(bulkData);
      return NextResponse.json({ success: true, message: '부서 비밀번호가 일괄 저장되었습니다.' });
    }

    // 2. 단일 부서 저장
    const { dept, password } = body;
    if (!dept) {
      return NextResponse.json({ success: false, error: '부서명이 필요합니다.' }, { status: 400 });
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
