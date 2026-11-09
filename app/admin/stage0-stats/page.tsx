'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  PieChart,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Layers,
  Building2,
  Users,
  Award,
  TrendingUp,
  ArrowRightLeft,
  Search,
  Filter,
  FileText,
  Sparkles,
  Clock,
  Printer,
  DownloadCloud,
  ChevronRight
} from 'lucide-react';
import { Proposal, Evaluation, EvaluationSession, Department } from '@/lib/types';

interface AssignedDeptStat {
  dept: string;
  office: string;
  assigned: number;
  submitted: number;
  yes: number;
  no: number;
  pending: number;
  transferredIn: number;
  submissionRate: number;
  adoptionRate: number;
}

interface ProposerDeptStat {
  dept: string;
  office: string;
  proposed: number;
  shareRate: number;
  yes: number;
  no: number;
  adoptionRate: number;
}

function Stage0StatsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const viewer = pathname === '/stage0-stats';

  const [sessions, setSessions] = useState<EvaluationSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState(false);

  // 정렬 및 필터 상태
  const [assignedSortBy, setAssignedSortBy] = useState<'assigned' | 'adoptionRate' | 'yes' | 'submissionRate'>('assigned');
  const [proposerSortBy, setProposerSortBy] = useState<'proposed' | 'yes' | 'adoptionRate'>('proposed');
  const [resultFilter, setResultFilter] = useState<'ALL' | 'Yes' | 'No' | 'TRANSFER'>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 1. 0차 평가 회차 및 조직도 로드
  useEffect(() => {
    Promise.all([
      fetch(viewer ? '/api/stage0-stats' : `/api/sessions?_t=${Date.now()}`, { cache: 'no-store' }).then(r => {
        if (!r.ok) throw new Error('회차를 불러오지 못했습니다.');
        return r.json();
      }),
      fetch('/api/organization').then(r => r.json())
    ])
      .then(([sessionList, orgData]) => {
        if (orgData?.departments) {
          setDepartments(orgData.departments);
        }

        const stage0Sessions: EvaluationSession[] = Array.isArray(sessionList)
          ? sessionList.filter((s: EvaluationSession) => !s.stage || s.stage === 'STAGE_0')
          : [];

        setSessions(stage0Sessions);

        if (stage0Sessions.length === 0) {
          setLoading(false);
          return;
        }

        const urlSessionId = searchParams.get('session_id');
        let initialId = urlSessionId || '';

        if (!initialId || !stage0Sessions.some(s => s.id === initialId)) {
          const mainSession =
            stage0Sessions.find(s => s.id === 'session-2026-main') ||
            stage0Sessions.find(s => (s.proposals_count || 0) > 0) ||
            stage0Sessions[0];
          initialId = mainSession.id;
        }

        setSelectedSessionId(initialId);
      })
      .catch(err => {
        console.error(err);
        setLoadError(true);
        setLoading(false);
      });
  }, [searchParams, viewer]);

  // 2. 선택된 0차 회차의 제안 및 평가 데이터 로드
  useEffect(() => {
    if (!selectedSessionId) return;
    const controller = new AbortController();
    const getData = async (endpoint: string) => {
      const res = await fetch(`${endpoint}?session_id=${encodeURIComponent(selectedSessionId)}`, {
        cache: 'no-store', signal: controller.signal
      });
      if (res.status === 401 || res.status === 403) router.refresh();
      if (!res.ok) throw new Error('평가 자료를 불러오지 못했습니다.');
      return res.json();
    };
    setLoading(true);
    setLoadError(false);
    const data = viewer
      ? getData('/api/stage0-stats').then(({ proposals, evaluations }) => [proposals, evaluations])
      : Promise.all([getData('/api/proposals'), getData('/api/evaluations')]);
    data
      .then(([pData, eData]) => {
        if (controller.signal.aborted) return;
        setProposals(Array.isArray(pData) ? pData : []);
        setEvaluations(Array.isArray(eData) ? eData : []);
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoadError(true);
        setLoading(false);
      });
    return () => controller.abort();
  }, [selectedSessionId, router, viewer]);

  const handleSessionChange = (newId: string) => {
    setSelectedSessionId(newId);
    setLoading(true);
    router.replace(`${pathname}?session_id=${encodeURIComponent(newId)}`);
  };

  const currentSession = sessions.find(s => s.id === selectedSessionId);
  const sessionQuery = `session_id=${encodeURIComponent(selectedSessionId)}`;
  const handlePrint = async () => {
    const response = await fetch(viewer ? '/api/auth/stats' : '/api/auth/admin', { cache: 'no-store' }).catch(() => null);
    if (response?.ok) window.print();
    else if (response?.status === 401 || response?.status === 403) router.replace('/');
    else alert('인쇄 권한을 확인하지 못했습니다. 다시 시도해 주세요.');
  };
  const handleViewerLogout = async () => {
    const response = await fetch('/api/auth/stats', { method: 'DELETE' }).catch(() => null);
    if (response?.ok) router.refresh();
    else alert('로그아웃하지 못했습니다. 다시 시도해 주세요.');
  };

  // 평가 맵 (proposal_id -> Evaluation)
  const evalMap = useMemo(() => {
    const map = new Map<string, Evaluation>();
    evaluations.forEach(ev => {
      map.set(ev.proposal_id, ev);
    });
    return map;
  }, [evaluations]);

  // 부서 -> 처/실/단 매핑
  const deptToOfficeMap = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach(d => {
      map.set(d.department, d.office);
    });
    proposals.forEach(p => {
      if (p.assigned_department && p.assigned_office && !map.has(p.assigned_department)) {
        map.set(p.assigned_department, p.assigned_office);
      }
      if (p.proposer_department && p.proposer_office && !map.has(p.proposer_department)) {
        map.set(p.proposer_department, p.proposer_office);
      }
    });
    return map;
  }, [departments, proposals]);

  // 각 제안의 최종 0차 결과 판별 헬퍼
  const getProposalResult = (p: Proposal): 'Yes' | 'No' | 'PENDING' => {
    const ev = evalMap.get(p.id);
    if (ev && ev.is_submitted) {
      if (ev.answers?.result === 'Yes') return 'Yes';
      if (ev.answers?.result === 'No') return 'No';
    }
    if (p.stage0_result === 'Yes' || p.review_result === '채택' || p.review_result === 'Yes') return 'Yes';
    if (p.stage0_result === 'No' || p.review_result === '불채택' || p.review_result === 'No') return 'No';
    return 'PENDING';
  };

  const getProposalOpinion = (p: Proposal): string => {
    const ev = evalMap.get(p.id);
    return ev?.answers?.opinion || p.stage0_opinion || p.review_basis || '-';
  };

  // 종합 핵심 지표 계산
  const summary = useMemo(() => {
    const total = proposals.length;
    let submitted = 0;
    let yes = 0;
    let no = 0;
    let transferredProposals = 0;
    let totalTransferEvents = 0;

    proposals.forEach(p => {
      const res = getProposalResult(p);
      if (res === 'Yes') {
        submitted++;
        yes++;
      } else if (res === 'No') {
        submitted++;
        no++;
      } else if (p.status === '평가완료') {
        submitted++;
      }

      const historyLen = Array.isArray(p.transfer_history) ? p.transfer_history.length : 0;
      if (historyLen > 0) {
        transferredProposals++;
        totalTransferEvents += historyLen;
      }
    });

    const pending = Math.max(0, total - submitted);
    const submissionRate = total > 0 ? Number(((submitted / total) * 100).toFixed(1)) : 0;
    const adoptionRate = submitted > 0 ? Number(((yes / submitted) * 100).toFixed(1)) : 0;
    const rejectionRate = submitted > 0 ? Number(((no / submitted) * 100).toFixed(1)) : 0;

    return {
      total,
      submitted,
      pending,
      yes,
      no,
      submissionRate,
      adoptionRate,
      rejectionRate,
      transferredProposals,
      totalTransferEvents
    };
  }, [proposals, evalMap]);

  // 실행부서(심사 담당부서)별 통계
  const assignedDeptStats = useMemo<AssignedDeptStat[]>(() => {
    const map = new Map<string, AssignedDeptStat>();

    // 조직도에 있는 부서 초기화
    departments.forEach(d => {
      if (!map.has(d.department)) {
        map.set(d.department, {
          dept: d.department,
          office: d.office,
          assigned: 0,
          submitted: 0,
          yes: 0,
          no: 0,
          pending: 0,
          transferredIn: 0,
          submissionRate: 0,
          adoptionRate: 0
        });
      }
    });

    proposals.forEach(p => {
      const dept = p.assigned_department || '미지정';
      const office = p.assigned_office || deptToOfficeMap.get(dept) || '기타';
      if (!map.has(dept)) {
        map.set(dept, {
          dept,
          office,
          assigned: 0,
          submitted: 0,
          yes: 0,
          no: 0,
          pending: 0,
          transferredIn: 0,
          submissionRate: 0,
          adoptionRate: 0
        });
      }
      const stat = map.get(dept)!;
      stat.assigned++;

      const res = getProposalResult(p);
      if (res === 'Yes') {
        stat.submitted++;
        stat.yes++;
      } else if (res === 'No') {
        stat.submitted++;
        stat.no++;
      } else if (p.status === '평가완료') {
        stat.submitted++;
      } else {
        stat.pending++;
      }

      if (Array.isArray(p.transfer_history) && p.transfer_history.length > 0) {
        stat.transferredIn++;
      }
    });

    const arr = Array.from(map.values())
      .filter(s => s.assigned > 0)
      .map(s => ({
        ...s,
        submissionRate: s.assigned > 0 ? Number(((s.submitted / s.assigned) * 100).toFixed(1)) : 0,
        adoptionRate: s.submitted > 0 ? Number(((s.yes / s.submitted) * 100).toFixed(1)) : 0
      }));

    return arr.sort((a, b) => {
      if (assignedSortBy === 'adoptionRate') return b.adoptionRate - a.adoptionRate || b.yes - a.yes;
      if (assignedSortBy === 'yes') return b.yes - a.yes || b.adoptionRate - a.adoptionRate;
      if (assignedSortBy === 'submissionRate') return b.submissionRate - a.submissionRate || b.assigned - a.assigned;
      return b.assigned - a.assigned || b.yes - a.yes;
    });
  }, [proposals, departments, evalMap, assignedSortBy, deptToOfficeMap]);

  // 제안자 소속부서(발의부서)별 제안 제출률 & 채택 성과
  const proposerDeptStats = useMemo<ProposerDeptStat[]>(() => {
    const map = new Map<string, ProposerDeptStat>();
    const total = proposals.length;

    proposals.forEach(p => {
      const dept = p.proposer_department || '미상';
      const office = p.proposer_office || deptToOfficeMap.get(dept) || '기타';
      if (!map.has(dept)) {
        map.set(dept, {
          dept,
          office,
          proposed: 0,
          shareRate: 0,
          yes: 0,
          no: 0,
          adoptionRate: 0
        });
      }
      const stat = map.get(dept)!;
      stat.proposed++;
      const res = getProposalResult(p);
      if (res === 'Yes') stat.yes++;
      if (res === 'No') stat.no++;
    });

    const arr = Array.from(map.values()).map(s => ({
      ...s,
      shareRate: total > 0 ? Number(((s.proposed / total) * 100).toFixed(1)) : 0,
      adoptionRate: s.proposed > 0 ? Number(((s.yes / s.proposed) * 100).toFixed(1)) : 0
    }));

    return arr.sort((a, b) => {
      if (proposerSortBy === 'yes') return b.yes - a.yes || b.proposed - a.proposed;
      if (proposerSortBy === 'adoptionRate') return b.adoptionRate - a.adoptionRate || b.yes - a.yes;
      return b.proposed - a.proposed || b.yes - a.yes;
    });
  }, [proposals, evalMap, proposerSortBy, deptToOfficeMap]);

  // 상위 조직(처/실/단)별 통계
  const officeStats = useMemo(() => {
    const map = new Map<string, { office: string; assigned: number; submitted: number; yes: number; no: number }>();
    proposals.forEach(p => {
      const dept = p.assigned_department || '미지정';
      const office = p.assigned_office || deptToOfficeMap.get(dept) || '기타';
      if (!map.has(office)) {
        map.set(office, { office, assigned: 0, submitted: 0, yes: 0, no: 0 });
      }
      const st = map.get(office)!;
      st.assigned++;
      const res = getProposalResult(p);
      if (res === 'Yes') {
        st.submitted++;
        st.yes++;
      } else if (res === 'No') {
        st.submitted++;
        st.no++;
      }
    });

    return Array.from(map.values())
      .map(o => ({
        ...o,
        submissionRate: o.assigned > 0 ? Number(((o.submitted / o.assigned) * 100).toFixed(1)) : 0,
        adoptionRate: o.submitted > 0 ? Number(((o.yes / o.submitted) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.assigned - a.assigned);
  }, [proposals, evalMap, deptToOfficeMap]);

  // 제안 분야(Category)별 통계
  const categoryStats = useMemo(() => {
    const map = new Map<string, { category: string; count: number; yes: number; no: number }>();
    proposals.forEach(p => {
      const cat = (p.category || '일반/기타').trim();
      if (!map.has(cat)) {
        map.set(cat, { category: cat, count: 0, yes: 0, no: 0 });
      }
      const st = map.get(cat)!;
      st.count++;
      const res = getProposalResult(p);
      if (res === 'Yes') st.yes++;
      if (res === 'No') st.no++;
    });

    return Array.from(map.values())
      .map(c => ({
        ...c,
        adoptionRate: c.count > 0 ? Number(((c.yes / c.count) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [proposals, evalMap]);

  // 제안자 직급(Rank)별 통계
  const rankStats = useMemo(() => {
    const map = new Map<string, { rank: string; count: number; yes: number; no: number }>();
    proposals.forEach(p => {
      const rank = (p.proposer_rank || '기타').trim();
      if (!map.has(rank)) {
        map.set(rank, { rank, count: 0, yes: 0, no: 0 });
      }
      const st = map.get(rank)!;
      st.count++;
      const res = getProposalResult(p);
      if (res === 'Yes') st.yes++;
      if (res === 'No') st.no++;
    });

    return Array.from(map.values())
      .map(r => ({
        ...r,
        shareRate: proposals.length > 0 ? Number(((r.count / proposals.length) * 100).toFixed(1)) : 0,
        adoptionRate: r.count > 0 ? Number(((r.yes / r.count) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [proposals, evalMap]);

  // 부서별 통합 비교 테이블 데이터 (실행부서 배정 + 제안부서 발의 통합)
  const combinedDeptTable = useMemo(() => {
    const allDepts = new Set<string>();
    departments.forEach(d => allDepts.add(d.department));
    proposals.forEach(p => {
      if (p.assigned_department) allDepts.add(p.assigned_department);
      if (p.proposer_department) allDepts.add(p.proposer_department);
    });

    return Array.from(allDepts)
      .map(dept => {
        const office = deptToOfficeMap.get(dept) || '-';
        const assignedItem = assignedDeptStats.find(a => a.dept === dept);
        const proposerItem = proposerDeptStats.find(p => p.dept === dept);

        return {
          dept,
          office,
          proposedCount: proposerItem?.proposed || 0,
          proposedShare: proposerItem?.shareRate || 0,
          proposedYes: proposerItem?.yes || 0,
          assignedCount: assignedItem?.assigned || 0,
          submittedCount: assignedItem?.submitted || 0,
          submissionRate: assignedItem?.submissionRate || 0,
          assignedYes: assignedItem?.yes || 0,
          assignedNo: assignedItem?.no || 0,
          adoptionRate: assignedItem?.adoptionRate || 0,
          transferredIn: assignedItem?.transferredIn || 0
        };
      })
      .filter(row => row.assignedCount > 0 || row.proposedCount > 0)
      .sort((a, b) => b.assignedCount - a.assignedCount || b.proposedCount - a.proposedCount);
  }, [departments, proposals, assignedDeptStats, proposerDeptStats, deptToOfficeMap]);

  // 하단 제안 상세 필터링
  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      const res = getProposalResult(p);
      if (resultFilter === 'Yes' && res !== 'Yes') return false;
      if (resultFilter === 'No' && res !== 'No') return false;
      if (resultFilter === 'TRANSFER' && (!p.transfer_history || p.transfer_history.length === 0)) return false;

      if (deptFilter !== 'ALL' && p.assigned_department !== deptFilter && p.proposer_department !== deptFilter) {
        return false;
      }

      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const inTitle = p.title?.toLowerCase().includes(kw);
        const inBoardNo = p.board_no?.toLowerCase().includes(kw);
        const inDept = p.assigned_department?.toLowerCase().includes(kw) || p.proposer_department?.toLowerCase().includes(kw);
        const inName = p.proposer_name?.toLowerCase().includes(kw);
        if (!inTitle && !inBoardNo && !inDept && !inName) return false;
      }

      return true;
    });
  }, [proposals, evalMap, resultFilter, deptFilter, searchKeyword]);

  // 최다 채택 실행부서 & 최다 발의 부서
  const topAdoptedDept = useMemo(() => {
    return [...assignedDeptStats].sort((a, b) => b.yes - a.yes || b.adoptionRate - a.adoptionRate)[0];
  }, [assignedDeptStats]);

  const topProposerDept = useMemo(() => {
    return [...proposerDeptStats].sort((a, b) => b.proposed - a.proposed || b.yes - a.yes)[0];
  }, [proposerDeptStats]);

  const maxAssigned = Math.max(1, ...assignedDeptStats.map(s => s.assigned));
  const maxProposed = Math.max(1, ...proposerDeptStats.map(s => s.proposed));

  // 도넛 차트 계산 (반지름 60, 둘레 377)
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const yesRatio = summary.total > 0 ? summary.yes / summary.total : 0;
  const noRatio = summary.total > 0 ? summary.no / summary.total : 0;
  const yesStroke = yesRatio * circumference;
  const noStroke = noRatio * circumference;

  return (
    <div className="stage0-report text-slate-900">
      <header className="bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link
              href={viewer ? '/' : '/admin'}
              className="print:hidden p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
              title={viewer ? '홈으로 돌아가기' : '관리자 회차 목록'}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-[2px] rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-500 to-amber-700 shadow-md shadow-amber-500/20">
              <div className="w-11 h-11 rounded-[14px] bg-slate-900 text-amber-400 flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  0차 부서 평가 통계 조회
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold">
                  결과 대시보드
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                {currentSession?.title}
              </p>
            </div>
          </div>

          {/* 0차 평가 회차 선택기 */}
          <div className="print:hidden flex flex-wrap items-center gap-2.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-slate-600 whitespace-nowrap">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>0차 평가 회차 선택</span>
            </div>
            <select
              value={selectedSessionId}
              onChange={(e) => handleSessionChange(e.target.value)}
              className="bg-white border-2 border-amber-400 text-slate-900 font-bold text-xs sm:text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.year}년] {s.title} ({s.proposals_count}건)
                </option>
              ))}
            </select>
            {viewer && <button type="button" onClick={handleViewerLogout} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">로그아웃</button>}
            {currentSession && !loading && !loadError && proposals.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2 text-white">
                  <Printer className="w-4 h-4" /> 통계 인쇄
                </button>
                {!viewer && <><a href={`/api/export?${sessionQuery}`} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-white">
                  <DownloadCloud className="w-4 h-4" /> 엑셀 다운로드
                </a>
                <Link href={`/admin/reports?${sessionQuery}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700">결과 취합</Link></>}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content Body */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6 flex-1">
        {loadError ? (
          <p role="alert" className="rounded-xl bg-white p-6 text-rose-700">평가 자료를 불러오지 못했습니다. 새로고침해 주세요.</p>
        ) : loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3 shadow-xs">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-700">0차 부서 평가 통계 데이터를 분석하고 있습니다...</p>
          </div>
        ) : proposals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3">
            <p className="text-base font-bold text-slate-700">선택된 회차에 등록된 제안 데이터가 없습니다.</p>
          </div>
        ) : (
          <>
            {/* 1. 핵심 요약 KPI 카드 6종 */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {/* KPI 1: 총 접수 제안 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">총 접수·배정 제안</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                    {summary.total}
                    <span className="text-sm font-bold text-slate-500 ml-1">건</span>
                  </div>
                  <p className="text-[12px] text-slate-500 mt-1">
                    심사 참여 <strong className="text-slate-700">{assignedDeptStats.length}개</strong> 실행부서
                  </p>
                </div>
              </div>

              {/* KPI 2: 부서 평가 제출률 */}
              <div className="bg-white rounded-2xl border border-emerald-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-700">부서 평가 제출률</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                    {summary.submissionRate}
                    <span className="text-sm font-bold ml-0.5">%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, summary.submissionRate)}%` }}
                    />
                  </div>
                  <p className="text-[12px] text-slate-500 mt-1">
                    {summary.total}건 중 <strong className="text-emerald-700">{summary.submitted}건</strong> 평가 완료
                  </p>
                </div>
              </div>

              {/* KPI 3: 0차 채택률 (Yes) */}
              <div className="bg-gradient-to-br from-amber-50/90 via-white to-yellow-50/60 rounded-2xl border-2 border-amber-300 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-amber-800">0차 채택률 (수용 Yes)</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                      {summary.adoptionRate}%
                    </span>
                    <span className="text-sm font-extrabold text-slate-800">({summary.yes}건)</span>
                  </div>
                  <p className="text-[12px] text-amber-800/80 font-medium mt-1">
                    1차 제안심사위원회 상정 대상
                  </p>
                </div>
              </div>

              {/* KPI 4: 0차 불채택 (No) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">불채택 (미수용 No)</span>
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-800">
                      {summary.no}
                      <span className="text-sm font-bold text-slate-500 ml-0.5">건</span>
                    </span>
                    <span className="text-xs font-bold text-rose-600">({summary.rejectionRate}%)</span>
                  </div>
                  <p className="text-[12px] text-slate-500 mt-1">
                    기시행·장기검토·예산제약 등
                  </p>
                </div>
              </div>

              {/* KPI 5: 부서 이동(소관 조정) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">부서 간 이관 조정</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600">
                    {summary.transferredProposals}
                    <span className="text-sm font-bold text-slate-500 ml-1">건</span>
                  </div>
                  <p className="text-[12px] text-slate-500 mt-1">
                    누적 부서이동 이력 <strong className="text-indigo-700">{summary.totalTransferEvents}회</strong>
                  </p>
                </div>
              </div>

              {/* KPI 6: 최다 채택 / 최다 제안 부서 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-500">주요 우수 부서</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">최다채택(심사)</span>
                    <strong className="text-slate-900 font-extrabold truncate max-w-[110px]">
                      {topAdoptedDept ? `${topAdoptedDept.dept} (${topAdoptedDept.yes}건)` : '-'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">최다제출(발의)</span>
                    <strong className="text-indigo-700 font-extrabold truncate max-w-[110px]">
                      {topProposerDept ? `${topProposerDept.dept} (${topProposerDept.proposed}건)` : '-'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 상단 시각화 그리드: 전체 채택 도넛 차트 & 처/실/단(상위조직)별 채택 현황 */}
            <div className="grid lg:grid-cols-12 gap-6">
              {/* 도넛 차트 (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-amber-600" />
                        <span>0차 부서 평가 종합 판정 비율</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        전체 {summary.total}건 제안에 대한 수용(Yes) / 미수용(No) 분포
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-4">
                    {/* SVG Donut */}
                    <div className="relative w-44 h-44 flex items-center justify-center">
                      <svg className="w-44 h-44 -rotate-90" viewBox="0 0 160 160">
                        <circle
                          cx="80"
                          cy="80"
                          r={radius}
                          fill="transparent"
                          stroke="#e2e8f0"
                          strokeWidth="20"
                        />
                        {/* No segment */}
                        <circle
                          cx="80"
                          cy="80"
                          r={radius}
                          fill="transparent"
                          stroke="#f43f5e"
                          strokeWidth="20"
                          strokeDasharray={`${noStroke} ${circumference}`}
                          strokeDashoffset={-yesStroke}
                        />
                        {/* Yes segment */}
                        <circle
                          cx="80"
                          cy="80"
                          r={radius}
                          fill="transparent"
                          stroke="#f59e0b"
                          strokeWidth="20"
                          strokeDasharray={`${yesStroke} ${circumference}`}
                          strokeDashoffset={0}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-[11px] font-bold text-slate-400">채택률</span>
                        <strong className="text-2xl font-extrabold text-amber-600">
                          {summary.adoptionRate}%
                        </strong>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {summary.yes} / {summary.total}건
                        </span>
                      </div>
                    </div>

                    {/* 범례 */}
                    <div className="space-y-3 flex-1 w-full">
                      <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-amber-500" />
                          <span className="text-xs font-bold text-slate-800">채택 (수용 Yes)</span>
                        </div>
                        <div className="text-right">
                          <strong className="text-sm font-extrabold text-amber-700">{summary.yes}건</strong>
                          <span className="text-xs text-slate-500 ml-1">({summary.adoptionRate}%)</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-rose-500" />
                          <span className="text-xs font-bold text-slate-800">불채택 (미수용 No)</span>
                        </div>
                        <div className="text-right">
                          <strong className="text-sm font-extrabold text-rose-600">{summary.no}건</strong>
                          <span className="text-xs text-slate-500 ml-1">({summary.rejectionRate}%)</span>
                        </div>
                      </div>

                      {summary.pending > 0 && (
                        <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-slate-400" />
                            <span className="text-xs font-bold text-slate-700">미제출 / 검토중</span>
                          </div>
                          <strong className="text-sm font-extrabold text-slate-700">{summary.pending}건</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                  💡 0차 부서 평가에서 <strong className="text-amber-700 font-bold">채택(Yes)된 {summary.yes}건</strong>의 제안이 1차 제안심사위원회 본심사 안건으로 상정되었습니다.
                </div>
              </div>

              {/* 처/실/단(상위조직)별 배정 및 채택 현황 (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        <span>처·실·단(상위조직)별 심사 배정 및 채택률</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        소관 처·실·단 단위의 제안 배정 규모, 평가 제출률 및 채택 비율 비교
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {officeStats.map((o) => {
                      const maxOfficeAssigned = Math.max(1, ...officeStats.map(x => x.assigned));
                      const barWidth = Math.round((o.assigned / maxOfficeAssigned) * 100);
                      const yesShareInBar = o.assigned > 0 ? Math.round((o.yes / o.assigned) * 100) : 0;

                      return (
                        <div key={o.office} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-800 text-sm">{o.office}</span>
                              <span className="text-slate-400 font-medium">
                                배정 {o.assigned}건 · 제출률 {o.submissionRate}%
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                                채택 {o.yes}건 ({o.adoptionRate}%)
                              </span>
                              <span className="text-slate-500 font-semibold">
                                불채택 {o.no}건
                              </span>
                            </div>
                          </div>

                          <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex">
                            <div
                              style={{ width: `${barWidth}%` }}
                              className="h-full bg-slate-300 rounded-full overflow-hidden flex transition-all duration-500"
                            >
                              <div
                                style={{ width: `${yesShareInBar}%` }}
                                className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                                title={`채택 ${o.yes}건`}
                              />
                              <div
                                style={{ width: `${100 - yesShareInBar}%` }}
                                className="h-full bg-slate-400/70"
                                title={`불채택 ${o.no}건`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
                      <span>채택(Yes) 건수 비중</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-slate-400" />
                      <span>불채택(No) 건수 비중</span>
                    </span>
                  </div>
                  <span>전체 막대 길이 = 처·실·단별 배정 건수 규모</span>
                </div>
              </div>
            </div>

            {/* 3. 부서별 상세 차트 2종: (좌) 실행부서별 평가 제출률 & 채택률 / (우) 제안자 소속부서별 제안 발의(제출) 순위 & 채택률 */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* 좌측: 실행부서(심사부서)별 평가 제출률 & 채택률 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>실행부서(심사부서)별 제출률 &amp; 채택률</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      소관 제안을 배정받아 0차 타당성 평가를 수행한 부서별 통계
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[11px] font-bold self-start">
                    <button
                      onClick={() => setAssignedSortBy('assigned')}
                      className={`px-2 py-1 rounded ${assignedSortBy === 'assigned' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      배정건수순
                    </button>
                    <button
                      onClick={() => setAssignedSortBy('adoptionRate')}
                      className={`px-2 py-1 rounded ${assignedSortBy === 'adoptionRate' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      채택률순
                    </button>
                    <button
                      onClick={() => setAssignedSortBy('yes')}
                      className={`px-2 py-1 rounded ${assignedSortBy === 'yes' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      채택건수순
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {assignedDeptStats.map((item, idx) => {
                    const scalePercent = Math.round((item.assigned / maxAssigned) * 100);
                    const yesInAssigned = item.assigned > 0 ? (item.yes / item.assigned) * 100 : 0;
                    const noInAssigned = item.assigned > 0 ? (item.no / item.assigned) * 100 : 0;

                    return (
                      <div
                        key={item.dept}
                        className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-amber-300 transition space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-extrabold text-[11px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-[11px] text-slate-400 font-semibold">[{item.office}]</span>
                            <strong className="text-slate-900 font-extrabold text-sm">{item.dept}</strong>
                            <span className="text-slate-500 font-semibold">배정 {item.assigned}건</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                              제출률 {item.submissionRate}%
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-[11px]">
                              채택률 {item.adoptionRate}% ({item.yes}건)
                            </span>
                          </div>
                        </div>

                        {/* 시각 막대 */}
                        <div className="w-full bg-slate-200/70 h-3 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${scalePercent}%` }}
                            className="h-full flex rounded-full overflow-hidden"
                          >
                            <div
                              style={{ width: `${yesInAssigned}%` }}
                              className="bg-amber-500 h-full"
                              title={`채택(Yes): ${item.yes}건`}
                            />
                            <div
                              style={{ width: `${noInAssigned}%` }}
                              className="bg-rose-400 h-full"
                              title={`불채택(No): ${item.no}건`}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            채택 <strong className="text-amber-700">{item.yes}건</strong> · 불채택 <strong className="text-rose-600">{item.no}건</strong>
                            {item.pending > 0 && ` · 미제출 ${item.pending}건`}
                          </span>
                          {item.transferredIn > 0 && (
                            <span className="text-indigo-600 font-semibold">
                              🔄 부서이동 이력 {item.transferredIn}건 포함
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 우측: 제안자 소속부서(발의부서)별 제안 제출 비중 & 채택 성과 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      <span>제안자 소속부서(발의부서)별 제출 비중 &amp; 채택률</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      임직원이 아이디어를 발의·제출한 소속 부서별 참여도 및 채택 성과
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[11px] font-bold self-start">
                    <button
                      onClick={() => setProposerSortBy('proposed')}
                      className={`px-2 py-1 rounded ${proposerSortBy === 'proposed' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      제출건수순
                    </button>
                    <button
                      onClick={() => setProposerSortBy('yes')}
                      className={`px-2 py-1 rounded ${proposerSortBy === 'yes' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      채택건수순
                    </button>
                    <button
                      onClick={() => setProposerSortBy('adoptionRate')}
                      className={`px-2 py-1 rounded ${proposerSortBy === 'adoptionRate' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      채택성공률순
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {proposerDeptStats.map((item, idx) => {
                    const scalePercent = Math.round((item.proposed / maxProposed) * 100);
                    const yesInProposed = item.proposed > 0 ? (item.yes / item.proposed) * 100 : 0;

                    return (
                      <div
                        key={item.dept}
                        className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-indigo-300 transition space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-[11px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-[11px] text-slate-400 font-semibold">[{item.office}]</span>
                            <strong className="text-slate-900 font-extrabold text-sm">{item.dept}</strong>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[11px]">
                              발의 {item.proposed}건 (비중 {item.shareRate}%)
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                              채택 {item.yes}건 ({item.adoptionRate}%)
                            </span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-200/70 h-3 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${scalePercent}%` }}
                            className="h-full bg-indigo-300 flex rounded-full overflow-hidden"
                          >
                            <div
                              style={{ width: `${yesInProposed}%` }}
                              className="bg-indigo-600 h-full"
                              title={`채택 성공: ${item.yes}건`}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            전체 제안 대비 제출 점유율 <strong className="text-indigo-700">{item.shareRate}%</strong>
                          </span>
                          <span>
                            발의 제안 중 채택 <strong className="text-amber-700">{item.yes}건</strong> / 불채택 {item.no}건
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. 제안 분야(Category)별 & 직급(Rank)별 통계 */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* 제안 분야별 분포 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
                <h2 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>제안 분야(카테고리)별 접수 및 채택률</span>
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  제안 성격·분야별 접수 건수 및 0차 심사 통과(Yes) 비율
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {categoryStats.map((cat) => (
                    <div
                      key={cat.category}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-xs sm:text-sm font-extrabold text-slate-800 truncate">
                          {cat.category}
                        </strong>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                          채택률 {cat.adoptionRate}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>총 {cat.count}건 접수</span>
                        <span>
                          채택 <strong className="text-emerald-700">{cat.yes}</strong> · 불채택 <strong className="text-rose-600">{cat.no}</strong>
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.min(100, cat.adoptionRate)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 직급별 제안 참여 분포 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
                <h2 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  <span>제안자 직급별 참여 비중 및 채택률</span>
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  직급별 혁신 제안 참여 건수 점유율 및 부서 채택률 현황
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {rankStats.map((rk) => (
                    <div
                      key={rk.rank}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-xs sm:text-sm font-extrabold text-slate-800">
                          {rk.rank}
                        </strong>
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[11px]">
                          비중 {rk.shareRate}% ({rk.count}건)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>채택률 {rk.adoptionRate}%</span>
                        <span>
                          채택 <strong className="text-emerald-700">{rk.yes}건</strong> · 불채택 {rk.no}건
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${Math.min(100, rk.shareRate)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. 부서별 종합 통계 일람표 (발의 + 심사 통합 표) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    부서별 0차 평가 종합 통계 일람표
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    각 부서의 [제안 발의(제출) 실적]과 [소관 제안 심사(평가) 실적]을 한눈에 비교합니다.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="py-3 px-4">소속 (처·실·단)</th>
                      <th className="py-3 px-4">부서명</th>
                      <th className="py-3 px-4 text-center bg-indigo-50/60 text-indigo-900">발의(제출) 건수</th>
                      <th className="py-3 px-4 text-center bg-indigo-50/60 text-indigo-900">발의 비중</th>
                      <th className="py-3 px-4 text-center bg-emerald-50/60 text-emerald-900">심사 배정 건수</th>
                      <th className="py-3 px-4 text-center bg-emerald-50/60 text-emerald-900">평가 제출률</th>
                      <th className="py-3 px-4 text-center bg-amber-50/80 text-amber-900">채택 (Yes)</th>
                      <th className="py-3 px-4 text-center">불채택 (No)</th>
                      <th className="py-3 px-4 text-center bg-amber-50/80 text-amber-900">부서 채택률</th>
                      <th className="py-3 px-4 text-center">부서이동 이력</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {combinedDeptTable.map((row) => (
                      <tr key={row.dept} className="hover:bg-slate-50/90 transition">
                        <td className="py-2.5 px-4 text-slate-500 font-medium">{row.office}</td>
                        <td className="py-2.5 px-4 font-extrabold text-slate-900">{row.dept}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-indigo-700 bg-indigo-50/20">
                          {row.proposedCount}건
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-600 bg-indigo-50/20">
                          {row.proposedShare}%
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-800 bg-emerald-50/20">
                          {row.assignedCount}건
                        </td>
                        <td className="py-2.5 px-4 text-center bg-emerald-50/20">
                          {row.assignedCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                              {row.submissionRate}%
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center font-extrabold text-amber-700 bg-amber-50/30">
                          {row.assignedYes}건
                        </td>
                        <td className="py-2.5 px-4 text-center font-semibold text-rose-600">
                          {row.assignedNo}건
                        </td>
                        <td className="py-2.5 px-4 text-center bg-amber-50/30">
                          {row.assignedCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold">
                              {row.adoptionRate}%
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {row.transferredIn > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                              {row.transferredIn}건
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6. 제안별 0차 부서 평가 결과 및 검토의견 상세 조회 */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    제안별 0차 부서 평가 결과 상세 내역 ({filteredProposals.length}건)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    채택(Yes) 여부, 담당부서 검토의견 및 부서이동 이력을 검색·필터링하여 열람할 수 있습니다.
                  </p>
                </div>

                <div className="print:hidden flex flex-wrap items-center gap-2 text-xs">
                  {/* 판정 필터 */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl font-bold">
                    <button
                      onClick={() => setResultFilter('ALL')}
                      className={`px-3 py-1.5 rounded-lg transition ${resultFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                    >
                      전체 ({proposals.length})
                    </button>
                    <button
                      onClick={() => setResultFilter('Yes')}
                      className={`px-3 py-1.5 rounded-lg transition ${resultFilter === 'Yes' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'}`}
                    >
                      채택 Yes ({summary.yes})
                    </button>
                    <button
                      onClick={() => setResultFilter('No')}
                      className={`px-3 py-1.5 rounded-lg transition ${resultFilter === 'No' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-600'}`}
                    >
                      불채택 No ({summary.no})
                    </button>
                    <button
                      onClick={() => setResultFilter('TRANSFER')}
                      className={`px-3 py-1.5 rounded-lg transition ${resultFilter === 'TRANSFER' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'}`}
                    >
                      부서이동 ({summary.transferredProposals})
                    </button>
                  </div>

                  {/* 부서 선택 필터 */}
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-700"
                  >
                    <option value="ALL">전체 부서</option>
                    {combinedDeptTable.map(d => (
                      <option key={d.dept} value={d.dept}>
                        {d.dept}
                      </option>
                    ))}
                  </select>

                  {/* 키워드 검색 */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="제안명, 부서, 번호 검색..."
                      className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="py-3 px-3 text-center w-16">번호</th>
                      <th className="py-3 px-3 w-28">제안자 소속</th>
                      <th className="py-3 px-3 w-28">심사 실행부서</th>
                      <th className="py-3 px-3 min-w-[220px]">제안 제목</th>
                      <th className="py-3 px-3 text-center w-24">0차 판정</th>
                      <th className="py-3 px-4 min-w-[280px]">실행부서 검토 의견</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProposals.map((p) => {
                      const res = getProposalResult(p);
                      const opinion = getProposalOpinion(p);
                      const transfers = Array.isArray(p.transfer_history) ? p.transfer_history : [];

                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition align-top">
                          <td className="py-3 px-3 text-center font-mono text-slate-500">
                            {p.board_no || p.seq_no}
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-medium">
                            {p.proposer_department || '-'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900">{p.assigned_department}</span>
                            {transfers.length > 0 && (
                              <div className="mt-1 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5">
                                🔄 {transfers.map(t => `${t.from_department}→${t.target_department}`).join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900 leading-relaxed">
                            {p.title}
                            <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                              분야: {p.category || '-'} · 직급: {p.proposer_rank || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {res === 'Yes' ? (
                              <span className="inline-flex px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-extrabold">
                                채택 (Yes)
                              </span>
                            ) : res === 'No' ? (
                              <span className="inline-flex px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                                불채택 (No)
                              </span>
                            ) : (
                              <span className="inline-flex px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-semibold">
                                미평가
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {opinion}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default function Stage0StatsPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-slate-500 text-sm">통계 대시보드 로딩 중...</div>}>
      <Stage0StatsContent />
    </Suspense>
  );
}
