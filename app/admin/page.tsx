'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layers, Plus, Calendar, FileText, CheckCircle2, Clock, ArrowRight, Settings, Upload, Check, Edit, X, Sparkles, CheckCircle, FileSpreadsheet, DownloadCloud, Trash2, AlertTriangle, Lock } from 'lucide-react';
import { EvaluationSession, EvaluationCriteria } from '@/lib/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<EvaluationSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  // 1. 신규 세션 생성 모달 상태
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);
  const [stage, setStage] = useState<'STAGE_0' | 'STAGE_1'>('STAGE_0');
  const [title, setTitle] = useState<string>('2026년 하반기 혁신 제안 심사 (0차 부서평가)');
  const [year, setYear] = useState<string>('2026');
  const [description, setDescription] = useState<string>('공사 경영개선 및 시민 편익 증진을 위한 부서 평가(0차 평가)');
  const [selectedExcel, setSelectedExcel] = useState<string>('DEFAULT'); // DEFAULT: 137건 샘플
  const [customCriteria, setCustomCriteria] = useState<EvaluationCriteria[]>([
    {
      id: 'crit-result',
      key: 'result',
      label: '부서 검토 결과 (수용 여부)',
      type: 'RADIO',
      options: ['Yes', 'No'],
      required: true,
      display_order: 1,
      description: '해당 제안에 대한 부서 차원의 채택/수용 여부'
    },
    {
      id: 'crit-opinion',
      key: 'opinion',
      label: '부서 검토 의견 (Opinion)',
      type: 'TEXTAREA',
      options: [],
      required: true,
      display_order: 2,
      description: '부서장 서술형 타당성 검토 의견'
    }
  ]);
  const [newCritLabel, setNewCritLabel] = useState<string>('');
  const [newCritType, setNewCritType] = useState<'RADIO' | 'TEXT' | 'TEXTAREA'>('TEXT');

  // 2. 세션 이름 및 정보 수정 모달 상태
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editSessionId, setEditSessionId] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editYear, setEditYear] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'ARCHIVED' | 'UPCOMING'>('ACTIVE');
  const [editSaving, setEditSaving] = useState<boolean>(false);

  // 3. 세션 삭제 확인 모달 상태 (비밀번호 재인증)
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [deleteSession, setDeleteSession] = useState<EvaluationSession | null>(null);
  const [deletePassword, setDeletePassword] = useState<string>('');
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string>('');

  const openDeleteModal = (s: EvaluationSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteSession(s);
    setDeletePassword('');
    setDeleteError('');
    setIsDeleteOpen(true);
  };

  const handleDeleteSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteSession) return;
    if (!deletePassword) {
      setDeleteError('관리자 비밀번호를 입력해주세요.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    try {
      const res = await fetch('/api/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: deleteSession.id,
          password: deletePassword
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`[${deleteSession.title}] 회차가 성공적으로 삭제되었습니다.`);
        setIsDeleteOpen(false);
        if (activeSessionId === deleteSession.id && typeof window !== 'undefined') {
          localStorage.removeItem('gcuc_active_session_id');
        }
        fetchSessions();
      } else {
        setDeleteError(data.error || '삭제 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setDeleteError('서버 통신 오류가 발생했습니다.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const fetchSessions = () => {
    setLoading(true);
    fetch('/api/sessions')
      .then(res => res.json())
      .then(data => {
        setSessions(data);
        if (typeof window !== 'undefined') {
          const savedActive = localStorage.getItem('gcuc_active_session_id');
          if (savedActive && data.some((s: EvaluationSession) => s.id === savedActive)) {
            setActiveSessionId(savedActive);
          } else if (data.length > 0) {
            setActiveSessionId(data[0].id);
            localStorage.setItem('gcuc_active_session_id', data[0].id);
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // 활성 세션 선택
  const handleSelectActiveSession = (id: string) => {
    setActiveSessionId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gcuc_active_session_id', id);
    }
  };

  // 수정 모달 열기
  const openEditModal = (s: EvaluationSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditSessionId(s.id);
    setEditTitle(s.title);
    setEditYear(s.year || '2026');
    setEditDescription(s.description || '');
    setEditStatus((s.status as any) || 'ACTIVE');
    setIsEditOpen(true);
  };

  // 수정 제출
  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      alert('제안평가 명칭을 입력해주세요.');
      return;
    }

    setEditSaving(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editSessionId,
          title: editTitle.trim(),
          year: editYear.trim(),
          description: editDescription.trim(),
          status: editStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsEditOpen(false);
        fetchSessions();
        alert('제안평가 정보가 성공적으로 수정되었습니다.');
      } else {
        alert(data.error || '수정 중 오류가 발생했습니다.');
      }
    } catch (err) {
      alert('서버 통신 오류가 발생했습니다.');
    } finally {
      setEditSaving(false);
    }
  };

  // 세션 생성
  const handleAddCriteria = () => {
    if (!newCritLabel.trim()) return;
    const newCrit: EvaluationCriteria = {
      id: `crit-${Date.now()}`,
      key: `custom_${Date.now()}`,
      label: newCritLabel.trim(),
      type: newCritType,
      options: newCritType === 'RADIO' ? ['상', '중', '하'] : [],
      required: false,
      display_order: customCriteria.length + 1
    };
    setCustomCriteria([...customCriteria, newCrit]);
    setNewCritLabel('');
  };

  const handleRemoveCriteria = (id: string) => {
    if (customCriteria.length <= 1) {
      alert('최소 1개 이상의 평가 항목이 필요합니다.');
      return;
    }
    setCustomCriteria(customCriteria.filter(c => c.id !== id));
  };

  const handleCreateSession = async () => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          year,
          description,
          stage,
          proposals_count: selectedExcel === 'DEFAULT' ? 137 : 0,
          criteria: customCriteria
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateOpen(false);
        setStep(1);
        fetchSessions();
        if (data.session?.id && typeof window !== 'undefined') {
          localStorage.setItem('gcuc_active_session_id', data.session.id);
          setActiveSessionId(data.session.id);
        }
      }
    } catch (err) {
      console.error(err);
      alert('세션 생성 실패');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-sky-950 text-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold mb-3">
            <Layers className="w-3.5 h-3.5" />
            제안평가 회차 대시보드
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">제안평가 건 (Evaluation Rounds) 관리</h2>
          <p className="text-sm text-slate-300 max-w-xl">
            관리할 제안평가 건을 선택하여 제안 목록 및 부서 배정을 관리하거나, 부서 평가(0차 평가) 취합 결과를 확인하고 명칭을 수정할 수 있습니다. (취합 완료 후 제안 심사(1차 평가) 위원회 연계)
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-sky-500/20 transition whitespace-nowrap self-start md:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>신규 제안평가 생성</span>
        </button>
      </div>

      {/* Session Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>등록된 제안평가 회차 ({sessions.length})</span>
          </h3>
          <span className="text-xs text-slate-500">
            * 각 제안평가 카드의 <strong className="text-sky-600">[제안 목록·배정]</strong> 또는 <strong className="text-slate-800">[부서 평가 취합]</strong> 버튼을 누르면 해당 회차의 데이터가 선택됩니다.
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-200">
            평가 건을 불러오는 중...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-200">
            등록된 제안평가 건이 없습니다.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {sessions.map((s) => {
              const isCurrentActive = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => handleSelectActiveSession(s.id)}
                  className={`bg-white rounded-2xl border p-6 shadow-sm transition flex flex-col justify-between cursor-pointer ${
                    isCurrentActive
                      ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {isCurrentActive && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-600 text-white flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            현재 선택된 평가 건
                          </span>
                        )}
                        {s.stage === 'STAGE_1' ? (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            제안 심사(1차 평가) 위원회
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {s.status === 'ACTIVE' ? '부서 평가(0차 평가) 진행중' : s.status}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">
                          {s.year}년
                        </span>
                        {/* 이름 수정 버튼 */}
                        <button
                          type="button"
                          onClick={(e) => openEditModal(s, e)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-sky-600 bg-slate-100 hover:bg-sky-50 border border-slate-200 transition flex items-center gap-1"
                          title="제안평가 이름 및 정보 수정"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>이름 수정</span>
                        </button>
                        {/* 삭제 버튼 */}
                        <button
                          type="button"
                          onClick={(e) => openDeleteModal(s, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition"
                          title="제안평가 회차 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-lg font-bold text-slate-900 mb-2 leading-snug">
                      {s.title}
                    </h4>
                    <p className="text-xs text-slate-500 mb-5 line-clamp-2">
                      {s.description || '설명 없음'}
                    </p>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-2 gap-4 text-xs mb-6">
                      <div>
                        <span className="text-slate-400 block mb-0.5">평가 대상 제안</span>
                        <strong className="text-base font-bold text-slate-800">{s.proposals_count}건</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">
                          {s.stage === 'STAGE_1' ? '1차 심사 배점 항목' : '부서 평가(0차) 항목'}
                        </span>
                        <strong className={`text-base font-bold ${s.stage === 'STAGE_1' ? 'text-amber-700' : 'text-sky-700'}`}>
                          {s.stage === 'STAGE_1' ? '4대 항목 (100점 만점)' : `${s.criteria ? s.criteria.length : 2}개 항목`}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <Link
                      href={`/admin/proposals?session_id=${s.id}`}
                      onClick={() => handleSelectActiveSession(s.id)}
                      className="flex-1 py-2.5 px-3 text-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      <span>제안 목록 ({s.proposals_count}건)</span>
                    </Link>

                    {s.stage === 'STAGE_1' ? (
                      <Link
                        href={`/admin/stage1?session_id=${s.id}`}
                        onClick={() => handleSelectActiveSession(s.id)}
                        className="flex-1 py-2.5 px-3 text-center rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20"
                      >
                        <span>제안 심사(1차) 다면 채점</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <Link
                        href={`/admin/reports?session_id=${s.id}`}
                        onClick={() => handleSelectActiveSession(s.id)}
                        className="flex-1 py-2.5 px-3 text-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <span>부서 평가(0차 평가) 취합</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- 모달: 제안평가 이름 및 정보 수정 --- */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative text-slate-800">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                <Edit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">제안평가 정보 수정</h3>
                <p className="text-xs text-slate-500">등록된 제안평가의 명칭 및 진행 정보를 수정합니다.</p>
              </div>
            </div>

            <form onSubmit={handleUpdateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  제안평가 명칭 (이름) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="예: 2026년 상반기 과천도시공사 제안 심사"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">진행 연도</label>
                  <input
                    type="text"
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">진행 상태</label>
                  <select
                    value={editStatus}
                    onChange={(e: any) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="ACTIVE">진행중 (ACTIVE)</option>
                    <option value="UPCOMING">준비중 (UPCOMING)</option>
                    <option value="ARCHIVED">마감/보관 (ARCHIVED)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">설명 및 세부 목적</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="제안평가 세부 내용을 입력하세요"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="w-2/3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-lg shadow-sky-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editSaving ? '저장 중...' : '수정사항 저장'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- 모달: 제안평가 회차 삭제 (관리자 비밀번호 재확인) --- */}
      {isDeleteOpen && deleteSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative text-slate-800">
            <button
              onClick={() => setIsDeleteOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">제안평가 회차 삭제</h3>
                <p className="text-xs text-rose-600 font-medium">주의: 삭제 시 복구할 수 없습니다.</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-xs space-y-1.5 mb-4 text-slate-700">
              <div>
                <span className="text-slate-400 block text-[10px]">삭제 대상 회차</span>
                <strong className="text-slate-900 text-xs block">{deleteSession.title}</strong>
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                해당 회차에 배정된 <strong>제안 {deleteSession.proposals_count}건</strong>과 부서 평가 내역, 심사위원 채점 결과가 완전히 삭제됩니다.
              </p>
            </div>

            <form onSubmit={handleDeleteSession} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>관리자 비밀번호 확인</span>
                  </span>
                  <span className="text-[10px] text-slate-400">* 안전을 위해 재입력</span>
                </label>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setDeleteError('');
                  }}
                  placeholder="관리자 비밀번호를 입력해주세요"
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {deleteError && (
                <div className="p-2.5 bg-rose-100/80 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading}
                  className="w-2/3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-lg shadow-rose-600/25 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deleteLoading ? '삭제 처리 중...' : '회차 영구 삭제'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- 모달: 신규 제안평가 생성 위저드 --- */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">신규 제안평가 건 생성 위저드</h3>
                <p className="text-xs text-slate-500">평가명 입력 및 엑셀 일괄 등록, 평가 항목을 구성합니다.</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full">
                단계 {step} / 3
              </div>
            </div>

            {/* Step 1: 기본 정보 */}
            {step === 1 && (
              <div className="space-y-4 text-xs">
                {/* 평가 단계 (Stage) 선택 */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    평가 단계 (Stage) 구분 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => {
                        setStage('STAGE_0');
                        setTitle('2026년 하반기 혁신 제안 심사 (0차 부서평가)');
                        setDescription('공사 경영개선 및 시민 편익 증진을 위한 부서 평가(0차 평가)');
                      }}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        stage === 'STAGE_0'
                          ? 'border-sky-600 bg-sky-50/70 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            🏢 부서 평가(0차 평가)
                          </span>
                          {stage === 'STAGE_0' && <CheckCircle className="w-4 h-4 text-sky-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          제안 소관(실행) 부서 대상 사전 타당성(Yes/No) 및 검토의견 심사
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        setStage('STAGE_1');
                        setTitle('2026년 하반기 혁신 제안 심사 (1차 평가)');
                        setDescription('제안심사위원회 심사위원 다인 다면 심사(창의성·실현성·효과성·전파성)');
                      }}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        stage === 'STAGE_1'
                          ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            ⚖️ 제안 심사(1차 평가)
                          </span>
                          {stage === 'STAGE_1' && <CheckCircle className="w-4 h-4 text-amber-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          심사위원단(11인) 다면 계량 채점(창의성/실현성/효과성/전파성 100점)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    제안평가명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">대상 연도</label>
                    <input
                      type="text"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">상태</label>
                    <span className="inline-block py-2.5 px-3 bg-slate-100 rounded-xl text-slate-600 font-semibold">
                      ACTIVE (생성 즉시 평가 진행)
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">평가 목적 및 설명</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl flex items-center gap-1 shadow-md shadow-sky-600/20"
                  >
                    <span>다음: 제안 엑셀 등록</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: 엑셀 파일 선택 & 양식 가이드 */}
            {step === 2 && (
              <div className="space-y-4 text-xs">
                {/* 엑셀 양식 다운로드 및 필수 컬럼 가이드 배너 */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h5 className="font-bold text-sky-950 flex items-center gap-1.5 text-xs sm:text-sm">
                        <FileSpreadsheet className="w-4 h-4 text-sky-600" />
                        <span>표준 제안 엑셀 서식 및 컬럼(Property) 가이드</span>
                      </h5>
                      <p className="text-[11px] text-sky-800/80 mt-0.5">
                        시스템이 제안을 올바르게 인식하고 담당 부서 평가함으로 자동 배정하기 위해 엑셀 컬럼명이 일치해야 합니다.
                      </p>
                    </div>

                    <a
                      href="/api/sample-excel"
                      download="GCUC_Proposal_Upload_Template.xlsx"
                      className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition whitespace-nowrap self-start sm:self-auto"
                    >
                      <DownloadCloud className="w-4 h-4" />
                      <span>샘플 엑셀 양식 다운로드 (.xlsx)</span>
                    </a>
                  </div>

                  {/* 컬럼 가이드 미니 표 */}
                  <div className="bg-white/90 rounded-lg p-3 border border-sky-200/80 text-[11px] space-y-2">
                    <div className="font-semibold text-slate-800 flex items-center justify-between">
                      <span>★ 핵심 필수 컬럼 (헤더명)</span>
                      <span className="text-[10px] text-slate-500">* 오탈자 없이 정확히 일치 권장</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                      <div className="bg-sky-50/70 p-1.5 rounded border border-sky-100">
                        <span className="text-sky-700 font-bold block">실행(평가)_부</span>
                        <span className="text-slate-500">부서평가함 배정 기준</span>
                      </div>
                      <div className="bg-sky-50/70 p-1.5 rounded border border-sky-100">
                        <span className="text-sky-700 font-bold block">실행(평가)_본부/부문</span>
                        <span className="text-slate-500">본부 조직 분류</span>
                      </div>
                      <div className="bg-sky-50/70 p-1.5 rounded border border-sky-100">
                        <span className="text-sky-700 font-bold block">제안제목</span>
                        <span className="text-slate-500">제안의 주요 제목</span>
                      </div>
                      <div className="bg-sky-50/70 p-1.5 rounded border border-sky-100">
                        <span className="text-sky-700 font-bold block">제안자 / 연번</span>
                        <span className="text-slate-500">제안자명 및 고유순번</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      ※ 기타 지원 컬럼: <code className="text-sky-800 bg-sky-50 px-1 py-0.5 rounded">게시판번호</code>, <code className="text-sky-800 bg-sky-50 px-1 py-0.5 rounded">접수일자</code>, <code className="text-sky-800 bg-sky-50 px-1 py-0.5 rounded">직급</code>, <code className="text-sky-800 bg-sky-50 px-1 py-0.5 rounded">제안자_본부/부문</code>, <code className="text-sky-800 bg-sky-50 px-1 py-0.5 rounded">제안자_처/실/단</code>, <code className="text-sky-800 bg-sky-50 px-1 py-0.5 rounded">제안자_부</code>, <code className="text-sky-800 bg-sky-50 px-1 py-0.5 rounded">제안구분</code>, <code className="text-sky-800 bg-sky-50 px-1 py-0.5 rounded">분야</code>, <code className="text-sky-800 bg-sky-50 px-1 py-0.5 rounded">제안내용</code>, <code className="text-sky-800 bg-sky-50 px-1 py-0.5 rounded">중복제안여부</code>
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-sky-600" />
                    제안 엑셀 데이터 탑재 방식 선택
                  </h4>
                  <p className="text-slate-500 mb-4">
                    과천도시공사 제안 데이터(본부/처/부 3단 분류 체계)를 기반으로 일괄 등록합니다.
                  </p>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-3 rounded-xl border border-sky-300 bg-sky-50/50 cursor-pointer">
                      <input
                        type="radio"
                        name="excel_source"
                        checked={selectedExcel === 'DEFAULT'}
                        onChange={() => setSelectedExcel('DEFAULT')}
                        className="mt-0.5 text-sky-600"
                      />
                      <div>
                        <strong className="text-slate-900 block font-semibold">
                          기본 2026 정제 데이터 (137건) 자동 탑재
                        </strong>
                        <span className="text-slate-500 text-[11px]">
                          기존 2026 혁신제안 137건 데이터를 신규 회차의 심사 대상 제안으로 즉시 자동 복제 및 Supabase DB에 연동합니다.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer opacity-70">
                      <input
                        type="radio"
                        name="excel_source"
                        checked={selectedExcel === 'NEW'}
                        onChange={() => setSelectedExcel('NEW')}
                        className="mt-0.5 text-sky-600"
                      />
                      <div>
                        <strong className="text-slate-900 block font-semibold">
                          신규 엑셀 파일 직접 업로드 (준비중)
                        </strong>
                        <span className="text-slate-500 text-[11px]">
                          상단에서 다운로드한 <strong>[표준 제안 엑셀 양식]</strong>에 맞춰 데이터를 작성한 후 업로드합니다.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl"
                  >
                    이전
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl flex items-center gap-1 shadow-md shadow-sky-600/20"
                  >
                    <span>다음: 부서 평가항목 설정</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: 부서 평가항목 구성 */}
            {step === 3 && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-sky-600" />
                    부서 평가(0차 평가) 심사 항목 설정
                  </h4>
                  <span className="text-slate-400">총 {customCriteria.length}개 항목</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {customCriteria.map((c, idx) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-[10px] text-sky-600 font-bold bg-sky-100 px-1.5 py-0.5 rounded">
                            항목 {idx + 1}
                          </span>
                          <strong className="text-slate-800">{c.label}</strong>
                          <span className="text-[10px] text-slate-400">({c.type})</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{c.description || '옵션: ' + (c.options?.join(', ') || '텍스트 입력')}</p>
                      </div>

                      {c.key !== 'result' && c.key !== 'opinion' && (
                        <button
                          onClick={() => handleRemoveCriteria(c.id)}
                          className="text-xs text-rose-500 hover:text-rose-700 px-2 py-1 rounded"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* 항목 추가 */}
                <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-200 space-y-2">
                  <span className="font-semibold text-slate-700 block">새 심사 항목 추가</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="항목명 (예: 적용 예상시기)"
                      value={newCritLabel}
                      onChange={(e) => setNewCritLabel(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    />
                    <select
                      value={newCritType}
                      onChange={(e: any) => setNewCritType(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 text-slate-800"
                    >
                      <option value="TEXT">단답형</option>
                      <option value="TEXTAREA">서술형</option>
                      <option value="RADIO">선택형(상/중/하)</option>
                    </select>
                    <button
                      onClick={handleAddCriteria}
                      className="px-3 py-1.5 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 whitespace-nowrap"
                    >
                      추가
                    </button>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setStep(2)}
                    className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl"
                  >
                    이전
                  </button>
                  <button
                    onClick={handleCreateSession}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl flex items-center gap-1 shadow-md shadow-emerald-600/20"
                  >
                    <Check className="w-4 h-4" />
                    <span>제안평가 회차 생성 완료</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
