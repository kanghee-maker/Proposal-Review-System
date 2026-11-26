'use client';
import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { EvaluationSession } from '@/lib/types';
import Stage0Visualization from './Stage0Visualization';
import Stage1Dashboard from '../stage1-stats/Stage1Dashboard';
import { StatisticsVisualStyles } from './StatisticsVisuals';
function Statistics({ defaultStage, fixedStage }: { defaultStage: 'STAGE_0' | 'STAGE_1'; fixedStage: boolean }) {
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
  const available = fixedStage ? sessions.filter(s => (s.stage || 'STAGE_0') === defaultStage) : sessions;
  const selected = available.find(s => s.id === query.get('session_id')) || available.find(s => (s.stage || 'STAGE_0') === defaultStage && (s.proposals_count || 0) > 0) || available.find(s => (s.stage || 'STAGE_0') === defaultStage) || available[0];
  const stageName = defaultStage === 'STAGE_1' ? '1차 심사' : '0차 부서평가';
  return <><StatisticsVisualStyles /><section className="round-switcher"><nav aria-label="통계 대시보드 선택"><Link href="/stage0-stats" aria-current={fixedStage && defaultStage === 'STAGE_0' ? 'page' : undefined}>0차 평가결과 통계자료</Link><Link href="/stage1-stats" aria-current={fixedStage && defaultStage === 'STAGE_1' ? 'page' : undefined}>1차 평가결과 통계자료</Link><Link href="/admin/stage0-stats" aria-current={!fixedStage ? 'page' : undefined}>통합 회차 선택</Link></nav>
    <label htmlFor="statistics-round">{fixedStage ? `${stageName} 회차 선택` : '평가 회차 선택 · 0차 / 1차'}</label>
    <select id="statistics-round" value={selected?.id || ''} disabled={!available.length} onChange={e => router.replace(`${pathname}?session_id=${encodeURIComponent(e.target.value)}`, { scroll: false })}>
      {!available.length && <option>{sessions.length ? '해당 단계의 회차 없음' : '회차를 불러오는 중'}</option>}{available.map(s => <option key={s.id} value={s.id}>[{s.stage === 'STAGE_1' ? '1차 심사' : '0차 부서평가'}] {s.year}년 · {s.title} ({s.proposals_count || 0}건)</option>)}
    </select><p>{fixedStage ? `${stageName} 자료만 표시합니다. ` : ''}회차를 바꾸면 해당 평가의 그래프·상세 결과·인쇄·엑셀 다운로드가 함께 전환됩니다.</p></section>
    {error && <p role="alert">{error}</p>}{selected && (selected.stage === 'STAGE_1' ? <Stage1Dashboard key={selected.id} sessionId={selected.id} embedded /> : <Stage0Visualization key={selected.id} sessionId={selected.id} embedded />)}
    <style jsx>{`.round-switcher{max-width:1272px;margin:24px auto 0;padding:18px 24px;border:1px solid #f4d18a;background:#fffaf0;border-radius:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;color:#172640}.round-switcher label{font-weight:750}.round-switcher select{border:1px solid #f59e0b;border-radius:8px;padding:10px;max-width:100%;background:white;font-weight:650}.round-switcher p{width:100%;font-size:12px;color:#64748b}.round-switcher nav{display:flex;flex-wrap:wrap;gap:8px;width:100%;margin-bottom:6px}.round-switcher nav :global(a){border:1px solid #e2c88a;border-radius:8px;background:white;padding:8px 12px;font-size:13px;font-weight:700}.round-switcher nav :global(a[aria-current=page]){background:#f59e0b;color:#0f172a;border-color:#d97706}@media print{.round-switcher{display:none}}`}</style></>;
}
export default function UnifiedStatistics({ defaultStage = 'STAGE_0', fixedStage = false }: { defaultStage?: 'STAGE_0' | 'STAGE_1'; fixedStage?: boolean }) {
  return <Suspense fallback={<p>평가 통계를 불러오는 중…</p>}><Statistics defaultStage={defaultStage} fixedStage={fixedStage} /></Suspense>;
}
