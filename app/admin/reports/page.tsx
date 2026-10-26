'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DownloadCloud, CheckCircle2, Clock, FileSpreadsheet, AlertTriangle, ArrowDownToLine, Layers, ChevronRight, Sparkles, X, Check, ArrowRight } from 'lucide-react';
import { Proposal, Evaluation, EvaluationSession } from '@/lib/types';

function AdminReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sessions, setSessions] = useState<EvaluationSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 1차 제안심사 연계 생성 모달 상태
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState<boolean>(false);
  const [bridgeTitle, setBridgeTitle] = useState<string>('');
  const [bridgeFilterOnlyYes, setBridgeFilterOnlyYes] = useState<boolean>(true);
  const [bridgeSubmitting, setBridgeSubmitting] = useState<boolean>(false);

  // 1. 회차 목록 로드 및 현재 회차 결정
  useEffect(() => {
    fetch(`/api/sessions?_t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then((sessionList: EvaluationSession[]) => {
        setSessions(sessionList);

        if (!sessionList || sessionList.length === 0) {
          setSelectedSessionId('');
          setProposals([]);
          setEvaluations([]);
          setLoading(false);
          return;
        }

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
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [searchParams]);

  // 2. 선택된 회차의 데이터 로드
  const fetchReportData = (sessionId: string) => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`/api/proposals?session_id=${encodeURIComponent(sessionId)}&_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`/api/evaluations?session_id=${encodeURIComponent(sessionId)}&_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json())
    ])
      .then(([pData, eData]) => {
        setProposals(Array.isArray(pData) ? pData : []);
        setEvaluations(Array.isArray(eData) ? eData : []);
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
    } else {
      setLoading(false);
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

  const handleCreateStage1 = async () => {
    if (!selectedSessionId) return;
    setBridgeSubmitting(true);
    try {
      const defaultTitle = `${(currentSession?.title || '과천도시공사 제안 심사').replace('(0차 부서평가)', '').trim()} (1차 제안심사)`;
      const res = await fetch('/api/stage1/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSessionId: selectedSessionId,
          newTitle: bridgeTitle.trim() || defaultTitle,
          year: currentSession?.year || '2026',
          filterOnlyYes: bridgeFilterOnlyYes
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsBridgeModalOpen(false);
        alert(`1차 제안심사 회차가 성공적으로 연계 생성되었습니다! (대상 제안: ${data.proposalsCount}건)`);
        if (typeof window !== 'undefined') {
          localStorage.setItem('gcuc_active_session_id', data.session.id);
        }
        router.push(`/admin/stage1?session_id=${encodeURIComponent(data.session.id)}`);
      } else {
        alert(data.error || '생성 실패');
      }
    } catch (err) {
      alert('1차 심사 회차 연계 생성 중 오류가 발생했습니다.');
    } finally {
      setBridgeSubmitting(false);
    }
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
              <span className="text-[15px] font-bold text-sky-800 uppercase tracking-wider">
                현재 선택된 제안평가 회차
              </span>
              <span className="text-[14px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
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
          <p className="text-[15px] sm:text-xs text-slate-500 mt-1">
            선택된 평가 회차의 각 부서 심사 결과(Yes/No 및 검토의견)를 실시간 집계하고 보고용 엑셀로 내보냅니다. (부서 평가 완료 후 1차 제안심사 회차로 바로 연계)
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* 1차 제안심사 연계 버튼 */}
          <button
            onClick={() => {
              const defaultTitle = `${(currentSession?.title || '과천도시공사 제안 심사').replace('(0차 부서평가)', '').trim()} (1차 제안심사)`;
              setBridgeTitle(defaultTitle);
              setIsBridgeModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold text-xs sm:text-sm shadow-md shadow-amber-600/25 transition whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>✨ 이 결과로 1차 제안심사 생성</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition whitespace-nowrap"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>종합 결과 엑셀 다운로드</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (모바일 반응형 2x2 또는 4열 그리드) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <span className="text-xs text-slate-400 font-medium block mb-1">대상 제안 건수</span>
          <div className="flex items-baseline gap-2">
            <strong className="text-2xl sm:text-3xl font-bold text-slate-900">{totalCount}</strong>
            <span className="text-xs text-slate-500">건</span>
          </div>
          <div className="mt-2 text-[15px] text-slate-400">100% 배정 완료</div>
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
          <div className="mt-2 text-[15px] text-sky-600 font-medium">수용/채택 제안</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <span className="text-xs text-rose-600 font-medium block mb-1">부서 불채택 (No)</span>
          <div className="flex items-baseline gap-2">
            <strong className="text-2xl sm:text-3xl font-bold text-rose-600">{noCount}</strong>
            <span className="text-xs text-slate-500">건</span>
          </div>
          <div className="mt-2 text-[15px] text-rose-600 font-medium">불채택 제안</div>
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
        ) : sessions.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs space-y-2">
            <DownloadCloud className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700">등록된 제안평가 회차가 없습니다.</p>
            <p className="text-[15px] text-slate-400">관리자 대시보드에서 신규 제안평가를 먼저 생성해주세요.</p>
            <div className="pt-2">
              <Link href="/admin" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-sm transition">
                <span>제안평가 회차 대시보드로 이동</span>
              </Link>
            </div>
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
                          <span className="text-[14px] text-slate-400 block">{p.assigned_division}</span>
                          <strong className="text-slate-800">{p.assigned_office} {p.assigned_department}</strong>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 line-clamp-1">{p.title}</div>
                          <div className="text-[15px] text-slate-400 mt-0.5">제안자: {p.proposer_name} ({p.proposer_department})</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[15px] font-semibold ${
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
                            <span className="text-slate-400 italic text-[15px]">미작성</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center text-[15px] text-slate-400">
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
                      <span className="font-mono font-bold text-[15px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        #{p.seq_no}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {result === 'Yes' ? (
                          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-[14px]">
                            Yes (수용)
                          </span>
                        ) : result === 'No' ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[14px]">
                            No (불채택)
                          </span>
                        ) : null}
                        <span className={`px-2 py-0.5 rounded-full text-[14px] font-semibold ${
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

                    <div className="text-[15px] text-slate-500">
                      담당: <strong className="text-sky-700">{p.assigned_department}</strong>
                    </div>

                    {opinion ? (
                      <div className="text-[15px] text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-500 block mb-0.5">검토의견:</span>
                        {opinion}
                      </div>
                    ) : (
                      <div className="text-[14px] text-slate-400 italic">검토의견 미작성</div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* --- 모달: 1차 제안심사 연계 생성 --- */}
      {isBridgeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">제안 심사(1차 평가) 회차로 연계 생성</h3>
                  <p className="text-xs text-slate-500">부서평가(0차) 검토 결과를 바탕으로 1차 심사위원회를 개설합니다.</p>
                </div>
              </div>
              <button
                onClick={() => setIsBridgeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1 font-medium">출처 부서평가(0차) 회차</span>
                <strong className="text-sm text-slate-900 block mb-2">{currentSession?.title}</strong>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[14px]">전체 제안</span>
                    <strong className="text-slate-800 text-xs">{totalCount}건</strong>
                  </div>
                  <div className="bg-sky-50 p-2 rounded-lg border border-sky-100">
                    <span className="text-sky-600 block text-[14px]">부서 채택 (Yes)</span>
                    <strong className="text-sky-700 text-xs">{yesCount}건</strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[14px]">부서 불채택 (No)</span>
                    <strong className="text-slate-600 text-xs">{noCount}건</strong>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">이관 대상 제안 선택</label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                    bridgeFilterOnlyYes ? 'border-amber-400 bg-amber-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}>
                    <input
                      type="radio"
                      name="bridgeFilter"
                      checked={bridgeFilterOnlyYes}
                      onChange={() => setBridgeFilterOnlyYes(true)}
                      className="mt-0.5 text-amber-600"
                    />
                    <div>
                      <strong className="text-slate-900 block font-semibold">
                        부서 채택(Yes) 제안만 1차 심사로 이관 (권장)
                      </strong>
                      <span className="text-[15px] text-slate-500">
                        부서 자체 타당성 검토에서 &apos;Yes&apos;를 받은 우수 제안({yesCount}건)만 제안심사위원회 심사 대상으로 선별 이관합니다.
                      </span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                    !bridgeFilterOnlyYes ? 'border-amber-400 bg-amber-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}>
                    <input
                      type="radio"
                      name="bridgeFilter"
                      checked={!bridgeFilterOnlyYes}
                      onChange={() => setBridgeFilterOnlyYes(false)}
                      className="mt-0.5 text-amber-600"
                    />
                    <div>
                      <strong className="text-slate-900 block font-semibold">
                        전체 제안 ({totalCount}건) 모두 1차 심사로 이관
                      </strong>
                      <span className="text-[15px] text-slate-500">
                        부서 채택 여부와 무관하게 모든 제안을 1차 위원회 심사 대상으로 이관합니다.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  새로 생성할 1차 제안심사 회차명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bridgeTitle}
                  onChange={(e) => setBridgeTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-[15px] text-amber-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>1차 심사위원회 11인 평가단 자동 배정</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  경영감사실, 미래전략실, 시설기획부, 사업기획부, 개발1부, 여가체육부 등 11인의 제안1차심사위원이 자동 배정되며, 0차 부서 검토의견이 1차 심사위원들에게 참고자료로 자동 연계 제공됩니다.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBridgeModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleCreateStage1}
                  disabled={bridgeSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-600/20 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>{bridgeSubmitting ? '연계 생성 중...' : '1차 제안심사 생성 및 즉시 이동'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
