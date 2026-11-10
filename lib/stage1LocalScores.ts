import type { CommitteeScore } from './types';

const fileFormat = 'gcuc-stage1-results-v1';

function storageId(sessionId: string, judgeName?: string) {
  return `gcuc:stage1:${JSON.stringify([sessionId, judgeName ?? 'admin'])}`;
}

export function readLocalScores(sessionId: string, judgeName?: string): CommitteeScore[] {
  const saved = localStorage.getItem(storageId(sessionId, judgeName));
  return saved ? JSON.parse(saved) : [];
}

export function storeLocalScores(sessionId: string, scores: CommitteeScore[], judgeName?: string) {
  const records = new Map<string, CommitteeScore>();
  for (const score of [...readLocalScores(sessionId, judgeName), ...scores]) {
    const key = JSON.stringify([score.proposal_id, score.judge_name, Boolean(score.is_draft)]);
    const existing = records.get(key);
    if (!existing || Date.parse(score.submitted_at || '') >= Date.parse(existing.submitted_at || '')) {
      records.set(key, score);
    }
  }
  const merged = Array.from(records.values());
  localStorage.setItem(storageId(sessionId, judgeName), JSON.stringify(merged));
  return merged;
}

export function downloadStage1Results(sessionId: string, scores: CommitteeScore[], judgeName?: string) {
  const content = { format: fileFormat, sessionId, scores: scores.filter(score => !score.is_draft) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `1차심사-${judgeName || '관리자취합'}-${sessionId}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseStage1Results(content: string, sessionId: string, proposalIds: Set<string>, judgeNames: Set<string>): CommitteeScore[] {
  const file = JSON.parse(content);
  if (file?.format !== fileFormat || file.sessionId !== sessionId || !Array.isArray(file.scores) || !file.scores.length) {
    throw new Error('선택한 회차의 1차 심사 결과 파일을 선택해 주세요.');
  }
  return file.scores.map((score: CommitteeScore) => {
    if (!score || score.session_id !== sessionId || !proposalIds.has(score.proposal_id) || !judgeNames.has(score.judge_name) ||
        score.is_draft || typeof score.opinion !== 'string' || !Number.isFinite(Date.parse(score.submitted_at || ''))) {
      throw new Error('회차, 제안 번호, 심사위원 또는 확정 일시를 확인해 주세요.');
    }
    const values = [score.creativity, score.feasibility, score.effectiveness, score.dissemination];
    if (values.some((value, index) => !Number.isInteger(value) || value < 0 || value > (index === 3 ? 10 : 30))) {
      throw new Error('파일에 점수 범위를 벗어난 항목이 있습니다.');
    }
    return { ...score, total_score: values.reduce((sum, value) => sum + value, 0), is_draft: false };
  });
}
