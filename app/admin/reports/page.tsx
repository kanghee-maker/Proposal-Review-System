'use client';

import React, { useState, useEffect } from 'react';
import { DownloadCloud, CheckCircle2, Clock, FileSpreadsheet, AlertTriangle, ArrowDownToLine } from 'lucide-react';
import { Proposal, Evaluation } from '@/lib/types';

export default function AdminReportsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/proposals').then(r => r.json()),
      fetch('/api/evaluations').then(r => r.json())
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
  }, []);

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
    window.location.href = '/api/export';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <DownloadCloud className="w-5 h-5 text-sky-600 flex-shrink-0" />
            0차 부서평가 결과 취합 및 엑셀 다운로드
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            각 부서의 심사 결과(Yes/No 및 검토의견)를 실시간 집계하고 보고용 엑셀로 내보냅니다.
          </p>
        </div>

        <button
          onClick={handleDownloadExcel}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/25 transition"
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span>최종 종합결과 엑셀 다운로드 (.xlsx)</span>
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-slate-400 block mb-1 font-semibold text-[11px]">전체 대상 제안</span>
          <strong className="text-xl sm:text-2xl font-bold text-slate-900">{totalCount}건</strong>
          <span className="text-[10px] text-slate-400 mt-1 block">2026년 공모 총계</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-slate-400 block mb-1 font-semibold text-[11px]">0차 부서평가 완료율</span>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <strong className="text-xl sm:text-2xl font-bold text-sky-600">{rate}%</strong>
            <span className="text-[10px] sm:text-xs text-slate-500">({completedCount}/{totalCount})</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-sky-500 h-full rounded-full transition-all" style={{ width: `${rate}%` }} />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-emerald-600 font-semibold block mb-1 flex items-center gap-1 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" /> 부서 수용 (Yes)
          </span>
          <strong className="text-xl sm:text-2xl font-bold text-emerald-700">{yesCount}건</strong>
          <span className="text-[10px] text-slate-400 mt-1 block">1차 심사 상정 대상</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-red-500 font-semibold block mb-1 flex items-center gap-1 text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5" /> 부서 불수용 (No)
          </span>
          <strong className="text-xl sm:text-2xl font-bold text-red-600">{noCount}건</strong>
          <span className="text-[10px] text-slate-400 mt-1 block">부서 검토의견 첨부</span>
        </div>
      </div>

      {/* Aggregate Preview Table / Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            0차 부서평가 결과 실시간 취합표
          </h3>
          <span className="text-[10px] sm:text-[11px] text-slate-500">
            * 엑셀 다운로드 시 137건 전체 서식이 출력됩니다.
          </span>
        </div>

        {/* 1. Desktop Table (md 이상) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-3 w-12 text-center">연번</th>
                <th className="py-3 px-3">제안자</th>
                <th className="py-3 px-3">담당부서 (처/실 - 부)</th>
                <th className="py-3 px-4 min-w-[240px]">제안 제목</th>
                <th className="py-3 px-3 text-center">진행 상태</th>
                <th className="py-3 px-3 text-center font-bold text-sky-900">검토 결과 (Result)</th>
                <th className="py-3 px-4 min-w-[260px]">부서 검토 의견 (Opinion)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">데이터 취합 중...</td>
                </tr>
              ) : (
                proposals.slice(0, 30).map(p => {
                  const ev = evalMap.get(p.id);
                  const result = ev?.answers?.result;
                  const opinion = ev?.answers?.opinion;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 text-center text-slate-400 font-mono font-medium">{p.seq_no}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{p.proposer_name}</td>
                      <td className="py-3 px-3 text-slate-700">
                        <span className="text-[11px] text-slate-400 block">{p.assigned_office}</span>
                        {p.assigned_department}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 line-clamp-1">{p.title}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          p.status === '평가완료'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {result === 'Yes' ? (
                          <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                            Yes (수용)
                          </span>
                        ) : result === 'No' ? (
                          <span className="inline-block px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-bold text-xs">
                            No (불수용)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 line-clamp-2">
                        {opinion || <span className="text-slate-300 italic">미작성</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 2. Mobile Card List (md 미만) */}
        <div className="md:hidden divide-y divide-slate-100">
          {proposals.slice(0, 30).map(p => {
            const ev = evalMap.get(p.id);
            const result = ev?.answers?.result;
            const opinion = ev?.answers?.opinion;

            return (
              <div key={p.id} className="p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                    #{p.seq_no}
                  </span>
                  <span className="text-[10px] text-slate-400">{p.assigned_department}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    result === 'Yes'
                      ? 'bg-emerald-100 text-emerald-800'
                      : result === 'No'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {result === 'Yes' ? 'Yes (수용)' : result === 'No' ? 'No (불수용)' : '미평가'}
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-900 leading-snug">
                  {p.title}
                </div>

                {opinion && (
                  <div className="text-[11px] bg-slate-50 p-2 rounded-lg text-slate-600 border border-slate-100 italic">
                    "{opinion}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
