'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, Edit, Check, AlertCircle, Building2, User, ChevronRight } from 'lucide-react';
import { Proposal, Department } from '@/lib/types';

export default function AdminProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 필터 및 검색
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('전체');
  const [deptFilter, setDeptFilter] = useState<string>('전체');

  // 편집 모달
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [editDivision, setEditDivision] = useState<string>('');
  const [editOffice, setEditOffice] = useState<string>('');
  const [editDepartment, setEditDepartment] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('미평가');
  const [saving, setSaving] = useState<boolean>(false);

  const fetchProposals = () => {
    setLoading(true);
    fetch('/api/proposals')
      .then(res => res.json())
      .then(data => {
        setProposals(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProposals();
    fetch('/api/organization')
      .then(res => res.json())
      .then(data => {
        if (data.departments) setDepartments(data.departments);
      })
      .catch(err => console.error(err));
  }, []);

  const openEditModal = (p: Proposal) => {
    setSelectedProposal(p);
    setEditDivision(p.assigned_division);
    setEditOffice(p.assigned_office);
    setEditDepartment(p.assigned_department);
    setEditStatus(p.status);
  };

  const handleDeptSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const found = departments.find(d => d.department === val);
    if (found) {
      setEditDivision(found.division);
      setEditOffice(found.office);
      setEditDepartment(found.department);
    }
  };

  const handleSaveProposal = async () => {
    if (!selectedProposal) return;
    setSaving(true);
    try {
      const updated: Proposal = {
        ...selectedProposal,
        assigned_division: editDivision,
        assigned_office: editOffice,
        assigned_department: editDepartment,
        assigned_raw_dept: `${editOffice} ${editDepartment}`,
        status: editStatus as any
      };

      const res = await fetch('/api/proposals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success) {
        setSelectedProposal(null);
        fetchProposals();
      }
    } catch (err) {
      console.error(err);
      alert('수정 실패');
    } finally {
      setSaving(false);
    }
  };

  const filtered = proposals.filter(p => {
    if (statusFilter !== '전체' && p.status !== statusFilter) return false;
    if (deptFilter !== '전체' && p.assigned_department !== deptFilter && p.assigned_office !== deptFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.proposer_name.toLowerCase().includes(q) ||
        p.board_no.includes(q) ||
        p.assigned_department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600" />
            제안 목록 및 평가 담당부서 관리
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            업로드된 전체 137건의 제안에 대해 담당부서(본부/처/부) 오배정 수정 및 0차 평가 진행 상태를 실시간 확인합니다.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
            전체: <strong className="text-slate-900 font-bold">{proposals.length}건</strong>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2">
            평가완료: <strong className="font-bold">{proposals.filter(p => p.status === '평가완료').length}건</strong>
          </div>
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-2">
            미평가: <strong className="font-bold">{proposals.filter(p => p.status === '미평가').length}건</strong>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">상태:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="전체">전체 상태</option>
              <option value="미평가">미평가</option>
              <option value="평가작성중">평가작성중</option>
              <option value="평가완료">평가완료</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">담당부서:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 max-w-[200px]"
            >
              <option value="전체">전체 부서</option>
              {departments.map(d => (
                <option key={d.code} value={d.department}>
                  {d.department}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="제안제목, 제안자명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 w-60 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Proposals Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3 w-12 text-center">연번</th>
                <th className="py-3 px-3 w-16 text-center">게시판</th>
                <th className="py-3 px-3">제안자 (직급)</th>
                <th className="py-3 px-3">제안자 소속 (처/실 - 부)</th>
                <th className="py-3 px-3">분야</th>
                <th className="py-3 px-3 font-bold text-sky-900">담당부서 (실행부서)</th>
                <th className="py-3 px-4 min-w-[280px]">제안 제목</th>
                <th className="py-3 px-3 text-center">0차 상태</th>
                <th className="py-3 px-3 text-center w-20">수정</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    제안 목록을 불러오는 중...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    조건에 해당하는 제안이 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-sky-50/30 transition">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono font-medium">{p.seq_no}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-500">{p.board_no}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {p.proposer_name} <span className="text-[11px] font-normal text-slate-500">({p.proposer_rank})</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <span className="text-[11px] text-slate-400 block">{p.proposer_division}</span>
                      {p.proposer_office} {p.proposer_department}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] text-sky-700 font-bold block">{p.assigned_division}</span>
                      <strong className="text-slate-900">{p.assigned_office} {p.assigned_department}</strong>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 leading-snug line-clamp-2">
                        {p.title}
                      </div>
                      {p.is_duplicate === '중복' && (
                        <span className="inline-block mt-1 text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.2 rounded font-semibold">
                          중복제안: {p.duplicate_title}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        p.status === '평가완료'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : p.status === '평가작성중'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => openEditModal(p)}
                        className="text-xs bg-white hover:bg-sky-50 text-sky-600 border border-slate-200 hover:border-sky-300 px-2.5 py-1 rounded-lg font-medium transition"
                      >
                        배정수정
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 제안 세부 및 담당부서 재배정 모달 */}
      {selectedProposal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit className="w-4 h-4 text-sky-600" />
                제안 정보 및 담당부서 재배정
              </h3>
              <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                연번 #{selectedProposal.seq_no} (게시판 #{selectedProposal.board_no})
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="text-slate-500 font-semibold text-[11px]">제안 제목</div>
                <div className="text-slate-900 font-bold text-sm leading-snug">
                  {selectedProposal.title}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                  <div>
                    <span className="text-slate-400">제안자: </span>
                    <strong className="text-slate-700">{selectedProposal.proposer_name} ({selectedProposal.proposer_rank})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">제안자 소속: </span>
                    <strong className="text-slate-700">{selectedProposal.proposer_office} {selectedProposal.proposer_department}</strong>
                  </div>
                </div>
              </div>

              {/* 담당 부서 빠른 변경 */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  담당 부서 빠른 선택 (2026 조직도 기준)
                </label>
                <select
                  value={editDepartment}
                  onChange={handleDeptSelectChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {departments.map((d) => (
                    <option key={d.code} value={d.department}>
                      [{d.division} &gt; {d.office}] {d.department}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">본부/부문</label>
                  <input
                    type="text"
                    value={editDivision}
                    onChange={(e) => setEditDivision(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">처/실/단</label>
                  <input
                    type="text"
                    value={editOffice}
                    onChange={(e) => setEditOffice(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">담당 부</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  0차 부서평가 진행 상태 직접 변경
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="미평가">미평가</option>
                  <option value="평가작성중">평가작성중</option>
                  <option value="평가완료">평가완료</option>
                </select>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setSelectedProposal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium"
              >
                취소
              </button>
              <button
                onClick={handleSaveProposal}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? '저장 중...' : '변경사항 저장'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
