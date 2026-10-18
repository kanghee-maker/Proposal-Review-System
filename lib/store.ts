import fs from 'fs';
import path from 'path';
import { OrganizationChart, EvaluationSession, Proposal, Evaluation, EvaluationCriteria, Department, CommitteeJudge, CommitteeScore, EvaluationStage } from './types';
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
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
  }
}

// 1. 조직도 관리
export async function getOrganizationChartAsync(): Promise<OrganizationChart> {
  try {
    const { data: chartData } = await supabase.from('organization_charts').select('*').limit(1).single();
    const { data: deptData } = await supabase.from('departments').select('*');
    if (deptData && deptData.length > 0) {
      return {
        name: chartData?.name || '2026_조직도',
        version: chartData?.version || '2026-v1.0',
        updated_at: chartData?.updated_at || new Date().toISOString(),
        description: chartData?.description || '과천도시공사 2026 조직도',
        departments: deptData.map(d => ({
          code: d.code,
          division: d.division,
          office: d.office,
          department: d.department,
          name: d.name,
          head_title: d.head_title
        }))
      };
    }
  } catch (err) {
    // Supabase fallback to local
  }
  return getOrganizationChart();
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
    if (!error && Array.isArray(data) && data.length > 0) {
      markSystemInitialized();
      const localMap = new Map(localSessions.map(s => [s.id, s]));
      return data.map(s => {
        const local = localMap.get(s.id);
        return {
          id: s.id,
          title: s.title,
          year: s.year,
          description: s.description,
          stage: local?.stage || s.stage || 'STAGE_0',
          source_session_id: local?.source_session_id || s.source_session_id,
          judges: local?.judges || s.judges || (s.stage === 'STAGE_1' ? DEFAULT_STAGE1_JUDGES : undefined),
          status: s.status,
          created_at: s.created_at,
          proposals_count: s.proposals_count || local?.proposals_count || 0,
          criteria: s.criteria || local?.criteria || (s.stage === 'STAGE_1' ? getDefaultStage1Criteria() : getDefaultCriteria())
        };
      });
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

// 4. 제안 목록 (Proposals)
export async function seedDefaultProposalsForSessionAsync(sessionId: string): Promise<Proposal[]> {
  const rawProposals = readJson<any[]>('proposals_2026_structured.json', []);
  const proposals: Proposal[] = rawProposals.map((item, index) => {
    const id = sessionId === DEFAULT_SESSION_ID ? `prop-${item.no || index + 1}` : `${sessionId}-prop-${item.no || index + 1}`;
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
      is_duplicate: item.is_duplicate || '',
      duplicate_title: item.duplicate_title || '',
      status: '미평가' as const
    };
  });

  // Local store sync
  let currentStore = readJson<Proposal[]>('proposals_store.json', []);
  const existingIds = new Set(currentStore.map(p => p.id));
  const toAdd = proposals.filter(p => !existingIds.has(p.id));
  if (toAdd.length > 0) {
    currentStore.push(...toAdd);
    writeJson('proposals_store.json', currentStore);
  }

  // Supabase sync in chunks
  try {
    for (let i = 0; i < proposals.length; i += 50) {
      const chunk = proposals.slice(i, i + 50);
      await supabase.from('proposals').upsert(chunk);
    }
  } catch (err) {
    console.error('Error seeding proposals to Supabase:', err);
  }

  return proposals;
}

function lookupDepartmentOrg(deptName: string): { division: string; office: string; department: string } {
  if (!deptName) return { division: '', office: '', department: '' };
  const org = readJson<{ departments: Department[] }>('organization_2026.json', { departments: [] });
  const found = org.departments?.find(d => 
    d.department === deptName || 
    d.name === deptName || 
    deptName.includes(d.department) ||
    (d.office && deptName.includes(d.office))
  );
  if (found) {
    return {
      division: found.division,
      office: found.office,
      department: found.department
    };
  }
  return { division: '', office: '', department: deptName };
}

export async function saveCustomProposalsForSessionAsync(
  sessionId: string,
  rawList: any[]
): Promise<Proposal[]> {
  const proposals: Proposal[] = rawList.map((item, index) => {
    const seq = Number(item.seq_no ?? item['연번'] ?? item['순번'] ?? (index + 1));
    const id = `${sessionId}-prop-${seq || (index + 1)}`;

    // Resolve proposer org if missing
    let pDivision = String(item.proposer_division || item['제안자_본부/부문'] || item['제안자_본부'] || item['제안자본부'] || '');
    let pOffice = String(item.proposer_office || item['제안자_처/실/단'] || item['제안자_처실단'] || item['제안자처'] || '');
    let pDept = String(item.proposer_department || item['제안자_부'] || item['제안자_부서'] || item['제안자부'] || item['소속부서'] || item['소속'] || '');
    if ((!pDivision || !pOffice) && pDept) {
      const resolved = lookupDepartmentOrg(pDept);
      if (!pDivision) pDivision = resolved.division;
      if (!pOffice) pOffice = resolved.office;
    }

    // Resolve assigned (execution) org if missing
    let aDivision = String(item.assigned_division || item['실행(평가)_본부/부문'] || item['실행_본부/부문'] || item['실행본부'] || item['평가본부'] || '');
    let aOffice = String(item.assigned_office || item['실행(평가)_처/실/단'] || item['실행_처/실/단'] || item['실행처'] || item['평가처'] || '');
    let aDept = String(item.assigned_department || item['실행(평가)_부'] || item['실행_부'] || item['실행부서'] || item['담당부서'] || item['평가부서'] || item['부서'] || '');
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
      proposer_name: String(item.proposer_name || item['제안자'] || item['제안자명'] || item['성명'] || item['이름'] || ''),
      proposer_rank: String(item.proposer_rank || item['직급'] || item['직책'] || ''),
      proposer_division: pDivision,
      proposer_office: pOffice,
      proposer_department: pDept,
      proposer_raw_dept: String(item.proposer_raw_dept || item['제안자_원소속부서'] || pDept),
      proposal_type: String(item.proposal_type || item['제안구분'] || item['구분'] || '지정제안'),
      category: String(item.category || item['분야'] || item['제안분야'] || '업무개선'),
      assigned_division: aDivision,
      assigned_office: aOffice,
      assigned_department: aDept,
      assigned_raw_dept: String(item.assigned_raw_dept || item['실행_원부서명'] || aDept),
      submitted_at: String(item.submitted_at || item['접수일자'] || item['등록일자'] || new Date().toISOString().split('T')[0]),
      title: String(item.title || item['제안제목'] || item['제목'] || `제안 ${seq}`),
      content: String(item.content || item['제안내용'] || item['내용'] || ''),
      expected_effect: String(item.expected_effect || item['기대효과'] || ''),
      is_duplicate: String(item.is_duplicate || item['중복제안여부'] || item['중복여부'] || ''),
      duplicate_title: String(item.duplicate_title || item['중복제안제목'] || item['중복제목'] || ''),
      status: '미평가' as const,
      contribution_rate: 100
    };
  });

  // 1. Local store sync
  let currentStore = readJson<Proposal[]>('proposals_store.json', []);
  currentStore = currentStore.filter(p => p.session_id !== sessionId);
  currentStore.push(...proposals);
  writeJson('proposals_store.json', currentStore);

  // 2. Supabase sync in chunks
  try {
    for (let i = 0; i < proposals.length; i += 50) {
      const chunk = proposals.slice(i, i + 50);
      await supabase.from('proposals').upsert(chunk);
    }
  } catch (err) {
    console.error('Error saving custom proposals to Supabase:', err);
  }

  return proposals;
}

export async function getProposalsAsync(sessionId?: string): Promise<Proposal[]> {
  try {
    let query = supabase.from('proposals').select('*').order('seq_no', { ascending: true });
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }
    const { data } = await query;
    if (data && data.length > 0) {
      return data.map(p => ({
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
        content: p.content,
        is_duplicate: p.is_duplicate,
        duplicate_title: p.duplicate_title,
        status: p.status,
        transfer_requested: p.transfer_requested,
        transfer_target_dept: p.transfer_target_dept,
        transfer_reason: p.transfer_reason,
        transfer_requested_at: p.transfer_requested_at,
        transfer_status: p.transfer_status,
        stage0_result: p.stage0_result,
        stage0_opinion: p.stage0_opinion,
        stage0_dept: p.stage0_dept,
        contribution_rate: p.contribution_rate ?? 100,
        stage1_is_closed: p.stage1_is_closed ?? false,
        stage1_decision: p.stage1_decision || '미결',
        stage1_avg_score: p.stage1_avg_score,
        stage1_review_date: p.stage1_review_date
      }));
    } else if (sessionId && sessionId === DEFAULT_SESSION_ID && !isSystemInitialized()) {
      // 최초 시스템 실행 시에만 기본 세션에 한해 자동 시딩
      const seeded = await seedDefaultProposalsForSessionAsync(sessionId);
      if (seeded && seeded.length > 0) return seeded;
    }
  } catch (err) {}
  return getProposals(sessionId);
}

export function getProposals(sessionId?: string): Proposal[] {
  let proposals = readJson<Proposal[]>('proposals_store.json', []);
  if (!isSystemInitialized() && proposals.length === 0) {
    const rawProposals = readJson<any[]>('proposals_2026_structured.json', []);
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
        is_duplicate: item.is_duplicate || '',
        duplicate_title: item.duplicate_title || '',
        status
      };
    });
    writeJson('proposals_store.json', proposals);
  }

  if (sessionId) {
    const filtered = proposals.filter(p => p.session_id === sessionId);
    if (filtered.length === 0 && !isSystemInitialized() && sessionId === DEFAULT_SESSION_ID) {
      const rawProposals = readJson<any[]>('proposals_2026_structured.json', []);
      const newProposals: Proposal[] = rawProposals.map((item, index) => ({
        id: `${sessionId}-prop-${item.no || index + 1}`,
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
        is_duplicate: item.is_duplicate || '',
        duplicate_title: item.duplicate_title || '',
        status: '미평가' as const
      }));
      proposals.push(...newProposals);
      writeJson('proposals_store.json', proposals);
      return newProposals;
    }
    return filtered;
  }

  return proposals;
}

export async function updateProposalAsync(updated: Proposal): Promise<void> {
  try {
    await supabase.from('proposals').update({
      assigned_division: updated.assigned_division,
      assigned_office: updated.assigned_office,
      assigned_department: updated.assigned_department,
      assigned_raw_dept: updated.assigned_raw_dept,
      status: updated.status,
      transfer_requested: updated.transfer_requested,
      transfer_target_dept: updated.transfer_target_dept,
      transfer_reason: updated.transfer_reason,
      transfer_requested_at: updated.transfer_requested_at,
      transfer_status: updated.transfer_status,
      stage0_result: updated.stage0_result,
      stage0_opinion: updated.stage0_opinion,
      stage1_is_closed: updated.stage1_is_closed,
      stage1_decision: updated.stage1_decision,
      stage1_avg_score: updated.stage1_avg_score,
      stage1_review_date: updated.stage1_review_date,
      contribution_rate: updated.contribution_rate
    }).eq('id', updated.id);
  } catch (err) {}
  updateProposal(updated);
}

export function updateProposal(updated: Proposal): void {
  const proposals = readJson<Proposal[]>('proposals_store.json', []);
  const idx = proposals.findIndex(p => p.id === updated.id);
  if (idx >= 0) {
    proposals[idx] = updated;
    writeJson('proposals_store.json', proposals);
  }
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
      return ev?.answers?.result === 'Yes';
    });
    // 만약 아직 Yes가 하나도 없으면 전체 제안 중 상위 30건을 데모 연계
    if (targetProposals.length === 0) {
      targetProposals = sourceProposals.slice(0, 30);
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
      stage0_result: ev?.answers?.result || 'Yes',
      stage0_opinion: ev?.answers?.opinion || '부서 자체 타당성 검토 결과 채택 및 1차 심사 추천',
      stage0_dept: p.assigned_department,
      contribution_rate: 100,
      stage1_is_closed: idx === 0, // 첫 번째 샘플 제안은 마감 상태로 예시 제공
      stage1_decision: idx === 0 ? '채택' : '심사대기',
      stage1_avg_score: idx === 0 ? 59 : undefined,
      stage1_review_date: idx === 0 ? '2026-10-18' : undefined,
      status: (idx === 0 ? '평가완료' : '미평가') as any
    };
  });

  // 로컬 proposals_store에 추가
  let currentStore = readJson<Proposal[]>('proposals_store.json', []);
  currentStore.push(...clonedProposals);
  writeJson('proposals_store.json', currentStore);

  // Supabase에 저장 시도
  try {
    for (let i = 0; i < clonedProposals.length; i += 50) {
      await supabase.from('proposals').upsert(clonedProposals.slice(i, i + 50));
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

