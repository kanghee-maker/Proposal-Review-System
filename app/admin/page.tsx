'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layers, Plus, Calendar, FileText, CheckCircle2, Clock, ArrowRight, Settings, Upload, Check } from 'lucide-react';
import { EvaluationSession, EvaluationCriteria } from '@/lib/types';

export default function AdminDashboardPage() {
  const [sessions, setSessions] = useState<EvaluationSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  // 신규 세션 폼
  const [step, setStep] = useState<number>(1);
  const [title, setTitle] = useState<string>('2026년 하반기 혁신 제안 심사');
  const [year, setYear] = useState<string>('2026');
  const [description, setDescription] = useState<string>('공사 경영개선 및 시민 편익 증진을 위한 0차 부서 타당성 평가');
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

  const fetchSessions = () => {
    setLoading(true);
    fetch('/api/sessions')
      .then(res => res.json())
      .then(data => {
        setSessions(data);
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
          proposals_count: selectedExcel === 'DEFAULT' ? 137 : 0,
          criteria: customCriteria
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateOpen(false);
        setStep(1);
        fetchSessions();
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
            관리자는 새로운 제안평가 건을 생성하여 대상 엑셀을 업로드하고, 부서별 0차 평가 기준을 설정하거나
            이전에 진행된 제안평가 건을 선택하여 관리할 수 있습니다.
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
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-600" />
          현재 등록된 제안평가 건 ({sessions.length})
        </h3>

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
            {sessions.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-sky-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {s.status === 'ACTIVE' ? '0차 부서평가 진행중' : s.status}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      연도: {s.year}년
                    </span>
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
                      <span className="text-slate-400 block mb-0.5">0차 평가항목</span>
                      <strong className="text-base font-bold text-sky-700">{s.criteria ? s.criteria.length : 2}개 항목</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <Link
                    href="/admin/proposals"
                    className="flex-1 py-2.5 px-4 text-center rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-4 h-4" />
                    <span>제안 목록 관리 (137건)</span>
                  </Link>

                  <Link
                    href="/admin/reports"
                    className="flex-1 py-2.5 px-4 text-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <span>평가 취합 &amp; 엑셀</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 신규 제안평가 생성 위저드 모달 */}
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
                    <label className="block font-semibold text-slate-700 mb-1">적용 조직도</label>
                    <div className="bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-600 font-medium">
                      2026_조직도 (과천도시공사 3단 계층)
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">설명 및 안내사항</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            )}

            {/* Step 2: 엑셀 파일 지정 */}
            {step === 2 && (
              <div className="space-y-4 text-xs">
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sky-900">
                  <div className="font-bold mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-600" />
                    기본 탑재 데이터 확인
                  </div>
                  <p className="text-[11px] leading-relaxed text-sky-800">
                    과천도시공사 2026년도 제안 엑셀 원본(137건)이 조직도("본부-처/실-부")로 구조화되어 준비되어 있습니다.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block font-semibold text-slate-700">제안 데이터 소스 선택</label>
                  <div
                    onClick={() => setSelectedExcel('DEFAULT')}
                    className={`cursor-pointer p-4 rounded-xl border transition flex items-center justify-between ${
                      selectedExcel === 'DEFAULT'
                        ? 'border-sky-500 bg-sky-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <strong className="block text-slate-900">2026_과천도시공사_제안목록_구조화.xlsx (137건)</strong>
                      <span className="text-slate-500 text-[11px]">
                        소속부서 및 실행부서가 본부/처/부 프로퍼티로 분리된 표준 데이터셋
                      </span>
                    </div>
                    {selectedExcel === 'DEFAULT' && <Check className="w-5 h-5 text-sky-600" />}
                  </div>

                  <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-400">
                    <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                    <p className="font-medium text-slate-600">추가 엑셀 파일 업로드</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      또는 파일 드래그 앤 드롭 (추후 추가 제안 엑셀 업로드 지원)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: 부서평가 항목 설정 */}
            {step === 3 && (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">부서 평가 항목 (Evaluation Criteria) 구성</h4>
                  <p className="text-[11px] text-slate-500 mb-3">
                    평가자(부서장)가 제안을 검토할 때 입력할 평가표 항목입니다.
                  </p>
                </div>

                <div className="space-y-2">
                  {customCriteria.map((c, i) => (
                    <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                          {i + 1}
                        </span>
                        <div>
                          <strong className="text-slate-900">{c.label}</strong>
                          <span className="ml-2 text-slate-400 text-[11px]">
                            [타입: {c.type === 'RADIO' ? '선택형 (Yes/No)' : '서술형 텍스트'}]
                          </span>
                        </div>
                      </div>
                      {c.key !== 'result' && (
                        <button
                          onClick={() => handleRemoveCriteria(c.id)}
                          className="text-red-500 hover:text-red-700 text-xs px-2 py-1"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* 항목 추가 컨트롤 */}
                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <input
                    type="text"
                    placeholder="새 평가항목 명칭 (예: 예산 소요 규모)"
                    value={newCritLabel}
                    onChange={(e) => setNewCritLabel(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                  <select
                    value={newCritType}
                    onChange={(e: any) => setNewCritType(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none"
                  >
                    <option value="TEXT">단답형 텍스트</option>
                    <option value="TEXTAREA">서술형 텍스트</option>
                    <option value="RADIO">3단계 라디오 (상/중/하)</option>
                  </select>
                  <button
                    onClick={handleAddCriteria}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl font-semibold"
                  >
                    추가
                  </button>
                </div>
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between gap-3 text-xs">
              <button
                onClick={() => {
                  if (step > 1) setStep(step - 1);
                  else setIsCreateOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold"
              >
                {step === 1 ? '취소' : '이전 단계'}
              </button>

              <div className="flex gap-2">
                {step < 3 ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-sm"
                  >
                    다음 단계
                  </button>
                ) : (
                  <button
                    onClick={handleCreateSession}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-md shadow-emerald-600/25"
                  >
                    제안평가 건 생성 완료
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
