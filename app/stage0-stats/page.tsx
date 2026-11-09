import { redirect } from 'next/navigation';

export default function Stage0StatsRedirect({ searchParams }: { searchParams: { session_id?: string } }) {
  const sessionId = searchParams.session_id;
  redirect(sessionId ? `/admin/stage0-stats?session_id=${encodeURIComponent(sessionId)}` : '/admin/stage0-stats');
}
