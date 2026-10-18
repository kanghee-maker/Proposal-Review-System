'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Users, CheckCircle, FileSpreadsheet, Building2, ChevronRight, Award } from 'lucide-react';
import { Department } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [evaluatorName, setEvaluatorName] = useState<string>('');

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

  const handleEvaluatorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) {
      alert('평가 부서를 선택해 주세요.');
      return;
    }
    const name = evaluatorName.trim() || `${selectedDept} 부서장`;
    // 로컬 스토리지에 평가자 세션 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('gcuc_user_role', 'EVALUATOR');
      localStorage.setItem('gcuc_dept_name', selectedDept);
      localStorage.setItem('gcuc_user_name', name);
    }
    router.push(`/evaluator?dept=${encodeURIComponent(selectedDept)}`);
  };

  const handleAdminLogin = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gcuc_user_role', 'ADMIN');
      localStorage.setItem('gcuc_user_name', '관리자');
    }
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-700/60 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center font-bold text-lg shadow-lg shadow-sky-500/20">
            GC
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">과천도시공사 제안 평가 시스템</h1>
            <p className="text-xs text-sky-300 font-medium">GWAMCHEON CITY URBAN CORPORATION</p>
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
              onClick={handleAdminLogin}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 font-semibold text-white shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition"
            >
              <span>관리자 모드로 입장</span>
              <ChevronRight className="w-4 h-4" />
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

              <form onSubmit={handleEvaluatorLogin} className="space-y-4 mb-6">
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
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-semibold text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition mt-2"
                >
                  <span>해당 부서 평가함 입장</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="text-xs text-slate-400 text-center">
              ※ 평가자는 본인 부서로 배정된 제안만 조회 및 평가할 수 있습니다.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-4 text-center text-xs text-slate-400">
        과천도시공사 (13807) 경기도 과천시 통영로 5 과천도시공사 • TEL 02-504-7300 • FAX 02-500-1450
      </footer>
    </div>
  );
}
