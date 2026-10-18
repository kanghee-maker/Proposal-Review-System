'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DownloadCloud, CheckCircle2, Clock, FileSpreadsheet, AlertTriangle, ArrowDownToLine, Layers, ChevronRight } from 'lucide-react';
import { Proposal, Evaluation, EvaluationSession } from '@/lib/types';

function AdminReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sessions, setSessions] = useState<EvaluationSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. 회차 목록 로드 및 현재 회차 결정
  useEffect(() => {
    fetch('/api/sessions')
      .then(res => res.json())
      .then((sessionList: EvaluationSession[]) => {
        setSessions(sessionList);

        const urlSessionId = searchParams.get('session_id');
        let initialId = urlSessionId;

        if (!initialId && typeof window !== 'undefined') {
          initialId = localStorage.getItem('gcuc_active_session_id') || '';
        }

        if (!initialId || !sessionList.some(s => s.id === initialId)) {
          initialId = sessionList[0]?.id || '';
        }

        setSelectedSessionId(initialId);
        if (initialId && typeof window !== 'undefined') {
          localStorage.setItem('gcuc_active_session_id', initialId);
        }
      })
      .catch(err => console.error(err));
  }, [searchParams]);

  // 2. 선택된 회차의 데이터 로드
  const fetchReportData = (sessionId: string) => {
    if (!sessionId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/proposals?session_id=${encodeURIComponent(sessionId)}`).then(r => r.json()),
      fetch(`/api/evaluations?session_id=${encodeURIComponent(sessionId)}`).then(r => r.json())
    ])
      .then(([pData, eData]) => {
        setProposals(pData);
        setEvaluations(eData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (selectedSessionId) {
      fetchReportData(selectedSessionId);
    }
  }, [selectedSessionId]);

  const handleSessionChange = (newSessionId: string) => {
    setSelectedSessionId(newSessionId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gcuc_active_session_id', newSessionId);
    }
    router.replace(`/admin/reports?session_id=${encodeURIComponent(newSessionId)}`);
  };

  const currentSession = sessions.find(s => s.id === selectedSessionId);

  const totalCount = proposals.length;
  const completedCount = proposals.filter(p => p.status === '평가완료').length;
  const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Yes / No 통계
  const evalMap = new Map(evaluations.map(e => [e.proposal_id, e]));
  let yesCount = 0;
  let noCount = 0;

  evaluations.forEach(ev => {
    if (ev.is_submitted) {
      if (ev.answers?.result === 'Yes') yesCount++;
      if (ev.answers?.result === 'No') noCount++;
    }
  });

  const handleDownloadExcel = () => {
    window.location.href = `/api/export?session_id=${encodeURIComponent(selectedSessionId)}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. 제안평가 회차 선행 선택 바 */}
      <div className="bg-white rounded-2xl border border-sky-200 p-4 sm:p-5 shadow-sm bg-gradient-to-r from-sky-50/70 via-white to-blue-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/25 flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">
                현재 선택된 제안평가 회차
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {currentSession?.status === 'ACTIVE' ? '진행중' : currentSession?.status}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedSessionId}
                onChange={(e) => handleSessionChange(e.target.value)}
                className="bg-white border-2 border-sky-400 font-bold text-slate-900 text-sm sm:text-base rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm cursor-pointer"
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    [{s.year}년] {s.title} ({s.proposals_count}건)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <Link
            href={`/admin/proposals?session_id=${encodeURIComponent(selectedSessionId)}`}
            className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold transition flex items-center gap-1.5 border border-sky-200"
          >
            <span>이 회차 제안 목록·배정 가기</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/admin"
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold transition"
          >
            회차 관리
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <DownloadCloud className="w-5 h-5 text-sky-600 flex-shrink-0" />
            <span>[{currentSession?.title || '제안평가'}] 부서 평가(0차 평가) 취합 및 엑셀 다운로드</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            선택된 평가 회차의 각 부서 심사 결과(Yes/No 및 검토의견)를 실시간 집계하고 보고용 엑셀로 내보냅니다. (향후 제안 심사(1차 평가) 위원회 기초자료로 활용)
          </p>
        </div>

        <button
          onClick={handleDownloadExcel}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-600/25 transition whitespace-nowrap"
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span>선택 회차 종합 결과 엑셀 다운로드 (.xlsx)</span>
        </button>
      </div>

      {/* KPI Cards (모바일 반응형 2x2 또는 4열 그리드) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <span className="text-xs text-slate-400 font-medium block mb-1">대상 제안 건수</span>
          <div className="flex items-baseline gap-2">
            <strong className="text-2xl sm:text-3xl font-bold text-slate-900">{totalCount}</strong>
            <span className="text-xs text-slate-500">건</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">100% 배정 완료</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <span className="text-xs text-emerald-600 font-medium block mb-1">부서 평가(0차 평가) 완료율</span>
          <div className="flex items-baseline gap-2">
            <strong className="text-2xl sm:text-3xl font-bold text-emerald-600">{rate}%</strong>
            <span className="text-xs text-slate-500">({completedCount}/{totalCount})</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${rate}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <span className="text-xs text-sky-600 font-medium block mb-1">부서 채택 (Yes)</span>
          <div className="flex items-baseline gap-2">
            <strong className="text-2xl sm:text-3xl font-bold text-sky-600">{yesCount}</strong>
            <span className="text-xs text-slate-500">건</span>
          </div>
          <div className="mt-2 text-[11px] text-sky-600 font-medium">수용/채택 제안</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <span className="text-xs text-rose-600 font-medium block mb-1">부서 불채택 (No)</span>
          <div className="flex items-baseline gap-2">
            <strong className="text-2xl sm:text-3xl font-bold text-rose-600">{noCount}</strong>
            <span className="text-xs text-slate-500">건</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-600 font-medium">불채택 제안</div>
        </div>
      </div>

      {/* Aggregate Table (모바일 카드 / 데스크톱 테이블 듀얼뷰) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            제안별 부서 평가(0차 평가) 결과 상세 (Result &amp; Opinion)
          </h3>
          <span className="text-xs text-slate-400">총 {proposals.length}건</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            평가 결과를 집계 중입니다...
          </div>
        ) : proposals.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">선택된 제안평가 건에 등록된 제안이 없습니다.</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-3 w-12 text-center">연번</th>
                    <th className="py-3 px-3 font-bold text-slate-800">실행(평가)부서</th>
                    <th className="py-3 px-4 min-w-[240px]">제안 제목</th>
                    <th className="py-3 px-3 text-center">심사 상태</th>
                    <th className="py-3 px-3 text-center font-bold text-slate-900">검토 결과(Result)</th>
                    <th className="py-3 px-4 min-w-[260px]">부서 검토의견 (Opinion)</th>
                    <th className="py-3 px-3 text-center text-slate-400">제출일시</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {proposals.map((p) => {
                    const ev = evalMap.get(p.id);
                    const result = ev?.answers?.result;
                    const opinion = ev?.answers?.opinion;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">{p.seq_no}</td>
                        <td className="py-3 px-3">
                          <span className="text-[10px] text-slate-400 block">{p.assigned_division}</span>
                          <strong className="text-slate-800">{p.assigned_office} {p.assigned_department}</strong>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 line-clamp-1">{p.title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">제안자: {p.proposer_name} ({p.proposer_department})</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            p.status === '평가완료'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {result === 'Yes' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sky-100 text-sky-800 font-bold text-xs">
                              Yes (수용)
                            </span>
                          ) : result === 'No' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-xs">
                              No (불채택)
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {opinion ? (
                            <div className="text-slate-700 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                              {opinion}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">미작성</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center text-[11px] text-slate-400">
                          {ev?.submitted_at ? new Date(ev.submitted_at).toLocaleDateString('ko-KR') : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100">
              {proposals.map((p) => {
                const ev = evalMap.get(p.id);
                const result = ev?.answers?.result;
                const opinion = ev?.answers?.opinion;

                return (
                  <div key={p.id} className="p-3.5 space-y-2 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        #{p.seq_no}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {result === 'Yes' ? (
                          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-[10px]">
                            Yes (수용)
                          </span>
                        ) : result === 'No' ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                            No (불채택)
                          </span>
                        ) : null}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.status === '평가완료'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                      {p.title}
                    </h4>

                    <div className="text-[11px] text-slate-500">
                      담당: <strong className="text-sky-700">{p.assigned_department}</strong>
                    </div>

                    {opinion ? (
                      <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-500 block mb-0.5">검토의견:</span>
                        {opinion}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic">검토의견 미작성</div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">페이지 로딩 중...</div>}>
      <AdminReportsContent />
    </Suspense>
  );
}
