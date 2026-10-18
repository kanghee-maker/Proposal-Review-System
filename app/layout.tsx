import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '과천도시공사 제안 평가 시스템',
  description: '과천도시공사 혁신 제안 부서 평가(0차 평가) 및 제안 심사(1차 평가) 총괄 관리 포털',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
