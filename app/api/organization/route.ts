import { authorize } from '@/lib/session';
import { NextResponse } from 'next/server';
import { getOrganizationChartAsync, updateOrganizationChartAsync } from '@/lib/store';

export async function GET() {
  const chart = await getOrganizationChartAsync();
  return NextResponse.json(chart);
}

export async function POST(req: Request) {
  const { principal, error: authError } = await authorize(req, true);
  if (authError) return authError;
  try {
    const body = await req.json();
    if (!body.departments || !Array.isArray(body.departments)) {
      return NextResponse.json({ success: false, error: 'Invalid departments data' }, { status: 400 });
    }
    const current = await getOrganizationChartAsync();
    current.departments = body.departments;
    if (body.name) current.name = body.name;
    if (body.description) current.description = body.description;
    await updateOrganizationChartAsync(current);
    return NextResponse.json({ success: true, chart: current });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
