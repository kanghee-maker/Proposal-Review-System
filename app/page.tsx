'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Users, CheckCircle, Award, ChevronRight, KeyRound, Lock, AlertCircle, X, Check, Building2, ExternalLink, ArrowRight } from 'lucide-react';
import { Department } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');

  // Modals state
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const [deptLoginModalOpen, setDeptLoginModalOpen] = useState(false);
  const [deptPassword, setDeptPassword] = useState('');
  const [deptError, setDeptError] = useState('');
  const [deptLoading, setDeptLoading] = useState(false);

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

  // 2. 부서 평가함 진입 요청
  const handleEvaluatorCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) {
      alert('평가 부서를 선택해 주세요.');
      return;
    }
    setDeptPassword('');
    setDeptError('');
    setDeptLoginModalOpen(true);
  };

  // 부서 로그인 제출
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

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col justify-between">
      {/* 1. GCUC Top Utility Bar (#383a41) */}
      <div className="bg-[#383a41] text-xs text-slate-300 py-1.5 px-6 border-b border-[#25262b]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-[#25262b] text-white px-2 py-0.5 rounded text-[11px] font-semibold">GCUC</span>
            <span className="hidden sm:inline text-slate-300 text-[11px]">과천도시공사 제안 평가 관리 포털</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-300">
            <span>2026년 혁신 제안 심사 플랫폼</span>
            <span className="text-slate-500">|</span>
            <a href="https://www.gcuc.or.kr" target="_blank" rel="noreferrer" className="hover:text-white transition">공사 홈페이지</a>
          </div>
        </div>
      </div>

      {/* 2. Main Header (Clean White with GCUC Identity) */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-40 px-6 py-3.5 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="bg-white p-1 rounded-xl border border-slate-100 shadow-sm flex items-center justify-center">
              <img src="/images/logo.png" alt="과천도시공사 로고" className="h-8 w-auto object-contain" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl leading-tight tracking-tight text-slate-900">
                과천도시공사 <span className="text-[#1768d5]">제안 평가 시스템</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium tracking-wide">
                GWACHEON CITY URBAN CORPORATION PROPOSAL REVIEW PORTAL
              </p>
            </div>
          </div>
          <div className="text-xs font-semibold text-[#1768d5] bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-200/60 hidden sm:flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" />
            <span>2026 혁신 제안 부서 평가(0차 평가)</span>
          </div>
        </div>
      </header>

      {/* 3. Main Content (Clean White Background) */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#1768d5] text-xs font-bold mb-3 shadow-sm">
            <Award className="w-4 h-4 text-[#1768d5]" />
            2026년도 혁신 제안 부서 평가(0차 평가) 진행 중
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
            과천도시공사 혁신 제안 평가 포털
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-medium">
            공사 임직원이 제출한 혁신 제안에 대해 각 부서의 타당성 평가를 신속히 심사하고, 전체 평가 현황을 체계적으로 총괄 관리합니다.
          </p>
          <p className="text-slate-500 text-xs sm:text-sm mt-2 font-medium">
            제안평가 시스템 관련 문의 사항이 있으실 경우 관리자(총무행정부 우세림)에게 문의해 주시면 됩니다.
          </p>
        </div>

        {/* 제안 심사 프로세스 2단계 로드맵 안내 */}
        <div className="max-w-4xl mx-auto w-full mb-8 bg-gradient-to-r from-blue-50/70 via-white to-emerald-50/70 rounded-2xl border border-blue-200/70 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#1768d5] text-white text-[10px] font-bold">심사 로드맵</span>
              <span className="text-xs sm:text-sm font-bold text-slate-900">2026 과천도시공사 혁신 제안 심사 절차</span>
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              * 부서 평가(0차 평가) 완료 후 제안 심사(1차 평가)가 진행됩니다.
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            {/* Step 1 */}
            <div className="bg-white p-4 rounded-xl border-2 border-[#1768d5]/40 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#1768d5] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                부서 평가 진행
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-[#1768d5] font-bold text-xs flex items-center justify-center">1</span>
                <strong className="text-slate-900 font-bold text-sm">부서 평가(0차 평가)</strong>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                각 담당 부서에서 소관 제안의 실무 타당성(예산, 실현가능성, 파급효과)을 사전 검토하고, 채택(Yes) 또는 불채택(No) 여부 및 검토의견을 작성합니다.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white/95 p-4 rounded-xl border border-slate-200 text-slate-700 relative">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">2</span>
                <strong className="text-slate-900 font-bold text-sm">제안 심사(1차 평가)</strong>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                  향후 심사 예정 (관리자 전용)
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                <strong>부서 평가(0차 평가)</strong> 완결 후 채택(Yes) 제안을 연계하여 제안심사위원회 11인 심사위원이 창의성·실현성·효과성·전파성(100점 만점)을 다면 평가합니다. (총괄 관리자 관리)
              </p>
            </div>
          </div>
        </div>

        {/* 2 Roles Card Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
          {/* 1. 관리자 (Admin) 카드 */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 flex flex-col justify-between shadow-lg shadow-slate-100 hover:border-[#1768d5] transition group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1768d5] flex items-center justify-center mb-5 group-hover:scale-105 transition">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">총괄 관리자 로그인</h3>
              <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
                제안평가 회차 생성, 엑셀 일괄 업로드 및 파싱, 부서별 배정 수정, 2026 조직도 관리, 종합 평가결과 엑셀 다운로드를 수행합니다.
              </p>

              <div className="space-y-2 text-xs text-slate-700 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#1768d5] flex-shrink-0" />
                  <span>제안평가 건 생성 &amp; 제안 엑셀 일괄 등록</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#1768d5] flex-shrink-0" />
                  <span>2026 조직도(JPEG 뷰어 및 부서 트리) 관리</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#1768d5] flex-shrink-0" />
                  <span>부서평가 항목(Result / Opinion) 동적 설정</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#1768d5] flex-shrink-0" />
                  <span>부서 평가(0차 평가) 취합 결과 엑셀 Export</span>
                </div>
              </div>
            </div>

            <button
              onClick={openAdminModal}
              className="w-full py-3.5 px-4 rounded-xl bg-[#1768d5] hover:bg-[#1357b3] font-semibold text-white shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition"
            >
              <Lock className="w-4 h-4" />
              <span>관리자 모드로 입장 (비밀번호 확인)</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
          </div>

          {/* 2. 평가자 (Evaluator) 카드 */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 flex flex-col justify-between shadow-lg shadow-slate-100 hover:border-[#169268] transition group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#169268] flex items-center justify-center mb-5 group-hover:scale-105 transition">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">부서 평가자 로그인</h3>
              <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
                담당 부서(실행부서)를 선택하여 본인 부서에 배정된 제안 목록을 열람하고, 부서 평가(0차 평가)(수용 여부 및 의견)를 진행합니다.
              </p>

              <form onSubmit={handleEvaluatorCheck} className="space-y-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    담당 부서 선택 <span className="text-emerald-600">*</span>
                  </label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full py-3.5 px-4 rounded-xl bg-[#169268] hover:bg-[#127754] font-semibold text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition mt-2 disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{deptLoading ? '부서 확인 중...' : '해당 부서 평가함 입장'}</span>
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
              </form>
            </div>

            {/* 안내 문구 (GCUC 스타일 박스) */}
            <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed text-left">
              <p className="text-[11px]">
                ※ 각 부서별 접속 비밀번호는 <strong>관리자(총무행정부 우세림)</strong>가 사전에 발급하여 관리합니다. 비밀번호 분실 또는 미발급 시 관리자에게 문의 바랍니다.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* 4. GCUC Official Style Footer */}
      <footer className="w-full mt-auto">
        {/* Footer Top Sub-bar (#383a41) */}
        <div className="bg-[#383a41] border-b border-[#25262b] py-2.5 px-6 text-xs text-slate-300">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="text-[#ffd300] font-bold">개인정보 처리방침</span>
              <span className="text-slate-500">|</span>
              <span className="hover:text-white cursor-pointer">이메일주소무단수집거부</span>
              <span className="text-slate-500">|</span>
              <span className="hover:text-white cursor-pointer">과천도시공사 윤리경영</span>
            </div>
            <div className="text-[11px] text-slate-400">
              과천도시공사 통합 제안 심사 관리 시스템
            </div>
          </div>
        </div>

        {/* Footer Bottom Address (#25262b) */}
        <div className="bg-[#25262b] text-[#afafaf] py-5 px-6 text-xs leading-relaxed">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div>
              <p className="text-xs">
                (우 13807) 경기도 과천시 통영로 5 과천도시공사 / 5, Tongyeong-ro, Gwacheon-si, Gyeonggi-do, Korea
              </p>
              <p className="text-xs text-slate-400 mt-1">
                TEL : 02-504-7300 <span className="mx-2 text-slate-600">|</span> FAX : 02-500-1450
              </p>
              <p className="text-[11px] text-slate-500 mt-1.5 font-mono">
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

      {/* --- 모달 2: 부서 비밀번호 로그인 (Clean White Modal) --- */}
      {deptLoginModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl p-6 relative text-slate-800">
            <button
              onClick={() => setDeptLoginModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#169268] flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">[{selectedDept}] 비밀번호 입력</h3>
                <p className="text-xs text-slate-500">부서 평가함에 접근하려면 비밀번호를 입력해주세요.</p>
              </div>
            </div>

            <form onSubmit={handleDeptLoginSubmit} className="space-y-4 mt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  부서 비밀번호
                </label>
                <input
                  type="password"
                  autoFocus
                  placeholder="부서 비밀번호를 입력하세요"
                  value={deptPassword}
                  onChange={(e) => setDeptPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {deptError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{deptError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeptLoginModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={deptLoading}
                  className="w-2/3 py-2.5 rounded-xl bg-[#169268] hover:bg-[#127754] text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{deptLoading ? '확인 중...' : '부서 평가함 입장'}</span>
                </button>
              </div>

              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                * 부서별 비밀번호는 관리자(총무행정부 우세림)가 사전에 발급한 4자리 숫자를 입력해주세요. (비밀번호 미발급 시 관리자 문의)
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
