'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function StatsLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/stats', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password })
      });
      if (!response.ok) throw new Error((await response.json()).error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">0차 부서 평가 통계 조회</h1>
        <label className="block space-y-2 text-sm font-semibold text-slate-700">
          <span>통계 조회 비밀번호</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="block w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50">통계 조회</button>
        <Link href="/" className="inline-block text-sm font-medium text-slate-600">홈으로 돌아가기</Link>
      </form>
    </main>
  );
}
