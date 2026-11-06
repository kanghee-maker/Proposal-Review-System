'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Award, CheckCircle2, Clock, ChevronRight, Layers, Building2 } from 'lucide-react';
import { Proposal, EvaluationSession, CommitteeScore, DEFAULT_STAGE1_JUDGES } from '@/lib/types';

function Stage1EvaluatorDashboardContent() {
  const searchParams = useSearchParams();
  const [judgeName, setJudgeName] = useState<string>('');
  const [judgeDept, setJudgeDept] = useState<string>('');
  const [sessions, setSessions] = useState<EvaluationSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [myScoresMap, setMyScoresMap] = useState<Map<string, CommitteeScore>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);

  // 1. 1차 심사 회차(STAGE_1) 목록 로드
  useEffect(() => {
    fetch(`/api/sessions?_t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then((sessionList: EvaluationSession[]) => {
        const stage1Sessions = Array.isArray(sessionList)
          ? sessionList.filter(s => s.stage === 'STAGE_1')
          : [];
        setSessions(stage1Sessions);

        if (stage1Sessions.length === 0) {
          setSelectedSessionId('');
          setProposals([]);
          setLoading(false);
          return;
        }

        const urlSessionId = searchParams.get('session_id');
        let initialId = urlSessionId || '';

        if (!initialId && typeof window !== 'undefined') {
          initialId = localStorage.getItem('gcuc_active_stage1_session_id') || '';
        }

        if (!initialId || !stage1Sessions.some(s => s.id === initialId)) {
          initialId = stage1Sessions[0]?.id || '';
        }

        setSelectedSessionId(initialId);
        if (initialId && typeof window !== 'undefined') {
          localStorage.setItem('gcuc_active_stage1_session_id', initialId);
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [searchParams]);

  // 2. 심사위원 정보 및 선택된 1차 회차 데이터 로드
  useEffect(() => {
    let jName = searchParams.get('judge') || '';
    if (!jName && typeof window !== 'undefined') {
      jName = localStorage.getItem('gcuc_dept_name') || DEFAULT_STAGE1_JUDGES[0]?.name || '박종용';
    }
    const matched = DEFAULT_STAGE1_JUDGES.find(j => j.name === jName);
    setJudgeName(jName);
    setJudgeDept(matched ? `${matched.dept} • ${matched.title}` : (typeof window !== 'undefined' ? localStorage.getItem('gcuc_judge_dept') || '' : ''));

    if (jName && selectedSessionId) {
      setLoading(true);
      Promise.all([
        fetch(`/api/proposals?session_id=${encodeURIComponent(selectedSessionId)}&_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/stage1/scores?session_id=${encodeURIComponent(selectedSessionId)}&_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json())
      ])
        .then(([pList, sList]) => {
          setProposals(Array.isArray(pList) ? pList : []);
          const scoreMap = new Map<string, CommitteeScore>();
          if (Array.isArray(sList)) {
            sList.forEach((sc: CommitteeScore) => {
              if (sc.judge_name === jName) {
                scoreMap.set(sc.proposal_id, sc);
              }
            });
          }
          setMyScoresMap(scoreMap);
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

  const completedCount = proposals.filter(p => myScoresMap.has(p.id)).length;
  const pendingCount = proposals.length - completedCount;

  return (
    <div className="space-y-6">
      {/* Banner (Orange/Amber Theme) */}
      <div className="bg-amber-50/80 rounded-2xl border-2 border-amber-200 border-l-[6px] border-l-amber-600 p-5 sm:p-6 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-2 border border-amber-300">
            <Award className="w-3.5 h-3.5 text-amber-700" />
            <span>[{judgeDept}] {judgeName} 위원 • 1차 제안심사 심사함</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            2026년도 제안심사 (1차 평가) 상정 제안 목록
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            0차 부서평가를 거쳐 상정된 제안의 내용과 부서 검토의견을 확인하시고, 창의성·실현성·효과성·전파성 점수와 심사 의견을 입력해 주십시오.
          </p>
        </div>

        <div className="flex min-w-0 max-w-full flex-col items-start gap-3 text-xs">
          {sessions.length > 1 && (
            <div className="flex items-center gap-1.5 bg-white border border-amber-300 rounded-xl px-3 py-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <select
                value={selectedSessionId}
                onChange={(e) => {
                  const sId = e.target.value;
                  setSelectedSessionId(sId);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('gcuc_active_stage1_session_id', sId);
                  }
                }}
                className="min-w-0 max-w-full bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    [{s.year}년] {s.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 whitespace-nowrap">
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2">
              상정 제안: <strong className="text-slate-900 font-bold">{proposals.length}건</strong>
            </div>
            <div className="bg-amber-100 border border-amber-300 text-amber-900 rounded-xl px-3 py-2">
              채점 완료: <strong className="font-bold">{completedCount}건</strong>
            </div>
            <div className="bg-white border border-slate-200 text-slate-600 rounded-xl px-3 py-2">
              미채점: <strong className="font-bold">{pendingCount}건</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Proposals List */}
      <div className="flex items-center gap-3 px-1" aria-hidden="true">
        <span className="text-sm font-semibold text-slate-700">1차 제안심사 대상 목록</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="space-y-3">
        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            <p className="font-semibold text-slate-700 mb-1">현재 개설된 1차 제안심사 회차가 없습니다.</p>
            <p className="text-slate-400">총괄 관리자가 0차 부서평가 결과를 1차 제안심사로 연계 생성하면 제안 목록이 표시됩니다.</p>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            1차 제안심사 목록을 불러오는 중...
          </div>
        ) : proposals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            해당 1차 심사 회차에 등록된 제안이 없습니다.
          </div>
        ) : (
          proposals.map((p) => {
            const myScore = myScoresMap.get(p.id);
            const isCompleted = Boolean(myScore);

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-amber-400 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      #{p.seq_no}
                    </span>
                    {p.board_no && (
                      <span className="font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                        게시판 #{p.board_no}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                      {p.proposal_type}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                      분야: {p.category}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">
                      실행부서: <strong className="text-slate-700">{p.assigned_department}</strong>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {p.title}
                  </h3>

                  {/* 0차 부서평가 검토의견 요약 */}
                  <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-slate-600">
                    <span className="font-bold text-sky-700 mr-2">
                      [0차 부서검토: {p.stage0_result || 'Yes'}]
                    </span>
                    <span className="line-clamp-1">
                      {p.stage0_opinion || '부서 자체 타당성 검토 완료 및 1차 심사 상정'}
                    </span>
                  </div>

                  {/* 본인 1차 채점 완료 시 점수 표시 */}
                  {isCompleted && myScore && (
                    <div className="text-xs bg-amber-50/80 p-2.5 rounded-xl border border-amber-200 flex flex-wrap items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white font-bold">
                        ✓ 내 채점 총점: {myScore.total_score}점
                      </span>
                      <span className="text-amber-900 font-medium">
                        (창의성 {myScore.creativity} / 실현성 {myScore.feasibility} / 효과성 {myScore.effectiveness} / 전파성 {myScore.dissemination})
                      </span>
                      {myScore.opinion && (
                        <span className="text-slate-600 truncate max-w-md">
                          &ldquo;{myScore.opinion}&rdquo;
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 self-end md:self-center">
                  <Link
                    href={`/evaluator/stage1/${p.id}?judge=${encodeURIComponent(judgeName)}`}
                    className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition flex items-center gap-1.5 shadow-sm ${
                      isCompleted
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-600/20'
                    }`}
                  >
                    <span>{isCompleted ? '1차 채점내용 수정' : '1차 제안심사 채점하기'}</span>
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

export default function Stage1EvaluatorDashboardPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-500 text-xs">페이지 로딩 중...</div>}>
      <Stage1EvaluatorDashboardContent />
    </Suspense>
  );
}
