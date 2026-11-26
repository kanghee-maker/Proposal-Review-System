import 'server-only';
import fs from 'fs';
import path from 'path';
import { supabase } from './supabaseClient';
import { applyProposalSource, isExcludedProposal } from './proposalSources';
import { getStage0ReviewLinks } from './stage0ReviewLinks';
import { getProposalTransfers } from './proposalTransfers';
import { CommitteeScore, DEFAULT_STAGE1_JUDGES, Evaluation, EvaluationSession, Proposal } from './types';
import { ReportMode, ResultReport, ResultRow } from './resultReports';

function localData<T>(name: string, fallback: T): T {
  const filename = path.join(process.cwd(), 'data', name);
  return fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : fallback;
}

// Keyset pagination avoids the API row limit. Database errors must reach the caller.
async function allRows(table: string): Promise<any[]> {
  const result: any[] = [];
  let lastId: string | undefined;
  for (;;) {
    let query = supabase.from(table).select('*').order('id').limit(500);
    if (lastId !== undefined) query = query.gt('id', lastId);
    const { data, error } = await query;
    if (error) throw new Error(`${table} DB 조회 실패 (${error.code || '연결 오류'})`);
    if (!data) throw new Error(`${table} DB 응답이 없습니다.`);
    result.push(...data);
    if (data.length < 500) return result;
    lastId = data[data.length - 1].id;
  }
}

export async function reportSessions(): Promise<EvaluationSession[]> {
  const rows = await allRows('evaluation_sessions');
  const local = new Map(localData<EvaluationSession[]>('sessions.json', []).map(s => [s.id, s]));
  return rows.map(row => ({ ...local.get(row.id), ...row,
    stage: row.stage || local.get(row.id)?.stage || (row.id.startsWith('session-stage1-') || row.criteria?.some((c: any) => c.key === 'creativity') ? 'STAGE_1' : 'STAGE_0'),
    judges: row.judges || local.get(row.id)?.judges || DEFAULT_STAGE1_JUDGES,
    source_session_id: row.source_session_id || local.get(row.id)?.source_session_id
  }));
}

export async function reportProposals(): Promise<Proposal[]> {
  const [rows, indexResponse] = await Promise.all([
    allRows('proposals'), supabase.from('organization_charts').select('description').eq('id', 'proposal_attachments_index').maybeSingle()
  ]);
  if (indexResponse.error) throw new Error('첨부파일 목록 DB 조회 실패');
  const index = indexResponse.data ? JSON.parse(indexResponse.data.description) : localData<Record<string, any[]>>('proposal_attachments_index.json', {});
  const local = new Map(localData<Proposal[]>('proposals_store.json', []).map(p => [p.id, p]));
  return rows.filter(p => !isExcludedProposal(p)).map(row => {
    const saved = local.get(row.id);
    return applyProposalSource({ ...saved, ...row,
      background: row.background ?? saved?.background, content: row.content ?? saved?.content,
      expected_effect: row.expected_effect ?? saved?.expected_effect,
      attachments: index[row.id] ?? row.attachments ?? saved?.attachments ?? []
    });
  });
}

export async function loadResultReport(mode: ReportMode, sessionId: string): Promise<ResultReport> {
  const [sessions, proposals, evaluations, transferMap] = await Promise.all([
    reportSessions(), reportProposals(), allRows('evaluations'), getProposalTransfers()
  ]);
  const selected = sessions.find(s => s.id === sessionId);
  if (!selected || (mode === 'stage1' ? selected.stage !== 'STAGE_1' : selected.stage === 'STAGE_1')) throw new Error('선택한 단계의 평가 회차를 찾을 수 없습니다.');
  const stage1Sessions = sessions.filter(s => s.stage === 'STAGE_1');
  const links = new Map(await Promise.all(stage1Sessions.map(async s => [s.id, await getStage0ReviewLinks(s.id)] as const)));
  const scores: CommitteeScore[] = evaluations.filter(e => e.id.startsWith('stage1-score-')).map(e => {
    const s = e.answers;
    if (!s || s.proposal_id !== e.proposal_id || s.session_id !== e.session_id || !Number.isFinite(s.total_score)) throw new Error('1차 점수 자료의 연결 정보 또는 총점을 확인해야 합니다.');
    return { ...s, is_draft: !e.is_submitted };
  });
  const stage0Evaluations: Evaluation[] = evaluations.filter(e => !e.id.startsWith('stage1-score-'));
  const sourceFor = (p: Proposal): Proposal | undefined => {
    const session = sessions.find(s => s.id === p.session_id)!;
    const link = links.get(p.session_id);
    const id = link?.sourceProposalIds[p.id];
    const sourceSession = link?.sourceSessionId || session.source_session_id;
    if (id && sourceSession) return proposals.find(source => source.id === id && source.session_id === sourceSession);
    if (link) return undefined;
    if (!p.board_no?.trim() || !p.proposer_name?.trim()) return undefined;
    const matches = proposals.filter(source => {
      const sourceMeta = sessions.find(s => s.id === source.session_id);
      return sourceMeta?.stage !== 'STAGE_1' && sourceMeta?.year === session.year &&
        (!sourceSession || source.session_id === sourceSession) &&
        source.board_no?.trim() === p.board_no.trim() && source.proposer_name?.trim() === p.proposer_name.trim();
    });
    return matches.length === 1 ? matches[0] : undefined;
  };
  const buildRow = (p: Proposal, children: Proposal[], issue = ''): ResultRow => {
    const ownEvaluations = stage0Evaluations.filter(e => e.proposal_id === p.id && e.session_id === p.session_id);
    const submitted = ownEvaluations.filter(e => e.is_submitted);
    const results = Array.from(new Set(submitted.map(e => e.answers?.result).filter(Boolean)));
    const rowScores = scores.filter(s => children.some(child => child.id === s.proposal_id && child.session_id === s.session_id));
    const judges = children.length === 1 ? (sessions.find(s => s.id === children[0].session_id)?.judges || DEFAULT_STAGE1_JUDGES) : [];
    const finals = rowScores.filter(s => !s.is_draft && judges.some(j => j.name === s.judge_name));
    const duplicateFinal = finals.some((s, i) => finals.findIndex(t => t.judge_name === s.judge_name) !== i);
    const missingJudges = judges.filter(j => !finals.some(s => s.judge_name === j.name)).map(j => j.name);
    const history = [...(transferMap[p.id]?.transfer_history || p.transfer_history || [])].sort((a, b) => a.at.localeCompare(b.at));
    const result = results.length > 1 ? '의견 상이' : results[0] || p.stage0_result || '기록 없음';
    const linkIssue = [issue, children.length > 1 ? '복수 1차 연결 확인 필요' : '', duplicateFinal ? '중복 최종점수 확인 필요' : '', rowScores.some(s => !judges.some(j => j.name === s.judge_name)) ? '심사위원 명단 확인 필요' : ''].filter(Boolean).join(' / ');
    return { proposal: { ...p, ...transferMap[p.id], transfer_history: history }, stage1: children, evaluations: ownEvaluations,
      scores: rowScores, transfers: history, judges, missingJudges, linkIssue,
      linkMethod: children.length ? children.map(child => links.get(child.session_id)?.sourceProposalIds[child.id] ? '저장된 원본 ID' : sourceFor(child) ? '관리번호+제안자 유일 일치' : '연결 확인 필요').join(', ') : '1차 미연계',
      stage0Result: result, stage0Complete: submitted.length > 0 && ownEvaluations.every(e => e.is_submitted),
      state: mode === 'stage0' ? submitted.length > 0 && ownEvaluations.every(e => e.is_submitted) ? '0차 평가 완료' : '0차 평가 미완료' : children.length > 1 || duplicateFinal ? '연결 확인 필요' : !children.length ? result === 'No' ? '0차 불채택' : '1차 미연계' : !missingJudges.length && judges.length ? '1차 심사 완료' : finals.length ? '1차 일부 제출' : '1차 미제출',
      average: finals.length && !duplicateFinal && children.length === 1 ? finals.reduce((sum, s) => sum + s.total_score, 0) / finals.length : null,
      rank: null
    };
  };
  let rows: ResultRow[];
  if (mode === 'stage1') {
    rows = proposals.filter(p => p.session_id === sessionId).map(p => {
      const source = sourceFor(p);
      return buildRow(source || p, [p], source ? '' : '0차 원본 연결 확인 필요');
    });
  } else {
    const originals = proposals.filter(p => p.session_id === sessionId);
    rows = originals.map(p => buildRow(p, mode === 'stage0' ? [] : proposals.filter(child => sessions.find(s => s.id === child.session_id)?.stage === 'STAGE_1' && sourceFor(child)?.id === p.id)));
    if (mode === 'combined') {
      const targets = stage1Sessions.filter(s => {
        const sourceId = links.get(s.id)?.sourceSessionId || s.source_session_id;
        return sourceId ? sourceId === sessionId : s.year === selected.year;
      });
      for (const p of proposals.filter(p => targets.some(s => s.id === p.session_id) && !sourceFor(p))) rows.push({ ...buildRow(p, [p], '원본 회차·제안 연결 확인 필요'), unlinkedTarget: true });
    }
  }
  // Full-precision average, competition ranking. Incomplete evaluations receive no rank.
  const complete = rows.filter(r => r.state === '1차 심사 완료' && r.average !== null).sort((a, b) => b.average! - a.average!);
  complete.forEach((r, index) => { r.rank = complete.findIndex(other => other.average === r.average) + 1; });
  return { sessions, rows, mode, sessionId, generatedAt: new Date().toISOString(), warnings: [
    '원본 ID 연결 정보가 없으면 동일 연도의 관리번호와 제안자가 유일하게 일치하는 경우에만 연결합니다. 제목 일치만으로 연결하지 않습니다.',
    '평가 결과는 현재 DB 저장값입니다. 과거에 덮어쓴 평가 의견의 수정 이력은 별도로 보관되어 있지 않습니다.',
    '순위는 전원 제출 완료 제안의 반올림 전 평균 기준 공동순위(1, 1, 3)입니다. 화면 평균은 소수 둘째 자리까지 표시합니다. 기존 최종 판정은 재계산하지 않습니다.',
    '원문·기본 첨부는 기존 원본 보정 목록을 사용하며, 부서·제안자 명칭과 의견은 저장된 값을 보존합니다. 최초 배정 부서는 이동 이력에 기록된 경우에만 확인할 수 있습니다.'
  ] };
}
