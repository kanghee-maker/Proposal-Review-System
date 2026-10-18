import fs from 'fs';
import path from 'path';
import { OrganizationChart, EvaluationSession, Proposal, Evaluation, EvaluationCriteria, Department } from './types';
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

// 3. 제안평가 건 (Sessions)
const DEFAULT_SESSION_ID = 'session-2026-gwacheon';

export async function getSessionsAsync(): Promise<EvaluationSession[]> {
  try {
    const { data, error } = await supabase.from('evaluation_sessions').select('*');
    if (data && data.length > 0) {
      return data.map(s => ({
        id: s.id,
        title: s.title,
        year: s.year,
        description: s.description,
        status: s.status,
        created_at: s.created_at,
        proposals_count: s.proposals_count || 0,
        criteria: s.criteria || getDefaultCriteria()
      }));
    }
  } catch (err) {
    // fallback
  }
  return getSessions();
}

export function getSessions(): EvaluationSession[] {
  let sessions = readJson<EvaluationSession[]>('sessions.json', []);
  if (sessions.length === 0) {
    const rawProposals = readJson<any[]>('proposals_2026_structured.json', []);
    const defaultSession: EvaluationSession = {
      id: DEFAULT_SESSION_ID,
      title: '2026년 상반기 과천도시공사 제안 심사 (0차 부서평가)',
      year: '2026',
      description: '과천도시공사 전 부서 대상 제안평가 0차 부서 타당성 심사 및 검토의견 수렴',
      status: 'ACTIVE',
      created_at: '2026-07-28T09:00:00Z',
      proposals_count: rawProposals.length,
      criteria: getDefaultCriteria()
    };
    sessions = [defaultSession];
    writeJson('sessions.json', sessions);
  }
  return sessions;
}

export async function saveSessionAsync(session: EvaluationSession): Promise<void> {
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
  saveSession(session);
}

export async function updateSessionAsync(sessionData: Partial<EvaluationSession> & { id: string }): Promise<EvaluationSession | null> {
  const sessions = await getSessionsAsync();
  const existing = sessions.find(s => s.id === sessionData.id);
  if (!existing) return null;

  const updated: EvaluationSession = {
    ...existing,
    ...sessionData
  };

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

  saveSession(updated);
  return updated;
}

export function saveSession(session: EvaluationSession): void {
  const sessions = getSessions();
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) sessions[idx] = session;
  else sessions.unshift(session);
  writeJson('sessions.json', sessions);
}

// 4. 제안 목록 (Proposals)
export async function getProposalsAsync(sessionId: string = DEFAULT_SESSION_ID): Promise<Proposal[]> {
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
        status: p.status
      }));
    }
  } catch (err) {}
  return getProposals(sessionId);
}

export function getProposals(sessionId: string = DEFAULT_SESSION_ID): Proposal[] {
  let proposals = readJson<Proposal[]>('proposals_store.json', []);
  if (proposals.length === 0) {
    const rawProposals = readJson<any[]>('proposals_2026_structured.json', []);
    const evaluations = getEvaluations(sessionId);
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
        status
      };
    });
    writeJson('proposals_store.json', proposals);
  }
  return proposals.filter(p => !sessionId || p.session_id === sessionId);
}

export async function updateProposalAsync(updated: Proposal): Promise<void> {
  try {
    await supabase.from('proposals').update({
      assigned_division: updated.assigned_division,
      assigned_office: updated.assigned_office,
      assigned_department: updated.assigned_department,
      assigned_raw_dept: updated.assigned_raw_dept,
      status: updated.status
    }).eq('id', updated.id);
  } catch (err) {}
  updateProposal(updated);
}

export function updateProposal(updated: Proposal): void {
  const proposals = getProposals();
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
  const evals = getEvaluations();
  const idx = evals.findIndex(e => e.proposal_id === evaluation.proposal_id && e.session_id === evaluation.session_id);
  if (idx >= 0) {
    evals[idx] = evaluation;
  } else {
    evals.push(evaluation);
  }
  writeJson('evaluations_store.json', evals);

  const proposals = getProposals(evaluation.session_id);
  const pIdx = proposals.findIndex(p => p.id === evaluation.proposal_id);
  if (pIdx >= 0) {
    proposals[pIdx].status = evaluation.is_submitted ? '평가완료' : '평가작성중';
    writeJson('proposals_store.json', proposals);
  }
}
