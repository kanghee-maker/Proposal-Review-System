'use client';

import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Dices, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Save, 
  Search, 
  ShieldCheck, 
  AlertCircle, 
  Building2, 
  Sparkles,
  Download,
  RefreshCw
} from 'lucide-react';

interface DepartmentPasswordItem {
  code: string;
  division: string;
  office: string;
  department: string;
  name: string;
  password: string;
  hasPassword: boolean;
}

export default function AdminPasswordsPage() {
  const [departments, setDepartments] = useState<DepartmentPasswordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [inputPasswords, setInputPasswords] = useState<Record<string, string>>({});
  const [savingDept, setSavingDept] = useState<string | null>(null);
  const [copiedDept, setCopiedDept] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const fetchPasswords = async (showLoadingSpinner: boolean = false) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const res = await fetch(`/api/admin/passwords?_t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.departments) {
        setDepartments(data.departments);
        const initialInputs: Record<string, string> = {};
        data.departments.forEach((d: DepartmentPasswordItem) => {
          initialInputs[d.department] = d.password || '';
        });
        setInputPasswords(initialInputs);
      }
    } catch (err) {
      console.error(err);
      showToast('비밀번호 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasswords(true);
  }, []);

  // 4자리 랜덤 숫자 생성 (1000 ~ 9999)
  const generateRandom4Digits = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // 단일 부서 4자리 랜덤 생성
  const handleRandomizeSingle = (deptName: string) => {
    const randomPass = generateRandom4Digits();
    setInputPasswords(prev => ({ ...prev, [deptName]: randomPass }));
    setShowPasswords(prev => ({ ...prev, [deptName]: true }));
    showToast(`[${deptName}] 4자리 번호(${randomPass}) 생성됨. [저장] 버튼을 누르면 적용됩니다.`);
  };

  // 미발급 부서 일괄 4자리 랜덤 생성
  const handleBulkRandomizeUnset = () => {
    const newInputs = { ...inputPasswords };
    let count = 0;
    departments.forEach(d => {
      if (!inputPasswords[d.department] || inputPasswords[d.department].trim() === '') {
        newInputs[d.department] = generateRandom4Digits();
        count++;
      }
    });

    if (count === 0) {
      showToast('이미 모든 부서의 비밀번호가 설정되어 있습니다.');
      return;
    }

    setInputPasswords(newInputs);
    showToast(`미발급 ${count}개 부서에 4자리 랜덤 번호가 채워졌습니다. 상단의 [전체 일괄 저장]을 눌러 저장하세요.`);
  };

  // 전체 부서 일괄 재발급 (랜덤)
  const handleBulkRandomizeAll = () => {
    if (!confirm('정말로 모든 부서의 비밀번호를 새로운 4자리 숫자로 랜덤 재발급하시겠습니까? 기존 설정된 비밀번호도 모두 갱신됩니다.')) {
      return;
    }
    const newInputs: Record<string, string> = {};
    departments.forEach(d => {
      newInputs[d.department] = generateRandom4Digits();
    });
    setInputPasswords(newInputs);
    showToast(`전체 ${departments.length}개 부서에 새 4자리 번호가 생성되었습니다. [전체 일괄 저장]을 눌러 적용하세요.`);
  };

  // 단일 부서 저장
  const handleSaveSingle = async (deptName: string) => {
    const pass = inputPasswords[deptName]?.trim() || '';
    if (!pass) {
      if (!confirm(`[${deptName}] 부서의 비밀번호를 공란으로 두면 해당 부서는 미설정 상태가 됩니다. 계속하시겠습니까?`)) {
        return;
      }
    }

    setSavingDept(deptName);
    try {
      const res = await fetch('/api/admin/passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dept: deptName, password: pass })
      });
      const data = await res.json();
      if (data.success) {
        // 즉시 상태 반영 (낙관적 갱신)
        setDepartments(prev => prev.map(d => d.department === deptName ? {
          ...d,
          password: pass,
          hasPassword: Boolean(pass)
        } : d));
        setInputPasswords(prev => ({ ...prev, [deptName]: pass }));
        showToast(`[${deptName}] 비밀번호가 성공적으로 저장되었습니다.`);
        await fetchPasswords(false);
      } else {
        alert(data.error || '저장 실패');
      }
    } catch (err) {
      alert('저장 중 통신 오류가 발생했습니다.');
    } finally {
      setSavingDept(null);
    }
  };

  // 전체 일괄 저장
  const handleSaveAll = async () => {
    setBulkSaving(true);
    try {
      const res = await fetch('/api/admin/passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwords: inputPasswords })
      });
      const data = await res.json();
      if (data.success) {
        // 즉시 전 부서 발급완료 반영 (낙관적 갱신)
        setDepartments(prev => prev.map(d => {
          const p = (inputPasswords[d.department] || '').trim();
          return {
            ...d,
            password: p,
            hasPassword: Boolean(p)
          };
        }));
        showToast('전체 부서 비밀번호가 성공적으로 일괄 저장되었습니다.');
        await fetchPasswords(false);
      } else {
        alert(data.error || '일괄 저장 실패');
      }
    } catch (err) {
      alert('일괄 저장 중 통신 오류가 발생했습니다.');
    } finally {
      setBulkSaving(false);
    }
  };

  // 클립보드 복사
  const handleCopySingle = (deptName: string, pass: string) => {
    if (!pass) {
      alert('설정된 비밀번호가 없습니다.');
      return;
    }
    navigator.clipboard.writeText(pass);
    setCopiedDept(deptName);
    setTimeout(() => setCopiedDept(null), 2000);
    showToast(`[${deptName}] 비밀번호(${pass})가 복사되었습니다.`);
  };

  // 전체 명단 텍스트 클립보드 복사
  const handleCopyAllList = () => {
    const lines = departments.map((d, idx) => {
      const pass = inputPasswords[d.department] || d.password || '(미발급)';
      return `${idx + 1}. [${d.division} > ${d.department}] 비밀번호: ${pass}`;
    });
    const content = `[과천도시공사 제안평가 부서별 접속 비밀번호 명단]\n\n${lines.join('\n')}\n\n* 관리자 발급일시: ${new Date().toLocaleString()}`;
    navigator.clipboard.writeText(content);
    showToast('전체 부서 비밀번호 명단이 클립보드에 복사되었습니다.');
  };

  // CSV 다운로드
  const handleDownloadCSV = () => {
    const headers = ['연번', '본부/부문', '처/실/단', '부서명', '접속비밀번호(4자리)', '발급상태'];
    const rows = departments.map((d, idx) => {
      const pass = inputPasswords[d.department] || d.password || '';
      return [
        idx + 1,
        `"${d.division}"`,
        `"${d.office}"`,
        `"${d.department}"`,
        `"${pass}"`,
        pass ? '"발급완료"' : '"미발급"'
      ].join(',');
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `과천도시공사_부서별_접속비밀번호_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('부서별 비밀번호 명단 CSV가 다운로드되었습니다.');
  };

  const filtered = departments.filter(d => {
    const q = search.toLowerCase();
    return (
      d.department.toLowerCase().includes(q) ||
      d.division.toLowerCase().includes(q) ||
      d.office.toLowerCase().includes(q)
    );
  });

  const totalCount = departments.length;
  const savedCount = departments.filter(d => Boolean(d.password)).length;
  const pendingSaveCount = departments.filter(d => Boolean(inputPasswords[d.department]) && inputPasswords[d.department] !== d.password).length;
  const unsetCount = departments.filter(d => !d.password && !inputPasswords[d.department]).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-sky-950 text-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold mb-3">
            <KeyRound className="w-3.5 h-3.5" />
            부서별 보안 인증 관리
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">부서별 평가 접속 비밀번호 관리</h2>
          <p className="text-sm text-slate-300 max-w-xl">
            각 부서 평가자가 0차 부서평가함에 접속할 때 사용할 4자리 비밀번호를 안전하게 발급하고 관리합니다.
            평가자가 스스로 설정하지 않고 <strong>관리자가 사전에 발급</strong>하여 안내합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleBulkRandomizeUnset}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-sky-600/25 transition"
            title="비밀번호가 없는 부서만 4자리 랜덤 숫자로 채웁니다."
          >
            <Dices className="w-4 h-4" />
            <span>미발급 부서 4자리 랜덤 생성</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={bulkSaving}
            className={`px-4 py-2.5 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition disabled:opacity-50 ${
              pendingSaveCount > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 ring-2 ring-emerald-400 shadow-emerald-600/40 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{bulkSaving ? '저장 중...' : pendingSaveCount > 0 ? `전체 일괄 저장 (${pendingSaveCount}건 대기)` : '전체 일괄 저장'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats & Tools */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <span className="text-xs text-slate-400 font-medium block mb-1">전체 대상 부서</span>
          <div className="flex items-baseline gap-2">
            <strong className="text-3xl font-bold text-slate-900">{totalCount}</strong>
            <span className="text-xs text-slate-500">개 부서</span>
          </div>
          <div className="mt-2 text-[15px] text-slate-400">2026 직제 기준</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <span className="text-xs text-emerald-600 font-medium block mb-1">비밀번호 발급 완료</span>
          <div className="flex items-baseline gap-2">
            <strong className="text-3xl font-bold text-emerald-600">{savedCount}</strong>
            <span className="text-xs text-slate-500">개 부서</span>
          </div>
          <div className="mt-2 text-[15px] font-semibold">
            {pendingSaveCount > 0 ? (
              <span className="text-amber-600 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                저장 대기: {pendingSaveCount}개
              </span>
            ) : (
              <span className="text-emerald-700">
                발급률 {totalCount > 0 ? Math.round((savedCount / totalCount) * 100) : 0}%
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <span className="text-xs text-amber-600 font-medium block mb-1">비밀번호 미발급</span>
          <div className="flex items-baseline gap-2">
            <strong className="text-3xl font-bold text-amber-600">{unsetCount}</strong>
            <span className="text-xs text-slate-500">개 부서</span>
          </div>
          <div className="mt-2 text-[15px] text-amber-700">
            {unsetCount > 0 ? '랜덤 생성 권장' : '전 부서 세팅 완료'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-medium block mb-1">명단 내보내기 &amp; 공유</span>
          <div className="flex gap-2">
            <button
              onClick={handleCopyAllList}
              className="flex-1 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition"
              title="전체 명단을 텍스트로 복사"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>명단 복사</span>
            </button>
            <button
              onClick={handleDownloadCSV}
              className="flex-1 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition"
              title="엑셀(CSV) 다운로드"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV 저장</span>
            </button>
          </div>
          <p className="text-[14px] text-slate-400 mt-2">
            * 각 부서 담당자에게 안전하게 개별 전달하세요.
          </p>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search & Actions Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="부서명, 본부, 처/실/단 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkRandomizeAll}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition"
              title="모든 부서의 비밀번호를 4자리 난수로 일괄 재발급합니다."
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>전체 4자리 랜덤 재발급</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[15px]">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 w-40">본부 / 부문</th>
                <th className="py-3 px-4 w-40">처 / 실 / 단</th>
                <th className="py-3 px-4">담당 부서명</th>
                <th className="py-3 px-4 w-28 text-center">발급 상태</th>
                <th className="py-3 px-4 w-60">접속 비밀번호 (4자리)</th>
                <th className="py-3 px-4 w-44 text-right">설정 액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    부서 비밀번호 목록을 불러오는 중...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    일치하는 부서가 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((d, index) => {
                  const savedPass = d.password || '';
                  const currentInput = inputPasswords[d.department] || '';
                  const isVisible = showPasswords[d.department] || false;
                  const isSaving = savingDept === d.department;
                  const isCopied = copiedDept === d.department;
                  const isSaved = Boolean(savedPass);
                  const isModified = currentInput !== savedPass;

                  return (
                    <tr key={d.department} className={`transition ${isModified ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/80'}`}>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                        {index + 1}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {d.division}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {d.office || '-'}
                      </td>

                      <td className="py-3.5 px-4">
                        <strong className="text-slate-900 font-bold text-sm block">
                          {d.department}
                        </strong>
                        <span className="text-[14px] text-slate-400">{d.name}</span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isModified && currentInput ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[15px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            저장대기 (생성됨)
                          </span>
                        ) : isSaved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[15px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3" />
                            발급완료
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[15px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            <AlertCircle className="w-3 h-3 text-slate-400" />
                            미발급
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 max-w-xs">
                          <div className="relative flex-1">
                            <input
                              type={isVisible ? 'text' : 'password'}
                              maxLength={10}
                              placeholder="4자리 숫자"
                              value={currentInput}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInputPasswords(prev => ({ ...prev, [d.department]: val }));
                              }}
                              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-sm tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, [d.department]: !isVisible }))}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              title={isVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
                            >
                              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopySingle(d.department, currentInput)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            title="비밀번호 복사"
                          >
                            {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRandomizeSingle(d.department)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[15px] font-semibold flex items-center gap-1 transition"
                            title="4자리 랜덤 숫자 생성"
                          >
                            <Dices className="w-3.5 h-3.5 text-amber-600" />
                            <span>4자리 Random</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSaveSingle(d.department)}
                            disabled={isSaving}
                            className={`px-3 py-1.5 rounded-lg text-[15px] font-semibold flex items-center gap-1 transition disabled:opacity-50 ${
                              isModified
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/30'
                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{isSaving ? '저장...' : isModified ? '저장 필요' : '저장'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
