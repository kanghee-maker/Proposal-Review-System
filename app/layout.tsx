import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '과천도시공사 제안 평가 시스템',
  description: '과천도시공사 혁신 제안 0차 부서평가 및 회차별 심사 관리 시스템',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
