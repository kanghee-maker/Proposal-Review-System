'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Layers, FileText, Network, DownloadCloud, LogOut, Shield } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: '/admin', label: '제안평가 회차 관리', icon: Layers },
    { href: '/admin/proposals', label: '제안 목록 및 부서 배정', icon: FileText },
    { href: '/admin/organization', label: '2026 조직도', icon: Network },
    { href: '/admin/reports', label: '0차 평가결과 취합 & 다운로드', icon: DownloadCloud },
  ];

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gcuc_user_role');
      localStorage.removeItem('gcuc_user_name');
    }
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Top Header */}
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center font-bold text-white shadow">
                GC
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight tracking-tight">과천도시공사 제안 평가 시스템</h1>
                <p className="text-[11px] text-sky-300 font-medium tracking-wide">ADMINISTRATION PORTAL</p>
              </div>
            </Link>
            <span className="ml-3 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-950 text-sky-400 border border-sky-800 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              총괄 관리자
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 hidden sm:inline">
              로그인: <strong className="text-slate-200">관리자 (기획혁신 담당)</strong>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>

        {/* Global Navigation Bar */}
        <nav className="bg-slate-800/90 border-t border-slate-700/80">
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
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        과천도시공사 제안 평가 시스템 • 2026 Innovation Proposal Review Management System
      </footer>
    </div>
  );
}
