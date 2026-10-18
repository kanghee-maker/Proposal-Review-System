'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Users, CheckCircle, Award, ChevronRight, KeyRound, Lock, AlertCircle, X, Check } from 'lucide-react';
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
        // 이미 비번이 설정된 경우 -> 비번 입력창 오픈
        setDeptPassword('');
        setDeptError('');
        setDeptLoginModalOpen(true);
      } else {
        // 아직 비번이 설정되지 않은 경우 -> 초기 비번 설정 모달 오픈
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-700/60 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="bg-white px-2.5 py-1.5 rounded-xl shadow-sm flex items-center justify-center">
            <img src="/images/logo.png" alt="과천도시공사 로고" className="h-7 w-auto object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">과천도시공사 제안 평가 시스템</h1>
            <p className="text-xs text-sky-300 font-medium tracking-wide">GWACHEON CITY URBAN CORPORATION</p>
          </div>
        </div>
        <div className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
          2026년도 혁신 제안 심사 플랫폼
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto w-full px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-300 text-xs font-semibold mb-4">
            <Award className="w-3.5 h-3.5 text-sky-400" />
            2026년 혁신 제안 0차 부서평가 진행 중
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            제안 검토 및 평가 포털
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto">
            공사 임직원 및 시민이 제출한 137건의 제안에 대해 각 부서의 타당성(0차 부서평가)을 심사하고,
            전체 평가 건을 체계적으로 관리합니다.
          </p>
        </div>

        {/* 2 Roles Card Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
          {/* 1. 관리자 (Admin) 카드 */}
          <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-8 flex flex-col justify-between shadow-xl shadow-black/30 hover:border-sky-500/50 transition">
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-5">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">총괄 관리자 로그인</h3>
              <p className="text-sm text-slate-400 mb-6">
                제안평가 회차 생성, 엑셀 일괄 업로드 및 파싱, 부서별 배정 수정, 2026 조직도 관리, 종합 평가결과 엑셀 다운로드를 수행합니다.
              </p>

              <div className="space-y-2 text-xs text-slate-300 mb-8 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <span>제안평가 건 생성 &amp; 제안 엑셀 일괄 등록</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <span>2026 조직도(JPEG 뷰어 및 부서 트리) 관리</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <span>부서평가 항목(Result / Opinion) 동적 설정</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <span>0차 부서평가 취합 결과 엑셀 Export</span>
                </div>
              </div>
            </div>

            <button
              onClick={openAdminModal}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 font-semibold text-white shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition"
            >
              <Lock className="w-4 h-4" />
              <span>관리자 모드로 입장 (비밀번호 확인)</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
          </div>

          {/* 2. 평가자 (Evaluator) 카드 */}
          <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-8 flex flex-col justify-between shadow-xl shadow-black/30 hover:border-emerald-500/50 transition">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">부서 평가자 로그인</h3>
              <p className="text-sm text-slate-400 mb-6">
                담당 부서(실행부서)를 선택하여 본인 부서에 배정된 제안 목록을 열람하고, 0차 부서평가(수용 여부 및 의견)를 진행합니다.
              </p>

              <form onSubmit={handleEvaluatorCheck} className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    담당 부서 선택 <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {departments.map((dept) => (
                      <option key={dept.code} value={dept.department}>
                        [{dept.office}] {dept.department}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    평가자 성명 (선택)
                  </label>
                  <input
                    type="text"
                    placeholder="예: 홍길동 (부장)"
                    value={evaluatorName}
                    onChange={(e) => setEvaluatorName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={deptLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-semibold text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition mt-2 disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{deptLoading ? '부서 확인 중...' : '해당 부서 평가함 입장'}</span>
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
              </form>
            </div>

            <div className="text-xs text-slate-400 text-center">
              ※ 각 부서는 최초 1회 비밀번호를 설정한 후 안전하게 평가를 수행합니다.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-4 text-center text-xs text-slate-400">
        과천도시공사 (13807) 경기도 과천시 통영로 5 과천도시공사 • TEL 02-504-7300 • FAX 02-500-1450
      </footer>

      {/* --- 모달 1: 관리자 비밀번호 입력 --- */}
      {adminModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 relative text-white">
            <button
              onClick={() => setAdminModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">총괄 관리자 비밀번호 확인</h3>
                <p className="text-xs text-slate-400">관리자 모드 접근을 위해 비밀번호를 입력해주세요.</p>
              </div>
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-4 mt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  비밀번호 입력
                </label>
                <input
                  type="password"
                  autoFocus
                  placeholder="관리자 비밀번호를 입력하세요"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[11px] text-sky-400/80 mt-1.5">
                  * 초기 기본 비밀번호: <strong className="text-sky-300">0423</strong>
                </p>
              </div>

              {adminError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{adminError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdminModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={adminLoading}
                  className="w-2/3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-lg shadow-sky-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{adminLoading ? '인증 확인 중...' : '관리자 입장'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- 모달 2: 부서 비밀번호 로그인 --- */}
      {deptLoginModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 relative text-white">
            <button
              onClick={() => setDeptLoginModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">[{selectedDept}] 비밀번호 입력</h3>
                <p className="text-xs text-slate-400">부서 평가함에 접근하려면 비밀번호를 입력해주세요.</p>
              </div>
            </div>

            <form onSubmit={handleDeptLoginSubmit} className="space-y-4 mt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  부서 비밀번호
                </label>
                <input
                  type="password"
                  autoFocus
                  placeholder="부서 비밀번호를 입력하세요"
                  value={deptPassword}
                  onChange={(e) => setDeptPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {deptError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{deptError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeptLoginModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={deptLoading}
                  className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{deptLoading ? '확인 중...' : '부서 평가함 입장'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- 모달 3: 부서 초기 비밀번호 설정 --- */}
      {deptSetupModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 relative text-white">
            <button
              onClick={() => setDeptSetupModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">[{selectedDept}] 초기 비밀번호 설정</h3>
                <p className="text-xs text-slate-400">
                  아직 설정된 비밀번호가 없습니다. 앞으로 사용할 비밀번호를 설정해주세요.
                </p>
              </div>
            </div>

            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
              * 설정한 비밀번호는 향후 <strong>[{selectedDept}]</strong> 평가함에 접속할 때 사용됩니다. 잊어버리지 않도록 주의해주세요.
            </div>

            <form onSubmit={handleDeptSetupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  새 비밀번호 (4자리 이상) <span className="text-amber-400">*</span>
                </label>
                <input
                  type="password"
                  autoFocus
                  placeholder="사용할 비밀번호를 입력하세요"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  비밀번호 확인 <span className="text-amber-400">*</span>
                </label>
                <input
                  type="password"
                  placeholder="비밀번호를 다시 한번 입력하세요"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {setupError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{setupError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeptSetupModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={setupLoading}
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-xs font-semibold text-white shadow-lg shadow-amber-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
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
