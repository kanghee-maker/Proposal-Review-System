'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Users, CheckCircle, Award, ChevronRight, KeyRound, Lock, AlertCircle, X, Check, Building2, ExternalLink, ArrowRight, Sparkles } from 'lucide-react';
import { Department, DEFAULT_STAGE1_JUDGES } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedJudge, setSelectedJudge] = useState<string>(DEFAULT_STAGE1_JUDGES[0]?.name || '박종용');

  // Modals state
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const [deptLoginModalOpen, setDeptLoginModalOpen] = useState(false);
  const [deptPassword, setDeptPassword] = useState('');
  const [deptError, setDeptError] = useState('');
  const [deptLoading, setDeptLoading] = useState(false);

  const [stage1LoginModalOpen, setStage1LoginModalOpen] = useState(false);
  const [stage1Password, setStage1Password] = useState('');
  const [stage1Error, setStage1Error] = useState('');
  const [stage1Loading, setStage1Loading] = useState(false);

  useEffect(() => {
    fetch('/api/organization')
      .then(res => res.json())
      .then(data => {
        if (data.departments) {
          setDepartments(data.departments);
          if (data.departments.length > 0) {
            setSelectedDept(data.departments[0].department);
          }
        }
      })
      .catch(err => console.error(err));
  }, []);

  // 1. 관리자 모드 진입 요청 (모달 띄우기)
  const openAdminModal = () => {
    setAdminPassword('');
    setAdminError('');
    setAdminModalOpen(true);
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) {
      setAdminError('비밀번호를 입력해주세요.');
      return;
    }

    setAdminLoading(true);
    setAdminError('');

    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });
      const data = await res.json();

      if (data.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('gcuc_user_role', 'ADMIN');
          localStorage.setItem('gcuc_admin_auth', 'true');
          localStorage.removeItem('gcuc_dept_name');
          localStorage.setItem('gcuc_user_name', '총괄 관리자');
        }
        setAdminModalOpen(false);
        router.push('/admin');
      } else {
        setAdminError(data.message || '관리자 비밀번호가 일치하지 않습니다.');
      }
    } catch (err: any) {
      setAdminError('인증 통신 오류가 발생했습니다.');
    } finally {
      setAdminLoading(false);
    }
  };

  // 2. 0차 부서 평가함 진입 요청 -> 종료 안내 팝업 표시 및 진입 차단
  const handleEvaluatorCheck = (e: React.FormEvent) => {
    e.preventDefault();
    setDeptLoginModalOpen(true);
  };

  // 0차 부서 로그인 제출
  const handleDeptLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptPassword) {
      setDeptError('비밀번호를 입력해주세요.');
      return;
    }

    setDeptLoading(true);
    setDeptError('');

    try {
      const res = await fetch('/api/auth/department', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dept: selectedDept,
          password: deptPassword,
          action: 'login'
        })
      });
      const data = await res.json();

      if (data.success) {
        if (data.isTestMode) {
          alert(`[관리자 스페셜 인증]\n${selectedDept} 평가함에 관리자 권한으로 입장합니다.`);
        }
        const name = `${selectedDept} 평가자`;
        if (typeof window !== 'undefined') {
          localStorage.setItem('gcuc_user_role', 'EVALUATOR');
          localStorage.setItem('gcuc_evaluator_stage', 'STAGE_0');
          localStorage.setItem('gcuc_dept_name', selectedDept);
          localStorage.setItem(`gcuc_dept_auth_${selectedDept}`, 'true');
          localStorage.setItem('gcuc_user_name', name);
        }
        setDeptLoginModalOpen(false);
        router.push(`/evaluator?dept=${encodeURIComponent(selectedDept)}`);
      } else {
        setDeptError(data.message || '비밀번호가 일치하지 않습니다.');
      }
    } catch (err) {
      setDeptError('인증 통신 오류가 발생했습니다.');
    } finally {
      setDeptLoading(false);
    }
  };

  // 3. 1차 제안심사 평가함 진입 요청
  const handleStage1EvaluatorCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJudge) {
      alert('1차 제안심사 평가자를 선택해 주세요.');
      return;
    }
    setStage1Password('');
    setStage1Error('');
    setStage1LoginModalOpen(true);
  };

  const selectedJudgeInfo = DEFAULT_STAGE1_JUDGES.find(j => j.name === selectedJudge) || DEFAULT_STAGE1_JUDGES[0];

  // 1차 제안심사 로그인 제출
  const handleStage1LoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stage1Password) {
      setStage1Error('비밀번호를 입력해주세요.');
      return;
    }

    setStage1Loading(true);
    setStage1Error('');

    try {
      const res = await fetch('/api/auth/department', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dept: selectedJudgeInfo.name,
          password: stage1Password,
          action: 'login'
        })
      });
      const data = await res.json();

      if (data.success) {
        if (data.isTestMode) {
          alert(`[관리자 스페셜 인증]\n[${selectedJudgeInfo.dept}] ${selectedJudgeInfo.title} (${selectedJudgeInfo.name}) 1차 심사함에 관리자 권한으로 입장합니다.`);
        }
        const displayTitle = `[${selectedJudgeInfo.dept}] ${selectedJudgeInfo.title} (${selectedJudgeInfo.name})`;
        if (typeof window !== 'undefined') {
          localStorage.setItem('gcuc_user_role', 'EVALUATOR');
          localStorage.setItem('gcuc_evaluator_stage', 'STAGE_1');
          localStorage.removeItem('gcuc_admin_auth');
          localStorage.setItem('gcuc_dept_name', selectedJudgeInfo.name);
          localStorage.setItem('gcuc_judge_dept', selectedJudgeInfo.dept);
          localStorage.setItem(`gcuc_dept_auth_${selectedJudgeInfo.name}`, 'true');
          localStorage.setItem('gcuc_user_name', displayTitle);
        }
        setStage1LoginModalOpen(false);
        router.push(`/evaluator/stage1?judge=${encodeURIComponent(selectedJudgeInfo.name)}`);
      } else {
        setStage1Error(data.message || '비밀번호가 일치하지 않습니다.');
      }
    } catch (err) {
      setStage1Error('인증 통신 오류가 발생했습니다.');
    } finally {
      setStage1Loading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col justify-between">
      {/* 1. GCUC Top Utility Bar (#383a41) */}
      <div className="bg-[#383a41] text-xs text-slate-300 py-1.5 px-6 border-b border-[#25262b]">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="bg-[#25262b] text-white px-2 py-0.5 rounded text-[15px] font-semibold">GCUC</span>
            <span className="hidden sm:inline text-slate-300 text-[15px]">과천도시공사 제안 평가 관리 포털</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-slate-300">
            <span>2026년 혁신 제안 심사 플랫폼</span>
            <span className="text-slate-500">|</span>
            <a href="https://www.gcuc.or.kr" target="_blank" rel="noreferrer" className="hover:text-white transition">공사 홈페이지</a>
          </div>
        </div>
      </div>

      {/* 2. Main Header (Clean White with GCUC Identity) */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-40 px-6 py-3.5 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="shrink-0 flex items-center justify-center">
              <img src="/images/logo.png" alt="과천도시공사 로고" className="h-6 sm:h-8 w-auto object-contain" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl leading-tight tracking-tight text-slate-900">
                과천도시공사 <span className="text-[#1768d5]">제안 평가 시스템</span>
              </h1>
              <p className="hidden sm:block text-xs text-slate-500 font-medium tracking-wide">
                GWACHEON CITY URBAN CORPORATION PROPOSAL REVIEW PORTAL
              </p>
            </div>
          </div>
          <div className="text-xs font-bold text-amber-800 bg-amber-50 px-3.5 py-1.5 rounded-full border border-amber-300 hidden sm:flex items-center gap-1.5 shadow-xs">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>2026년도 제안심사 (1차 평가) 진행 중</span>
          </div>
        </div>
      </header>

      {/* 3. Main Content (Clean White Background) */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold mb-3 shadow-sm">
            <Award className="w-4 h-4 text-amber-600" />
            2026년도 제안심사 (1차 평가) 진행 중
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3 text-balance">
            과천도시공사 <span className="text-[#1768d5]">제안 평가 시스템</span>
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-3xl mx-auto leading-7 font-medium text-balance">
            공사 임직원이 제출한 혁신 제안에 대해 각 부서의 타당성 평가 및 제안심사위원회 1차 심사를 신속히 수행하고, 전체 평가 현황을 체계적으로 총괄 관리합니다.
          </p>
          <p className="text-slate-600 text-xs sm:text-sm mt-2 font-medium">
            제안평가 시스템 관련 문의 사항이 있으실 경우 관리자<strong className="text-orange-600 font-bold">(총무행정부 우세림) - 1192(내선번호)</strong>에게 문의해 주시면 됩니다.
          </p>
        </div>

        {/* 제안 심사 프로세스 2단계 로드맵 안내 */}
        <div className="max-w-5xl mx-auto w-full mb-8 bg-gradient-to-r from-amber-50/70 via-white to-orange-50/60 rounded-2xl border border-amber-200/80 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col items-start gap-2 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="shrink-0 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-amber-600 text-white text-[14px] font-bold">심사 로드맵</span>
              <span className="text-xs sm:text-sm font-bold text-slate-900">2026 과천도시공사 혁신 제안 심사 절차</span>
            </div>
            <span className="text-[15px] leading-relaxed text-slate-500">
              * 부서 평가(0차 평가) 완료 후 현재 제안 심사(1차 평가)가 진행 중입니다.
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            {/* Step 1 */}
            <div className="bg-slate-100/90 p-4 rounded-xl border-2 border-slate-200/90 text-slate-500 flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="border border-slate-300 bg-slate-200/80 text-slate-600 text-[14px] font-bold px-2.5 py-1 rounded-md whitespace-nowrap">
                  0차 부서 평가 완료 (마감)
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center">1</span>
                <strong className="text-slate-600 font-bold text-sm">부서 평가(0차 평가)</strong>
              </div>
              <p className="text-slate-500 text-[15px] leading-relaxed">
                각 담당 부서에서 소관 제안의 실무 타당성(예산, 실현가능성, 파급효과)을 사전 검토하고, 채택(Yes) 또는 불채택(No) 여부 및 검토의견을 작성합니다.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-4 rounded-xl border-2 border-amber-500/70 shadow-sm flex flex-col">
              <span className="self-start mb-3 text-[14px] px-2 py-1 rounded-md bg-amber-600 text-white font-bold border border-transparent whitespace-nowrap">
                1차 제안심사 진행 중
              </span>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">2</span>
                <strong className="text-slate-900 font-bold text-sm">제안 심사(1차 평가)</strong>
              </div>
              <p className="text-slate-600 text-[15px] leading-relaxed">
                <strong>부서 평가(0차 평가)</strong> 완결 후 채택(Yes) 제안을 연계하여 제안심사위원회 12인 심사위원이 창의성·실현성·효과성·전파성을 다면 평가합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 3 Roles Card Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
          {/* 1. 관리자 (Admin) 카드 */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-7 flex flex-col justify-between shadow-lg shadow-slate-100 hover:border-[#1768d5] transition group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1768d5] flex items-center justify-center mb-5 group-hover:scale-105 transition">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">총괄 관리자 로그인</h3>
              <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-6 md:min-h-[4.5rem]">
                제안평가 회차 생성, 엑셀 일괄 업로드, 부서별 배정 수정, 0차/1차 심사 현황 관리 및 종합 결과 엑셀 다운로드를 수행합니다.
              </p>

              <div className="space-y-2 text-xs text-slate-700 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#1768d5] flex-shrink-0" />
                  <span>제안평가 회차 &amp; 제안 엑셀 일괄 관리</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#1768d5] flex-shrink-0" />
                  <span>2026 조직도 및 부서/위원 비밀번호 관리</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#1768d5] flex-shrink-0" />
                  <span>0차 부서평가 취합 &amp; 1차 심사 연계</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#1768d5] flex-shrink-0" />
                  <span>1차 제안심사 집계 및 최종 판정 마감</span>
                </div>
              </div>
            </div>

            <button
              onClick={openAdminModal}
              className="w-full py-3.5 px-4 rounded-xl bg-[#1768d5] hover:bg-[#1357b3] font-semibold text-white shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition text-sm"
            >
              <Lock className="w-4 h-4" />
              <span>관리자 모드로 입장</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
            <Link href="/stage0-stats" className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100">
              <Lock className="h-4 w-4" /> 0차 평가 통계 조회
            </Link>
          </div>

          {/* 2. 0차 부서 평가자 (Stage 0 Evaluator) 카드 - 마감 완료 (옅은 회색 톤) */}
          <div className="bg-slate-100/90 rounded-2xl border-2 border-slate-200 p-6 sm:p-7 flex flex-col justify-between shadow-sm transition group">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-slate-200/80 text-slate-500 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-600 border border-slate-300 text-xs font-bold">
                  0차 심사 마감
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-600 mb-2">0차 부서 평가자 로그인</h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-6 md:min-h-[4.5rem]">
                담당 부서(실행부서)를 선택하여 본인 부서에 배정된 제안 목록을 열람하고, 부서 평가(0차 평가)(수용 여부 및 의견)를 진행합니다.
              </p>

              <form onSubmit={handleEvaluatorCheck} className="space-y-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    담당 부서 선택
                  </label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="w-full bg-slate-200/60 border border-slate-300 text-slate-600 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
                  >
                    {departments.map((dept) => (
                      <option key={dept.code} value={dept.department}>
                        [{dept.office}] {dept.department}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={deptLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-slate-400 hover:bg-slate-500 font-semibold text-white shadow-sm flex items-center justify-center gap-2 transition mt-2 disabled:opacity-50 text-sm"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{deptLoading ? '부서 확인 중...' : '0차 부서 평가함 입장 (종료)'}</span>
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
              </form>
            </div>

            {/* 안내 문구 */}
            <div className="mt-2 p-3 rounded-xl bg-slate-200/50 border border-slate-200 text-xs text-slate-500 leading-relaxed text-left">
              <p className="text-[14px]">
                ※ 0차 부서 평가는 마감되었으며, 현재 <strong className="text-slate-600 font-bold">1차 제안심사</strong>가 진행 중입니다.
              </p>
            </div>
          </div>

          {/* 3. 1차 제안심사 평가자 (Stage 1 Judge) 카드 - 주황색 계열 신설 */}
          <div className="bg-white rounded-2xl border-2 border-amber-300 p-6 sm:p-7 flex flex-col justify-between shadow-lg shadow-amber-100/60 hover:border-amber-600 transition group relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center group-hover:scale-105 transition">
                  <Award className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold">
                  1차 심사위원 전용 (12인)
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">1차 제안심사 평가자 로그인</h3>
              <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-6 md:min-h-[4.5rem]">
                1차 제안심사위원(12명)을 선택하여 상정된 제안의 부서 검토의견을 확인하고, 항목별 점수(창의성·실현성·효과성·전파성) 및 심사 의견을 입력합니다.
              </p>

              <form onSubmit={handleStage1EvaluatorCheck} className="space-y-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    담당 부서(1차 심사위원) 선택 <span className="text-amber-600">*</span>
                  </label>
                  <select
                    value={selectedJudge}
                    onChange={(e) => setSelectedJudge(e.target.value)}
                    className="w-full bg-amber-50/40 border border-amber-300 text-slate-900 font-semibold rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {DEFAULT_STAGE1_JUDGES.map((judge) => (
                      <option key={judge.id} value={judge.name}>
                        [{judge.dept}] {judge.title} ({judge.name})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={stage1Loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 font-semibold text-white shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2 transition mt-2 disabled:opacity-50 text-sm"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{stage1Loading ? '심사위원 확인 중...' : '1차 제안심사 평가함 입장'}</span>
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
              </form>
            </div>

            {/* 안내 문구 */}
            <div className="mt-2 p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-slate-700 leading-relaxed text-left">
              <p className="text-[14px]">
                ※ 1차 제안심사위원 접속 비밀번호는 소속 부서 비밀번호와 동일하거나 <strong className="text-orange-600 font-bold">관리자(총무행정부 우세림) - 1192(내선번호)</strong>가 발급한 번호를 사용합니다.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* 4. GCUC Official Style Footer */}
      <footer className="w-full mt-auto">
        {/* Footer Bottom Address (#25262b) */}
        <div className="bg-[#25262b] text-[#afafaf] py-5 px-6 text-xs leading-relaxed">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div>
              <p className="text-xs">
                (우 13807) 경기도 과천시 통영로 5 과천도시공사 / 5, Tongyeong-ro, Gwacheon-si, Gyeonggi-do, Korea
              </p>
              <p className="text-xs text-slate-400 mt-1">
                TEL : 02-500-1192
              </p>
              <p className="text-[15px] text-slate-500 mt-1.5 font-mono">
                Copyright © Gwacheon City Urban Corporation (GCUC) All rights reserved.
              </p>
            </div>
            <div className="text-right hidden md:block">
              <span className="inline-block px-3 py-1.5 rounded-lg bg-[#383a41] text-slate-300 text-xs border border-slate-700">
                시민과 함께 미래를 여는 혁신 공기업
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* --- 모달 1: 관리자 비밀번호 입력 (Clean White Modal) --- */}
      {adminModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl p-6 relative text-slate-800">
            <button
              onClick={() => setAdminModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1768d5] flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">총괄 관리자 비밀번호 확인</h3>
                <p className="text-xs text-slate-500">관리자 모드 접근을 위해 비밀번호를 입력해주세요.</p>
              </div>
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-4 mt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  비밀번호 입력
                </label>
                <input
                  type="password"
                  autoFocus
                  placeholder="관리자 비밀번호를 입력하세요"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1768d5]"
                />
              </div>

              {adminError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{adminError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdminModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={adminLoading}
                  className="w-2/3 py-2.5 rounded-xl bg-[#1768d5] hover:bg-[#1357b3] text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{adminLoading ? '인증 확인 중...' : '관리자 입장'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- 모달 2: 0차 심사 종료 안내 팝업 --- */}
      {deptLoginModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative text-slate-800 text-center">
            <button
              onClick={() => setDeptLoginModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">
              0차 심사는 종료 되었습니다.
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              2026년도 부서 평가(0차 평가)가 마감되어 현재 1차 제안심사가 진행 중입니다.
            </p>
            <button
              type="button"
              onClick={() => setDeptLoginModalOpen(false)}
              autoFocus
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-sm transition"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* --- 모달 3: 1차 제안심사 평가자 비밀번호 로그인 (주황색 계열 모달) --- */}
      {stage1LoginModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-amber-300 w-full max-w-md rounded-2xl shadow-2xl p-6 relative text-slate-800">
            <button
              onClick={() => setStage1LoginModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  [{selectedJudgeInfo.dept}] {selectedJudgeInfo.name} 위원 인증
                </h3>
                <p className="text-xs text-slate-500">1차 제안심사 평가함에 접근하려면 비밀번호를 입력해주세요.</p>
              </div>
            </div>

            <form onSubmit={handleStage1LoginSubmit} className="space-y-4 mt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  1차 심사위원 비밀번호
                </label>
                <input
                  type="password"
                  autoFocus
                  placeholder="비밀번호(4자리)를 입력하세요"
                  value={stage1Password}
                  onChange={(e) => setStage1Password(e.target.value)}
                  className="w-full bg-amber-50/30 border border-amber-300 text-slate-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {stage1Error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{stage1Error}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStage1LoginModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={stage1Loading}
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-xs font-semibold text-white shadow-lg shadow-amber-600/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{stage1Loading ? '확인 중...' : '1차 제안심사 평가함 입장'}</span>
                </button>
              </div>

              <div className="mt-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-[15px] text-slate-600 leading-relaxed">
                * 소속 부서({selectedJudgeInfo.dept}) 비밀번호 또는 <strong className="text-orange-600 font-bold">관리자(총무행정부 우세림) - 1192(내선번호)</strong>가 발급한 심사위원 비밀번호를 입력해주세요.
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
