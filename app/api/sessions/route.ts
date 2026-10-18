import { NextResponse } from 'next/server';
import { getSessions, saveSession, getDefaultCriteria } from '@/lib/store';

export async function GET() {
  const sessions = getSessions();
  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newSession = {
      id: `session-${Date.now()}`,
      title: body.title || '신규 제안 심사',
      year: body.year || '2026',
      description: body.description || '',
      status: 'ACTIVE' as const,
      created_at: new Date().toISOString(),
      proposals_count: body.proposals_count || 0,
      criteria: body.criteria && body.criteria.length > 0 ? body.criteria : getDefaultCriteria()
    };
    saveSession(newSession);
    return NextResponse.json({ success: true, session: newSession });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
