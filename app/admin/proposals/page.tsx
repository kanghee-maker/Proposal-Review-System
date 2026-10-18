'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Search, Building2, User, ChevronRight, Edit, Check, Layers, Clock, AlertCircle, Paperclip, Upload, Download, Trash2, X } from 'lucide-react';
import { Proposal, ProposalAttachment, Department, EvaluationSession } from '@/lib/types';

function AdminProposalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sessions, setSessions] = useState<EvaluationSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
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

  // 첨부파일 관리 모달
  const [attachModalProposal, setAttachModalProposal] = useState<Proposal | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
  const [deletingAttId, setDeletingAttId] = useState<string>('');

  // 1. 회차 목록 로드 및 현재 회차 결정
  useEffect(() => {
    fetch(`/api/sessions?_t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then((sessionList: EvaluationSession[]) => {
        setSessions(sessionList);

        if (!sessionList || sessionList.length === 0) {
          setSelectedSessionId('');
          setProposals([]);
          setLoading(false);
          return;
        }

        const urlSessionId = searchParams.get('session_id');
        let initialId = urlSessionId;

        if (!initialId && typeof window !== 'undefined') {
          initialId = localStorage.getItem('gcuc_active_session_id') || '';
        }

        if (!initialId || !sessionList.some(s => s.id === initialId)) {
          initialId = sessionList[0]?.id || '';
        }

        setSelectedSessionId(initialId);
        if (initialId && typeof window !== 'undefined') {
          localStorage.setItem('gcuc_active_session_id', initialId);
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    fetch('/api/organization')
      .then(res => res.json())
      .then(data => {
        if (data.departments) setDepartments(data.departments);
      })
      .catch(err => console.error(err));
  }, [searchParams]);

  // 2. 선택된 회차의 제안 목록 로드
  const fetchProposalsForSession = (sessionId: string) => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/proposals?session_id=${encodeURIComponent(sessionId)}&_t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setProposals(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (selectedSessionId) {
      fetchProposalsForSession(selectedSessionId);
    } else {
      setLoading(false);
    }
  }, [selectedSessionId]);

  const handleSessionChange = (newSessionId: string) => {
    setSelectedSessionId(newSessionId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gcuc_active_session_id', newSessionId);
    }
    router.replace(`/admin/proposals?session_id=${encodeURIComponent(newSessionId)}`);
  };

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
        fetchProposalsForSession(selectedSessionId);
      }
    } catch (err) {
      console.error(err);
      alert('수정 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveTransfer = async () => {
    if (!selectedProposal || !selectedProposal.transfer_target_dept) return;
    const targetDept = selectedProposal.transfer_target_dept;
    const found = departments.find(d => d.department === targetDept);

    const updatedDiv = found?.division || editDivision;
    const updatedOff = found?.office || editOffice;
    const updatedDept = found?.department || targetDept;

    setSaving(true);
    try {
      const updated: Proposal = {
        ...selectedProposal,
        assigned_division: updatedDiv,
        assigned_office: updatedOff,
        assigned_department: updatedDept,
        assigned_raw_dept: `${updatedOff} ${updatedDept}`,
        transfer_requested: false,
        transfer_status: 'APPROVED',
        status: editStatus as any
      };

      const res = await fetch('/api/proposals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success) {
        alert(`[${updatedDept}](으)로 부서 변경 및 이관 승인이 완료되었습니다.`);
        setSelectedProposal(null);
        fetchProposalsForSession(selectedSessionId);
      }
    } catch (err) {
      alert('승인 처리 실패');
    } finally {
      setSaving(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('파일 읽기 오류'));
      reader.readAsDataURL(file);
    });
  };

  const handleUploadAttachments = async (e: React.ChangeEvent<HTMLInputElement>, targetProposal?: Proposal) => {
    const prop = targetProposal || attachModalProposal;
    const files = e.target.files;
    if (!prop || !files || files.length === 0) return;

    setUploadingFiles(true);
    try {
      let latestList: ProposalAttachment[] = prop.attachments || [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUrl = await readFileAsDataUrl(file);
        const res = await fetch('/api/proposals/attachments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proposal_id: prop.id,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            data_url: dataUrl
          })
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.attachments)) {
          latestList = data.attachments;
        } else {
          alert(data.error || `${file.name} 업로드에 실패했습니다.`);
        }
      }

      setProposals(prev =>
        prev.map(p => (p.id === prop.id ? { ...p, attachments: latestList } : p))
      );
      setAttachModalProposal(prev =>
        prev && prev.id === prop.id ? { ...prev, attachments: latestList } : prev
      );
      setSelectedProposal(prev =>
        prev && prev.id === prop.id ? { ...prev, attachments: latestList } : prev
      );
    } catch (err) {
      console.error(err);
      alert('첨부파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploadingFiles(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (proposalId: string, attachmentId: string, fileName: string) => {
    if (!confirm(`'${fileName}' 첨부파일을 삭제하시겠습니까?`)) return;
    setDeletingAttId(attachmentId);
    try {
      const res = await fetch('/api/proposals/attachments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: proposalId,
          attachment_id: attachmentId
        })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.attachments)) {
        const latestList: ProposalAttachment[] = data.attachments;
        setProposals(prev =>
          prev.map(p => (p.id === proposalId ? { ...p, attachments: latestList } : p))
        );
        setAttachModalProposal(prev =>
          prev && prev.id === proposalId ? { ...prev, attachments: latestList } : prev
        );
        setSelectedProposal(prev =>
          prev && prev.id === proposalId ? { ...prev, attachments: latestList } : prev
        );
      } else {
        alert(data.error || '삭제 실패');
      }
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingAttId('');
    }
  };

  const currentSession = sessions.find(s => s.id === selectedSessionId);

  const transferCount = proposals.filter(p => p.transfer_requested).length;

  const filtered = proposals.filter(p => {
    if (statusFilter === '이관요청') {
      if (!p.transfer_requested) return false;
    } else if (statusFilter !== '전체' && p.status !== statusFilter) {
      return false;
    }

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
    <div className="space-y-4 sm:space-y-6">
      {/* 1. 제안평가 회차 선행 선택 바 */}
      <div className="bg-white rounded-2xl border border-sky-200 p-4 sm:p-5 shadow-sm bg-gradient-to-r from-sky-50/70 via-white to-blue-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/25 flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">
                현재 선택된 제안평가 회차
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {currentSession?.status === 'ACTIVE' ? '진행중' : currentSession?.status}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedSessionId}
                onChange={(e) => handleSessionChange(e.target.value)}
                className="bg-white border-2 border-sky-400 font-bold text-slate-900 text-sm sm:text-base rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm cursor-pointer"
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    [{s.year}년] {s.title} ({s.proposals_count}건)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <Link
            href={`/admin/reports?session_id=${encodeURIComponent(selectedSessionId)}`}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition flex items-center gap-1.5 shadow-sm"
          >
            <span>이 회차 평가 취합 보기</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/admin"
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold transition"
          >
            회차 관리
          </Link>
        </div>
      </div>

      {/* 2. 제안 목록 & 통계 카드 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600 flex-shrink-0" />
            <span>[{currentSession?.title || '제안평가'}] 제안 목록 및 담당부서 배정</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
            선택된 제안평가 건의 제안에 대해 담당부서(본부/처/부) 오배정 수정, 첨부파일 등록 및 부서 평가(0차 평가) 상태를 관리합니다.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2">
            <span className="text-[10px] text-slate-400 block">전체</span>
            <strong className="text-slate-900 font-bold">{proposals.length}건</strong>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-2.5 py-2">
            <span className="text-[10px] text-emerald-600 block">평가완료</span>
            <strong className="font-bold">{proposals.filter(p => p.status === '평가완료').length}건</strong>
          </div>
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-2.5 py-2">
            <span className="text-[10px] text-amber-600 block">미평가</span>
            <strong className="font-bold">{proposals.filter(p => p.status === '미평가').length}건</strong>
          </div>
          <div className={`border rounded-xl px-2.5 py-2 ${transferCount > 0 ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
            <span className="text-[10px] block">이관요청</span>
            <strong className="font-bold">{transferCount}건</strong>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="font-semibold text-slate-500 text-[11px]">상태:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs w-full sm:w-auto"
            >
              <option value="전체">전체 상태</option>
              <option value="미평가">미평가</option>
              <option value="평가작성중">평가작성중</option>
              <option value="평가완료">평가완료</option>
              {transferCount > 0 && (
                <option value="이관요청">🔄 부서이관 요청건 ({transferCount}건)</option>
              )}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="font-semibold text-slate-500 text-[11px]">담당부서:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs w-full sm:max-w-[180px]"
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

        <div className="relative w-full md:w-60">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="제안제목, 제안자 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 w-full text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Proposals Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            제안 목록을 불러오는 중...
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700">등록된 제안평가 회차가 없습니다.</p>
            <p className="text-[11px] text-slate-400">관리자 대시보드에서 신규 제안평가를 먼저 생성해주세요.</p>
            <div className="pt-2">
              <Link href="/admin" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-sm transition">
                <span>제안평가 회차 대시보드로 이동</span>
              </Link>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">선택된 제안평가 건에 등록된 제안이 없습니다.</div>
        ) : (
          <>
            {/* 1. Desktop Table View (md 이상) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3 w-12 text-center">연번</th>
                    <th className="py-3 px-3 w-14 text-center">게시판</th>
                    <th className="py-3 px-3">제안자</th>
                    <th className="py-3 px-3">제안자 소속</th>
                    <th className="py-3 px-3">분야</th>
                    <th className="py-3 px-3 font-bold text-sky-900">담당부서 (실행부서)</th>
                    <th className="py-3 px-4 min-w-[240px]">제안 제목</th>
                    <th className="py-3 px-3 text-center w-36">첨부파일</th>
                    <th className="py-3 px-3 text-center">부서 평가(0차)</th>
                    <th className="py-3 px-3 text-center w-20">수정</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => {
                    const attList = p.attachments || [];
                    return (
                      <tr key={p.id} className="hover:bg-sky-50/30 transition">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono font-medium">{p.seq_no}</td>
                        <td className="py-3 px-3 text-center font-mono text-slate-500">{p.board_no}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {p.proposer_name} <span className="text-[11px] font-normal text-slate-500">({p.proposer_rank})</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <span className="text-[11px] text-slate-400 block">{p.proposer_division}</span>
                          {p.proposer_office === p.proposer_department
                            ? (p.proposer_department || p.proposer_raw_dept || '-')
                            : (`${p.proposer_office || ''} ${p.proposer_department || ''}`.trim() || p.proposer_raw_dept || '-')}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[11px] text-sky-700 font-bold block">{p.assigned_division}</span>
                          <strong className="text-slate-900">
                            {p.assigned_office === p.assigned_department
                              ? (p.assigned_department || p.assigned_raw_dept || '-')
                              : (`${p.assigned_office || ''} ${p.assigned_department || ''}`.trim() || p.assigned_raw_dept || '-')}
                          </strong>
                          {p.transfer_requested && (
                            <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded font-bold">
                              🔄 이관요청: {p.transfer_target_dept}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 leading-snug line-clamp-2">
                            {p.title}
                          </div>
                          {p.is_duplicate === '중복' && (
                            <span className="inline-block mt-1 text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.2 rounded font-semibold">
                              중복: {p.duplicate_title}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setAttachModalProposal(p)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                                attList.length > 0
                                  ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200'
                                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-sky-300'
                              }`}
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              <span>파일 첨부{attList.length > 0 ? ` (${attList.length})` : ''}</span>
                            </button>
                            {attList.length > 0 && (
                              <div className="max-w-[130px] space-y-0.5">
                                {attList.slice(0, 2).map(att => (
                                  <a
                                    key={att.id}
                                    href={`/api/proposals/attachments?id=${encodeURIComponent(att.id)}&download=1`}
                                    className="block text-[10px] text-sky-600 hover:underline truncate"
                                    title={`${att.name} 다운로드`}
                                  >
                                    {att.name}
                                  </a>
                                ))}
                                {attList.length > 2 && (
                                  <span className="block text-[10px] text-slate-400">외 {attList.length - 2}건</span>
                                )}
                              </div>
                            )}
                          </div>
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
                            수정
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. Mobile Card List View (md 미만 터치 친화적 카드) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map((p) => {
                const attList = p.attachments || [];
                return (
                  <div key={p.id} className="p-3.5 space-y-2 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          #{p.seq_no}
                        </span>
                        <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-medium">
                          {p.category}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {p.proposal_type}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        p.status === '평가완료'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : p.status === '평가작성중'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {p.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {p.title}
                    </h4>

                    {p.is_duplicate === '중복' && (
                      <div className="text-[10px] text-red-600 bg-red-50 border border-red-200 p-1.5 rounded">
                        중복제안: {p.duplicate_title}
                      </div>
                    )}

                    <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] space-y-1 text-slate-600 border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-400">제안자:</span>
                        <strong>{p.proposer_name} ({p.proposer_rank})</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">담당부서:</span>
                        <strong className="text-sky-700">{p.assigned_office} {p.assigned_department}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAttachModalProposal(p)}
                        className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>파일 첨부{attList.length > 0 ? ` (${attList.length})` : ''}</span>
                      </button>
                      <button
                        onClick={() => openEditModal(p)}
                        className="w-full py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-xs flex items-center justify-center gap-1 transition"
                      >
                        <span>담당부서 오배정 수정</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 첨부파일 관리 모달 */}
      {attachModalProposal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-sky-600" />
                <span>제안별 첨부파일 추가 및 관리</span>
              </h3>
              <button
                type="button"
                onClick={() => setAttachModalProposal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>연번 #{attachModalProposal.seq_no}</span>
                  <span>제안자: {attachModalProposal.proposer_name}</span>
                </div>
                <div className="text-slate-900 font-bold text-xs sm:text-sm leading-snug">
                  {attachModalProposal.title}
                </div>
              </div>

              {/* 파일 업로드 영역 */}
              <div className="relative border-2 border-dashed border-sky-300 hover:border-sky-500 rounded-xl p-5 text-center bg-sky-50/40 hover:bg-sky-50/80 transition cursor-pointer">
                <input
                  type="file"
                  multiple
                  disabled={uploadingFiles}
                  onChange={(e) => handleUploadAttachments(e, attachModalProposal)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <p className="font-bold text-slate-800 text-xs">
                    {uploadingFiles ? '첨부파일 업로드 중...' : '클릭하거나 파일을 이곳에 끌어다 놓아 첨부하세요'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    제안서 원문, 참고자료(HWP, PDF, DOCX, XLSX, 이미지 등) 다중 첨부 가능
                  </p>
                </div>
              </div>

              {/* 등록된 첨부파일 목록 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-semibold text-slate-700">
                  <span>등록된 첨부파일 목록</span>
                  <span className="text-[11px] text-sky-600 font-bold">
                    총 {(attachModalProposal.attachments || []).length}개
                  </span>
                </div>

                {(attachModalProposal.attachments || []).length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-100 text-slate-400 text-[11px]">
                    아직 등록된 첨부파일이 없습니다. 위 영역을 클릭하여 파일을 추가해주세요.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {(attachModalProposal.attachments || []).map((att) => (
                      <div key={att.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-800 truncate flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                            <span className="truncate">{att.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {formatFileSize(att.size)} · {new Date(att.uploaded_at).toLocaleString('ko-KR')}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <a
                            href={`/api/proposals/attachments?id=${encodeURIComponent(att.id)}&download=1`}
                            className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-[11px] flex items-center gap-1 transition"
                          >
                            <Download className="w-3 h-3" />
                            <span>다운로드</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(attachModalProposal.id, att.id, att.name)}
                            disabled={deletingAttId === att.id}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition disabled:opacity-50"
                            title="첨부파일 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setAttachModalProposal(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 제안 세부 및 담당부서 재배정 모달 */}
      {selectedProposal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Edit className="w-4 h-4 text-sky-600" />
                제안 정보 및 담당부서 재배정
              </h3>
              <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                #{selectedProposal.seq_no}
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5">
                <div className="text-slate-500 font-semibold text-[10px]">제안 제목</div>
                <div className="text-slate-900 font-bold text-xs sm:text-sm leading-snug">
                  {selectedProposal.title}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[10px] sm:text-[11px]">
                  <div>
                    <span className="text-slate-400">제안자: </span>
                    <strong className="text-slate-700">{selectedProposal.proposer_name} ({selectedProposal.proposer_rank})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">제안자소속: </span>
                    <strong className="text-slate-700">{selectedProposal.proposer_office} {selectedProposal.proposer_department}</strong>
                  </div>
                </div>
              </div>

              {/* 실행부서 변경 요청 알림 박스 (존재 시) */}
              {selectedProposal.transfer_requested && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      담당부서의 실행 부서 변경 요청 접수됨
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold text-[10px]">
                      이관 심사 대기
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-900 space-y-1 bg-white/80 p-2.5 rounded-lg border border-amber-200">
                    <div>
                      <span className="text-slate-500">현재 배정: </span>
                      <strong className="text-slate-800">{selectedProposal.assigned_department}</strong>
                      <span className="text-slate-400 mx-1.5">➔</span>
                      <span className="text-slate-500">희망 이관 부서: </span>
                      <strong className="text-emerald-700 font-extrabold">{selectedProposal.transfer_target_dept}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">요청 사유: </span>
                      <span className="font-medium text-slate-800">"{selectedProposal.transfer_reason}"</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleApproveTransfer}
                    disabled={saving}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>[{selectedProposal.transfer_target_dept}](으)로 이관 승인 및 즉시 반영</span>
                  </button>
                </div>
              )}

              {/* 담당 부서 빠른 변경 */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  담당 부서 빠른 선택 (2026 조직도 기준)
                </label>
                <select
                  value={editDepartment}
                  onChange={handleDeptSelectChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs"
                >
                  {departments.map((d) => (
                    <option key={d.code} value={d.department}>
                      [{d.division} &gt; {d.office}] {d.department}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">본부/부문</label>
                  <input
                    type="text"
                    value={editDivision}
                    onChange={(e) => setEditDivision(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">처/실/단</label>
                  <input
                    type="text"
                    value={editOffice}
                    onChange={(e) => setEditOffice(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">담당 부</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  부서 평가(0차 평가) 진행 상태
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs"
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

export default function AdminProposalsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">페이지 로딩 중...</div>}>
      <AdminProposalsContent />
    </Suspense>
  );
}
