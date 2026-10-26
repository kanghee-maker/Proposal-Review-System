'use client';

import React, { useState, useEffect } from 'react';
import { Network, Image as ImageIcon, Table, Plus, Trash2, Download, ZoomIn, Check } from 'lucide-react';
import { Department, OrganizationChart } from '@/lib/types';

export default function OrganizationPage() {
  const [chart, setChart] = useState<OrganizationChart | null>(null);
  const [viewMode, setViewMode] = useState<'IMAGE' | 'TABLE'>('IMAGE');
  const [filterDivision, setFilterDivision] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);

  // 신규 부서 추가 모달
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newDivision, setNewDivision] = useState<string>('운영관리본부');
  const [newOffice, setNewOffice] = useState<string>('');
  const [newDept, setNewDept] = useState<string>('');
  const [newCode, setNewCode] = useState<string>('');
  const [newHead, setNewHead] = useState<string>('부장');

  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/organization')
      .then(res => res.json())
      .then(data => setChart(data))
      .catch(err => console.error(err));
  }, []);

  const handleAddDepartment = () => {
    if (!newOffice.trim() || !newDept.trim()) {
      alert('처/실/단 명칭과 부 명칭을 모두 입력해 주세요.');
      return;
    }
    if (!chart) return;

    const code = newCode.trim().toUpperCase() || `DEPT_${Date.now()}`;
    const newEntry: Department = {
      code,
      division: newDivision,
      office: newOffice.trim(),
      department: newDept.trim(),
      name: `${newOffice.trim()} ${newDept.trim()}`,
      head_title: newHead
    };

    const updated = {
      ...chart,
      departments: [...chart.departments, newEntry]
    };
    setChart(updated);
    saveChart(updated);

    // 폼 초기화
    setNewOffice('');
    setNewDept('');
    setNewCode('');
    setIsAddOpen(false);
  };

  const handleDeleteDepartment = (code: string) => {
    if (!chart) return;
    if (!confirm('정말 이 부서를 조직도에서 삭제하시겠습니까?')) return;

    const updated = {
      ...chart,
      departments: chart.departments.filter(d => d.code !== code)
    };
    setChart(updated);
    saveChart(updated);
  };

  const saveChart = async (chartToSave: OrganizationChart) => {
    setSaving(true);
    try {
      const res = await fetch('/api/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chartToSave)
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error(err);
      alert('조직도 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!chart) {
    return <div className="text-center py-20 text-slate-500 text-xs">조직도 데이터를 불러오는 중...</div>;
  }

  const divisions = ['ALL', '사장 직속', '개발사업본부', '운영관리본부', '경영부문'];

  const filteredDepts = chart.departments.filter(dept => {
    if (filterDivision !== 'ALL' && dept.division !== filterDivision) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        dept.department.toLowerCase().includes(q) ||
        dept.office.toLowerCase().includes(q) ||
        dept.division.toLowerCase().includes(q) ||
        dept.code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                2026 조직도 관리
                <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
                  {chart.name}
                </span>
              </h2>
              <p className="text-[12px] sm:text-xs text-slate-500 line-clamp-1">
                본부/부문 (Division) • 처/실/단 (Office) • 부 (Department) 3단 체계
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {saveSuccess && (
            <span className="text-[12px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 font-medium">
              <Check className="w-3 h-3" />
              저장 완료
            </span>
          )}

          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setViewMode('IMAGE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'IMAGE'
                  ? 'bg-white text-sky-600 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>조직도 (JPEG)</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'TABLE'
                  ? 'bg-white text-sky-600 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>부서 목록 ({chart.departments.length})</span>
            </button>
          </div>

          <a
            href="/images/2026_조직도.jpeg"
            download="2026_과천도시공사_조직도.jpeg"
            className="flex items-center gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-xl transition shadow-sm whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">JPEG 다운로드</span>
            <span className="sm:hidden">다운로드</span>
          </a>
        </div>
      </div>

      {/* 1. JPEG 그림 뷰어 모드 */}
      {viewMode === 'IMAGE' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm">2026 조직계층구조요약 (고해상도 JPEG)</h3>
              <p className="text-[12px] text-slate-500">
                모바일에서도 터치하여 원본 크기로 선명하게 확인하실 수 있습니다.
              </p>
            </div>
            <button
              onClick={() => setIsZoomOpen(true)}
              className="flex items-center gap-1 text-[12px] text-slate-600 hover:text-sky-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>확대</span>
            </button>
          </div>

          <div
            onClick={() => setIsZoomOpen(true)}
            className="cursor-pointer border border-slate-200 rounded-xl overflow-x-auto hover:border-sky-400 transition bg-slate-50 p-1 sm:p-2 flex justify-center group relative shadow-inner"
          >
            <img
              src="/images/2026_조직도.jpeg"
              alt="과천도시공사 2026 조직도"
              className="w-full max-w-5xl rounded-lg shadow-sm object-contain"
            />
            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 hidden sm:flex items-center justify-center transition">
              <span className="opacity-0 group-hover:opacity-100 bg-slate-900/80 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur transition">
                <ZoomIn className="w-4 h-4" /> 클릭하여 원본 크기 확대
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. 부서 트리 및 편집 목록 테이블 모드 */}
      {viewMode === 'TABLE' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="p-3 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[12px] font-bold text-slate-500 mr-1 hidden sm:inline">본부/부문:</span>
              {divisions.map((div) => (
                <button
                  key={div}
                  onClick={() => setFilterDivision(div)}
                  className={`text-[12px] sm:text-xs px-2.5 py-1.5 rounded-lg font-medium transition ${
                    filterDivision === div
                      ? 'bg-sky-600 text-white font-semibold shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {div === 'ALL' ? '전체' : div}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="부서명, 처/실 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 flex-1 md:w-48 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                onClick={() => setIsAddOpen(true)}
                className="flex items-center gap-1 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-xl transition shadow-sm whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>부서 추가</span>
              </button>
            </div>
          </div>

          {/* Desktop Table View (sm 이상) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-14 text-center">번호</th>
                  <th className="py-3 px-4">식별코드</th>
                  <th className="py-3 px-4">본부 / 부문</th>
                  <th className="py-3 px-4">처 / 실 / 단</th>
                  <th className="py-3 px-4 font-bold text-sky-900">부 (평가단위)</th>
                  <th className="py-3 px-4">전체 표기명</th>
                  <th className="py-3 px-4 text-center">직책</th>
                  <th className="py-3 px-4 text-center w-16">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDepts.map((d, idx) => (
                  <tr key={d.code} className="hover:bg-sky-50/40 transition">
                    <td className="py-3 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{d.code}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                        {d.division}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{d.office}</td>
                    <td className="py-3 px-4 font-bold text-sky-700">{d.department}</td>
                    <td className="py-3 px-4 text-slate-500">{d.name}</td>
                    <td className="py-3 px-4 text-center text-slate-600 font-medium">{d.head_title || '부장'}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteDepartment(d.code)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition"
                        title="부서 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (sm 미만 터치 친화적 카드) */}
          <div className="sm:hidden divide-y divide-slate-100">
            {filteredDepts.map((d, idx) => (
              <div key={d.code} className="p-3.5 space-y-1.5 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-semibold">
                      {d.division}
                    </span>
                    <span className="text-slate-400 text-[11px] font-mono">{d.code}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    <span className="text-slate-500 font-normal mr-1">{d.office} &gt;</span>
                    {d.department}
                  </div>
                  <div className="text-[12px] text-slate-500">
                    직책: <strong className="text-slate-700">{d.head_title || '부장'}</strong>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteDepartment(d.code)}
                  className="text-slate-400 hover:text-red-600 p-2 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 부서 추가 모달 */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-600" />
              신규 부서 추가 (2026_조직도)
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">본부 / 부문 (Division)</label>
                <select
                  value={newDivision}
                  onChange={(e) => setNewDivision(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="운영관리본부">운영관리본부</option>
                  <option value="경영부문">경영부문</option>
                  <option value="개발사업본부">개발사업본부</option>
                  <option value="사장 직속">사장 직속</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">처 / 실 / 단 (Office)</label>
                <input
                  type="text"
                  placeholder="예: 시설관리처, 미래전략실 등"
                  value={newOffice}
                  onChange={(e) => setNewOffice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">부 (Department - 평가 단위)</label>
                <input
                  type="text"
                  placeholder="예: 시설기획부, 스마트정보부 등"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">식별코드</label>
                  <input
                    type="text"
                    placeholder="예: FAC_PLAN"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">직책</label>
                  <input
                    type="text"
                    placeholder="부장, 단장 등"
                    value={newHead}
                    onChange={(e) => setNewHead(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium"
              >
                취소
              </button>
              <button
                onClick={handleAddDepartment}
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-sm"
              >
                부서 등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 확대 모달 */}
      {isZoomOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="relative max-w-6xl w-full max-h-[92vh] bg-slate-900 rounded-2xl overflow-hidden p-2 sm:p-3 flex flex-col">
            <div className="flex items-center justify-between pb-2 px-2 text-white border-b border-slate-800">
              <span className="font-bold text-xs sm:text-sm">과천도시공사 2026 기구표 원본 뷰어</span>
              <button
                onClick={() => setIsZoomOpen(false)}
                className="text-slate-400 hover:text-white text-xs bg-slate-800 px-3 py-1.5 rounded-lg"
              >
                닫기 ✕
              </button>
            </div>
            <div className="overflow-auto flex-1 p-2 sm:p-4 flex justify-center items-center">
              <img
                src="/images/2026_조직도.jpeg"
                alt="2026 조직도 원본"
                className="rounded shadow-2xl max-w-none w-[1200px] sm:w-[1600px] h-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
