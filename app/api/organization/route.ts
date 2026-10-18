import { NextResponse } from 'next/server';
import { getOrganizationChart, updateOrganizationChart } from '@/lib/store';

export async function GET() {
  const chart = getOrganizationChart();
  return NextResponse.json(chart);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.departments || !Array.isArray(body.departments)) {
      return NextResponse.json({ success: false, error: 'Invalid departments data' }, { status: 400 });
    }
    const current = getOrganizationChart();
    current.departments = body.departments;
    if (body.name) current.name = body.name;
    if (body.description) current.description = body.description;
    updateOrganizationChart(current);
    return NextResponse.json({ success: true, chart: current });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
