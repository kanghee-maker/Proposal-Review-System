'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Award, Send, AlertCircle, FileText, Check, Paperclip, Download, Building2 } from 'lucide-react';
import { Proposal, CommitteeScore, DEFAULT_STAGE1_JUDGES } from '@/lib/types';
import AdoptionCriteria from '../AdoptionCriteria';
import { readLocalScores, removeLocalScore } from '@/lib/stage1LocalScores';

function Stage1EvaluateProposalContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const proposalId = params.id as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [judgeName, setJudgeName] = useState<string>('');
  const [judgeDept, setJudgeDept] = useState<string>('');
  const [judgeTitle, setJudgeTitle] = useState<string>('제안1차심사자');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState('');

  // 1차 심사 채점 상태 (기본값: 각 배점의 중간값 15 / 15 / 15 / 5 = 총점 50점)
  const [creativity, setCreativity] = useState<number>(15);
  const [feasibility, setFeasibility] = useState<number>(15);
  const [effectiveness, setEffectiveness] = useState<number>(15);
  const [dissemination, setDissemination] = useState<number>(5);
  const [opinion, setOpinion] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string>('');
  const [hasLocalScore, setHasLocalScore] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const totalScore = Number(creativity || 0) + Number(feasibility || 0) + Number(effectiveness || 0) + Number(dissemination || 0);
  const sessionId = proposal?.session_id || searchParams.get('session_id') || '';
  const returnParams = new URLSearchParams({ judge: judgeName });
  if (sessionId) returnParams.set('session_id', sessionId);
  const returnLink = `/evaluator/stage1?${returnParams}`;

  useEffect(() => {
    setHasLocalScore(false);
    let jName = searchParams.get('judge') || '';
    if (!jName && typeof window !== 'undefined') {
      jName = localStorage.getItem('gcuc_dept_name') || DEFAULT_STAGE1_JUDGES[0]?.name || '박종용';
    }
    const matched = DEFAULT_STAGE1_JUDGES.find(j => j.name === jName);
    setJudgeName(jName);
    setJudgeDept(matched?.dept || (typeof window !== 'undefined' ? localStorage.getItem('gcuc_judge_dept') || '' : ''));
    setJudgeTitle(matched?.title || '제안1차심사자');

    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    setProposal(null);
    const requestOptions = { cache: 'no-store' as const, signal: controller.signal };
    fetch(`/api/proposals?id=${encodeURIComponent(proposalId)}`, requestOptions)
      .then(async response => {
        if (!response.ok) throw new Error('제안과 연결된 평가 자료를 불러오지 못했습니다.');
        const prop: Proposal | null = await response.json();
        if (!prop) return [null, []] as const;
        const query = new URLSearchParams({ session_id: prop.session_id, proposal_id: proposalId, include_draft: '1' });
        const scoresResponse = await fetch(`/api/stage1/scores?${query}`, requestOptions);
        if (!scoresResponse.ok) throw new Error('기존 심사 점수를 불러오지 못했습니다.');
        const scoreList: CommitteeScore[] = await scoresResponse.json();
        return [prop, scoreList] as const;
      })
      .then(([prop, scoreList]) => {
        if (controller.signal.aborted) return;
        setProposal(prop || null);
        if (prop && Array.isArray(scoreList) && jName) {
          const finalScore = scoreList.find((s: CommitteeScore) => s.judge_name === jName && !s.is_draft);
          const draft = scoreList.find((s: CommitteeScore) => s.judge_name === jName && s.is_draft);
          const savedScore = draft && (!finalScore || Date.parse(draft.submitted_at || '') > Date.parse(finalScore.submitted_at || ''))
            ? draft : finalScore;
          let localScore: CommitteeScore | undefined;
          if (!savedScore) {
            try {
              localScore = readLocalScores(prop.session_id, jName)
                .filter(score => score.proposal_id === proposalId)
                .sort((a, b) => Date.parse(b.submitted_at || '') - Date.parse(a.submitted_at || ''))[0];
            } catch {
              // Browser storage can be unavailable even when database access works.
            }
          }
          const existing = savedScore ?? localScore;
          setIsSubmitted(Boolean(finalScore));
          setHasLocalScore(Boolean(localScore));
          setCreativity(existing?.creativity ?? 15);
          setFeasibility(existing?.feasibility ?? 15);
          setEffectiveness(existing?.effectiveness ?? 15);
          setDissemination(existing?.dissemination ?? 5);
          setOpinion(existing?.opinion && existing.opinion !== '-' ? existing.opinion : '');
        }
        setLoading(false);
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        console.error(err);
        setLoadError('제안 또는 저장된 심사 점수를 불러오지 못했습니다. 다시 시도해 주세요.');
        setLoading(false);
      });
    return () => controller.abort();
  }, [proposalId, searchParams]);

  const handleSaveScore = async (isFinal: boolean) => {
    if (!proposal || !judgeName) return;

    setSubmitting(true);
    try {
      const payload = {
        proposal_id: proposal.id,
        session_id: proposal.session_id,
        judge_name: judgeName,
        judge_dept: judgeDept,
        judge_title: judgeTitle,
        creativity: Number(creativity || 0),
        feasibility: Number(feasibility || 0),
        effectiveness: Number(effectiveness || 0),
        dissemination: Number(dissemination || 0),
        opinion: opinion.trim() || '-',
        is_draft: !isFinal
      };

      const res = await fetch('/api/stage1/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setHasLocalScore(false);
        if (isFinal) {
          setIsSubmitted(true);
          alert(`[${data.score.judge_name} 위원] 1차 제안심사 채점 결과(총점 ${data.score.total_score}점)가 최종 제출되었습니다!`);
          router.push(returnLink);
        } else {
          setIsSubmitted(false);
          setSaveToast('임시저장 완료되었습니다.');
          setTimeout(() => setSaveToast(''), 2500);
        }
      } else {
        alert(data.error || '채점 저장 중 오류가 발생했습니다.');
      }
    } catch (err) {
      alert('서버 통신 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmission = async () => {
    if (!proposal || !judgeName) return;
    if (!window.confirm('제출 완료 상태를 취소하고 임시저장(작성중) 상태로 되돌리시겠습니까?\n(현재 입력된 점수와 검토 의견은 그대로 유지됩니다.)')) {
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        proposal_id: proposal.id,
        session_id: proposal.session_id,
        judge_name: judgeName,
        judge_dept: judgeDept,
        judge_title: judgeTitle,
        creativity: Number(creativity || 0),
        feasibility: Number(feasibility || 0),
        effectiveness: Number(effectiveness || 0),
        dissemination: Number(dissemination || 0),
        opinion: opinion.trim() || '-',
        is_draft: true
      };

      const res = await fetch('/api/stage1/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsSubmitted(false);
        setSaveToast('제출이 취소되어 임시저장 상태로 전환되었습니다.');
        setTimeout(() => setSaveToast(''), 3000);
      } else {
        alert(data.error || '제출 취소 중 오류가 발생했습니다.');
      }
    } catch {
      alert('서버 통신 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetScore = async () => {
    if (!proposal || !judgeName) return;
    if (!window.confirm('입력하신 채점 점수와 검토 의견을 모두 삭제하고 최초 상태(미채점 기본값)로 초기화하시겠습니까?')) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/stage1/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset',
          proposal_id: proposal.id,
          session_id: proposal.session_id,
          judge_name: judgeName
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        removeLocalScore(proposal.session_id, proposal.id, judgeName);
        setHasLocalScore(false);
        setIsSubmitted(false);
        setCreativity(15);
        setFeasibility(15);
        setEffectiveness(15);
        setDissemination(5);
        setOpinion('');
        setSaveToast('내용이 최초 상태(미채점)로 초기화되었습니다.');
        setTimeout(() => setSaveToast(''), 3000);
      } else {
        alert(data.error || '내용 초기화 중 오류가 발생했습니다.');
      }
    } catch {
      alert('서버 통신 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-500 text-sm">제안 및 심사 정보를 불러오는 중...</div>;
  }

  if (!proposal) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <p className="text-sm text-slate-600 mb-4">{loadError || '해당 제안을 찾을 수 없습니다.'}</p>
        <Link href={returnLink} className="text-xs text-amber-600 font-semibold underline">
          1차 심사 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={returnLink}
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition shadow-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>1차 제안심사 대상 목록으로 돌아가기</span>
        </Link>

        {hasLocalScore && (
          <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            이 브라우저에 남아 있던 점수를 불러왔습니다. 내용을 확인한 뒤 저장하면 DB에 반영됩니다.
          </p>
        )}
        {saveToast && (
          <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1 animate-pulse">
            <Check className="w-3.5 h-3.5" />
            {saveToast}
          </span>
        )}
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column: 제안 원문 및 0차 부서검토 상세 (7 cols) */}
        <div className="min-w-0 break-words xl:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
          <div className="border-b border-slate-100 pb-3 sm:pb-4">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[15px] sm:text-xs mb-2">
              <span className="bg-slate-100 text-slate-600 font-mono font-bold px-2 py-0.5 rounded">
                연번 #{proposal.seq_no}
              </span>
              {proposal.board_no && (
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                  게시판 #{proposal.board_no}
                </span>
              )}
              <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-semibold">
                {proposal.proposal_type}
              </span>
              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                분야: {proposal.category}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
              {proposal.title}
            </h2>
          </div>

          {/* 0차 부서평가 검토결과 하이라이트 박스 */}
          <div className="rounded-xl border-2 border-sky-200 bg-sky-50/60 p-4 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-sky-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-sky-600" />
                <span>0차 부서평가 검토 의견{proposal.stage0_dept && ` (${proposal.stage0_dept})`}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-sky-600 text-white font-bold">
                {proposal.stage0_result === 'Yes' ? '채택' : proposal.stage0_result === 'No' ? '불채택' : proposal.stage0_result || '결과 미확인'}
              </span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-sky-100 text-slate-700 leading-relaxed whitespace-pre-wrap">
              {proposal.stage0_opinion || '확인할 수 있는 0차 부서 검토 의견이 없습니다.'}
            </div>
          </div>

          {/* 제안자 & 소속 정보 메타 카드 */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid sm:grid-cols-2 gap-3 text-xs">
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
              <span className="text-slate-400 block mb-0.5">실행(소관) 부서</span>
              <span className="text-amber-700 font-bold">
                {proposal.assigned_office} {proposal.assigned_department}
              </span>
            </div>
          </div>

          {/* 중복/유사 제안 검토 알림 */}
          {(proposal.is_duplicate === '중복' || proposal.review_result) && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-1.5">
              <strong className="font-bold flex items-center gap-1.5 text-red-800">
                <AlertCircle className="w-4 h-4" />
                기존 제안 중복·유사 여부 검토 안내 {proposal.review_result ? `(${proposal.review_result})` : ''}
              </strong>
              {proposal.duplicate_title && (
                <p className="text-[15px] leading-relaxed">
                  중복 제안 이력: <strong>{proposal.duplicate_title}</strong>
                </p>
              )}
              {proposal.comparison_target && (
                <p className="text-[15px] leading-relaxed">
                  비교 대상 제안: <strong>{proposal.comparison_target}</strong>
                </p>
              )}
              {proposal.review_basis && (
                <p className="text-[15px] leading-relaxed text-red-800/90">
                  판단 근거: {proposal.review_basis}
                </p>
              )}
            </div>
          )}

          {/* 제안서 상세 내용 */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>제안서 본문 상세 내용</span>
              </h4>
            </div>

            {proposal.background || proposal.content || proposal.expected_effect ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white divide-y divide-slate-200 text-xs">
                {proposal.background && (
                  <div className="grid sm:grid-cols-12">
                    <div className="sm:col-span-2 bg-slate-50 px-3.5 py-3 font-bold text-slate-700 flex items-start sm:border-r border-slate-200">
                      배 경
                    </div>
                    <div className="sm:col-span-10 p-3.5 text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {proposal.background}
                    </div>
                  </div>
                )}

                {proposal.content && (
                  <div className="grid sm:grid-cols-12">
                    <div className="sm:col-span-2 bg-slate-50 px-3.5 py-3 font-bold text-slate-700 flex items-start sm:border-r border-slate-200">
                      추진내용
                    </div>
                    <div className="sm:col-span-10 p-3.5 text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {proposal.content}
                    </div>
                  </div>
                )}

                {proposal.expected_effect && (
                  <div className="grid sm:grid-cols-12">
                    <div className="sm:col-span-2 bg-slate-50 px-3.5 py-3 font-bold text-slate-700 flex items-start sm:border-r border-slate-200">
                      기대효과
                    </div>
                    <div className="sm:col-span-10 p-3.5 text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {proposal.expected_effect}
                    </div>
                  </div>
                )}

                {proposal.attachment_note && (
                  <div className="grid sm:grid-cols-12">
                    <div className="sm:col-span-2 bg-slate-50 px-3.5 py-3 font-bold text-slate-700 flex items-start sm:border-r border-slate-200">
                      첨부 자료 안내
                    </div>
                    <div className="sm:col-span-10 p-3.5 text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {proposal.attachment_note}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                {proposal.title}
              </div>
            )}

            {/* 추가 시트 데이터 */}
            {proposal.extra_sheets && proposal.extra_sheets.length > 0 && (
              <div className="space-y-3 pt-2">
                {proposal.extra_sheets.map((sheet, sIdx) => (
                  <div key={sIdx} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 font-bold text-xs text-slate-800">
                      <span>[추가 시트] {sheet.sheetName}</span>
                    </div>
                    <div className="overflow-x-auto max-h-80">
                      <table className="w-full text-[15px] border-collapse">
                        <tbody className="divide-y divide-slate-100">
                          {sheet.rows.map((row, rIdx) => (
                            <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-50 font-semibold text-slate-800' : 'text-slate-700'}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-3 py-2 border-r border-slate-100 last:border-r-0 whitespace-pre-wrap align-top">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 첨부파일 섹션 */}
          <div className="space-y-2 pt-2">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-amber-600" />
              <span>제안서 첨부파일 ({(proposal.attachments || []).length}건)</span>
            </h4>
            {(proposal.attachments || []).length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-400">
                등록된 첨부파일이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {(proposal.attachments || []).map((att) => (
                  <div key={att.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="font-medium text-slate-800 truncate">{att.name}</span>
                    </div>
                    <a
                      href={att.static_url || `/api/proposals/attachments?attachment_id=${encodeURIComponent(att.id)}`}
                      download={att.name}
                      className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1 flex-shrink-0 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>다운로드</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 1차 제안심사 채점표 (5 cols, Orange/Amber Theme) */}
        <div className="xl:col-span-5">
          <div className="bg-white rounded-2xl border-2 border-amber-300 p-5 sm:p-6 shadow-md space-y-5 sticky top-20">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">1차 제안심사 채점표</h3>
                  <p className="text-xs text-amber-700 font-semibold">
                    심사위원: [{judgeDept}] {judgeName} 위원
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[13px] text-slate-400 block">합계 총점</span>
                <strong className="text-2xl font-extrabold text-amber-600">{totalScore}점</strong>
              </div>
            </div>

            <AdoptionCriteria />

            <div className="space-y-4 text-xs">
              {/* 1. 창의성 */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-sm">
                    1. 창의성 <span className="text-xs text-slate-500 font-normal">(배점 0 ~ 30점)</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={creativity}
                      onChange={(e) => setCreativity(Math.min(30, Math.max(0, Number(e.target.value))))}
                      className="w-16 text-center bg-white border-2 border-amber-400 rounded-lg py-1 font-extrabold text-sm text-slate-900"
                    />
                    <span className="font-semibold text-slate-600">점</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={creativity}
                  onChange={(e) => setCreativity(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              {/* 2. 실현성 */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-sm">
                    2. 실현성 <span className="text-xs text-slate-500 font-normal">(배점 0 ~ 30점)</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={feasibility}
                      onChange={(e) => setFeasibility(Math.min(30, Math.max(0, Number(e.target.value))))}
                      className="w-16 text-center bg-white border-2 border-amber-400 rounded-lg py-1 font-extrabold text-sm text-slate-900"
                    />
                    <span className="font-semibold text-slate-600">점</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={feasibility}
                  onChange={(e) => setFeasibility(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              {/* 3. 효과성 */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-sm">
                    3. 효과성 <span className="text-xs text-slate-500 font-normal">(배점 0 ~ 30점)</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={effectiveness}
                      onChange={(e) => setEffectiveness(Math.min(30, Math.max(0, Number(e.target.value))))}
                      className="w-16 text-center bg-white border-2 border-amber-400 rounded-lg py-1 font-extrabold text-sm text-slate-900"
                    />
                    <span className="font-semibold text-slate-600">점</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={effectiveness}
                  onChange={(e) => setEffectiveness(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              {/* 4. 전파성 */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-sm">
                    4. 전파성 <span className="text-xs text-slate-500 font-normal">(배점 0 ~ 10점)</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={dissemination}
                      onChange={(e) => setDissemination(Math.min(10, Math.max(0, Number(e.target.value))))}
                      className="w-16 text-center bg-white border-2 border-amber-400 rounded-lg py-1 font-extrabold text-sm text-slate-900"
                    />
                    <span className="font-semibold text-slate-600">점</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={dissemination}
                  onChange={(e) => setDissemination(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              {/* 5. 심사위원 의견 */}
              <div>
                <label className="block font-bold text-slate-800 text-sm mb-1.5">
                  5. 심사위원 검토 의견 (Opinion) <span className="text-xs font-normal text-slate-500">· 선택</span>
                </label>
                <textarea
                  rows={4}
                  value={opinion}
                  onChange={(e) => setOpinion(e.target.value)}
                  placeholder="제안에 대한 1차 심사 의견(보완 필요사항, 기대효과 등)을 입력해 주세요..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              {isSubmitted && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                  <span className="font-bold text-amber-900">✓ 현재 최종 제출 완료 상태입니다.</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleCancelSubmission}
                      className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition disabled:opacity-50"
                    >
                      제출 취소 (임시저장 전환)
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleResetScore}
                      className="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition disabled:opacity-50"
                    >
                      내용 초기화
                    </button>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                {!isSubmitted && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleResetScore}
                    className="py-3 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 font-semibold text-xs transition disabled:opacity-50 whitespace-nowrap"
                  >
                    내용 초기화
                  </button>
                )}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSaveScore(false)}
                  className="flex-1 py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition disabled:opacity-50 whitespace-nowrap"
                >
                  임시저장
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSaveScore(true)}
                  className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-lg shadow-amber-600/25 flex items-center justify-center gap-1.5 transition disabled:opacity-50 whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? '제출 중...' : `1차 심사 채점 제출 (${totalScore}점)`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Stage1EvaluateProposalPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-500 text-xs">페이지 로딩 중...</div>}>
      <Stage1EvaluateProposalContent />
    </Suspense>
  );
}
