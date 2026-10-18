'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, Save, Send, AlertCircle, Building2, User, FileText, Check } from 'lucide-react';
import { Proposal, Evaluation } from '@/lib/types';

export default function EvaluateProposalPage() {
  const router = useRouter();
  const params = useParams();
  const proposalId = params.id as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 평가 입력 폼 상태
  const [result, setResult] = useState<'Yes' | 'No' | ''>('');
  const [opinion, setOpinion] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string>('');

  useEffect(() => {
    Promise.all([
      fetch('/api/proposals').then(r => r.json()),
      fetch(`/api/evaluations?proposal_id=${proposalId}`).then(r => r.json())
    ])
      .then(([proposals, ev]) => {
        const found = proposals.find((p: Proposal) => p.id === proposalId);
        setProposal(found || null);
        if (ev) {
          setEvaluation(ev);
          setResult(ev.answers?.result || '');
          setOpinion(ev.answers?.opinion || '');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [proposalId]);

  const handleSave = async (isSubmit: boolean) => {
    if (isSubmit && !result) {
      alert('0차 부서 평가 결과(Yes 또는 No)를 선택해 주세요.');
      return;
    }
    if (isSubmit && !opinion.trim()) {
      alert('부서 검토 의견(Opinion)을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const dept = typeof window !== 'undefined' ? localStorage.getItem('gcuc_dept_name') || '' : '';
      const user = typeof window !== 'undefined' ? localStorage.getItem('gcuc_user_name') || '' : '';

      const payload = {
        proposal_id: proposalId,
        session_id: proposal?.session_id || 'session-2026-gwacheon',
        department_name: dept || proposal?.assigned_department || '',
        evaluator_name: user,
        answers: {
          result,
          opinion: opinion.trim()
        },
        is_submitted: isSubmit
      };

      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        if (isSubmit) {
          alert('0차 부서 평가가 성공적으로 최종 제출되었습니다!');
          router.push('/evaluator');
        } else {
          setSaveToast('임시저장 완료되었습니다.');
          setTimeout(() => setSaveToast(''), 2500);
        }
      }
    } catch (err) {
      console.error(err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-500 text-sm">제안 정보를 불러오는 중...</div>;
  }

  if (!proposal) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <p className="text-sm text-slate-600 mb-4">해당 제안을 찾을 수 없습니다.</p>
        <Link href="/evaluator" className="text-xs text-sky-600 font-semibold underline">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/evaluator"
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition shadow-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>담당 제안 목록으로 돌아가기</span>
        </Link>

        {saveToast && (
          <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1 animate-pulse">
            <Check className="w-3.5 h-3.5" />
            {saveToast}
          </span>
        )}
      </div>

      {/* Main 2-Column Grid (모바일 1열 스택, PC 2열) */}
      <div className="grid lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column: 제안 원문 상세 (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
          <div className="border-b border-slate-100 pb-3 sm:pb-4">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs mb-2">
              <span className="bg-slate-100 text-slate-600 font-mono font-bold px-2 py-0.5 rounded">
                연번 #{proposal.seq_no}
              </span>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                게시판 #{proposal.board_no}
              </span>
              <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-semibold">
                {proposal.proposal_type}
              </span>
              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                분야: {proposal.category}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
              {proposal.title}
            </h2>
          </div>

          {/* 제안자 & 소속 정보 메타 카드 */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">제안자 정보</span>
              <strong className="text-slate-800 text-sm">{proposal.proposer_name}</strong>
              <span className="text-slate-500 ml-1.5 font-medium">({proposal.proposer_rank})</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">제안자 소속 부서</span>
              <strong className="text-slate-800 font-medium">
                {proposal.proposer_division} &gt; {proposal.proposer_office} {proposal.proposer_department}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">접수 일시</span>
              <span className="text-slate-700 font-mono">{proposal.submitted_at || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">평가 담당 부서</span>
              <span className="text-emerald-700 font-bold">
                {proposal.assigned_office} {proposal.assigned_department}
              </span>
            </div>
          </div>

          {/* 중복 제안 여부 알림 */}
          {proposal.is_duplicate === '중복' && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-1">
              <strong className="font-bold flex items-center gap-1.5 text-red-800">
                <AlertCircle className="w-4 h-4" />
                기존 제안과 중복 검토 필요
              </strong>
              <p className="text-[11px] leading-relaxed">
                중복 제안 이력: <strong>{proposal.duplicate_title}</strong>
              </p>
            </div>
          )}

          {/* 제안 내용 안내 */}
          <div className="space-y-2 pt-2">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-sky-600" />
              제안 주요 골자 및 타당성 검토 포인트
            </h4>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-700 leading-relaxed space-y-2">
              <p>
                본 제안은 <strong>{proposal.proposer_name}</strong> 제안자가 공사 혁신 및 업무개선을 위해 제안한 내용입니다.
              </p>
              <p className="text-slate-600 bg-white p-3 rounded-lg border border-slate-200 font-medium">
                "{proposal.title}"
              </p>
              <p className="text-[11px] text-slate-500">
                * 해당 제안이 부서의 실무 여건상 실현 가능한지, 예산 및 인력 배치가 타당한지 종합적으로 검토하여 우측 평가표를 작성해 주시기 바랍니다.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: 0차 부서 평가표 (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border-2 border-emerald-500/30 p-4 sm:p-6 shadow-md flex flex-col justify-between space-y-4 sm:space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  STAGE 0
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  0차 부서 타당성 평가표
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {evaluation?.is_submitted ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 제출 완료
                  </span>
                ) : (
                  <span className="text-amber-600 font-semibold">작성 중</span>
                )}
              </span>
            </div>

            {/* 항목 1: Result (Yes / No) */}
            <div className="space-y-2 mb-6">
              <label className="block text-xs font-bold text-slate-800">
                1. 부서 검토 결과 (수용 여부) <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                해당 제안을 부서 업무로 수용하여 1차 심사로 상정할지 결정합니다.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* Yes Button */}
                <button
                  type="button"
                  onClick={() => setResult('Yes')}
                  className={`p-4 rounded-xl border-2 transition flex flex-col items-center justify-center gap-1.5 text-center ${
                    result === 'Yes'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-md shadow-emerald-500/10'
                      : 'border-slate-200 hover:border-emerald-300 bg-slate-50 text-slate-700'
                  }`}
                >
                  <CheckCircle2 className={`w-6 h-6 ${result === 'Yes' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <strong className="text-sm font-bold">Yes (수용 / 채택)</strong>
                  <span className="text-[10px] text-slate-500">1차 심사 상정</span>
                </button>

                {/* No Button */}
                <button
                  type="button"
                  onClick={() => setResult('No')}
                  className={`p-4 rounded-xl border-2 transition flex flex-col items-center justify-center gap-1.5 text-center ${
                    result === 'No'
                      ? 'border-red-500 bg-red-50 text-red-800 shadow-md shadow-red-500/10'
                      : 'border-slate-200 hover:border-red-300 bg-slate-50 text-slate-700'
                  }`}
                >
                  <XCircle className={`w-6 h-6 ${result === 'No' ? 'text-red-500' : 'text-slate-400'}`} />
                  <strong className="text-sm font-bold">No (불수용)</strong>
                  <span className="text-[10px] text-slate-500">수용 불가 (의견 필수)</span>
                </button>
              </div>
            </div>

            {/* 항목 2: Opinion (서술형) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                2. 부서 검토 의견 (Opinion) <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-slate-500">
                {result === 'Yes'
                  ? '수용 사유, 추진 가능 시기, 예상 효과 등을 기재해 주십시오.'
                  : result === 'No'
                  ? '불수용 사유(법령 제한, 예산 부족, 기추진 사업 등)를 상세히 기재해 주십시오.'
                  : '부서 차원의 타당성 검토 의견을 상세히 작성해 주십시오.'}
              </p>

              <textarea
                rows={6}
                value={opinion}
                onChange={(e) => setOpinion(e.target.value)}
                placeholder="검토 의견을 구체적으로 작성해 주십시오..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={submitting}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold transition flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>임시저장</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={submitting}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>최종 제출하기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
