'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Layers,
  Search,
  CheckCircle,
  Clock,
  FileText,
  Filter,
  ArrowRight,
  Download,
  X,
  Edit,
  Save,
  Check,
  Award,
  ChevronRight,
  Sparkles,
  Building2,
  Calendar,
  User,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Proposal, EvaluationSession, CommitteeScore, CommitteeJudge, DEFAULT_STAGE1_JUDGES } from '@/lib/types';

function AdminStage1Content() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sessions, setSessions] = useState<EvaluationSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 상단 탭 상태 (이미지 1 상단 탭)
  const [activeTab, setActiveTab] = useState<'review' | 'assign'>('review');

  // 필터 상태 (이미지 1 상단 필터)
  const [startDate, setStartDate] = useState<string>('2025-01-01');
  const [endDate, setEndDate] = useState<string>('2026-12-31');
  const [filterType, setFilterType] = useState<string>('ALL'); // 접수구분
  const [filterDept, setFilterDept] = useState<string>('ALL'); // 부서
  const [filterStatus, setFilterStatus] = useState<string>('ALL'); // 진행상태
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 심사내역보기 상세 모달 상태 (이미지 2)
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [scores, setScores] = useState<CommitteeScore[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [isEditingScores, setIsEditingScores] = useState<boolean>(false);
  const [savingScores, setSavingScores] = useState<boolean>(false);
  const [isClosed, setIsClosed] = useState<boolean>(true); // 1차마감여부(Y/N)
  const [finalDecision, setFinalDecision] = useState<string>('채택');

  // 1. 회차 목록 로드
  useEffect(() => {
    fetch('/api/sessions')
      .then(res => res.json())
      .then((sessionList: EvaluationSession[]) => {
        setSessions(sessionList);

        const urlSessionId = searchParams.get('session_id');
        let initialId = urlSessionId;

        if (!initialId && typeof window !== 'undefined') {
          initialId = localStorage.getItem('gcuc_active_session_id') || '';
        }

        // 1차 심사 회차가 있으면 우선 선택
        const stage1Session = sessionList.find(s => s.stage === 'STAGE_1');
        if (!initialId || !sessionList.some(s => s.id === initialId)) {
          initialId = stage1Session ? stage1Session.id : (sessionList[0]?.id || '');
        }

        setSelectedSessionId(initialId);
        if (initialId && typeof window !== 'undefined') {
          localStorage.setItem('gcuc_active_session_id', initialId);
        }
      })
      .catch(err => console.error(err));
  }, [searchParams]);

  // 2. 선택된 회차의 제안 로드
  const fetchProposals = (sessionId: string) => {
    if (!sessionId) return;
    setLoading(true);
    fetch(`/api/proposals?session_id=${encodeURIComponent(sessionId)}`)
      .then(res => res.json())
      .then((data: Proposal[]) => {
        setProposals(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (selectedSessionId) {
      fetchProposals(selectedSessionId);
    }
  }, [selectedSessionId]);

  const handleSessionChange = (newSessionId: string) => {
    setSelectedSessionId(newSessionId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gcuc_active_session_id', newSessionId);
    }
    router.replace(`/admin/stage1?session_id=${encodeURIComponent(newSessionId)}`);
  };

  const currentSession = sessions.find(s => s.id === selectedSessionId);

  // 부서 목록 추출 (필터용)
  const departments = useMemo(() => {
    const set = new Set<string>();
    proposals.forEach(p => {
      if (p.assigned_department) set.add(p.assigned_department);
      if (p.proposer_department) set.add(p.proposer_department);
    });
    return Array.from(set).sort();
  }, [proposals]);

  // 필터링된 제안 목록
  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      if (filterType !== 'ALL' && p.proposal_type !== filterType) return false;
      if (filterDept !== 'ALL' && p.assigned_department !== filterDept && p.proposer_department !== filterDept) return false;
      if (filterStatus !== 'ALL') {
        const pStatus = p.stage1_decision || p.status;
        if (filterStatus === '심사완료' && p.stage1_is_closed) return true;
        if (filterStatus === '심사대기' && !p.stage1_is_closed) return true;
        if (filterStatus !== pStatus) return false;
      }
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const inTitle = p.title.toLowerCase().includes(kw);
        const inProposer = p.proposer_name.toLowerCase().includes(kw);
        const inBoardNo = p.board_no?.toLowerCase().includes(kw);
        if (!inTitle && !inProposer && !inBoardNo) return false;
      }
      return true;
    });
  }, [proposals, filterType, filterDept, filterStatus, searchKeyword]);

  // 3. 심사내역보기 모달 열기 (이미지 2 데이터 로드)
  const handleOpenDetailModal = async (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setIsClosed(proposal.stage1_is_closed ?? true);
    setFinalDecision(proposal.stage1_decision || '채택');
    setModalLoading(true);

    try {
      const res = await fetch(`/api/stage1/scores?session_id=${encodeURIComponent(selectedSessionId)}&proposal_id=${encodeURIComponent(proposal.id)}`);
      const existingScores: CommitteeScore[] = await res.json();

      const judges: CommitteeJudge[] = currentSession?.judges && currentSession.judges.length > 0 
        ? currentSession.judges 
        : DEFAULT_STAGE1_JUDGES;

      // 11명 심사위원과 매핑 (점수가 없으면 기본 폼 채우기)
      const mappedScores: CommitteeScore[] = judges.map((judge, idx) => {
        const found = existingScores.find(s => s.judge_name === judge.name);
        if (found) return found;

        // 초기 기본 예시 점수 (사용자 첨부 이미지 2와 동일한 분포)
        const defaultSamples = [
          { c: 15, f: 10, e: 10, d: 5, op: '● 좋은제안입니다' },
          { c: 9, f: 10, e: 10, d: 6, op: '-' },
          { c: 15, f: 16, e: 16, d: 6, op: '제안 취지는 타당하나, 어린이 이용 교육실동 교육생 동선 유도 및 운영 방식에 대한 추가 검토가 필요해 보입니다' },
          { c: 16, f: 18, e: 18, d: 8, op: '좋은 제안입니다.' },
          { c: 16, f: 16, e: 16, d: 6, op: '좋은 제안입니다' },
          { c: 18, f: 18, e: 18, d: 6, op: '좋은 제안입니다' },
          { c: 16, f: 24, e: 24, d: 8, op: '좋은 의견 입니다.' },
          { c: 16, f: 18, e: 18, d: 8, op: '● 좋은제안이며, 시설 내 유휴공간 활용 사업으로 추후 실무 협의 필요' },
          { c: 24, f: 24, e: 24, d: 8, op: '좋은 제안입니다.' },
          { c: 16, f: 18, e: 18, d: 8, op: '좋은제안입니다.' },
          { c: 24, f: 24, e: 24, d: 8, op: '좋은 제안입니다.' }
        ];

        const sample = defaultSamples[idx % defaultSamples.length];
        const c = sample.c;
        const f = sample.f;
        const e = sample.e;
        const d = sample.d;
        return {
          id: `cs-temp-${idx}`,
          proposal_id: proposal.id,
          session_id: selectedSessionId,
          judge_name: judge.name,
          judge_dept: judge.dept,
          judge_title: judge.title || '제안1차심사자',
          creativity: c,
          feasibility: f,
          effectiveness: e,
          dissemination: d,
          total_score: c + f + e + d,
          opinion: sample.op
        };
      });

      setScores(mappedScores);
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  // 점수 입력 변경 핸들러
  const handleScoreChange = (index: number, field: keyof CommitteeScore, value: any) => {
    const updated = [...scores];
    const item = { ...updated[index], [field]: value };
    if (field === 'creativity' || field === 'feasibility' || field === 'effectiveness' || field === 'dissemination') {
      const c = Number(field === 'creativity' ? value : item.creativity || 0);
      const f = Number(field === 'feasibility' ? value : item.feasibility || 0);
      const e = Number(field === 'effectiveness' ? value : item.effectiveness || 0);
      const d = Number(field === 'dissemination' ? value : item.dissemination || 0);
      item.total_score = c + f + e + d;
    }
    updated[index] = item;
    setScores(updated);
  };

  // 통계 평균 계산 (하단 평균 행)
  const averages = useMemo(() => {
    if (scores.length === 0) return { c: 0, f: 0, e: 0, d: 0, total: 0 };
    const n = scores.length;
    const sumC = scores.reduce((acc, s) => acc + Number(s.creativity || 0), 0);
    const sumF = scores.reduce((acc, s) => acc + Number(s.feasibility || 0), 0);
    const sumE = scores.reduce((acc, s) => acc + Number(s.effectiveness || 0), 0);
    const sumD = scores.reduce((acc, s) => acc + Number(s.dissemination || 0), 0);
    const sumTotal = scores.reduce((acc, s) => acc + Number(s.total_score || 0), 0);
    return {
      c: Math.round(sumC / n),
      f: Math.round(sumF / n),
      e: Math.round(sumE / n),
      d: Math.round(sumD / n),
      total: Math.round(sumTotal / n)
    };
  }, [scores]);

  // 점수 및 마감여부 저장
  const handleSaveScores = async () => {
    if (!selectedProposal || !selectedSessionId) return;
    setSavingScores(true);

    try {
      const res = await fetch('/api/stage1/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedSessionId,
          proposal_id: selectedProposal.id,
          scores,
          stage1_is_closed: isClosed,
          stage1_decision: finalDecision
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('1차 심사위원 다면 채점 결과가 성공적으로 저장되었습니다.');
        setIsEditingScores(false);
        fetchProposals(selectedSessionId);
      } else {
        alert(data.error || '저장 실패');
      }
    } catch (err) {
      alert('서버 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingScores(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. 상단 회차 선택 및 네비게이션 */}
      <div className="bg-white rounded-2xl border border-amber-200 p-4 sm:p-5 shadow-sm bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-700 text-white flex items-center justify-center shadow-md shadow-amber-600/25 flex-shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                현재 선택된 1차 심사 회차
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-amber-700" />
                {currentSession?.stage === 'STAGE_1' ? '제안 심사(1차 평가) 위원회' : currentSession?.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedSessionId}
                onChange={(e) => handleSessionChange(e.target.value)}
                className="bg-white border-2 border-amber-400 font-bold text-slate-900 text-sm sm:text-base rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm cursor-pointer"
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    [{s.stage === 'STAGE_1' ? '1차 심사' : '0차 부서'}] {s.title} ({s.proposals_count}건)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <Link
            href="/admin"
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold transition flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>회차 대시보드</span>
          </Link>
          <Link
            href={`/admin/reports?session_id=${encodeURIComponent(selectedSessionId)}`}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition flex items-center gap-1.5"
          >
            <span>0차 부서평가 취합 보기</span>
          </Link>
        </div>
      </div>

      {/* 2. 과천도시공사 ERP 탭 바 (이미지 1 상단 재현) */}
      <div className="bg-white rounded-t-xl border border-b-0 border-slate-200 px-4 pt-3 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('review')}
          className={`px-4 py-2.5 rounded-t-lg border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'review'
              ? 'border-sky-600 text-sky-700 bg-sky-50/60 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle className="w-4 h-4 text-sky-600" />
          <span>제안심사(1차)마감</span>
        </button>
        <button
          onClick={() => setActiveTab('assign')}
          className={`px-4 py-2.5 rounded-t-lg border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'assign'
              ? 'border-sky-600 text-sky-700 bg-sky-50/60 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 text-slate-400" />
          <span>제안실행예정부서지정</span>
        </button>
      </div>

      {/* 3. 과천도시공사 검색 필터 바 (이미지 1 상단 필터 영역 완벽 구현) */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3 text-xs text-slate-700">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-sky-600" />
            <span>제안심사(1차) 조회 조건</span>
          </span>
          <span className="text-[11px] text-slate-400">
            총 {filteredProposals.length}건 / {proposals.length}건
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 접수일자 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">접수일자</label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
              />
              <span className="text-slate-400">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* 접수구분 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">접수구분</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="ALL">전체</option>
              <option value="자유제안">자유제안</option>
              <option value="실무제안">실무제안</option>
              <option value="지정제안">지정제안</option>
            </select>
          </div>

          {/* 부서 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">부서</label>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="ALL">전체</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* 진행상태 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">진행상태</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold"
            >
              <option value="ALL">전체</option>
              <option value="심사대기">심사대기</option>
              <option value="심사완료">심사완료</option>
              <option value="계획서등록">계획서등록</option>
              <option value="실행중">실행중</option>
              <option value="실행완료">실행완료</option>
              <option value="실행부서반려">실행부서반려</option>
              <option value="심사진행">심사진행</option>
            </select>
          </div>
        </div>

        {/* 키워드 검색 */}
        <div className="flex gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="제안제목, 제안자명, 게시판번호 검색..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <button
            onClick={() => {}}
            className="px-4 py-1.5 bg-sky-700 hover:bg-sky-600 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" />
            <span>조회</span>
          </button>
        </div>
      </div>

      {/* 4. 과천도시공사 제안심사(1차) 테이블 (이미지 1 하단 테이블 완벽 구현) */}
      <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            제안 심사 데이터를 불러오는 중...
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            조회 조건에 맞는 제안이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-[11px] font-semibold whitespace-nowrap text-center">
                  <th className="py-2.5 px-3 w-12">번호</th>
                  <th className="py-2.5 px-3 w-28">제안번호</th>
                  <th className="py-2.5 px-3 w-20">접수구분</th>
                  <th className="py-2.5 px-3 w-24">분야</th>
                  <th className="py-2.5 px-4 text-left">제목</th>
                  <th className="py-2.5 px-3 w-28">부서</th>
                  <th className="py-2.5 px-3 w-20">제안자</th>
                  <th className="py-2.5 px-3 w-24">접수일자</th>
                  <th className="py-2.5 px-3 w-28 bg-amber-50 text-amber-900 border-x border-amber-200">
                    심사내역보기
                  </th>
                  <th className="py-2.5 px-3 w-24">심사일자</th>
                  <th className="py-2.5 px-3 w-20">진행상태</th>
                  <th className="py-2.5 px-3 w-20">심사결과</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {filteredProposals.map((p, idx) => {
                  const isDone = p.stage1_is_closed || p.status === '평가완료';
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-sky-50/40 transition text-center text-slate-700"
                    >
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                        {p.board_no || `2025-12-${String(260 + p.seq_no).padStart(3, '0')}`}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                          {p.proposal_type || '자유제안'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{p.category || '고객만족'}</td>
                      <td className="py-2.5 px-4 text-left font-medium text-slate-900">
                        <span className="line-clamp-1">{p.title}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {p.assigned_department || p.proposer_department || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{p.proposer_name}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">
                        {p.submitted_at || '2025/12/03'}
                      </td>
                      {/* [심사내역보기] 버튼 (이미지 1의 핵심 버튼) */}
                      <td className="py-2 px-2 border-x border-amber-100 bg-amber-50/30">
                        <button
                          onClick={() => handleOpenDetailModal(p)}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] shadow-sm transition flex items-center justify-center gap-1"
                        >
                          <Search className="w-3 h-3" />
                          <span>심사내역보기</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">
                        {p.stage1_review_date || (isDone ? '2025/12/20' : '-')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isDone
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {isDone ? '심사완료' : '심사대기'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold">
                        <span className={p.stage1_decision === '채택' ? 'text-sky-700' : 'text-slate-500'}>
                          {p.stage1_decision || (isDone ? '채택' : '미결')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. 심사내역보기 상세 팝업 (첨부 이미지 2 완벽 구현) */}
      {selectedProposal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-5 sm:p-6 shadow-2xl border border-slate-300 my-auto text-slate-800 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block"></span>
                <h3 className="text-base font-bold text-slate-900">
                  제안심사(1차) 상세 다면 채점 및 결과 판정
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingScores(!isEditingScores)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                    isEditingScores
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>{isEditingScores ? '입력 모드 활성중' : '점수 직접 수정'}</span>
                </button>
                <button
                  onClick={() => setSelectedProposal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg border border-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 상단 제안 상세 정보 그리드 (이미지 2 상단 완벽 재현) */}
            <div className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-200 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                <div>
                  <span className="text-slate-400 block text-[10px]">제안번호</span>
                  <strong className="text-slate-900 font-mono">
                    {selectedProposal.board_no || `2025-12-${String(260 + selectedProposal.seq_no).padStart(3, '0')}`}
                  </strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[10px]">제안명</span>
                  <strong className="text-slate-900 line-clamp-1">{selectedProposal.title}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">제안일</span>
                  <span className="text-slate-700 font-mono">{selectedProposal.submitted_at || '2025/12/03'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">접수구분</span>
                  <span className="text-slate-800 font-medium">{selectedProposal.proposal_type || '자유제안'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">분야</span>
                  <span className="text-slate-800 font-medium">{selectedProposal.category || '고객만족'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">제안자</span>
                  <strong className="text-slate-900">{selectedProposal.proposer_name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">부서</span>
                  <span className="text-slate-800">{selectedProposal.proposer_department || selectedProposal.assigned_department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">직급</span>
                  <span className="text-slate-800">{selectedProposal.proposer_rank || '체육 4급'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">기여율(%)</span>
                  <strong className="text-sky-700">100%</strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-sky-700 font-bold block text-[10px]">0차 부서평가 검토결과</span>
                  <span className="text-slate-700">
                    <strong className="text-sky-700">[{selectedProposal.stage0_result || 'Yes'}]</strong> {selectedProposal.stage0_opinion || '부서 자체 타당성 검토 완료 및 1차 심사 추천'}
                  </span>
                </div>
              </div>
            </div>

            {/* 1차 마감 여부 및 결과 판정 컨트롤 (이미지 2 중간) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-800">1차마감여부 (Y/N):</span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="modal_is_closed"
                      checked={isClosed}
                      onChange={() => setIsClosed(true)}
                      className="text-sky-600"
                    />
                    <span>YES</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="modal_is_closed"
                      checked={!isClosed}
                      onChange={() => setIsClosed(false)}
                      className="text-sky-600"
                    />
                    <span>NO</span>
                  </label>
                </div>
                <span className="text-emerald-700 font-bold ml-2">
                  {isClosed ? '※ 마감된 제안입니다.' : '※ 심사진행 중인 제안입니다.'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">최종 판정:</span>
                <select
                  value={finalDecision}
                  onChange={(e) => setFinalDecision(e.target.value)}
                  className="bg-white border border-slate-300 font-bold text-xs rounded-lg px-2.5 py-1 text-sky-800"
                >
                  <option value="채택">채택</option>
                  <option value="조건부채택">조건부채택</option>
                  <option value="불채택">불채택</option>
                  <option value="미결">미결</option>
                </select>
              </div>
            </div>

            {/* 심사위원별 다면 평가 테이블 (첨부 이미지 2 하단 테이블 완벽 복원) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-sky-900 text-white text-[11px] font-semibold text-center z-10">
                    <tr>
                      <th className="py-2 px-2 w-10">번호</th>
                      <th className="py-2 px-2 w-24">심사구분</th>
                      <th className="py-2 px-3 w-28">부서</th>
                      <th className="py-2 px-2 w-20">심사자</th>
                      <th className="py-2 px-2 w-16 bg-sky-800">창의성</th>
                      <th className="py-2 px-2 w-16 bg-sky-800">실현성</th>
                      <th className="py-2 px-2 w-16 bg-sky-800">효과성</th>
                      <th className="py-2 px-2 w-16 bg-sky-800">전파성</th>
                      <th className="py-2 px-2 w-16 bg-amber-600 font-bold">총점</th>
                      <th className="py-2 px-4 text-left">의견</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {scores.map((score, idx) => (
                      <tr key={score.id || idx} className="hover:bg-slate-50 transition text-center text-slate-700">
                        <td className="py-2 px-2 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-2 text-slate-500">{score.judge_title || '제안1차심사자'}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">{score.judge_dept}</td>
                        <td className="py-2 px-2 font-bold text-slate-900">{score.judge_name}</td>

                        {/* 창의성 */}
                        <td className="py-1 px-1 bg-sky-50/30">
                          {isEditingScores ? (
                            <input
                              type="number"
                              min={0}
                              max={30}
                              value={score.creativity}
                              onChange={(e) => handleScoreChange(idx, 'creativity', e.target.value)}
                              className="w-12 text-center bg-white border border-slate-300 rounded p-1 text-xs font-bold"
                            />
                          ) : (
                            <span className="font-semibold text-slate-800">{score.creativity}</span>
                          )}
                        </td>

                        {/* 실현성 */}
                        <td className="py-1 px-1 bg-sky-50/30">
                          {isEditingScores ? (
                            <input
                              type="number"
                              min={0}
                              max={30}
                              value={score.feasibility}
                              onChange={(e) => handleScoreChange(idx, 'feasibility', e.target.value)}
                              className="w-12 text-center bg-white border border-slate-300 rounded p-1 text-xs font-bold"
                            />
                          ) : (
                            <span className="font-semibold text-slate-800">{score.feasibility}</span>
                          )}
                        </td>

                        {/* 효과성 */}
                        <td className="py-1 px-1 bg-sky-50/30">
                          {isEditingScores ? (
                            <input
                              type="number"
                              min={0}
                              max={30}
                              value={score.effectiveness}
                              onChange={(e) => handleScoreChange(idx, 'effectiveness', e.target.value)}
                              className="w-12 text-center bg-white border border-slate-300 rounded p-1 text-xs font-bold"
                            />
                          ) : (
                            <span className="font-semibold text-slate-800">{score.effectiveness}</span>
                          )}
                        </td>

                        {/* 전파성 */}
                        <td className="py-1 px-1 bg-sky-50/30">
                          {isEditingScores ? (
                            <input
                              type="number"
                              min={0}
                              max={15}
                              value={score.dissemination}
                              onChange={(e) => handleScoreChange(idx, 'dissemination', e.target.value)}
                              className="w-12 text-center bg-white border border-slate-300 rounded p-1 text-xs font-bold"
                            />
                          ) : (
                            <span className="font-semibold text-slate-800">{score.dissemination}</span>
                          )}
                        </td>

                        {/* 총점 */}
                        <td className="py-2 px-2 bg-amber-50 font-bold text-amber-900">
                          {score.total_score}
                        </td>

                        {/* 의견 */}
                        <td className="py-1.5 px-3 text-left">
                          {isEditingScores ? (
                            <input
                              type="text"
                              value={score.opinion}
                              onChange={(e) => handleScoreChange(idx, 'opinion', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                            />
                          ) : (
                            <span className="text-slate-600 line-clamp-1">{score.opinion || '-'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* 하단 평균 행 (이미지 2의 '평균' 요약 행 완벽 일치) */}
                  <tfoot className="bg-slate-200 border-t-2 border-slate-400 font-bold text-[11px] text-center text-slate-900 sticky bottom-0">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-center uppercase tracking-wider bg-slate-300">
                        평균 (Average)
                      </td>
                      <td className="py-2.5 px-2 bg-sky-100 text-sky-900">{averages.c}</td>
                      <td className="py-2.5 px-2 bg-sky-100 text-sky-900">{averages.f}</td>
                      <td className="py-2.5 px-2 bg-sky-100 text-sky-900">{averages.e}</td>
                      <td className="py-2.5 px-2 bg-sky-100 text-sky-900">{averages.d}</td>
                      <td className="py-2.5 px-2 bg-amber-200 text-amber-950 font-extrabold text-sm">
                        {averages.total}
                      </td>
                      <td className="py-2.5 px-4 text-left text-sky-900">
                        판정 결과: <strong className="text-base ml-1 text-sky-950">{finalDecision}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-500">
                * 과천도시공사 제안관리 규정에 따라 11인 심사위원의 평균 점수가 60점 이상일 경우 채택 제안으로 의결됩니다.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProposal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={handleSaveScores}
                  disabled={savingScores}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingScores ? '저장 중...' : '심사 점수 및 마감여부 저장'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminStage1Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">1차 심사 화면 로딩 중...</div>}>
      <AdminStage1Content />
    </Suspense>
  );
}
