'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, User, LogOut, CheckCircle, FileText, ExternalLink } from 'lucide-react';

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
      const isAdminAuth = localStorage.getItem('gcuc_admin_auth') === 'true';

      if (isAdminAuth && (!d || isAuth !== 'true')) {
        setDeptName('총괄 관리자 (미리보기)');
        setUserName('조회 전용 모드');
        setAuthorized(true);
      } else if (!d || isAuth !== 'true') {
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
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-800">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#169268] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">부서 인증 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-800">
      {/* 1. GCUC Top Utility Bar (#383a41) */}
      <div className="bg-[#383a41] text-xs text-slate-300 py-1 px-4 sm:px-6 border-b border-[#25262b]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-[15px]">
            <span className="bg-[#25262b] text-white px-2 py-0.5 rounded font-bold">GCUC</span>
            <span>과천도시공사 제안 평가 시스템 • 부서 평가(0차 평가)</span>
          </div>
          <div className="flex items-center gap-3 text-[15px] text-slate-400">
            <span>2026년 혁신 제안 심사</span>
            <span className="text-slate-600">|</span>
            <a href="https://www.gcuc.or.kr" target="_blank" rel="noreferrer" className="hover:text-white transition flex items-center gap-0.5">
              <span>공사 대표사이트</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>

      {/* 2. Main Header (Clean White with GCUC Identity) */}
      <header className="bg-white text-slate-800 shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 hover:opacity-90 transition" title="메인 포털(초기 화면)로 이동">
            <div className="flex items-center justify-center">
              <img src="/images/logo.png" alt="과천도시공사 로고" className="h-7 sm:h-8 w-auto object-contain cursor-pointer" />
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg leading-tight tracking-tight text-slate-900 line-clamp-1">
                제안 평가 시스템 <span className="text-[#169268]">부서 심사</span>
              </h1>
              <p className="text-[14px] sm:text-[15px] text-[#169268] font-semibold tracking-wide">
                부서 평가(0차 평가) 전용
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4 text-xs">
            <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5 sm:gap-2 shadow-sm">
              <Building2 className="w-4 h-4 text-[#169268] flex-shrink-0" />
              <strong className="text-slate-900 text-xs font-bold truncate max-w-[120px] sm:max-w-none">{deptName}</strong>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="text-slate-600 hidden sm:inline">{userName}</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-slate-600 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-slate-200 transition font-medium"
              title="로그아웃"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {children}
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
    </div>
  );
}
