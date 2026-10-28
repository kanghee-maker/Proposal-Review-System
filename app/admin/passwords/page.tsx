'use client';
import React, { useEffect, useState } from 'react';

interface Department { department: string; division: string; office: string; hasPassword: boolean }
export default function AdminPasswordsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [drafts, setDrafts] = useState<Record<string,string>>({});
  const [issued, setIssued] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  async function load() {
    const response = await fetch('/api/admin/passwords', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '목록을 불러올 수 없습니다.');
    setDepartments(data.departments);
  }
  useEffect(() => { load().catch(e => setMessage(e.message)); }, []);
  function generate() {
    const bytes = new Uint32Array(1); crypto.getRandomValues(bytes);
    return String(10000000 + (bytes[0] % 90000000));
  }
  async function save(changes: Record<string,string>) {
    if (!Object.keys(changes).length) { setMessage('변경한 비밀번호가 없습니다.'); return; }
    if (Object.values(changes).some(v => v && v.trim().length < 4)) { setMessage('비밀번호는 4자 이상 입력해주세요.'); return; }
    if (Object.values(changes).some(v => !v.trim()) && !confirm('선택한 부서의 비밀번호 발급을 취소할까요? 해당 부서는 새 비밀번호를 발급할 때까지 로그인할 수 없습니다.')) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/passwords', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({passwords:changes}) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || '저장에 실패했습니다.');
      setIssued(prev => ({...prev,...changes}));
      setDrafts(prev => Object.fromEntries(Object.entries(prev).filter(([key]) => !(key in changes))));
      await load(); setMessage('저장했습니다. 새로 발급한 비밀번호는 이 화면을 떠나기 전에 복사해 전달하세요.');
    } catch(e: any) { setMessage(e.message); } finally { setSaving(false); }
  }
  return <section className="space-y-5">
    <h1 className="text-xl font-bold">부서 비밀번호 관리</h1>
    <p className="text-sm text-slate-600">기존 비밀번호는 조회하지 않습니다. 현재 발급된 비밀번호는 그대로 사용할 수 있습니다. 입력하지 않은 부서는 변경되지 않습니다.</p>
    <p className="text-sm text-slate-600">새로 발급한 비밀번호는 저장 직후 이 화면에서만 확인할 수 있습니다. 부서 담당자에게 개별 전달하세요.</p>
    {message && <p role="status" className="p-3 rounded bg-blue-50">{message}</p>}
    <div className="flex gap-3 flex-wrap">
      <input aria-label="부서 검색" placeholder="부서 검색" value={search} onChange={e=>setSearch(e.target.value)} className="border rounded p-2" />
      <button disabled={saving} className="border rounded p-2" onClick={()=>{
        const changes: Record<string,string>={};departments.filter(d=>!d.hasPassword).forEach(d=>changes[d.department]=generate());
        setDrafts(prev=>({...prev,...changes}));
      }}>미발급 부서 번호 생성</button>
      <button disabled={saving} className="bg-blue-700 text-white rounded p-2 disabled:opacity-50" onClick={()=>save(drafts)}>변경한 부서 일괄 저장</button>
    </div>
    <div className="overflow-x-auto"><table className="w-full text-sm bg-white border">
      <thead><tr><th className="p-3 text-left">부서</th><th>발급 상태</th><th>새 비밀번호</th><th>작업</th></tr></thead>
      <tbody>{departments.filter(d=>d.department.includes(search)||d.office.includes(search)).map(d=><tr key={d.department} className="border-t">
        <td className="p-3">{d.office} / {d.department}</td><td className="p-3 text-center">{d.hasPassword?'발급완료':'미발급'}</td>
        <td className="p-3"><input aria-label={`${d.department} 새 비밀번호`} type="password" autoComplete="new-password" maxLength={128} value={drafts[d.department] || ''} onChange={e=>setDrafts(prev=>({...prev,[d.department]:e.target.value}))} placeholder="공란 유지 시 변경 안 함" className="border rounded p-2 w-full" />
          {issued[d.department] && <div className="mt-2"><span>이번 발급: <code>{issued[d.department]}</code></span> <button onClick={()=>navigator.clipboard.writeText(issued[d.department])}>복사</button></div>}
        </td>
        <td className="p-3 whitespace-nowrap"><button disabled={saving} className="border rounded p-2 mr-2" onClick={()=>setDrafts(prev=>({...prev,[d.department]:generate()}))}>번호 생성</button>
          <button disabled={saving || !(d.department in drafts)} className="border rounded p-2 disabled:opacity-40" onClick={()=>save({[d.department]:drafts[d.department]})}>저장</button>
          <button disabled={saving} className="border rounded p-2 ml-2 text-red-700" onClick={()=>save({[d.department]:''})}>발급 취소</button>
        </td></tr>)}</tbody>
    </table></div>
  </section>;
}
