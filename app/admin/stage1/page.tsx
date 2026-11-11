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
  FileSpreadsheet,
  ArrowDownToLine,
  DownloadCloud
} from 'lucide-react';
import { Proposal, EvaluationSession, CommitteeScore, DEFAULT_STAGE1_JUDGES } from '@/lib/types';

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
  const [roundScores, setRoundScores] = useState<CommitteeScore[] | null>(null);
  const [scoreLoadError, setScoreLoadError] = useState(false);
  const [modalScoreError, setModalScoreError] = useState(false);
  const [editedJudges, setEditedJudges] = useState<Set<string>>(new Set());
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [isEditingScores, setIsEditingScores] = useState<boolean>(false);
  const [savingScores, setSavingScores] = useState<boolean>(false);
  const [isClosed, setIsClosed] = useState<boolean>(true); // 1차마감여부(Y/N)
  const [finalDecision, setFinalDecision] = useState<string>('채택');

  // 1. 회차 목록 로드 (오직 1차 심사로 연계 생성된 STAGE_1 회차만 표시)
  useEffect(() => {
    fetch(`/api/sessions?_t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then((sessionList: EvaluationSession[]) => {
        const stage1Sessions = Array.isArray(sessionList)
          ? sessionList.filter(s => s.stage === 'STAGE_1')
          : [];
        setSessions(stage1Sessions);

        if (stage1Sessions.length === 0) {
          setSelectedSessionId('');
          setProposals([]);
          setLoading(false);
          return;
        }

        const urlSessionId = searchParams.get('session_id');
        let initialId = urlSessionId || '';

        if (!initialId && typeof window !== 'undefined') {
          initialId = localStorage.getItem('gcuc_active_session_id') || '';
        }

        // 선택된 ID가 STAGE_1 목록에 없으면 첫 번째 STAGE_1 회차 선택
        if (!initialId || !stage1Sessions.some(s => s.id === initialId)) {
          initialId = stage1Sessions[0].id;
        }

        setSelectedSessionId(initialId);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [searchParams]);

  // 2. 선택된 회차의 제안 로드
  const fetchProposals = (sessionId: string) => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/proposals?session_id=${encodeURIComponent(sessionId)}&_t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then((data: Proposal[]) => {
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
      fetchProposals(selectedSessionId);
    } else {
      setLoading(false);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    if (!selectedSessionId) return;
    const controller = new AbortController();
    setRoundScores(null);
    setScoreLoadError(false);
    fetch(`/api/stage1/scores?session_id=${encodeURIComponent(selectedSessionId)}`, {
      cache: 'no-store', signal: controller.signal
    })
      .then(response => {
        if (!response.ok) throw new Error('심사위원 제출 현황 조회 실패');
        return response.json();
      })
      .then(data => { if (!controller.signal.aborted) setRoundScores(data); })
      .catch(() => { if (!controller.signal.aborted) setScoreLoadError(true); });
    return () => controller.abort();
  }, [selectedSessionId]);

  const handleSessionChange = (newSessionId: string) => {
    setSelectedSessionId(newSessionId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gcuc_active_session_id', newSessionId);
    }
    router.replace(`/admin/stage1?session_id=${encodeURIComponent(newSessionId)}`);
  };

  const currentSession = sessions.find(s => s.id === selectedSessionId);
  const sessionJudges = currentSession?.judges;
  const judges = sessionJudges?.length && !sessionJudges.some(j => j.name === '박민호')
    ? sessionJudges : DEFAULT_STAGE1_JUDGES;
  const selectedJudgeFilter = searchParams.get('judge') || '';

  const submissionCounts = useMemo(() => {
    const result = new Map<string, Set<string>>();
    for (const score of roundScores || []) {
      const proposalIds = result.get(score.judge_name) ?? new Set<string>();
      proposalIds.add(score.proposal_id);
      result.set(score.judge_name, proposalIds);
    }
    return result;
  }, [roundScores]);

  // 제안별 완료 심사위원 맵 (proposal_id -> Map<judge_name, CommitteeScore>)
  const proposalJudgeScoresMap = useMemo(() => {
    const validJudgeNames = new Set(judges.map(j => j.name));
    const map = new Map<string, Map<string, CommitteeScore>>();
    for (const score of roundScores || []) {
      if (score.is_draft || !validJudgeNames.has(score.judge_name)) continue;
      const byJudge = map.get(score.proposal_id) ?? new Map<string, CommitteeScore>();
      byJudge.set(score.judge_name, score);
      map.set(score.proposal_id, byJudge);
    }
    return map;
  }, [roundScores, judges]);

  const totalJudgesCount = judges.length || 12;

  const getProposalProgress = (proposalId: string) => {
    const count = proposalJudgeScoresMap.get(proposalId)?.size ?? 0;
    const status: '심사완료' | '심사중' | '심사대기' =
      count >= totalJudgesCount ? '심사완료' : count > 0 ? '심사중' : '심사대기';
    return { count, total: totalJudgesCount, status };
  };

  const getProposalDecision = (proposal: Proposal) => {
    const judgeScores = Array.from(proposalJudgeScoresMap.get(proposal.id)?.values() ?? []);
    const under50Count = judgeScores.filter(s => Number(s.total_score) < 50).length;
    if (under50Count >= 3) {
      return { decision: '과락 불채택', under50Count };
    }
    const prog = getProposalProgress(proposal.id);
    if (proposal.stage1_decision && proposal.stage1_decision !== '심사대기' && proposal.stage1_decision !== '과락 불채택') {
      return { decision: proposal.stage1_decision, under50Count };
    }
    if (prog.status === '심사완료' && judgeScores.length > 0) {
      const avg = judgeScores.reduce((sum, s) => sum + Number(s.total_score || 0), 0) / judgeScores.length;
      return { decision: avg >= 50 ? '채택' : '불채택', under50Count };
    }
    return { decision: '미결', under50Count };
  };

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
        const { status } = getProposalProgress(p.id);
        if (filterStatus === '심사완료') {
          if (status !== '심사완료') return false;
        } else if (filterStatus === '심사중' || filterStatus === '심사진행') {
          if (status !== '심사중') return false;
        } else if (filterStatus === '심사대기') {
          if (status !== '심사대기') return false;
        } else if (filterStatus !== (p.stage1_decision || status)) {
          return false;
        }
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
  }, [proposals, filterType, filterDept, filterStatus, searchKeyword, proposalJudgeScoresMap, totalJudgesCount]);

  // 특정 심사위원이 평가완료한 제안 목록 (심사위원 제출건수 클릭 시 화면용)
  const selectedJudgeInfo = judges.find(j => j.name === selectedJudgeFilter);
  const judgeCompletedItems = useMemo(() => {
    if (!selectedJudgeFilter) return [];
    return proposals
      .map(p => {
        const judgeScore = proposalJudgeScoresMap.get(p.id)?.get(selectedJudgeFilter);
        return judgeScore ? { proposal: p, score: judgeScore } : null;
      })
      .filter((item): item is { proposal: Proposal; score: CommitteeScore } => item !== null);
  }, [proposals, proposalJudgeScoresMap, selectedJudgeFilter]);

  // 3. 심사내역보기 모달 열기 (이미지 2 데이터 로드)
  const handleOpenDetailModal = async (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setScores([]);
    setEditedJudges(new Set());
    setModalScoreError(false);
    setIsClosed(proposal.stage1_is_closed ?? true);
    setFinalDecision(proposal.stage1_decision || '채택');
    setModalLoading(true);

    try {
      const res = await fetch(`/api/stage1/scores?session_id=${encodeURIComponent(selectedSessionId)}&proposal_id=${encodeURIComponent(proposal.id)}&include_draft=1`, { cache: 'no-store' });
      if (!res.ok) throw new Error('심사 점수 조회 실패');
      const existingScores: CommitteeScore[] = await res.json();

      // 12명 심사위원과 매핑 (제출본 우선, 임시저장본 포함)
      const mappedScores: CommitteeScore[] = judges.map((judge, idx) => {
        const candidates = existingScores.filter(s => s.judge_name === judge.name);
        const found = candidates.find(s => !s.is_draft) || candidates[0];
        if (found) {
          return {
            ...found,
            judge_dept: judge.dept,
            judge_title: judge.title || found.judge_title || '제안1차심사자',
          };
        }

        return {
          id: `cs-temp-${idx}`,
          proposal_id: proposal.id,
          session_id: selectedSessionId,
          judge_name: judge.name,
          judge_dept: judge.dept,
          judge_title: judge.title || '제안1차심사자',
          creativity: 0,
          feasibility: 0,
          effectiveness: 0,
          dissemination: 0,
          total_score: 0,
          opinion: '미채점'
        };
      });

      setScores(mappedScores);

      const scoredRows = mappedScores.filter(s => Boolean(s.submitted_at && !s.is_draft));
      const under50Count = scoredRows.filter(s => Number(s.total_score) < 50).length;
      if (under50Count >= 3) {
        setFinalDecision('과락 불채택');
      } else if (proposal.stage1_decision && proposal.stage1_decision !== '심사대기' && proposal.stage1_decision !== '과락 불채택') {
        setFinalDecision(proposal.stage1_decision);
      } else if (scoredRows.length >= totalJudgesCount) {
        const avg = scoredRows.reduce((acc, s) => acc + Number(s.total_score || 0), 0) / scoredRows.length;
        setFinalDecision(avg >= 50 ? '채택' : '불채택');
      } else {
        setFinalDecision('채택');
      }
    } catch (err) {
      console.error(err);
      setModalScoreError(true);
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
    const nextEdited = new Set(editedJudges).add(item.judge_name);
    setEditedJudges(nextEdited);

    const scored = updated.filter(s => (s.submitted_at && !s.is_draft) || nextEdited.has(s.judge_name));
    const under50Count = scored.filter(s => Number(s.total_score) < 50).length;
    if (under50Count >= 3) {
      setFinalDecision('과락 불채택');
    } else if (finalDecision === '과락 불채택') {
      const avg = scored.length > 0 ? scored.reduce((acc, s) => acc + Number(s.total_score || 0), 0) / scored.length : 50;
      setFinalDecision(avg >= 50 ? '채택' : '불채택');
    }
  };

  // 통계 평균 계산 (하단 평균 행)
  const averages = useMemo(() => {
    const scored = scores.filter(score => score.submitted_at || editedJudges.has(score.judge_name));
    if (scored.length === 0) return { c: '—', f: '—', e: '—', d: '—', total: '—' };
    const n = scored.length;
    const sumC = scored.reduce((acc, s) => acc + Number(s.creativity || 0), 0);
    const sumF = scored.reduce((acc, s) => acc + Number(s.feasibility || 0), 0);
    const sumE = scored.reduce((acc, s) => acc + Number(s.effectiveness || 0), 0);
    const sumD = scored.reduce((acc, s) => acc + Number(s.dissemination || 0), 0);
    const sumTotal = scored.reduce((acc, s) => acc + Number(s.total_score || 0), 0);
    return {
      c: Math.round(sumC / n),
      f: Math.round(sumF / n),
      e: Math.round(sumE / n),
      d: Math.round(sumD / n),
      total: Math.round(sumTotal / n)
    };
  }, [scores, editedJudges]);

  const modalUnder50Count = useMemo(() => {
    const scored = scores.filter(score => (score.submitted_at && !score.is_draft) || editedJudges.has(score.judge_name));
    return scored.filter(s => Number(s.total_score) < 50).length;
  }, [scores, editedJudges]);

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
          scores: scores.filter(score => editedJudges.has(score.judge_name)),
          stage1_is_closed: isClosed,
          stage1_decision: finalDecision
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('1차 심사위원 다면 채점 결과가 성공적으로 저장되었습니다.');
        setIsEditingScores(false);
        fetchProposals(selectedSessionId);
        void handleOpenDetailModal({ ...selectedProposal, stage1_is_closed: isClosed, stage1_decision: finalDecision });
        const updated = await fetch(`/api/stage1/scores?session_id=${encodeURIComponent(selectedSessionId)}`, { cache: 'no-store' });
        if (updated.ok) setRoundScores(await updated.json());
      } else {
        alert(data.error || '저장 실패');
      }
    } catch (err) {
      alert('서버 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingScores(false);
    }
  };

  // 관리자: 특정 심사위원 제출 취소 처리 (점수·의견은 임시저장으로 보존)
  const handleAdminCancelJudgeSubmit = async (judgeName: string, targetProposalId?: string) => {
    const propId = targetProposalId || selectedProposal?.id;
    if (!propId || !selectedSessionId) return;
    if (!window.confirm(`[${judgeName} 위원]의 최종 제출을 취소하고 임시저장(작성중) 상태로 전환하시겠습니까?\n(입력된 점수와 의견 데이터는 그대로 보존됩니다.)`)) {
      return;
    }
    setSavingScores(true);
    try {
      const res = await fetch('/api/stage1/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsubmit',
          session_id: selectedSessionId,
          proposal_id: propId,
          judge_name: judgeName
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (selectedProposal?.id === propId) {
          setIsClosed(false);
          setScores(prev => prev.map(s => s.judge_name === judgeName ? { ...s, is_draft: true } : s));
        }
        fetchProposals(selectedSessionId);
        const updated = await fetch(`/api/stage1/scores?session_id=${encodeURIComponent(selectedSessionId)}`, { cache: 'no-store' });
        if (updated.ok) setRoundScores(await updated.json());
      } else {
        alert(data.error || '제출 취소 처리 실패');
      }
    } catch {
      alert('서버 통신 중 오류가 발생했습니다.');
    } finally {
      setSavingScores(false);
    }
  };

  // 관리자: 특정 심사위원 채점 내용 초기화 (최초 미채점 상태로 삭제)
  const handleAdminResetJudgeScore = async (judgeName: string, targetProposalId?: string) => {
    const propId = targetProposalId || selectedProposal?.id;
    if (!propId || !selectedSessionId) return;
    if (!window.confirm(`[${judgeName} 위원]이 입력한 채점 점수와 검토 의견을 모두 삭제하고 최초 상태(미채점)로 초기화하시겠습니까?`)) {
      return;
    }
    setSavingScores(true);
    try {
      const res = await fetch('/api/stage1/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset',
          session_id: selectedSessionId,
          proposal_id: propId,
          judge_name: judgeName
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (selectedProposal?.id === propId) {
          setIsClosed(false);
          setEditedJudges(prev => {
            const next = new Set(prev);
            next.delete(judgeName);
            return next;
          });
          setScores(prev =>
            prev.map(s =>
              s.judge_name === judgeName
                ? {
                    ...s,
                    creativity: 0,
                    feasibility: 0,
                    effectiveness: 0,
                    dissemination: 0,
                    total_score: 0,
                    opinion: '미채점',
                    submitted_at: undefined,
                    is_draft: undefined
                  }
                : s
            )
          );
        }
        fetchProposals(selectedSessionId);
        const updated = await fetch(`/api/stage1/scores?session_id=${encodeURIComponent(selectedSessionId)}`, { cache: 'no-store' });
        if (updated.ok) setRoundScores(await updated.json());
      } else {
        alert(data.error || '내용 초기화 처리 실패');
      }
    } catch {
      alert('서버 통신 중 오류가 발생했습니다.');
    } finally {
      setSavingScores(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!selectedSessionId) return;
    window.location.href = `/api/export?session_id=${encodeURIComponent(selectedSessionId)}&stage=STAGE_1`;
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
              <span className="text-[15px] font-bold text-amber-800 uppercase tracking-wider">
                현재 선택된 1차 심사 회차
              </span>
              <span className="text-[14px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-amber-700" />
                {currentSession?.stage === 'STAGE_1' ? '제안 심사(1차 평가) 위원회' : currentSession?.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedSessionId}
                onChange={(e) => handleSessionChange(e.target.value)}
                disabled={sessions.length === 0}
                className="bg-white border-2 border-amber-400 font-bold text-slate-900 text-sm sm:text-base rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm cursor-pointer disabled:opacity-60"
              >
                {sessions.length === 0 ? (
                  <option value="">1차 심사로 이관된 회차 없음</option>
                ) : (
                  sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      [1차 심사] {s.title} ({s.proposals_count}건)
                    </option>
                  ))
                )}
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
            href={`/admin/reports${currentSession?.source_session_id ? `?session_id=${encodeURIComponent(currentSession.source_session_id)}` : ''}`}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition flex items-center gap-1.5"
          >
            <span>0차 부서평가 취합 보기</span>
          </Link>
        </div>
      </div>

      {/* 1-2. 1차 제안심사 취합 및 종합 결과 엑셀 다운로드 헤더 (0차 페이지와 동일한 GUI 버튼) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <DownloadCloud className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>[{currentSession?.title || '1차 제안심사'}] 제안 심사(1차 평가) 취합 및 엑셀 다운로드</span>
          </h2>
          <p className="text-[15px] sm:text-xs text-slate-500 mt-1">
            선택된 1차 심사 회차의 12인 심사위원 채점 결과(창의성·실현성·효과성·전파성·총점·의견), 평균 총점 및 부서이동 이력을 보고용 엑셀로 내보냅니다.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleDownloadExcel}
            disabled={!selectedSessionId}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition whitespace-nowrap disabled:opacity-50"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>종합 결과 엑셀 다운로드</span>
          </button>
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

      {selectedSessionId && (
        <section className="rounded-2xl border border-sky-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-slate-900">심사위원별 제출 현황</h3>
            <span className="text-xs text-slate-500">
              * 제출 건수(숫자)를 클릭하면 해당 심사위원이 평가 완료한 제안 목록 화면으로 이동합니다.
            </span>
          </div>
          {scoreLoadError ? (
            <p role="alert" className="mt-2 text-sm text-red-700">제출 현황을 불러오지 못했습니다. 새로고침해 주세요.</p>
          ) : roundScores === null ? (
            <p className="mt-2 text-sm text-slate-500">제출 현황을 불러오는 중입니다.</p>
          ) : (
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {judges.map(judge => {
                const count = submissionCounts.get(judge.name)?.size ?? 0;
                const isSelected = selectedJudgeFilter === judge.name;
                return (
                  <li
                    key={judge.name}
                    className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm border transition ${
                      isSelected
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300/50'
                        : 'bg-sky-50 border-sky-100 hover:border-sky-300'
                    }`}
                  >
                    <span className="font-medium text-slate-800">{judge.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/admin/stage1?session_id=${encodeURIComponent(selectedSessionId)}&judge=${encodeURIComponent(judge.name)}`
                        )
                      }
                      className="px-2 py-0.5 rounded-md bg-white hover:bg-amber-500 text-sky-900 hover:text-white border border-sky-200 hover:border-amber-600 font-extrabold text-xs shadow-2xs transition cursor-pointer underline decoration-sky-400 hover:no-underline underline-offset-2"
                      title={`${judge.name} 위원이 평가 완료한 제안 모아보기`}
                    >
                      {count}건
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {selectedJudgeFilter ? (
        /* 심사위원별 평가완료 제안 전용 화면 */
        <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 via-white to-orange-50/60 p-4 sm:p-5 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold mb-1.5">
                <User className="w-3.5 h-3.5 text-amber-700" />
                <span>심사위원별 평가완료 제안 모아보기</span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                [{selectedJudgeInfo?.dept || '심사위원'}] {selectedJudgeInfo?.title ? `${selectedJudgeInfo.title} ` : ''}
                <span className="text-amber-700">{selectedJudgeFilter} 위원</span> 평가완료 제안 목록
                <span className="ml-2 text-sm font-bold text-slate-600">
                  ({judgeCompletedItems.length}건 완료 / 전체 {proposals.length}건)
                </span>
              </h3>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/admin/stage1?session_id=${encodeURIComponent(selectedSessionId)}`)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition self-start sm:self-center whitespace-nowrap"
            >
              ← 전체 제안심사(1차) 목록으로 돌아가기
            </button>
          </div>

          {judgeCompletedItems.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <p className="font-bold text-slate-700 text-sm mb-1">
                {selectedJudgeFilter} 위원이 아직 최종 제출(평가완료)한 제안이 없습니다.
              </p>
              <p className="text-slate-400">위원이 1차 제안심사 채점을 제출하면 이곳에 모아 표시됩니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-[14px] font-bold whitespace-nowrap text-center">
                    <th className="py-2.5 px-3 w-12">번호</th>
                    <th className="py-2.5 px-3 w-24">제안번호</th>
                    <th className="py-2.5 px-3 w-24">분야</th>
                    <th className="py-2.5 px-4 text-left">제안 제목</th>
                    <th className="py-2.5 px-3 w-28">실행부서</th>
                    <th className="py-2.5 px-2 w-16 bg-sky-50 text-sky-900">창의성(30)</th>
                    <th className="py-2.5 px-2 w-16 bg-sky-50 text-sky-900">실현성(30)</th>
                    <th className="py-2.5 px-2 w-16 bg-sky-50 text-sky-900">효과성(30)</th>
                    <th className="py-2.5 px-2 w-16 bg-sky-50 text-sky-900">전파성(10)</th>
                    <th className="py-2.5 px-2 w-20 bg-amber-100 text-amber-950">위원 총점</th>
                    <th className="py-2.5 px-3 text-left min-w-[180px]">위원 검토의견</th>
                    <th className="py-2.5 px-3 w-28">상세보기</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[14px]">
                  {judgeCompletedItems.map(({ proposal: p, score }, idx) => {
                    return (
                      <tr key={p.id} className="hover:bg-amber-50/30 transition text-center text-slate-700">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                          {p.board_no || `#${p.seq_no}`}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{p.category || '-'}</td>
                        <td className="py-2.5 px-4 text-left font-bold text-slate-900 whitespace-pre-wrap break-words">
                          {p.title}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">
                          {p.assigned_department || '-'}
                        </td>
                        <td className="py-2.5 px-2 bg-sky-50/40 font-semibold text-slate-800">{score.creativity}</td>
                        <td className="py-2.5 px-2 bg-sky-50/40 font-semibold text-slate-800">{score.feasibility}</td>
                        <td className="py-2.5 px-2 bg-sky-50/40 font-semibold text-slate-800">{score.effectiveness}</td>
                        <td className="py-2.5 px-2 bg-sky-50/40 font-semibold text-slate-800">{score.dissemination}</td>
                        <td className="py-2.5 px-2 bg-amber-50 font-extrabold text-amber-800">{score.total_score}점</td>
                        <td className="py-2.5 px-3 text-left text-slate-700 whitespace-pre-wrap break-words leading-relaxed max-w-md">
                          {score.opinion && score.opinion !== '-' ? score.opinion : '-'}
                        </td>
                        <td className="py-2 px-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(p)}
                            className="w-full py-1.5 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition"
                          >
                            심사내역보기
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
      <>
      {/* 3. 과천도시공사 검색 필터 바 (이미지 1 상단 필터 영역 완벽 구현) */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3 text-xs text-slate-700">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-sky-600" />
            <span>제안심사(1차) 조회 조건</span>
          </span>
          <span className="text-[15px] text-slate-400">
            총 {filteredProposals.length}건 / {proposals.length}건
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 접수일자 */}
          <div>
            <label className="block text-[15px] font-semibold text-slate-500 mb-1">접수일자</label>
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
            <label className="block text-[15px] font-semibold text-slate-500 mb-1">접수구분</label>
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
            <label className="block text-[15px] font-semibold text-slate-500 mb-1">부서</label>
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
            <label className="block text-[15px] font-semibold text-slate-500 mb-1">진행상태</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold"
            >
              <option value="ALL">전체</option>
              <option value="심사대기">심사대기 (0/{totalJudgesCount})</option>
              <option value="심사중">심사중 (1~{totalJudgesCount - 1}/{totalJudgesCount})</option>
              <option value="심사완료">심사완료 ({totalJudgesCount}/{totalJudgesCount})</option>
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

      <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden">
        {sessions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <p className="font-semibold text-slate-700 mb-1">현재 1차 제안심사로 넘긴(이관된) 평가 회차가 없습니다.</p>
            <p className="text-slate-400">0차 부서평가 완료 후 [부서 평가 취합] 또는 [관리자 대시보드]에서 1차 심사 연계 생성을 진행해주세요.</p>
          </div>
        ) : loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            제안 심사 데이터를 불러오는 중...
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            조회 조건에 맞는 제안이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-[15px] font-semibold whitespace-nowrap text-center">
                  <th className="whitespace-nowrap py-2.5 px-3 w-12">번호</th>
                  <th className="whitespace-nowrap py-2.5 px-3 w-28">제안번호</th>
                  <th className="whitespace-nowrap py-2.5 px-3 w-20">접수구분</th>
                  <th className="whitespace-nowrap py-2.5 px-3 w-24">분야</th>
                  <th className="whitespace-nowrap py-2.5 px-4 text-left">제목</th>
                  <th className="whitespace-nowrap py-2.5 px-3 w-28">부서</th>
                  <th className="whitespace-nowrap py-2.5 px-3 w-20">제안자</th>
                  <th className="whitespace-nowrap py-2.5 px-3 w-24">접수일자</th>
                  <th className="whitespace-nowrap py-2.5 px-3 w-28 bg-amber-50 text-amber-900 border-x border-amber-200">
                    심사내역보기
                  </th>
                  <th className="whitespace-nowrap py-2.5 px-3 w-24">심사일자</th>
                  <th className="whitespace-nowrap py-2.5 px-3 w-32">진행상태 (완료/전체)</th>
                  <th className="whitespace-nowrap py-2.5 px-3 w-24">심사결과</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[15px]">
                {filteredProposals.map((p, idx) => {
                  const prog = getProposalProgress(p.id);
                  const isDone = prog.status === '심사완료';
                  const { decision } = getProposalDecision(p);
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
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[14px]">
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
                          className="w-full py-1.5 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[15px] shadow-sm transition flex items-center justify-center gap-1"
                        >
                          <Search className="w-3 h-3" />
                          <span>심사내역보기</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">
                        {p.stage1_review_date || (isDone ? new Date().toISOString().split('T')[0] : '-')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[14px] font-bold whitespace-nowrap ${
                          prog.status === '심사완료'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : prog.status === '심사중'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          <span>{prog.status}</span>
                          <span className="font-mono text-xs opacity-90">({prog.count}/{prog.total})</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                        {decision === '과락 불채택' ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-extrabold">
                            과락 불채택
                          </span>
                        ) : decision === '불채택' ? (
                          <span className="text-rose-600">{decision}</span>
                        ) : decision === '채택' || decision === '조건부채택' ? (
                          <span className="text-sky-700">{decision}</span>
                        ) : (
                          <span className="text-slate-500">{decision}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* 5. 심사내역보기 상세 팝업 (첨부 이미지 2 완벽 구현) */}
      {selectedProposal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-6xl w-full p-5 sm:p-6 shadow-2xl border border-slate-300 my-auto text-slate-800 space-y-4">
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
                  disabled={modalLoading || modalScoreError}
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

            {modalLoading && <p className="text-sm text-slate-500">심사 점수를 불러오는 중입니다.</p>}
            {modalScoreError && (
              <p role="alert" className="text-sm text-red-700">심사 점수를 불러오지 못했습니다. 창을 닫고 다시 열어 주세요.</p>
            )}

            {/* 상단 제안 상세 정보 그리드 (이미지 2 상단 완벽 재현) */}
            <div className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-200 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                <div>
                  <span className="text-slate-400 block text-[14px]">제안번호</span>
                  <strong className="text-slate-900 font-mono">
                    {selectedProposal.board_no || `2025-12-${String(260 + selectedProposal.seq_no).padStart(3, '0')}`}
                  </strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[14px]">제안명</span>
                  <strong className="text-slate-900 whitespace-pre-wrap break-words">{selectedProposal.title}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[14px]">제안일</span>
                  <span className="text-slate-700 font-mono">{selectedProposal.submitted_at || '2025/12/03'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[14px]">접수구분</span>
                  <span className="text-slate-800 font-medium">{selectedProposal.proposal_type || '자유제안'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[14px]">분야</span>
                  <span className="text-slate-800 font-medium">{selectedProposal.category || '고객만족'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[14px]">제안자</span>
                  <strong className="text-slate-900">{selectedProposal.proposer_name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[14px]">부서</span>
                  <span className="text-slate-800">{selectedProposal.proposer_department || selectedProposal.assigned_department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[14px]">직급</span>
                  <span className="text-slate-800">{selectedProposal.proposer_rank || '체육 4급'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[14px]">기여율(%)</span>
                  <strong className="text-sky-700">100%</strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-sky-700 font-bold block text-[14px]">0차 부서평가 검토결과</span>
                  <span className="text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
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

              <div className="flex flex-wrap items-center gap-2">
                {modalUnder50Count >= 3 && (
                  <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs">
                    ⚠️ 50점 미만 평가자 {modalUnder50Count}명 (과락 불채택 자동 지정)
                  </span>
                )}
                <span className="font-bold text-slate-700">최종 판정:</span>
                <select
                  value={finalDecision}
                  onChange={(e) => setFinalDecision(e.target.value)}
                  className={`bg-white border font-bold text-xs rounded-lg px-2.5 py-1 ${
                    finalDecision === '과락 불채택'
                      ? 'border-rose-400 text-rose-700 bg-rose-50'
                      : 'border-slate-300 text-sky-800'
                  }`}
                >
                  <option value="채택">채택</option>
                  <option value="조건부채택">조건부채택</option>
                  <option value="불채택">불채택</option>
                  <option value="과락 불채택">과락 불채택</option>
                  <option value="미결">미결</option>
                </select>
              </div>
            </div>

            {/* 심사위원별 다면 평가 테이블 (첨부 이미지 2 하단 테이블 완벽 복원) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="max-h-[460px] overflow-y-auto">
                <table className="w-full min-w-[920px] text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-sky-900 text-white text-[15px] font-semibold text-center z-10">
                    <tr>
                      <th className="whitespace-nowrap py-2 px-2 w-10">번호</th>
                      <th className="whitespace-nowrap py-2 px-2 w-24">심사구분</th>
                      <th className="whitespace-nowrap py-2 px-3 w-28">부서</th>
                      <th className="whitespace-nowrap py-2 px-2 w-20">심사자</th>
                      <th className="whitespace-nowrap py-2 px-2 w-20">상태</th>
                      <th className="whitespace-nowrap py-2 px-2 w-16 bg-sky-800">창의성</th>
                      <th className="whitespace-nowrap py-2 px-2 w-16 bg-sky-800">실현성</th>
                      <th className="whitespace-nowrap py-2 px-2 w-16 bg-sky-800">효과성</th>
                      <th className="whitespace-nowrap py-2 px-2 w-16 bg-sky-800">전파성</th>
                      <th className="whitespace-nowrap py-2 px-2 w-16 bg-amber-600 font-bold">총점</th>
                      <th className="whitespace-nowrap py-2 px-4 text-left min-w-[240px]">위원 검토의견</th>
                      <th className="whitespace-nowrap py-2 px-2 w-40">제출/초기화 관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[15px]">
                    {scores.map((score, idx) => {
                      const hasScoreData = Boolean(score.submitted_at || editedJudges.has(score.judge_name));
                      const isJudgeSubmitted = Boolean(score.submitted_at && !score.is_draft);
                      const isJudgeDraft = Boolean(score.submitted_at && score.is_draft);
                      return (
                      <tr key={score.id || idx} className="hover:bg-slate-50 transition text-center text-slate-700">
                        <td className="py-2 px-2 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-2 text-slate-500">{score.judge_title || '제안1차심사자'}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">{score.judge_dept}</td>
                        <td className="py-2 px-2 font-bold text-slate-900">{score.judge_name}</td>
                        <td className="py-2 px-2">
                          {isJudgeSubmitted ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                              제출완료
                            </span>
                          ) : isJudgeDraft ? (
                            <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-xs">
                              임시저장
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 font-medium text-xs">
                              미채점
                            </span>
                          )}
                        </td>

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
                            <span className="font-semibold text-slate-800">{hasScoreData ? score.creativity : 0}</span>
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
                            <span className="font-semibold text-slate-800">{hasScoreData ? score.feasibility : 0}</span>
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
                            <span className="font-semibold text-slate-800">{hasScoreData ? score.effectiveness : 0}</span>
                          )}
                        </td>

                        {/* 전파성 */}
                        <td className="py-1 px-1 bg-sky-50/30">
                          {isEditingScores ? (
                            <input
                              type="number"
                              min={0}
                              max={10}
                              value={score.dissemination}
                              onChange={(e) => handleScoreChange(idx, 'dissemination', e.target.value)}
                              className="w-12 text-center bg-white border border-slate-300 rounded p-1 text-xs font-bold"
                            />
                          ) : (
                            <span className="font-semibold text-slate-800">{hasScoreData ? score.dissemination : 0}</span>
                          )}
                        </td>

                        {/* 총점 */}
                        <td className="py-2 px-2 bg-amber-50 font-bold text-amber-900">
                          {hasScoreData ? score.total_score : '—'}
                        </td>

                        {/* 의견 */}
                        <td className="py-2 px-3 text-left align-middle">
                          {isEditingScores ? (
                            <textarea
                              rows={2}
                              value={score.opinion}
                              onChange={(e) => handleScoreChange(idx, 'opinion', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs leading-relaxed"
                            />
                          ) : (
                            <div className="text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                              {score.opinion || '-'}
                            </div>
                          )}
                        </td>

                        {/* 제출 취소 및 내용 초기화 버튼 */}
                        <td className="py-1.5 px-2 text-center">
                          {isJudgeSubmitted ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                disabled={savingScores}
                                onClick={() => handleAdminCancelJudgeSubmit(score.judge_name)}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition disabled:opacity-50 whitespace-nowrap"
                              >
                                제출 취소
                              </button>
                              <button
                                type="button"
                                disabled={savingScores}
                                onClick={() => handleAdminResetJudgeScore(score.judge_name)}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs transition disabled:opacity-50 whitespace-nowrap"
                              >
                                내용 초기화
                              </button>
                            </div>
                          ) : isJudgeDraft || hasScoreData ? (
                            <button
                              type="button"
                              disabled={savingScores}
                              onClick={() => handleAdminResetJudgeScore(score.judge_name)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs transition disabled:opacity-50 whitespace-nowrap"
                            >
                              내용 초기화
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>

                  {/* 하단 평균 행 (이미지 2의 '평균' 요약 행 완벽 일치) */}
                  <tfoot className="bg-slate-200 border-t-2 border-slate-400 font-bold text-[15px] text-center text-slate-900 sticky bottom-0">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 text-center uppercase tracking-wider bg-slate-300">
                        평균 (Average)
                      </td>
                      <td className="py-2.5 px-2 bg-sky-100 text-sky-900">{averages.c}</td>
                      <td className="py-2.5 px-2 bg-sky-100 text-sky-900">{averages.f}</td>
                      <td className="py-2.5 px-2 bg-sky-100 text-sky-900">{averages.e}</td>
                      <td className="py-2.5 px-2 bg-sky-100 text-sky-900">{averages.d}</td>
                      <td className="py-2.5 px-2 bg-amber-200 text-amber-950 font-extrabold text-sm">
                        {averages.total}
                      </td>
                      <td colSpan={2} className="py-2.5 px-4 text-left text-sky-900">
                        판정 결과: <strong className="text-base ml-1 text-sky-950">{finalDecision}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <span className="text-[15px] text-slate-500">
                * 심사위원 총점 평균 50점 이상 시 채택 (단, 50점 미만 부여 위원이 3명 이상이면 과락 불채택 자동 지정)
              </span>

              <div className="flex flex-wrap items-center gap-2">
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
