'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Layers, FileText, Network, DownloadCloud, LogOut, Shield, Menu, X, ExternalLink } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuth = localStorage.getItem('gcuc_admin_auth');
      if (isAuth !== 'true') {
        router.push('/');
      } else {
        setAuthorized(true);
      }
    }
  }, [router]);

  const navItems = [
    { href: '/admin', label: '제안평가 관리', icon: Layers },
    { href: '/admin/proposals', label: '제안 목록·배정', icon: FileText },
    { href: '/admin/organization', label: '2026 조직도', icon: Network },
    { href: '/admin/reports', label: '부서 평가(0차 평가) 취합', icon: DownloadCloud },
  ];

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gcuc_user_role');
      localStorage.removeItem('gcuc_user_name');
      localStorage.removeItem('gcuc_admin_auth');
    }
    router.push('/');
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-800">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#1768d5] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">관리자 인증 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-800 pb-16 md:pb-0">
      {/* 1. GCUC Top Utility Bar (#383a41) */}
      <div className="bg-[#383a41] text-xs text-slate-300 py-1 px-4 sm:px-6 border-b border-[#25262b]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="bg-[#25262b] text-white px-2 py-0.5 rounded font-bold">GCUC</span>
            <span>과천도시공사 제안 평가 시스템 • 총괄 관리자 포털</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition" title="메인 포털(초기 화면)로 이동">
              <div className="bg-white p-1 rounded-xl border border-slate-100 shadow-sm flex items-center justify-center">
                <img src="/images/logo.png" alt="과천도시공사 로고" className="h-7 sm:h-8 w-auto object-contain cursor-pointer" />
              </div>
              <div>
                <h1 className="font-extrabold text-base sm:text-lg leading-tight tracking-tight text-slate-900 line-clamp-1">
                  제안 평가 시스템 <span className="text-[#1768d5]">관리자</span>
                </h1>
                <p className="text-[10px] sm:text-[11px] text-[#1768d5] font-semibold tracking-wide hidden xs:block">
                  ADMINISTRATION MANAGEMENT
                </p>
              </div>
            </Link>
            <span className="hidden sm:inline-flex ml-2 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#1768d5] border border-blue-200 items-center gap-1">
              <Shield className="w-3 h-3" />
              총괄 관리자
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs text-slate-600 hidden lg:inline">
              접속자: <strong className="text-slate-900 font-bold">총괄 관리자</strong>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-slate-600 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-slate-200 transition font-medium"
              title="로그아웃"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
            {/* 모바일 햄버거 토글 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 md:hidden border border-slate-200"
              aria-label="메뉴 열기"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Desktop Navigation Bar (Clean White / GCUC Blue Active Tab) */}
        <nav className="bg-white border-t border-slate-100 hidden md:block">
          <div className="max-w-7xl mx-auto px-6 flex gap-2 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
                    isActive
                      ? 'border-[#1768d5] text-[#1768d5] bg-blue-50/50'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Mobile Dropdown Menu (모바일 상단 펼침 메뉴) */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 px-4 py-3 space-y-1 shadow-lg">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[#1768d5] text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar (모바일 전용 하단 고정 탭) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1.5 flex justify-around items-center z-40 shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition min-w-[64px] ${
                isActive ? 'text-[#1768d5] font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 4. GCUC Official Style Footer */}
      <footer className="w-full mt-auto hidden md:block">
        {/* Footer Top Sub-bar (#383a41) */}
        <div className="bg-[#383a41] border-b border-[#25262b] py-2 px-6 text-xs text-slate-300">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="text-[#ffd300] font-bold">개인정보 처리방침</span>
              <span className="text-slate-500">|</span>
              <span className="hover:text-white cursor-pointer">이메일주소무단수집거부</span>
              <span className="text-slate-500">|</span>
              <span className="hover:text-white cursor-pointer">과천도시공사 윤리경영</span>
            </div>
            <div className="text-[11px] text-slate-400">
              과천도시공사 제안 평가 시스템 • 총괄 관리자 포털
            </div>
          </div>
        </div>

        {/* Footer Bottom Address (#25262b) */}
        <div className="bg-[#25262b] text-[#afafaf] py-5 px-6 text-xs leading-relaxed">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
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
            <div className="text-right">
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
