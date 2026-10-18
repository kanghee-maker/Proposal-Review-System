'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, User, LogOut, CheckCircle, FileText } from 'lucide-react';

export default function EvaluatorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [deptName, setDeptName] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [authorized, setAuthorized] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const d = localStorage.getItem('gcuc_dept_name') || '';
      const u = localStorage.getItem('gcuc_user_name') || '부서 평가자';
      const isAuth = d ? localStorage.getItem(`gcuc_dept_auth_${d}`) : null;

      if (!d || isAuth !== 'true') {
        router.push('/');
      } else {
        setDeptName(d);
        setUserName(u);
        setAuthorized(true);
      }
    }
  }, [router]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gcuc_user_role');
      localStorage.removeItem('gcuc_dept_name');
      localStorage.removeItem('gcuc_user_name');
      if (deptName) {
        localStorage.removeItem(`gcuc_dept_auth_${deptName}`);
      }
    }
    router.push('/');
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-emerald-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-emerald-300">부서 인증 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Header */}
      <header className="bg-emerald-950 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition" title="메인 포털(초기 화면)로 이동">
            <div className="bg-white p-1 rounded-lg shadow-sm flex items-center justify-center">
              <img src="/images/logo.png" alt="과천도시공사 로고" className="h-5 sm:h-6 w-auto object-contain cursor-pointer" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base leading-tight tracking-tight text-white line-clamp-1">
                제안 평가 시스템
              </h1>
              <p className="text-[10px] sm:text-[11px] text-emerald-300 font-medium tracking-wide">
                0차 부서평가 전용
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4 text-xs">
            <div className="bg-emerald-900/80 px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-emerald-800/80 flex items-center gap-1.5 sm:gap-2">
              <Building2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <strong className="text-white text-xs truncate max-w-[100px] sm:max-w-none">{deptName}</strong>
              <span className="text-emerald-500 hidden sm:inline">|</span>
              <span className="text-slate-300 hidden sm:inline">{userName}</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-slate-300 hover:text-white bg-emerald-900/60 hover:bg-emerald-900 px-2.5 py-1.5 rounded-lg border border-emerald-800 transition"
              title="로그아웃"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        과천도시공사 제안 평가 시스템 • 0차 부서 타당성 심사
      </footer>
    </div>
  );
}
