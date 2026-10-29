'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, Save, Send, AlertCircle, Building2, User, FileText, Check, Paperclip, Download, Eye } from 'lucide-react';
import { Proposal, Evaluation, Department } from '@/lib/types';

function EvaluateProposalContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const proposalId = params.id as string;
  const isReadOnly = searchParams.get('readonly') === '1';

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 평가 입력 폼 상태
  const [result, setResult] = useState<'Yes' | 'No' | ''>('');
  const [opinion, setOpinion] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string>('');

  // 실행 부서 변경 요청 상태
  const [isTransferOpen, setIsTransferOpen] = useState<boolean>(false);
  const [targetDept, setTargetDept] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [transferSaving, setTransferSaving] = useState<boolean>(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/proposals?id=${encodeURIComponent(proposalId)}`).then(r => r.json()),
      fetch(`/api/evaluations?proposal_id=${encodeURIComponent(proposalId)}`).then(r => r.json()),
      fetch('/api/organization').then(r => r.json())
    ])
      .then(([prop, ev, orgData]) => {
        setProposal(prop || null);
        if (ev) {
          setEvaluation(ev);
          setResult(ev.answers?.result || '');
          setOpinion(ev.answers?.opinion || '');
        }
        if (orgData?.departments) {
          setDepartments(orgData.departments);
          if (orgData.departments.length > 0) {
            setTargetDept(orgData.departments[0].department);
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [proposalId]);

  const handleSave = async (isSubmit: boolean) => {
    if (isReadOnly) return;
    if (isSubmit && !result) {
      alert('부서 평가(0차 평가) 결과(Yes 또는 No)를 선택해 주세요.');
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
          alert('부서 평가(0차 평가)가 성공적으로 최종 제출되었습니다!\n(향후 제안 심사(1차 평가) 위원회 자료로 상정됩니다.)');
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

  // 실행 부서 변경 요청 제출
  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !proposal) return;
    if (!transferReason.trim()) {
      alert('실행 부서 변경 요청 사유를 작성해 주세요.');
      return;
    }

    setTransferSaving(true);
    try {
      const updated: Proposal = {
        ...proposal,
        transfer_requested: true,
        transfer_target_dept: targetDept,
        transfer_reason: transferReason.trim(),
        transfer_requested_at: new Date().toISOString(),
        transfer_status: 'PENDING'
      };

      const res = await fetch('/api/proposals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success) {
        setProposal(updated);
        setIsTransferOpen(false);
        alert(`[${targetDept}](으)로의 실행 부서 변경 요청이 접수되었습니다.\n총괄 관리자가 확인 후 승인 시 해당 부서로 이관됩니다.`);
      } else {
        alert('요청 중 오류가 발생했습니다.');
      }
    } catch (err) {
      alert('서버 통신 실패');
    } finally {
      setTransferSaving(false);
    }
  };

  // 실행 부서 변경 요청 취소
  const handleCancelTransfer = async () => {
    if (isReadOnly || !proposal) return;
    if (!confirm('실행 부서 변경 요청을 취소하시겠습니까?')) return;

    setTransferSaving(true);
    try {
      const updated: Proposal = {
        ...proposal,
        transfer_requested: false,
        transfer_status: undefined,
        transfer_reason: '',
        transfer_target_dept: ''
      };

      const res = await fetch('/api/proposals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success) {
        setProposal(updated);
        alert('실행 부서 변경 요청이 취소되었습니다.');
      }
    } catch (err) {
      alert('요청 취소 실패');
    } finally {
      setTransferSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-500 text-sm">제안 정보를 불러오는 중...</div>;
  }

  if (!proposal) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <p className="text-sm text-slate-600 mb-4">해당 제안을 찾을 수 없습니다.</p>
        <Link href={isReadOnly ? `/admin/proposals?session_id=${encodeURIComponent('')}` : '/evaluator'} className="text-xs text-sky-600 font-semibold underline">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={isReadOnly ? `/admin/proposals?session_id=${encodeURIComponent(proposal.session_id || '')}` : '/evaluator'}
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition shadow-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isReadOnly ? '관리자 제안 목록/배정으로 돌아가기' : '담당 제안 목록으로 돌아가기'}</span>
        </Link>

        {isReadOnly && (
          <div className="inline-flex items-center gap-1.5 text-xs text-sky-800 bg-sky-50 border border-sky-200 px-3.5 py-2 rounded-xl font-bold shadow-xs">
            <Eye className="w-4 h-4 text-sky-600" />
            <span>관리자 조회 전용 모드 (평가자 화면 미리보기 — 항목 수정 불가)</span>
          </div>
        )}

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
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[15px] sm:text-xs mb-2">
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
              <span className="text-slate-400 block mb-0.5">심사 방식</span>
              <strong className="text-slate-800 text-sm">제안자 이름 비공개</strong>
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

          {/* 실행 부서 변경 요청 (타 부서 이관 신청) 섹션 */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>실행(평가) 부서 변경 요청 (타 부서 이관)</span>
              </div>
              {proposal.transfer_requested ? (
                <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-bold text-[14px]">
                  변경 요청 심사 대기중
                </span>
              ) : !isReadOnly ? (
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(!isTransferOpen)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 font-semibold text-[15px] transition shadow-xs"
                >
                  {isTransferOpen ? '닫기' : '부서 변경 요청하기'}
                </button>
              ) : (
                <span className="text-[15px] text-amber-700/70 font-medium">조회 전용</span>
              )}
            </div>

            {proposal.transfer_requested ? (
              <div className="bg-white p-3 rounded-lg border border-amber-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] text-slate-500">희망 이관 부서:</span>
                  <strong className="text-amber-800 font-bold">{proposal.transfer_target_dept}</strong>
                </div>
                <div className="text-[15px] text-slate-600">
                  <span className="text-slate-400 block mb-0.5">요청 사유:</span>
                  "{proposal.transfer_reason}"
                </div>
                {!isReadOnly && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleCancelTransfer}
                      disabled={transferSaving}
                      className="text-[14px] text-red-600 hover:text-red-700 underline font-medium"
                    >
                      {transferSaving ? '취소 처리 중...' : '변경 요청 취소'}
                    </button>
                  </div>
                )}
              </div>
            ) : !isReadOnly && isTransferOpen ? (
              <form onSubmit={handleRequestTransfer} className="bg-white p-3.5 rounded-lg border border-amber-200 space-y-3">
                <p className="text-[15px] text-slate-600">
                  해당 제안이 귀 부서 소관 업무가 아닌 경우, 실제 담당해야 할 타 부서를 지정하여 변경을 요청할 수 있습니다. (총괄 관리자 승인 후 배정 변경)
                </p>
                <div>
                  <label className="block text-[15px] font-semibold text-slate-700 mb-1">
                    희망 이관 부서 선택 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={targetDept}
                    onChange={(e) => setTargetDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {departments.map(d => (
                      <option key={d.code} value={d.department}>
                        [{d.division} &gt; {d.office}] {d.department}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[15px] font-semibold text-slate-700 mb-1">
                    부서 변경 요청 사유 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    placeholder="소관 업무 불일치 사유 및 이관 필요성을 기재해 주세요..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsTransferOpen(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-[15px]"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={transferSaving}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[15px] shadow-sm transition disabled:opacity-50"
                  >
                    {transferSaving ? '요청 제출 중...' : '변경 요청 제출'}
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-[15px] text-amber-800/80">
                본 제안의 소관 부서가 아닐 경우 우측 [부서 변경 요청하기] 버튼을 통해 타 부서로의 이관을 신청할 수 있습니다.
              </p>
            )}
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

          {/* 제안서 상세 내용 (첨부 xlsx 원문 바로보기) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-600" />
                <span>제안서 본문 상세 내용</span>
              </h4>
              {(proposal.background || proposal.content || proposal.expected_effect) && (
                <span className="text-[15px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  제안서(.xlsx) 원문 자동 연동됨
                </span>
              )}
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
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-700 leading-relaxed space-y-2">
                <p>
                  본 제안은 공사 혁신 및 업무개선을 위해 제출된 내용입니다.
                </p>
                <p className="text-slate-600 bg-white p-3 rounded-lg border border-slate-200 font-medium">
                  "{proposal.title}"
                </p>
                <p className="text-[15px] text-slate-500">
                  * 해당 제안이 부서의 실무 여건상 실현 가능한지, 예산 및 인력 배치가 타당한지 종합적으로 검토하여 우측 평가표를 작성해 주시기 바랍니다.
                </p>
              </div>
            )}

            {/* 추가 시트 데이터가 있는 경우 (예: 붙임_법적검토, 참고자료, 검토근거 등) */}
            {proposal.extra_sheets && proposal.extra_sheets.length > 0 && (
              <div className="space-y-3 pt-2">
                {proposal.extra_sheets.map((sheet, sIdx) => (
                  <div key={sIdx} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
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
              <Paperclip className="w-4 h-4 text-sky-600" />
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
                      <Paperclip className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{att.name}</span>
                    </div>
                    <a
                      href={att.static_url || `/api/proposals/attachments?id=${encodeURIComponent(att.id)}&download=1`}
                      download={att.name}
                      className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-[15px] flex items-center gap-1 flex-shrink-0 transition"
                    >
                      <Download className="w-3 h-3" />
                      <span>다운로드</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 부서 평가(0차 평가)표 (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border-2 border-emerald-500/30 p-4 sm:p-6 shadow-md flex flex-col justify-between space-y-4 sm:space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <span className="text-[14px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  STAGE 0
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  부서 평가(0차 평가)표
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {evaluation?.is_submitted ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 제출 완료
                  </span>
                ) : (
                  <span className="text-amber-600 font-semibold">{evaluation ? '작성 중' : '미작성'}</span>
                )}
              </span>
            </div>

            {/* 항목 1: Result (Yes / No) */}
            <div className="space-y-2 mb-6">
              <label className="block text-xs font-bold text-slate-800">
                1. 부서 검토 결과 (수용 여부) <span className="text-red-500">*</span>
              </label>
              <p className="text-[15px] text-slate-500 mb-2">
                해당 제안을 부서 업무로 수용하여 1차 심사로 상정할지 결정합니다.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* Yes Button */}
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => !isReadOnly && setResult('Yes')}
                  className={`p-4 rounded-xl border-2 transition flex flex-col items-center justify-center gap-1.5 text-center ${
                    result === 'Yes'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-md shadow-emerald-500/10'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  } ${isReadOnly ? 'cursor-not-allowed opacity-85' : 'hover:border-emerald-300'}`}
                >
                  <CheckCircle2 className={`w-6 h-6 ${result === 'Yes' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <strong className="text-sm font-bold">Yes (수용 / 채택)</strong>
                  <span className="text-[14px] text-slate-500">1차 심사 상정</span>
                </button>

                {/* No Button */}
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => !isReadOnly && setResult('No')}
                  className={`p-4 rounded-xl border-2 transition flex flex-col items-center justify-center gap-1.5 text-center ${
                    result === 'No'
                      ? 'border-red-500 bg-red-50 text-red-800 shadow-md shadow-red-500/10'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  } ${isReadOnly ? 'cursor-not-allowed opacity-85' : 'hover:border-red-300'}`}
                >
                  <XCircle className={`w-6 h-6 ${result === 'No' ? 'text-red-500' : 'text-slate-400'}`} />
                  <strong className="text-sm font-bold">No (불수용)</strong>
                  <span className="text-[14px] text-slate-500">수용 불가 (의견 필수)</span>
                </button>
              </div>
            </div>

            {/* 항목 2: Opinion (서술형) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                2. 부서 검토 의견 (Opinion) <span className="text-red-500">*</span>
              </label>
              <p className="text-[15px] text-slate-500">
                {result === 'Yes'
                  ? '수용 사유, 추진 가능 시기, 예상 효과 등을 기재해 주십시오.'
                  : result === 'No'
                  ? '불수용 사유(법령 제한, 예산 부족, 기추진 사업 등)를 상세히 기재해 주십시오.'
                  : '부서 차원의 타당성 검토 의견을 상세히 작성해 주십시오.'}
              </p>

              <textarea
                rows={6}
                value={opinion}
                readOnly={isReadOnly}
                disabled={isReadOnly}
                onChange={(e) => !isReadOnly && setOpinion(e.target.value)}
                placeholder={isReadOnly ? '부서 평가자가 작성한 검토 의견이 아직 없습니다.' : '검토 의견을 구체적으로 작성해 주십시오...'}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed ${
                  isReadOnly ? 'cursor-not-allowed opacity-85' : 'focus:outline-none focus:ring-2 focus:ring-emerald-500'
                }`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          {isReadOnly ? (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
              <div className="w-full py-3 px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-semibold flex items-center justify-center gap-1.5">
                <Eye className="w-4 h-4 text-slate-500" />
                <span>조회 전용 화면입니다 (항목 수정 및 제출 불가)</span>
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}

export default function EvaluateProposalPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-500 text-sm">제안 정보를 불러오는 중...</div>}>
      <EvaluateProposalContent />
    </Suspense>
  );
}
