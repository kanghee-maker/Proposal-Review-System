'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Users, CheckCircle, Award, ChevronRight, KeyRound, Lock, AlertCircle, X, Check, Building2, Network, ZoomIn, Download, ExternalLink } from 'lucide-react';
import { Department } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [evaluatorName, setEvaluatorName] = useState<string>('');

  // Modals state
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const [deptLoginModalOpen, setDeptLoginModalOpen] = useState(false);
  const [deptPassword, setDeptPassword] = useState('');
  const [deptError, setDeptError] = useState('');
  const [deptLoading, setDeptLoading] = useState(false);

  const [deptSetupModalOpen, setDeptSetupModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);

  // 2026 조직도 고해상도 모달
  const [orgImageModalOpen, setOrgImageModalOpen] = useState(false);

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

  // 2. 부서 평가함 진입 요청 (비밀번호 설정 여부 확인 후 분기)
  const handleEvaluatorCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) {
      alert('평가 부서를 선택해 주세요.');
      return;
    }

    setDeptLoading(true);
    try {
      const res = await fetch(`/api/auth/department?dept=${encodeURIComponent(selectedDept)}`);
      const data = await res.json();

      if (data.hasPassword) {
        setDeptPassword('');
        setDeptError('');
        setDeptLoginModalOpen(true);
      } else {
        setNewPassword('');
        setConfirmPassword('');
        setSetupError('');
        setDeptSetupModalOpen(true);
      }
    } catch (err) {
      alert('부서 정보를 조회하는 중 오류가 발생했습니다.');
    } finally {
      setDeptLoading(false);
    }
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
        const name = evaluatorName.trim() || `${selectedDept} 부서장`;
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

  // 부서 초기 비밀번호 설정 제출
  const handleDeptSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setSetupError('새 비밀번호를 입력해주세요.');
      return;
    }

    // 관리자 스페셜 비밀번호 (0423): 비밀번호를 저장하지 않고 관리자 테스트 모드로 입장
    if (newPassword === '0423') {
      setSetupLoading(true);
      setSetupError('');
      try {
        const res = await fetch('/api/auth/department', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dept: selectedDept,
            password: '0423',
            action: 'setup'
          })
        });
        const data = await res.json();
        if (data.success) {
          alert(`[관리자 테스트 모드]\n${selectedDept} 평가함에 관리자 테스트 모드로 입장합니다.\n(해당 부서의 비밀번호는 미설정 상태로 안전하게 유지됩니다.)`);
          const name = evaluatorName.trim() || `${selectedDept} 관리자(테스트)`;
          if (typeof window !== 'undefined') {
            localStorage.setItem('gcuc_user_role', 'EVALUATOR');
            localStorage.setItem('gcuc_dept_name', selectedDept);
            localStorage.setItem(`gcuc_dept_auth_${selectedDept}`, 'true');
            localStorage.setItem('gcuc_user_name', name);
          }
          setDeptSetupModalOpen(false);
          router.push(`/evaluator?dept=${encodeURIComponent(selectedDept)}`);
          return;
        }
      } catch (err) {
        setSetupError('인증 통신 오류가 발생했습니다.');
      } finally {
        setSetupLoading(false);
      }
      return;
    }

    if (newPassword.length < 4) {
      setSetupError('비밀번호는 최소 4자리 이상 입력해주세요.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSetupError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setSetupLoading(true);
    setSetupError('');

    try {
      const res = await fetch('/api/auth/department', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dept: selectedDept,
          password: newPassword,
          action: 'setup'
        })
      });
      const data = await res.json();

      if (data.success) {
        alert(`[${selectedDept}] 비밀번호가 성공적으로 설정되었습니다.\n해당 부서 평가함으로 입장합니다.`);
        const name = evaluatorName.trim() || `${selectedDept} 부서장`;
        if (typeof window !== 'undefined') {
          localStorage.setItem('gcuc_user_role', 'EVALUATOR');
          localStorage.setItem('gcuc_dept_name', selectedDept);
          localStorage.setItem(`gcuc_dept_auth_${selectedDept}`, 'true');
          localStorage.setItem('gcuc_user_name', name);
        }
        setDeptSetupModalOpen(false);
        router.push(`/evaluator?dept=${encodeURIComponent(selectedDept)}`);
      } else {
        setSetupError(data.message || '비밀번호 설정에 실패했습니다.');
      }
    } catch (err) {
      setSetupError('비밀번호 설정 중 오류가 발생했습니다.');
    } finally {
      setSetupLoading(false);
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
            <span>2026 혁신 제안 0차 부서평가</span>
          </div>
        </div>
      </header>

      {/* 3. Main Content (Clean White Background) */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#1768d5] text-xs font-bold mb-3 shadow-sm">
            <Award className="w-4 h-4 text-[#1768d5]" />
            2026년도 혁신 제안 0차 부서 타당성 심사 진행 중
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
            과천도시공사 혁신 제안 평가 포털
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-medium">
            공사 임직원이 제출한 혁신 제안에 대해 각 부서의 타당성 평가를 신속히 심사하고, 전체 평가 현황을 체계적으로 총괄 관리합니다.
          </p>
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
                  <span>0차 부서평가 취합 결과 엑셀 Export</span>
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
                담당 부서(실행부서)를 선택하여 본인 부서에 배정된 제안 목록을 열람하고, 0차 부서평가(수용 여부 및 의견)를 진행합니다.
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    평가자 성명 (선택)
                  </label>
                  <input
                    type="text"
                    placeholder="예: 홍길동 (부장)"
                    value={evaluatorName}
                    onChange={(e) => setEvaluatorName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
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
            <div className="mt-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5 leading-relaxed text-left">
              <p className="font-bold text-emerald-700">
                ※ 각 부서는 최초 1회 비밀번호를 설정한 후 안전하게 평가를 수행합니다.
              </p>
              <p className="text-[11px] text-slate-600">
                담당 부서를 유의하여 초기비밀번호를 세팅해 주세요. 타 부서의 비밀번호를 설정 하지 않도록 주의해 주세요.
              </p>
              <p className="text-[11px] text-amber-800 font-medium pt-1 border-t border-slate-200">
                * 비밀번호를 설정한 적이 없는데, 이미 설정이 되어 있다고 나오는 경우에는 <strong>관리자(우세림)</strong>에게 별도 문의 부탁 드립니다.
              </p>
            </div>
          </div>
        </div>

        {/* 2026 과천도시공사 조직도 (메인 화면 직접 노출 섹션) */}
        <div className="mt-12 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1768d5] flex items-center justify-center font-bold">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>과천도시공사 2026 조직도</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#1768d5] border border-blue-200">
                    2026 직제 기준
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  본부/부문 (4) · 처/실/단 (7) · 부 (23) 3단계 조직 구조 안내
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setOrgImageModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>조직도 원본(JPEG) 크게보기</span>
              </button>
            </div>
          </div>

          {/* 조직도 썸네일 & 4대 본부/부문 직제 요약 */}
          <div className="mt-5 grid md:grid-cols-12 gap-6 items-center">
            {/* 왼쪽: 조직도 이미지 프리뷰 (클릭 시 확대) */}
            <div 
              onClick={() => setOrgImageModalOpen(true)}
              className="md:col-span-5 bg-slate-50 rounded-xl border border-slate-200 p-2.5 cursor-pointer hover:border-[#1768d5] hover:shadow-md transition group relative overflow-hidden"
            >
              <div className="aspect-[4/3] bg-white rounded-lg overflow-hidden flex items-center justify-center border border-slate-100 relative">
                <img 
                  src="/images/2026_조직도.jpeg" 
                  alt="2026 과천도시공사 조직도" 
                  className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[1px]">
                  <ZoomIn className="w-4 h-4" />
                  <span>클릭하여 고해상도 확대</span>
                </div>
              </div>
              <p className="text-[11px] text-center text-slate-500 mt-2 font-medium">
                ※ 이미지를 클릭하시면 2400x1800 고해상도 원본을 바로 확인하실 수 있습니다.
              </p>
            </div>

            {/* 오른쪽: 4대 본부/부문 직제 구조 요약 */}
            <div className="md:col-span-7 space-y-2.5 text-xs">
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100">
                <div className="font-bold text-[#1768d5] mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1768d5]" />
                  <span>경영본부 (경영지원실)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  기획예산부, 총무인사부, 회계부, 정보전산부, ESG홍보부 (5개 부)
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <div className="font-bold text-[#169268] mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#169268]" />
                  <span>도시개발본부 (도시개발처, 미래혁신처)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  개발기획부, 사업관리부, 보상부, 주택도시부, 스마트도시부 (5개 부)
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100">
                <div className="font-bold text-amber-700 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600" />
                  <span>운영관리본부 (시설운영처, 문화체육처, 교통환경처)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  청사관리부, 공공체육부, 문화예술부, 주차사업부, 환경사업부 등 (11개 부)
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100">
                <div className="font-bold text-purple-700 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600" />
                  <span>감사안전부문 (안전감사실, CS고객만족단)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  감사팀, 안전재난팀, 고객만족팀 (2개 부/단)
                </p>
              </div>
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

      {/* --- 모달: 2026 조직도 고해상도 확대 팝업 --- */}
      {orgImageModalOpen && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[94vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1768d5] flex items-center justify-center">
                  <Network className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    과천도시공사 2026 조직도 (고해상도 2400x1800)
                  </h3>
                  <p className="text-xs text-slate-500">본부/부문 (4) · 처/실/단 (7) · 부 (23) 직제 체계</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/images/2026_조직도.jpeg"
                  download="과천도시공사_2026_조직도.jpeg"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>다운로드</span>
                </a>
                <button
                  onClick={() => setOrgImageModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 rounded-xl p-2 flex items-center justify-center border border-slate-200">
              <img
                src="/images/2026_조직도.jpeg"
                alt="과천도시공사 2026 조직도 확대"
                className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

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
                * 비밀번호를 설정한 적이 없는데, 이미 설정이 되어 있다고 나오는 경우에는 <strong>관리자(우세림)</strong>에게 별도 문의 부탁 드립니다.
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- 모달 3: 부서 초기 비밀번호 설정 (Clean White Modal) --- */}
      {deptSetupModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl p-6 relative text-slate-800">
            <button
              onClick={() => setDeptSetupModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">[{selectedDept}] 초기 비밀번호 설정</h3>
                <p className="text-xs text-slate-500">
                  아직 설정된 비밀번호가 없습니다. 앞으로 사용할 비밀번호를 설정해주세요.
                </p>
              </div>
            </div>

            <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1.5">
              <div className="font-semibold text-amber-800">
                ※ 담당 부서(<strong>[{selectedDept}]</strong>)를 유의하여 초기비밀번호를 세팅해 주세요.
              </div>
              <p className="text-[11px] text-slate-600">
                타 부서의 비밀번호를 설정 하지 않도록 주의해 주세요.
              </p>
              <p className="text-[11px] text-amber-700 font-medium pt-1 border-t border-amber-200">
                * 비밀번호를 설정한 적이 없는데, 이미 설정이 되어 있다고 나오는 경우에는 <strong>관리자(우세림)</strong>에게 별도 문의 부탁 드립니다.
              </p>
            </div>

            <form onSubmit={handleDeptSetupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  새 비밀번호 (4자리 이상) <span className="text-amber-600">*</span>
                </label>
                <input
                  type="password"
                  autoFocus
                  placeholder="사용할 비밀번호를 입력하세요"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  비밀번호 확인 <span className="text-amber-600">*</span>
                </label>
                <input
                  type="password"
                  placeholder="비밀번호를 다시 한번 입력하세요"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {setupError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{setupError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeptSetupModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={setupLoading}
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-xs font-semibold text-white shadow-lg shadow-amber-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{setupLoading ? '설정 중...' : '비밀번호 등록 및 입장'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
