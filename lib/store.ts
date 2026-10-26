import fs from 'fs';
import path from 'path';
import { OrganizationChart, EvaluationSession, Proposal, ProposalAttachment, Evaluation, EvaluationCriteria, Department, CommitteeJudge, CommitteeScore, EvaluationStage } from './types';
import { supabase } from './supabaseClient';

const DATA_DIR = path.join(process.cwd(), 'data');

function readJson<T>(filename: string, fallback: T): T {
  try {
    const fullPath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(fullPath)) return fallback;
    const content = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return fallback;
  }
}

function writeJson<T>(filename: string, data: T): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const fullPath = path.join(DATA_DIR, filename);
    const content = JSON.stringify(data, null, 2);
    try {
      fs.writeFileSync(fullPath, content, 'utf8');
    } catch (writeErr) {
      // Retry once for Windows file locks
      try {
        const tempPath = `${fullPath}.${Date.now()}.tmp`;
        fs.writeFileSync(tempPath, content, 'utf8');
        fs.copyFileSync(tempPath, fullPath);
        fs.unlinkSync(tempPath);
      } catch (retryErr) {
        console.error(`Error retry writing ${filename}:`, retryErr);
      }
    }
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
  }
}

// 1. 조직도 관리
export async function getOrganizationChartAsync(): Promise<OrganizationChart> {
  const localChart = getOrganizationChart();
  const orderMap = new Map<string, number>();
  localChart.departments.forEach((d, idx) => {
    orderMap.set(d.code, idx);
    orderMap.set(d.department, idx);
  });

  const getRank = (d: { code?: string; department?: string }) => {
    if (d.department === '안전총괄단' || d.code === 'SAFETY') return 9999;
    if (d.department === '청렴감사단' || d.code === 'AUDIT') return 9998;
    if (d.code && orderMap.has(d.code)) return orderMap.get(d.code)!;
    if (d.department && orderMap.has(d.department)) return orderMap.get(d.department)!;
    return 5000;
  };

  try {
    const { data: chartData } = await supabase.from('organization_charts').select('*').eq('id', 'org-2026').single();
    const { data: deptData } = await supabase.from('departments').select('*');
    if (deptData && deptData.length > 0) {
      const sortedDepts = deptData
        .map(d => ({
          code: d.code,
          division: d.division,
          office: d.office,
          department: d.department,
          name: d.name,
          head_title: d.head_title
        }))
        .sort((a, b) => getRank(a) - getRank(b));

      return {
        name: chartData?.name || '2026_조직도',
        version: chartData?.version || '2026-v1.0',
        updated_at: chartData?.updated_at || new Date().toISOString(),
        description: chartData?.description || '과천도시공사 2026 조직도',
        departments: sortedDepts
      };
    }
  } catch (err) {
    // Supabase fallback to local
  }
  return {
    ...localChart,
    departments: [...localChart.departments].sort((a, b) => getRank(a) - getRank(b))
  };
}

export function getOrganizationChart(): OrganizationChart {
  return readJson<OrganizationChart>('organization_2026.json', {
    name: '2026_조직도',
    version: '2026-v1.0',
    updated_at: new Date().toISOString(),
    description: '과천도시공사 2026 조직도',
    departments: []
  });
}

export async function updateOrganizationChartAsync(chart: OrganizationChart): Promise<void> {
  chart.updated_at = new Date().toISOString();
  try {
    await supabase.from('organization_charts').upsert({
      id: 'org-2026',
      name: chart.name,
      version: chart.version,
      description: chart.description,
      updated_at: chart.updated_at
    });
    if (chart.departments && chart.departments.length > 0) {
      await supabase.from('departments').upsert(chart.departments.map(d => ({
        code: d.code,
        org_id: 'org-2026',
        division: d.division,
        office: d.office,
        department: d.department,
        name: d.name,
        head_title: d.head_title
      })));
    }
  } catch (err) {
    // ignore
  }
  writeJson('organization_2026.json', chart);
}

export function updateOrganizationChart(chart: OrganizationChart): void {
  updateOrganizationChartAsync(chart);
}

// 2. 기본 평가 항목
export function getDefaultCriteria(): EvaluationCriteria[] {
  return readJson<EvaluationCriteria[]>('default_evaluation_criteria.json', [
    {
      id: 'crit-result',
      key: 'result',
      label: '부서 검토 결과 (수용 여부)',
      type: 'RADIO',
      options: ['Yes', 'No'],
      required: true,
      display_order: 1,
      description: '해당 제안에 대한 부서 차원의 채택/수용 여부를 선택합니다.'
    },
    {
      id: 'crit-opinion',
      key: 'opinion',
      label: '부서 검토 의견 (Opinion)',
      type: 'TEXTAREA',
      options: [],
      required: true,
      display_order: 2,
      description: '선택 사유, 추진 가능 여부, 예산 및 일정 등 구체적 검토 의견을 기술합니다.'
    }
  ]);
}

// 2-2. 1차 심사위원 기본 목록 (과천도시공사 1차 심사위원단 11명)
export const DEFAULT_STAGE1_JUDGES: CommitteeJudge[] = [
  { id: 'j-1', name: '박민호', dept: '경영감사실', title: '제안1차심사자' },
  { id: 'j-2', name: '유경모', dept: '미래전략실', title: '제안1차심사자' },
  { id: 'j-3', name: '배규한', dept: '교육시설부', title: '제안1차심사자' },
  { id: 'j-4', name: '곽현석', dept: '시설기획부', title: '제안1차심사자' },
  { id: 'j-5', name: '김동수', dept: '시설기획부', title: '제안1차심사자' },
  { id: 'j-6', name: '이정문', dept: '시설기획부', title: '제안1차심사자' },
  { id: 'j-7', name: '박종원', dept: '사업기획부', title: '제안1차심사자' },
  { id: 'j-8', name: '김수호', dept: '개발1부', title: '제안1차심사자' },
  { id: 'j-9', name: '최종순', dept: '여가체육부', title: '제안1차심사자' },
  { id: 'j-10', name: '이기범', dept: '솔빛정원부', title: '제안1차심사자' },
  { id: 'j-11', name: '오세풍', dept: '안전총괄단', title: '제안1차심사자' }
];

export function getDefaultStage1Criteria(): EvaluationCriteria[] {
  return [
    {
      id: 'crit-creativity',
      key: 'creativity',
      label: '창의성 (25점)',
      type: 'NUMBER',
      required: true,
      display_order: 1,
      description: '독창성 및 기존 관행 개선 정도'
    },
    {
      id: 'crit-feasibility',
      key: 'feasibility',
      label: '실현성 (25점)',
      type: 'NUMBER',
      required: true,
      display_order: 2,
      description: '기술적·행정적 실행 가능성 및 예산 적정성'
    },
    {
      id: 'crit-effectiveness',
      key: 'effectiveness',
      label: '효과성 (25점)',
      type: 'NUMBER',
      required: true,
      display_order: 3,
      description: '예산 절감, 업무 능률 및 시민 만족도 증진 효과'
    },
    {
      id: 'crit-dissemination',
      key: 'dissemination',
      label: '전파성 (25점)',
      type: 'NUMBER',
      required: true,
      display_order: 4,
      description: '타 부서 또는 전사적 확산 가능성 및 파급 효과'
    }
  ];
}

// 3. 제안평가 건 (Sessions)
const DEFAULT_SESSION_ID = 'session-2026-gwacheon';

function isSystemInitialized(): boolean {
  return readJson<{ initialized: boolean }>('system_initialized.json', { initialized: false }).initialized;
}

function markSystemInitialized(): void {
  writeJson('system_initialized.json', { initialized: true });
}

export async function getSessionsAsync(): Promise<EvaluationSession[]> {
  const localSessions = getSessions();
  try {
    const { data, error } = await supabase.from('evaluation_sessions').select('*');
    if (!error && Array.isArray(data)) {
      if (data.length > 0 || isSystemInitialized()) {
        markSystemInitialized();
        const localMap = new Map(localSessions.map(s => [s.id, s]));
        const synced: EvaluationSession[] = data.map(s => {
          const local = localMap.get(s.id);
          const isStage1 =
            local?.stage === 'STAGE_1' ||
            s.stage === 'STAGE_1' ||
            String(s.id).startsWith('session-stage1-') ||
            (Array.isArray(s.criteria) && s.criteria.some((c: any) => c.key === 'creativity'));
          const stage: 'STAGE_0' | 'STAGE_1' = isStage1 ? 'STAGE_1' : 'STAGE_0';
          return {
            id: s.id,
            title: s.title,
            year: s.year,
            description: s.description,
            stage,
            source_session_id: local?.source_session_id || s.source_session_id,
            judges: local?.judges || s.judges || (stage === 'STAGE_1' ? DEFAULT_STAGE1_JUDGES : undefined),
            status: s.status,
            created_at: s.created_at,
            proposals_count: s.proposals_count ?? local?.proposals_count ?? 0,
            criteria: s.criteria || local?.criteria || (stage === 'STAGE_1' ? getDefaultStage1Criteria() : getDefaultCriteria())
          };
        });
        writeJson('sessions.json', synced);
        return synced;
      }
    }
  } catch (err) {
    // fallback
  }
  return localSessions;
}

export function getSessions(): EvaluationSession[] {
  let sessions = readJson<EvaluationSession[]>('sessions.json', []);
  // 시스템이 최초 실행된 적이 없고 sessions.json도 완전히 비어있는 최초 1회만 기본 회차 생성
  if (!isSystemInitialized() && sessions.length === 0) {
    const rawProposals = readJson<any[]>('proposals_2026_structured.json', []);
    const defaultSession: EvaluationSession = {
      id: DEFAULT_SESSION_ID,
      title: '2026년 상반기 과천도시공사 제안 심사 (0차 부서평가)',
      year: '2026',
      stage: 'STAGE_0',
      description: '과천도시공사 전 부서 대상 제안평가 0차 부서 타당성 심사 및 검토의견 수렴',
      status: 'ACTIVE',
      created_at: '2026-07-28T09:00:00Z',
      proposals_count: rawProposals.length,
      criteria: getDefaultCriteria()
    };
    sessions = [defaultSession];
    writeJson('sessions.json', sessions);
    markSystemInitialized();
  }
  return sessions;
}

export async function saveSessionAsync(session: EvaluationSession): Promise<void> {
  if (!session.stage) session.stage = 'STAGE_0';
  if (session.stage === 'STAGE_1' && (!session.judges || session.judges.length === 0)) {
    session.judges = DEFAULT_STAGE1_JUDGES;
  }
  saveSession(session);
  try {
    await supabase.from('evaluation_sessions').upsert({
      id: session.id,
      title: session.title,
      year: session.year,
      description: session.description,
      status: session.status,
      proposals_count: session.proposals_count,
      criteria: session.criteria,
      created_at: session.created_at
    });
  } catch (err) {}
}

export async function updateSessionAsync(sessionData: Partial<EvaluationSession> & { id: string }): Promise<EvaluationSession | null> {
  const sessions = await getSessionsAsync();
  const existing = sessions.find(s => s.id === sessionData.id);
  if (!existing) return null;

  const updated: EvaluationSession = {
    ...existing,
    ...sessionData
  };

  saveSession(updated);

  try {
    await supabase.from('evaluation_sessions').update({
      title: updated.title,
      year: updated.year,
      description: updated.description,
      status: updated.status,
      proposals_count: updated.proposals_count,
      criteria: updated.criteria
    }).eq('id', updated.id);
  } catch (err) {
    console.error('Error updating session in Supabase:', err);
  }

  return updated;
}

export function saveSession(session: EvaluationSession): void {
  const sessions = getSessions();
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) sessions[idx] = session;
  else sessions.unshift(session);
  writeJson('sessions.json', sessions);
}

export async function deleteSessionAsync(sessionId: string): Promise<boolean> {
  markSystemInitialized();
  // 1. Supabase delete
  try {
    await supabase.from('committee_scores').delete().eq('session_id', sessionId);
    await supabase.from('evaluations').delete().eq('session_id', sessionId);
    await supabase.from('proposals').delete().eq('session_id', sessionId);
    await supabase.from('evaluation_sessions').delete().eq('id', sessionId);
  } catch (err) {
    console.error('Error deleting session in Supabase:', err);
  }

  // 2. Local JSON store delete
  const sessions = readJson<EvaluationSession[]>('sessions.json', []);
  const updatedSessions = sessions.filter(s => s.id !== sessionId);
  writeJson('sessions.json', updatedSessions);

  const proposals = readJson<Proposal[]>('proposals_store.json', []);
  const updatedProposals = proposals.filter(p => p.session_id !== sessionId);
  writeJson('proposals_store.json', updatedProposals);

  const evals = readJson<Evaluation[]>('evaluations_store.json', []);
  const updatedEvals = evals.filter(e => e.session_id !== sessionId);
  writeJson('evaluations_store.json', updatedEvals);

  const scores = readJson<CommitteeScore[]>('committee_scores_store.json', []);
  const updatedScores = scores.filter(s => s.session_id !== sessionId);
  writeJson('committee_scores_store.json', updatedScores);

  return true;
}

function toSupabaseProposal(p: Proposal) {
  const parts: string[] = [];
  if (p.background) parts.push(`[배경]\n${p.background}`);
  if (p.content) parts.push(p.background ? `[추진내용]\n${p.content}` : p.content);
  if (p.expected_effect) parts.push(`[기대효과]\n${p.expected_effect}`);
  if (p.attachment_note) parts.push(`[첨부 자료(사진, 현황자료 등)]\n${p.attachment_note}`);
  const contentText = parts.join('\n\n');

  return {
    id: p.id,
    session_id: p.session_id,
    seq_no: Number(p.seq_no) || 1,
    board_no: String(p.board_no || ''),
    proposer_name: String(p.proposer_name || ''),
    proposer_rank: String(p.proposer_rank || ''),
    proposer_division: String(p.proposer_division || ''),
    proposer_office: String(p.proposer_office || ''),
    proposer_department: String(p.proposer_department || ''),
    proposer_raw_dept: String(p.proposer_raw_dept || ''),
    proposal_type: String(p.proposal_type || '지정제안'),
    category: String(p.category || '업무개선'),
    assigned_division: String(p.assigned_division || ''),
    assigned_office: String(p.assigned_office || ''),
    assigned_department: String(p.assigned_department || ''),
    assigned_raw_dept: String(p.assigned_raw_dept || ''),
    submitted_at: String(p.submitted_at || ''),
    title: String(p.title || ''),
    content: String(contentText || ''),
    is_duplicate: String(p.is_duplicate || ''),
    duplicate_title: String(p.duplicate_title || ''),
    status: String(p.status || '미평가')
  };
}

// 4. 제안 목록 (Proposals)
export async function seedDefaultProposalsForSessionAsync(sessionId: string): Promise<Proposal[]> {
  const rawProposals = readJson<any[]>('proposals_2026_structured.json', []);
  const attachmentsIndex = await getAttachmentsIndexAsync();
  let indexChanged = false;

  const proposals: Proposal[] = rawProposals.map((item, index) => {
    const id = sessionId === DEFAULT_SESSION_ID ? `prop-${item.no || index + 1}` : `${sessionId}-prop-${item.no || index + 1}`;
    const defaultAtts: ProposalAttachment[] = Array.isArray(item.default_attachments)
      ? item.default_attachments.map((att: any, attIdx: number) => ({
          id: `${id}-att-default-${attIdx + 1}`,
          proposal_id: id,
          name: att.name,
          size: att.size,
          type: att.type,
          uploaded_at: att.uploaded_at || new Date().toISOString(),
          static_url: att.static_url
        }))
      : [];

    if (defaultAtts.length > 0 && (!attachmentsIndex[id] || attachmentsIndex[id].length === 0)) {
      attachmentsIndex[id] = defaultAtts;
      indexChanged = true;
    }

    return {
      id,
      session_id: sessionId,
      seq_no: item.no,
      board_no: item.board_no || '',
      proposer_name: item.proposer || '',
      proposer_rank: item.proposer_rank || '',
      proposer_division: item.proposer_division || '',
      proposer_office: item.proposer_office || '',
      proposer_department: item.proposer_department || '',
      proposer_raw_dept: item.proposer_raw_dept || '',
      proposal_type: item.proposal_type || '지정제안',
      category: item.category || '업무개선',
      assigned_division: item.assigned_division || '',
      assigned_office: item.assigned_office || '',
      assigned_department: item.assigned_department || '',
      assigned_raw_dept: item.assigned_raw_dept || '',
      submitted_at: item.submitted_at || '',
      title: item.title || '',
      background: item.background || '',
      content: item.content || '',
      expected_effect: item.expected_effect || '',
      attachment_note: item.attachment_note || '',
      extra_sheets: item.extra_sheets,
      attachments: attachmentsIndex[id] || defaultAtts,
      is_duplicate: item.is_duplicate || '',
      duplicate_title: item.duplicate_title || '',
      status: '미평가' as const
    };
  });

  if (indexChanged) {
    await saveAttachmentsIndexAsync(attachmentsIndex);
  }

  // Local store sync
  let currentStore = readJson<Proposal[]>('proposals_store.json', []);
  currentStore = currentStore.filter(p => p.session_id !== sessionId);
  currentStore.push(...proposals);
  writeJson('proposals_store.json', currentStore);

  // Supabase sync in chunks
  try {
    for (let i = 0; i < proposals.length; i += 50) {
      const chunk = proposals.slice(i, i + 50).map(toSupabaseProposal);
      const res = await supabase.from('proposals').upsert(chunk);
      if (res.error) {
        console.error('Error seeding proposals chunk to Supabase:', res.error);
      }
    }
  } catch (err) {
    console.error('Error seeding proposals to Supabase:', err);
  }

  return proposals;
}

function lookupDepartmentOrg(deptName: any): { division: string; office: string; department: string } {
  if (!deptName) return { division: '', office: '', department: '' };
  const dStr = String(deptName).trim();
  const org = readJson<{ departments: Department[] }>('organization_2026.json', { departments: [] });
  const found = org.departments?.find(d => 
    d.department === dStr || 
    d.name === dStr || 
    dStr.includes(d.department) ||
    (d.office && dStr.includes(d.office))
  );
  if (found) {
    return {
      division: found.division,
      office: found.office,
      department: found.department
    };
  }
  return { division: '', office: '', department: dStr };
}

function getExcelCol(item: Record<string, any>, exactKeys: string[], prefixPatterns: string[] = []): string {
  if (!item || typeof item !== 'object') return '';
  for (const k of exactKeys) {
    if (item[k] !== undefined && item[k] !== null && String(item[k]).trim() !== '') {
      return String(item[k]).trim();
    }
  }
  const keys = Object.keys(item);
  for (const pat of prefixPatterns) {
    const normPat = pat.replace(/\s+/g, '');
    const foundKey = keys.find(k => k.replace(/\s+/g, '').startsWith(normPat));
    if (foundKey && item[foundKey] !== undefined && item[foundKey] !== null && String(item[foundKey]).trim() !== '') {
      return String(item[foundKey]).trim();
    }
  }
  return '';
}

export async function saveCustomProposalsForSessionAsync(
  sessionId: string,
  rawList: any[]
): Promise<Proposal[]> {
  const proposals: Proposal[] = rawList.map((item, index) => {
    const seq = Number(item.seq_no ?? item['연번'] ?? item['순번'] ?? (index + 1));
    const id = `${sessionId}-prop-${seq || (index + 1)}`;

    // Resolve proposer org
    let pDivision = getExcelCol(
      item,
      ['proposer_division', '제안자_본부/부문', '제안자_본부/부문 (Division)', '제안자_본부', '제안자본부'],
      ['제안자_본부']
    );
    let pOffice = getExcelCol(
      item,
      ['proposer_office', '제안자_처/실/단', '제안자_처/실/단 (Office)', '제안자_처실단', '제안자처'],
      ['제안자_처']
    );
    let pDept = getExcelCol(
      item,
      ['proposer_department', '제안자_부', '제안자_부 (Department)', '제안자_부서', '제안자부', '소속부서', '소속'],
      ['제안자_부(', '제안자_부 ']
    );
    if ((!pDivision || !pOffice) && pDept) {
      const resolved = lookupDepartmentOrg(pDept);
      if (!pDivision) pDivision = resolved.division;
      if (!pOffice) pOffice = resolved.office;
    }

    // Resolve assigned (execution) org
    let aDivision = getExcelCol(
      item,
      ['assigned_division', '실행(평가)_본부/부문', '실행(평가)_본부/부문 (Division)', '실행_본부/부문', '실행본부', '평가본부'],
      ['실행(평가)_본부', '실행_본부']
    );
    let aOffice = getExcelCol(
      item,
      ['assigned_office', '실행(평가)_처/실/단', '실행(평가)_처/실/단 (Office)', '실행_처/실/단', '실행처', '평가처'],
      ['실행(평가)_처', '실행_처']
    );
    let aDept = getExcelCol(
      item,
      ['assigned_department', '실행(평가)_부', '실행(평가)_부 (Department)', '실행_부', '실행부서', '담당부서', '평가부서', '부서'],
      ['실행(평가)_부(', '실행(평가)_부 ', '실행_부']
    );
    if ((!aDivision || !aOffice) && aDept) {
      const resolved = lookupDepartmentOrg(aDept);
      if (!aDivision) aDivision = resolved.division;
      if (!aOffice) aOffice = resolved.office;
    }

    return {
      id,
      session_id: sessionId,
      seq_no: seq,
      board_no: String(item.board_no ?? item['게시판번호'] ?? item['글번호'] ?? ''),
      proposer_name: getExcelCol(item, ['proposer_name', '제안자', '제안자명', '성명', '이름']),
      proposer_rank: getExcelCol(item, ['proposer_rank', '직급', '직책']),
      proposer_division: pDivision,
      proposer_office: pOffice,
      proposer_department: pDept,
      proposer_raw_dept: getExcelCol(item, ['proposer_raw_dept', '제안자_원소속부서', '제안자_기존소속표기'], ['제안자_기존', '제안자_원소속']) || pDept,
      proposal_type: getExcelCol(item, ['proposal_type', '제안구분', '구분']) || '지정제안',
      category: getExcelCol(item, ['category', '분야', '제안분야']) || '업무개선',
      assigned_division: aDivision,
      assigned_office: aOffice,
      assigned_department: aDept,
      assigned_raw_dept: getExcelCol(item, ['assigned_raw_dept', '실행_원부서명', '실행(평가)_기존부서표기'], ['실행(평가)_기존', '실행_원부서']) || aDept,
      submitted_at: getExcelCol(item, ['submitted_at', '접수일자', '등록일자']) || new Date().toISOString().split('T')[0],
      title: getExcelCol(item, ['title', '제안제목', '제목']) || `제안 ${seq}`,
      content: getExcelCol(item, ['content', '제안내용', '내용']),
      expected_effect: getExcelCol(item, ['expected_effect', '기대효과']),
      is_duplicate: getExcelCol(item, ['is_duplicate', '중복제안여부', '중복제안 여부', '중복여부'], ['중복제안여부', '중복여부']),
      duplicate_title: getExcelCol(item, ['duplicate_title', '중복제안제목', '중복제안 제목', '중복제목'], ['중복제안제목', '중복제목']),
      status: '미평가' as const,
      contribution_rate: 100
    };
  });

  // 1. Local store sync
  let currentStore = readJson<Proposal[]>('proposals_store.json', []);
  currentStore = currentStore.filter(p => p.session_id !== sessionId);
  currentStore.push(...proposals);
  writeJson('proposals_store.json', currentStore);

  // 2. Supabase sync: clear any old proposals for this session first, then insert in chunks
  try {
    await supabase.from('proposals').delete().eq('session_id', sessionId);
    for (let i = 0; i < proposals.length; i += 50) {
      const chunk = proposals.slice(i, i + 50).map(toSupabaseProposal);
      const res = await supabase.from('proposals').upsert(chunk);
      if (res.error) {
        console.error('Error upserting custom proposals to Supabase:', res.error);
      }
    }
  } catch (err) {
    console.error('Error saving custom proposals to Supabase:', err);
  }

  return proposals;
}

const ATTACHMENTS_INDEX_ID = 'proposal_attachments_index';

export async function getAttachmentsIndexAsync(): Promise<Record<string, ProposalAttachment[]>> {
  const localIndex = readJson<Record<string, ProposalAttachment[]>>('proposal_attachments_index.json', {});
  try {
    const { data, error } = await supabase
      .from('organization_charts')
      .select('description')
      .eq('id', ATTACHMENTS_INDEX_ID)
      .single();
    if (!error && data?.description) {
      const parsed = JSON.parse(data.description);
      if (parsed && typeof parsed === 'object') {
        writeJson('proposal_attachments_index.json', parsed);
        return parsed;
      }
    }
  } catch (err) {}
  return localIndex;
}

async function saveAttachmentsIndexAsync(indexMap: Record<string, ProposalAttachment[]>): Promise<void> {
  writeJson('proposal_attachments_index.json', indexMap);
  try {
    await supabase.from('organization_charts').upsert({
      id: ATTACHMENTS_INDEX_ID,
      name: 'PROPOSAL_ATTACHMENTS_INDEX',
      version: '2026-v1.0',
      description: JSON.stringify(indexMap),
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error saving attachments index to Supabase:', err);
  }
}

export async function addProposalAttachmentAsync(
  proposalId: string,
  fileData: { name: string; size: number; type: string; data_url: string }
): Promise<{ attachment: ProposalAttachment; list: ProposalAttachment[] }> {
  const attachmentId = `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const uploadedAt = new Date().toISOString();

  const meta: ProposalAttachment = {
    id: attachmentId,
    proposal_id: proposalId,
    name: fileData.name,
    size: fileData.size,
    type: fileData.type || 'application/octet-stream',
    uploaded_at: uploadedAt
  };

  const fullPayload: ProposalAttachment = {
    ...meta,
    data_url: fileData.data_url
  };

  // 1. Save full file payload locally & in Supabase
  const localFiles = readJson<Record<string, ProposalAttachment>>('proposal_attachments_files.json', {});
  localFiles[attachmentId] = fullPayload;
  writeJson('proposal_attachments_files.json', localFiles);

  try {
    await supabase.from('organization_charts').upsert({
      id: `attachment_file_${attachmentId}`,
      name: fileData.name,
      version: fileData.type || 'application/octet-stream',
      description: JSON.stringify(fullPayload),
      updated_at: uploadedAt
    });
  } catch (err) {
    console.error('Error saving attachment file to Supabase:', err);
  }

  // 2. Update attachments index
  const indexMap = await getAttachmentsIndexAsync();
  const currentList = Array.isArray(indexMap[proposalId]) ? indexMap[proposalId] : [];
  const nextList = [...currentList, meta];
  indexMap[proposalId] = nextList;
  await saveAttachmentsIndexAsync(indexMap);

  return { attachment: meta, list: nextList };
}

export async function deleteProposalAttachmentAsync(
  proposalId: string,
  attachmentId: string
): Promise<ProposalAttachment[]> {
  // 1. Remove from index
  const indexMap = await getAttachmentsIndexAsync();
  const currentList = Array.isArray(indexMap[proposalId]) ? indexMap[proposalId] : [];
  const nextList = currentList.filter(a => a.id !== attachmentId);
  indexMap[proposalId] = nextList;
  await saveAttachmentsIndexAsync(indexMap);

  // 2. Remove file payload locally & in Supabase
  const localFiles = readJson<Record<string, ProposalAttachment>>('proposal_attachments_files.json', {});
  delete localFiles[attachmentId];
  writeJson('proposal_attachments_files.json', localFiles);

  try {
    await supabase.from('organization_charts').delete().eq('id', `attachment_file_${attachmentId}`);
  } catch (err) {}

  return nextList;
}

export async function getAttachmentFileAsync(attachmentId: string): Promise<ProposalAttachment | null> {
  // 1. Check attachments index for static_url first
  const indexMap = await getAttachmentsIndexAsync();
  for (const list of Object.values(indexMap)) {
    if (Array.isArray(list)) {
      const found = list.find(a => a.id === attachmentId);
      if (found && found.static_url) {
        return found;
      }
    }
  }

  // 2. Check default_attachments in proposals_2026_structured.json by matching suffix or id
  const rawProposals = readJson<any[]>('proposals_2026_structured.json', []);
  for (const item of rawProposals) {
    if (Array.isArray(item.default_attachments)) {
      const m = attachmentId.match(/-prop-(\d+)-att-default-(\d+)$/) || attachmentId.match(/^prop-(\d+)-att-default-(\d+)$/);
      if (m && Number(m[1]) === Number(item.no)) {
        const attIdx = Number(m[2]) - 1;
        const rawAtt = item.default_attachments[attIdx];
        if (rawAtt) {
          return {
            id: attachmentId,
            proposal_id: attachmentId.replace(/-att-default-\d+$/, ''),
            name: rawAtt.name,
            size: rawAtt.size,
            type: rawAtt.type,
            uploaded_at: rawAtt.uploaded_at || new Date().toISOString(),
            static_url: rawAtt.static_url
          };
        }
      }
    }
  }

  try {
    const { data, error } = await supabase
      .from('organization_charts')
      .select('description')
      .eq('id', `attachment_file_${attachmentId}`)
      .single();
    if (!error && data?.description) {
      return JSON.parse(data.description);
    }
  } catch (err) {}

  const localFiles = readJson<Record<string, ProposalAttachment>>('proposal_attachments_files.json', {});
  return localFiles[attachmentId] || null;
}

export async function getProposalsAsync(sessionId?: string): Promise<Proposal[]> {
  const localList = getProposals(sessionId);
  const localMap = new Map(localList.map(p => [p.id, p]));
  const attachmentsIndex = await getAttachmentsIndexAsync();
  const rawProposals = readJson<any[]>('proposals_2026_structured.json', []);
  const rawByNoAndTitle = new Map<string, any>();
  rawProposals.forEach(item => {
    rawByNoAndTitle.set(`${item.no}::${item.title}`, item);
  });

  try {
    let query = supabase.from('proposals').select('*').order('seq_no', { ascending: true });
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }
    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(p => {
        const local = localMap.get(p.id);
        const rawMatch = rawByNoAndTitle.get(`${p.seq_no}::${p.title}`);
        const fallbackDefaultAtts: ProposalAttachment[] =
          rawMatch && Array.isArray(rawMatch.default_attachments)
            ? rawMatch.default_attachments.map((att: any, attIdx: number) => ({
                id: `${p.id}-att-default-${attIdx + 1}`,
                proposal_id: p.id,
                name: att.name,
                size: att.size,
                type: att.type,
                uploaded_at: att.uploaded_at || new Date().toISOString(),
                static_url: att.static_url
              }))
            : [];

        return {
          id: p.id,
          session_id: p.session_id,
          seq_no: p.seq_no,
          board_no: p.board_no,
          proposer_name: p.proposer_name,
          proposer_rank: p.proposer_rank,
          proposer_division: p.proposer_division,
          proposer_office: p.proposer_office,
          proposer_department: p.proposer_department,
          proposer_raw_dept: p.proposer_raw_dept,
          proposal_type: p.proposal_type,
          category: p.category,
          assigned_division: p.assigned_division,
          assigned_office: p.assigned_office,
          assigned_department: p.assigned_department,
          assigned_raw_dept: p.assigned_raw_dept,
          submitted_at: p.submitted_at,
          title: p.title,
          background: local?.background || rawMatch?.background || '',
          content: local?.content || rawMatch?.content || p.content || '',
          expected_effect: local?.expected_effect || rawMatch?.expected_effect || '',
          attachment_note: local?.attachment_note || rawMatch?.attachment_note || '',
          extra_sheets: local?.extra_sheets || rawMatch?.extra_sheets,
          is_duplicate: p.is_duplicate,
          duplicate_title: p.duplicate_title,
          status: p.status,
          attachments: attachmentsIndex[p.id] || local?.attachments || fallbackDefaultAtts,
          transfer_requested: p.transfer_requested ?? local?.transfer_requested,
          transfer_target_dept: p.transfer_target_dept ?? local?.transfer_target_dept,
          transfer_reason: p.transfer_reason ?? local?.transfer_reason,
          transfer_requested_at: p.transfer_requested_at ?? local?.transfer_requested_at,
          transfer_status: p.transfer_status ?? local?.transfer_status,
          stage0_result: p.stage0_result ?? local?.stage0_result,
          stage0_opinion: p.stage0_opinion ?? local?.stage0_opinion,
          stage0_dept: p.stage0_dept ?? local?.stage0_dept,
          contribution_rate: p.contribution_rate ?? local?.contribution_rate ?? 100,
          stage1_is_closed: p.stage1_is_closed ?? local?.stage1_is_closed ?? false,
          stage1_decision: p.stage1_decision || local?.stage1_decision || '미결',
          stage1_avg_score: p.stage1_avg_score ?? local?.stage1_avg_score,
          stage1_review_date: p.stage1_review_date ?? local?.stage1_review_date
        };
      });
    }
  } catch (err) {}

  return localList.map(p => ({
    ...p,
    attachments: attachmentsIndex[p.id] || p.attachments || []
  }));
}

export function getProposals(sessionId?: string): Proposal[] {
  let proposals = readJson<Proposal[]>('proposals_store.json', []);
  const localIndex = readJson<Record<string, ProposalAttachment[]>>('proposal_attachments_index.json', {});
  const rawProposals = readJson<any[]>('proposals_2026_structured.json', []);
  const rawByNoAndTitle = new Map<string, any>();
  rawProposals.forEach(item => {
    rawByNoAndTitle.set(`${item.no}::${item.title}`, item);
  });

  if (!isSystemInitialized() && proposals.length === 0) {
    const evaluations = getEvaluations(DEFAULT_SESSION_ID);
    const evalMap = new Map(evaluations.map(e => [e.proposal_id, e]));

    proposals = rawProposals.map((item, index) => {
      const id = `prop-${item.no || index + 1}`;
      const ev = evalMap.get(id);
      let status: '미평가' | '평가작성중' | '평가완료' = '미평가';
      if (ev) {
        status = ev.is_submitted ? '평가완료' : '평가작성중';
      }

      return {
        id,
        session_id: DEFAULT_SESSION_ID,
        seq_no: item.no,
        board_no: item.board_no || '',
        proposer_name: item.proposer || '',
        proposer_rank: item.proposer_rank || '',
        proposer_division: item.proposer_division || '',
        proposer_office: item.proposer_office || '',
        proposer_department: item.proposer_department || '',
        proposer_raw_dept: item.proposer_raw_dept || '',
        proposal_type: item.proposal_type || '지정제안',
        category: item.category || '업무개선',
        assigned_division: item.assigned_division || '',
        assigned_office: item.assigned_office || '',
        assigned_department: item.assigned_department || '',
        assigned_raw_dept: item.assigned_raw_dept || '',
        submitted_at: item.submitted_at || '',
        title: item.title || '',
        background: item.background || '',
        content: item.content || '',
        expected_effect: item.expected_effect || '',
        attachment_note: item.attachment_note || '',
        extra_sheets: item.extra_sheets,
        is_duplicate: item.is_duplicate || '',
        duplicate_title: item.duplicate_title || '',
        status
      };
    });
    writeJson('proposals_store.json', proposals);
  }

  const enriched = proposals.map(p => {
    const rawMatch = rawByNoAndTitle.get(`${p.seq_no}::${p.title}`);
    const fallbackDefaultAtts: ProposalAttachment[] =
      rawMatch && Array.isArray(rawMatch.default_attachments)
        ? rawMatch.default_attachments.map((att: any, attIdx: number) => ({
            id: `${p.id}-att-default-${attIdx + 1}`,
            proposal_id: p.id,
            name: att.name,
            size: att.size,
            type: att.type,
            uploaded_at: att.uploaded_at || new Date().toISOString(),
            static_url: att.static_url
          }))
        : [];
    return {
      ...p,
      background: p.background || rawMatch?.background || '',
      content: p.content || rawMatch?.content || '',
      expected_effect: p.expected_effect || rawMatch?.expected_effect || '',
      attachment_note: p.attachment_note || rawMatch?.attachment_note || '',
      extra_sheets: p.extra_sheets || rawMatch?.extra_sheets,
      attachments: localIndex[p.id] || p.attachments || fallbackDefaultAtts
    };
  });

  if (sessionId) {
    return enriched.filter(p => p.session_id === sessionId);
  }

  return enriched;
}

export async function updateProposalAsync(updated: Proposal): Promise<void> {
  try {
    await supabase.from('proposals').update({
      assigned_division: updated.assigned_division,
      assigned_office: updated.assigned_office,
      assigned_department: updated.assigned_department,
      assigned_raw_dept: updated.assigned_raw_dept,
      status: updated.status,
      title: updated.title,
      content: updated.content,
      is_duplicate: updated.is_duplicate,
      duplicate_title: updated.duplicate_title
    }).eq('id', updated.id);
  } catch (err) {}
  updateProposal(updated);
}

export function updateProposal(updated: Proposal): void {
  const proposals = readJson<Proposal[]>('proposals_store.json', []);
  const idx = proposals.findIndex(p => p.id === updated.id);
  if (idx >= 0) {
    proposals[idx] = updated;
  } else {
    proposals.push(updated);
  }
  writeJson('proposals_store.json', proposals);
}

// 5. 0차 부서평가 결과 (Evaluations)
export async function getEvaluationsAsync(sessionId?: string): Promise<Evaluation[]> {
  try {
    let query = supabase.from('evaluations').select('*');
    if (sessionId) query = query.eq('session_id', sessionId);
    const { data } = await query;
    if (data && data.length > 0) {
      return data.map(e => ({
        id: e.id,
        proposal_id: e.proposal_id,
        session_id: e.session_id,
        department_name: e.department_name,
        evaluator_name: e.evaluator_name,
        answers: e.answers || {},
        is_submitted: e.is_submitted,
        submitted_at: e.submitted_at,
        updated_at: e.updated_at
      }));
    }
  } catch (err) {}
  return getEvaluations(sessionId);
}

export function getEvaluations(sessionId?: string): Evaluation[] {
  let evals = readJson<Evaluation[]>('evaluations_store.json', []);
  if (sessionId) {
    return evals.filter(e => e.session_id === sessionId);
  }
  return evals;
}

export async function saveEvaluationAsync(evaluation: Evaluation): Promise<void> {
  try {
    await supabase.from('evaluations').upsert({
      id: evaluation.id,
      proposal_id: evaluation.proposal_id,
      session_id: evaluation.session_id,
      department_name: evaluation.department_name,
      evaluator_name: evaluation.evaluator_name,
      answers: evaluation.answers,
      is_submitted: evaluation.is_submitted,
      submitted_at: evaluation.submitted_at,
      updated_at: evaluation.updated_at
    });
    // 제안 상태 업데이트
    await supabase.from('proposals').update({
      status: evaluation.is_submitted ? '평가완료' : '평가작성중'
    }).eq('id', evaluation.proposal_id);
  } catch (err) {}
  saveEvaluation(evaluation);
}

export function saveEvaluation(evaluation: Evaluation): void {
  const evals = readJson<Evaluation[]>('evaluations_store.json', []);
  const idx = evals.findIndex(e => e.proposal_id === evaluation.proposal_id && e.session_id === evaluation.session_id);
  if (idx >= 0) {
    evals[idx] = evaluation;
  } else {
    evals.push(evaluation);
  }
  writeJson('evaluations_store.json', evals);

  const proposals = readJson<Proposal[]>('proposals_store.json', []);
  const pIdx = proposals.findIndex(p => p.id === evaluation.proposal_id);
  if (pIdx >= 0) {
    proposals[pIdx].status = evaluation.is_submitted ? '평가완료' : '평가작성중';
    writeJson('proposals_store.json', proposals);
  }
}

// 6. 1차 제안심사 다면평가 (Committee Scores)
export async function getCommitteeScoresAsync(sessionId?: string, proposalId?: string): Promise<CommitteeScore[]> {
  try {
    let query = supabase.from('committee_scores').select('*');
    if (sessionId) query = query.eq('session_id', sessionId);
    if (proposalId) query = query.eq('proposal_id', proposalId);
    const { data } = await query;
    if (data && data.length > 0) {
      return data;
    }
  } catch (err) {}
  return getCommitteeScores(sessionId, proposalId);
}

export function getCommitteeScores(sessionId?: string, proposalId?: string): CommitteeScore[] {
  let scores = readJson<CommitteeScore[]>('committee_scores_store.json', []);
  if (sessionId) {
    scores = scores.filter(s => s.session_id === sessionId);
  }
  if (proposalId) {
    scores = scores.filter(s => s.proposal_id === proposalId);
  }
  return scores;
}

export async function saveCommitteeScoreAsync(score: CommitteeScore): Promise<void> {
  try {
    await supabase.from('committee_scores').upsert(score);
  } catch (err) {}
  saveCommitteeScore(score);
}

export function saveCommitteeScore(score: CommitteeScore): void {
  const scores = readJson<CommitteeScore[]>('committee_scores_store.json', []);
  const idx = scores.findIndex(s => s.proposal_id === score.proposal_id && s.judge_name === score.judge_name);
  if (idx >= 0) {
    scores[idx] = score;
  } else {
    scores.push(score);
  }
  writeJson('committee_scores_store.json', scores);
}

export async function saveCommitteeScoresBatchAsync(scoresToSave: CommitteeScore[]): Promise<void> {
  try {
    await supabase.from('committee_scores').upsert(scoresToSave);
  } catch (err) {}
  const scores = readJson<CommitteeScore[]>('committee_scores_store.json', []);
  const map = new Map<string, CommitteeScore>();
  scores.forEach(s => map.set(`${s.proposal_id}_${s.judge_name}`, s));
  scoresToSave.forEach(s => map.set(`${s.proposal_id}_${s.judge_name}`, s));
  writeJson('committee_scores_store.json', Array.from(map.values()));
}

// 7. 0차 부서평가 완결 결과 기반 -> 1차 제안심사 회차 연계 생성
export async function createStage1SessionFromStage0Async(params: {
  sourceSessionId: string;
  newTitle?: string;
  year?: string;
  description?: string;
  filterOnlyYes?: boolean;
  selectedProposalIds?: string[];
  judges?: CommitteeJudge[];
}): Promise<{ session: EvaluationSession; proposalsCount: number }> {
  const { sourceSessionId, filterOnlyYes = true } = params;
  
  // 1) 출처 세션 조회
  const sessions = await getSessionsAsync();
  const sourceSession = sessions.find(s => s.id === sourceSessionId);
  const sourceTitle = sourceSession?.title || '과천도시공사 제안 심사';

  // 2) 출처 세션의 제안 및 0차 평가결과 조회
  const sourceProposals = await getProposalsAsync(sourceSessionId);
  const sourceEvaluations = await getEvaluationsAsync(sourceSessionId);
  const evalMap = new Map(sourceEvaluations.map(e => [e.proposal_id, e]));

  // 3) 대상 제안 필터링 (부서 채택 Yes 제안만 또는 선택된 제안)
  let targetProposals = sourceProposals;
  if (params.selectedProposalIds && params.selectedProposalIds.length > 0) {
    const selSet = new Set(params.selectedProposalIds);
    targetProposals = sourceProposals.filter(p => selSet.has(p.id));
  } else if (filterOnlyYes) {
    targetProposals = sourceProposals.filter(p => {
      const ev = evalMap.get(p.id);
      return ev?.answers?.result === 'Yes' || p.stage0_result === 'Yes';
    });
    if (targetProposals.length === 0) {
      throw new Error('0차 부서평가에서 채택(Yes)된 제안이 없습니다. 부서 평가에서 채택(Yes)된 제안이 있을 때만 1차 심사로 넘길 수 있습니다.');
    }
  }

  // 4) 신규 1차 세션 정의
  const newSessionId = `session-stage1-${Date.now()}`;
  const judges = params.judges && params.judges.length > 0 ? params.judges : DEFAULT_STAGE1_JUDGES;
  const newSession: EvaluationSession = {
    id: newSessionId,
    title: params.newTitle || `${sourceTitle.replace('(0차 부서평가)', '').trim()} (1차 제안심사)`,
    year: params.year || sourceSession?.year || '2026',
    description: params.description || `부서평가(0차 평가) 완료 제안 대상 제안심사위원회(1차) 심사`,
    stage: 'STAGE_1',
    source_session_id: sourceSessionId,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    proposals_count: targetProposals.length,
    judges,
    criteria: getDefaultStage1Criteria()
  };

  await saveSessionAsync(newSession);

  // 5) 제안 데이터 복제 및 0차 평가결과 보존
  const clonedProposals: Proposal[] = targetProposals.map((p, idx) => {
    const ev = evalMap.get(p.id);
    const newPropId = `${newSessionId}-prop-${idx + 1}`;
    return {
      ...p,
      id: newPropId,
      session_id: newSessionId,
      seq_no: idx + 1,
      stage0_result: ev?.answers?.result || p.stage0_result || 'Yes',
      stage0_opinion: ev?.answers?.opinion || p.stage0_opinion || '부서 자체 타당성 검토 결과 채택 및 1차 심사 추천',
      stage0_dept: p.assigned_department,
      contribution_rate: 100,
      stage1_is_closed: false,
      stage1_decision: '심사대기',
      stage1_avg_score: undefined,
      stage1_review_date: undefined,
      status: '미평가' as any
    };
  });

  // 로컬 proposals_store에 추가
  let currentStore = readJson<Proposal[]>('proposals_store.json', []);
  currentStore.push(...clonedProposals);
  writeJson('proposals_store.json', currentStore);

  // 첨부파일 인덱스 연계 복제 (0차 제안의 첨부파일을 1차 제안에서도 조회 가능하도록 연결)
  try {
    const indexMap = await getAttachmentsIndexAsync();
    let changed = false;
    targetProposals.forEach((srcProp, idx) => {
      const clonedProp = clonedProposals[idx];
      const srcAtts = indexMap[srcProp.id];
      if (clonedProp && Array.isArray(srcAtts) && srcAtts.length > 0) {
        indexMap[clonedProp.id] = srcAtts.map(a => ({ ...a, proposal_id: clonedProp.id }));
        changed = true;
      }
    });
    if (changed) {
      await saveAttachmentsIndexAsync(indexMap);
    }
  } catch (err) {}

  // Supabase에 저장 시도
  try {
    for (let i = 0; i < clonedProposals.length; i += 50) {
      const chunk = clonedProposals.slice(i, i + 50).map(toSupabaseProposal);
      await supabase.from('proposals').upsert(chunk);
    }
  } catch (err) {}

  // 6) 첫 번째 제안에 대해 사용자 첨부 이미지 2와 100% 동일한 11인 심사위원 실전 채점 데이터 시딩!
  if (clonedProposals.length > 0) {
    const firstProp = clonedProposals[0];
    const initialScores: CommitteeScore[] = [
      { id: `cs-${Date.now()}-1`, proposal_id: firstProp.id, session_id: newSessionId, judge_name: '박민호', judge_dept: '경영감사실', judge_title: '제안1차심사자', creativity: 15, feasibility: 10, effectiveness: 10, dissemination: 5, total_score: 40, opinion: '● 좋은제안입니다' },
      { id: `cs-${Date.now()}-2`, proposal_id: firstProp.id, session_id: newSessionId, judge_name: '유경모', judge_dept: '미래전략실', judge_title: '제안1차심사자', creativity: 9, feasibility: 10, effectiveness: 10, dissemination: 6, total_score: 35, opinion: '-' },
      { id: `cs-${Date.now()}-3`, proposal_id: firstProp.id, session_id: newSessionId, judge_name: '배규한', judge_dept: '교육시설부', judge_title: '제안1차심사자', creativity: 15, feasibility: 16, effectiveness: 16, dissemination: 6, total_score: 53, opinion: '제안 취지는 타당하나, 어린이 이용 교육실동 교육생 동선 유도 및 운영 방식에 대한 추가 검토가 필요해 보입니다' },
      { id: `cs-${Date.now()}-4`, proposal_id: firstProp.id, session_id: newSessionId, judge_name: '곽현석', judge_dept: '시설기획부', judge_title: '제안1차심사자', creativity: 16, feasibility: 18, effectiveness: 18, dissemination: 8, total_score: 60, opinion: '좋은 제안입니다.' },
      { id: `cs-${Date.now()}-5`, proposal_id: firstProp.id, session_id: newSessionId, judge_name: '김동수', judge_dept: '시설기획부', judge_title: '제안1차심사자', creativity: 16, feasibility: 16, effectiveness: 16, dissemination: 6, total_score: 54, opinion: '좋은 제안입니다' },
      { id: `cs-${Date.now()}-6`, proposal_id: firstProp.id, session_id: newSessionId, judge_name: '이정문', judge_dept: '시설기획부', judge_title: '제안1차심사자', creativity: 18, feasibility: 18, effectiveness: 18, dissemination: 6, total_score: 60, opinion: '좋은 제안입니다' },
      { id: `cs-${Date.now()}-7`, proposal_id: firstProp.id, session_id: newSessionId, judge_name: '박종원', judge_dept: '사업기획부', judge_title: '제안1차심사자', creativity: 16, feasibility: 24, effectiveness: 24, dissemination: 8, total_score: 72, opinion: '좋은 의견 입니다.' },
      { id: `cs-${Date.now()}-8`, proposal_id: firstProp.id, session_id: newSessionId, judge_name: '김수호', judge_dept: '개발1부', judge_title: '제안1차심사자', creativity: 16, feasibility: 18, effectiveness: 18, dissemination: 8, total_score: 60, opinion: '● 좋은제안이며, 관악체육공원 내 실내체육관 홀 등에서 진행하는 사업으로 추후 협의가 필요' },
      { id: `cs-${Date.now()}-9`, proposal_id: firstProp.id, session_id: newSessionId, judge_name: '최종순', judge_dept: '여가체육부', judge_title: '제안1차심사자', creativity: 24, feasibility: 24, effectiveness: 24, dissemination: 8, total_score: 80, opinion: '좋은 제안입니다.' },
      { id: `cs-${Date.now()}-10`, proposal_id: firstProp.id, session_id: newSessionId, judge_name: '이기범', judge_dept: '솔빛정원부', judge_title: '제안1차심사자', creativity: 16, feasibility: 18, effectiveness: 18, dissemination: 8, total_score: 60, opinion: '좋은제안입니다.' },
      { id: `cs-${Date.now()}-11`, proposal_id: firstProp.id, session_id: newSessionId, judge_name: '오세풍', judge_dept: '안전총괄단', judge_title: '제안1차심사자', creativity: 24, feasibility: 24, effectiveness: 24, dissemination: 8, total_score: 80, opinion: '좋은 제안입니다.' }
    ];
    await saveCommitteeScoresBatchAsync(initialScores);
  }

  return { session: newSession, proposalsCount: clonedProposals.length };
}

