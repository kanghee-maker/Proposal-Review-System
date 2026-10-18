'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Layers, FileText, Network, DownloadCloud, LogOut, Shield, Menu, X } from 'lucide-react';

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
    { href: '/admin/reports', label: '0차 평가 취합', icon: DownloadCloud },
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">관리자 인증 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 pb-16 md:pb-0">
      {/* Top Header */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition" title="메인 포털(초기 화면)로 이동">
              <div className="bg-white p-1 rounded-lg shadow-sm flex items-center justify-center">
                <img src="/images/logo.png" alt="과천도시공사 로고" className="h-5 sm:h-6 w-auto object-contain cursor-pointer" />
              </div>
              <div>
                <h1 className="font-bold text-sm sm:text-base leading-tight tracking-tight text-white line-clamp-1">
                  제안 평가 시스템
                </h1>
                <p className="text-[10px] sm:text-[11px] text-sky-300 font-medium tracking-wide hidden xs:block">
                  ADMIN PORTAL
                </p>
              </div>
            </Link>
            <span className="hidden sm:inline-flex ml-2 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-950 text-sky-400 border border-sky-800 items-center gap-1">
              <Shield className="w-3 h-3" />
              관리자
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs text-slate-400 hidden lg:inline">
              로그인: <strong className="text-slate-200">총괄 관리자</strong>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
              title="로그아웃"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
            {/* 모바일 햄버거 토글 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white md:hidden"
              aria-label="메뉴 열기"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Desktop Navigation Bar */}
        <nav className="bg-slate-800/90 border-t border-slate-700/80 hidden md:block">
          <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    isActive
                      ? 'border-sky-400 text-sky-400 bg-slate-800 font-semibold'
                      : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-750'
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
          <div className="md:hidden bg-slate-800 border-t border-slate-700 px-4 py-3 space-y-1 shadow-lg">
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
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-2 py-1.5 flex justify-around items-center z-40 shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition min-w-[64px] ${
                isActive ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 hidden md:block">
        과천도시공사 제안 평가 시스템 • 2026 Innovation Proposal Review Management System
      </footer>
    </div>
  );
}
