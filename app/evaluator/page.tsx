'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Building2, CheckCircle2, Clock, AlertCircle, ChevronRight, FileText, Check } from 'lucide-react';
import { Proposal, Evaluation, EvaluationSession } from '@/lib/types';
import { Layers } from 'lucide-react';

function EvaluatorDashboardContent() {
  const searchParams = useSearchParams();
  const [dept, setDept] = useState<string>('');
  const [sessions, setSessions] = useState<EvaluationSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. 세션 목록 로드
  useEffect(() => {
    fetch(`/api/sessions?_t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then((sessionList: EvaluationSession[]) => {
        const stage0Sessions = Array.isArray(sessionList)
          ? sessionList.filter(s => s.stage !== 'STAGE_1')
          : [];
        setSessions(stage0Sessions);

        if (stage0Sessions.length === 0) {
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

        if (!initialId || !stage0Sessions.some(s => s.id === initialId)) {
          initialId = stage0Sessions[0]?.id || '';
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

  // 2. 부서 및 선택 세션 데이터 로드
  useEffect(() => {
    let d = searchParams.get('dept');
    if (!d && typeof window !== 'undefined') {
      d = localStorage.getItem('gcuc_dept_name') || '회계부';
    }
    setDept(d || '');

    if (d && selectedSessionId) {
      setLoading(true);
      Promise.all([
        fetch(`/api/proposals?department=${encodeURIComponent(d)}&session_id=${encodeURIComponent(selectedSessionId)}&_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/evaluations?session_id=${encodeURIComponent(selectedSessionId)}&_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json())
      ])
        .then(([pList, eList]) => {
          setProposals(Array.isArray(pList) ? pList : []);
          setEvaluations(Array.isArray(eList) ? eList : []);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [searchParams, selectedSessionId]);

  const evalMap = new Map(evaluations.map(e => [e.proposal_id, e]));

  const completedCount = proposals.filter(p => p.status === '평가완료').length;
  const pendingCount = proposals.filter(p => p.status !== '평가완료').length;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-2 border border-emerald-200">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{dept} 부서 평가(0차 평가) 심사함</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {dept} 평가 담당 제안 목록
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            소관 업무와 관련된 제안의 타당성을 검토하고 채택(Yes) 또는 불채택(No) 여부 및 부서 검토의견을 작성해 주십시오. (타 부서 소관 제안인 경우 상세화면에서 실행 부서 변경을 요청할 수 있습니다.)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs">
          {sessions.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedSessionId}
                onChange={(e) => {
                  const sId = e.target.value;
                  setSelectedSessionId(sId);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('gcuc_active_session_id', sId);
                  }
                }}
                className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    [{s.year}년] {s.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              배정: <strong className="text-slate-900 font-bold">{proposals.length}건</strong>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-3 py-2">
              완료: <strong className="font-bold">{completedCount}건</strong>
            </div>
            <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3 py-2">
              미작성: <strong className="font-bold">{pendingCount}건</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Proposals List */}
      <div className="space-y-3">
        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            <p className="font-semibold text-slate-700 mb-1">등록된 제안평가 회차가 없습니다.</p>
            <p className="text-slate-400">관리자가 제안평가 회차를 등록하면 담당 제안이 표시됩니다.</p>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            담당 제안 목록을 불러오는 중...
          </div>
        ) : proposals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            현재 <strong>{dept}</strong>에 배정된 제안이 없습니다.
          </div>
        ) : (
          proposals.map((p) => {
            const ev = evalMap.get(p.id);
            const isCompleted = p.status === '평가완료';
            const resultVal = ev?.answers?.result;
            const isTransferredIn = p.assigned_department === dept && (
              (p.transfer_status === 'APPROVED' && p.transfer_target_dept === dept) ||
              p.transfer_history?.some(event => event.action === 'APPROVE' && event.target_department === dept)
            );

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-emerald-400 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      #{p.seq_no}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                      {p.proposal_type}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-medium">
                      분야: {p.category}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">
                      제안자 소속: {p.proposer_office} {p.proposer_department}
                    </span>

                    {isTransferredIn && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                        이관받은 제안
                      </span>
                    )}
                    {p.transfer_requested && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-300 flex items-center gap-1">
                        🔄 실행부서 변경 요청중 ({p.transfer_target_dept})
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {p.title}
                  </h3>

                  {p.is_duplicate === '중복' && (
                    <div className="text-[15px] text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg inline-block font-medium">
                      ⚠️ 중복 제안 이력 있음: {p.duplicate_title}
                    </div>
                  )}

                  {isCompleted && ev?.answers && (
                    <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-3">
                      <span className="font-semibold text-slate-500">평가 결과:</span>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                        resultVal === 'Yes' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {resultVal === 'Yes' ? '✓ Yes (수용/채택)' : '✗ No (불수용)'}
                      </span>
                      {ev.answers.opinion && (
                        <span className="text-slate-600 truncate max-w-md">
                          "{ev.answers.opinion}"
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 self-end md:self-center">
                  <Link
                    href={`/evaluator/evaluate/${p.id}`}
                    className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition flex items-center gap-1.5 shadow-sm ${
                      isCompleted
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    }`}
                  >
                    <span>{isCompleted ? '평가내용 수정' : '부서 평가(0차 평가) 작성'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function EvaluatorDashboardPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-500 text-xs">페이지 로딩 중...</div>}>
      <EvaluatorDashboardContent />
    </Suspense>
  );
}

