'use client';
import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { EvaluationSession } from '@/lib/types';
import Stage0Visualization from './Stage0Visualization';
import Stage1Dashboard from '../stage1-stats/Stage1Dashboard';
function Statistics({ defaultStage }: { defaultStage: 'STAGE_0' | 'STAGE_1' }) {
  const router = useRouter(), pathname = usePathname(), query = useSearchParams();
  const [sessions, setSessions] = useState<EvaluationSession[]>([]), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/result-reports', { cache: 'no-store', signal: controller.signal }).then(async r => {
      const body = await r.json(); if (!r.ok) throw Error(body.error || '회차를 불러오지 못했습니다.');
      if (!controller.signal.aborted) setSessions(body);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, []);
  const selected = sessions.find(s => s.id === query.get('session_id')) || sessions.find(s => (s.stage || 'STAGE_0') === defaultStage && (s.proposals_count || 0) > 0) || sessions.find(s => (s.stage || 'STAGE_0') === defaultStage) || sessions[0];
  return <><section className="round-switcher"><label htmlFor="statistics-round">평가 회차 선택 · 0차 / 1차</label>
    <select id="statistics-round" value={selected?.id || ''} disabled={!sessions.length} onChange={e => router.replace(`${pathname}?session_id=${encodeURIComponent(e.target.value)}`, { scroll: false })}>
      {!sessions.length && <option>회차를 불러오는 중</option>}{sessions.map(s => <option key={s.id} value={s.id}>[{s.stage === 'STAGE_1' ? '1차 심사' : '0차 부서평가'}] {s.year}년 · {s.title} ({s.proposals_count || 0}건)</option>)}
    </select><p>회차를 바꾸면 해당 평가의 그래프·상세 결과·인쇄·엑셀 다운로드가 함께 전환됩니다.</p></section>
    {error && <p role="alert">{error}</p>}{selected && (selected.stage === 'STAGE_1' ? <Stage1Dashboard key={selected.id} sessionId={selected.id} embedded /> : <Stage0Visualization key={selected.id} sessionId={selected.id} embedded />)}
    <style jsx>{`.round-switcher{max-width:1272px;margin:24px auto 0;padding:18px 24px;border:1px solid #f4d18a;background:#fffaf0;border-radius:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;color:#172640}.round-switcher label{font-weight:750}.round-switcher select{border:1px solid #f59e0b;border-radius:8px;padding:10px;max-width:100%;background:white;font-weight:650}.round-switcher p{width:100%;font-size:12px;color:#64748b}@media print{.round-switcher{display:none}}`}</style></>;
}
export default function UnifiedStatistics({ defaultStage = 'STAGE_0' }: { defaultStage?: 'STAGE_0' | 'STAGE_1' }) {
  return <Suspense fallback={<p>평가 통계를 불러오는 중…</p>}><Statistics defaultStage={defaultStage} /></Suspense>;
}
