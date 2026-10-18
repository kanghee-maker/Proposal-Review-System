'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, User, LogOut, CheckCircle, FileText } from 'lucide-react';

export default function EvaluatorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [deptName, setDeptName] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const d = localStorage.getItem('gcuc_dept_name') || '회계부';
      const u = localStorage.getItem('gcuc_user_name') || '부서 평가자';
      setDeptName(d);
      setUserName(u);
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gcuc_user_role');
      localStorage.removeItem('gcuc_dept_name');
      localStorage.removeItem('gcuc_user_name');
    }
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Header */}
      <header className="bg-emerald-950 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/evaluator" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow">
              GC
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight tracking-tight">과천도시공사 제안 평가 시스템</h1>
              <p className="text-[11px] text-emerald-300 font-medium tracking-wide">0차 부서평가 전용 포털</p>
            </div>
          </Link>

          <div className="flex items-center gap-4 text-xs">
            <div className="bg-emerald-900/80 px-3.5 py-1.5 rounded-xl border border-emerald-800/80 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>평가부서: <strong className="text-white font-bold">{deptName}</strong></span>
              <span className="text-emerald-500">|</span>
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>{userName}</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white bg-emerald-900/60 hover:bg-emerald-900 px-3 py-1.5 rounded-lg border border-emerald-800 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        과천도시공사 제안 평가 시스템 • 0차 부서 타당성 심사
      </footer>
    </div>
  );
}
