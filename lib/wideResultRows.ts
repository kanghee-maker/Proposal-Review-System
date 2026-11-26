import { DEFAULT_STAGE1_JUDGES } from './types';
import { finalScores, initialDepartment, ResultReport, ResultRow } from './resultReports';
import { exportStage1Decision } from './stage1Decision';

export function wideResultRows(report: ResultReport, rows: ResultRow[]) {
  const judges = [...DEFAULT_STAGE1_JUDGES];
  for (const row of rows) for (const judge of row.judges) {
    if (!judges.some(j => j.name === judge.name)) judges.push(judge);
  }
  return [...rows].sort((a, b) => a.proposal.seq_no - b.proposal.seq_no).map(row => {
    const p = row.proposal, child = row.stage1.length === 1 ? row.stage1[0] : undefined;
    const submitted = row.evaluations.filter(e => e.is_submitted);
    const scores = finalScores(row);
    const average = (key: 'creativity' | 'feasibility' | 'effectiveness' | 'dissemination' | 'total_score') =>
      scores.length && !row.linkIssue ? Number((scores.reduce((sum, score) => sum + score[key], 0) / scores.length).toFixed(1)) : '';
    const history = row.transfers.map((t, index) => `${index + 1}. [${t.at || '일시 미기록'}] ${t.action}\n${t.from_department || '기록 없음'} → ${t.target_department || '기록 없음'}\n요청사유: ${t.request_reason || '기록 없음'}\n처리자: ${t.actor || '기록 없음'}\n처리의견: ${t.comment || '기록 없음'}`).join('\n\n');
    const result: Record<string, string | number> = {
      '연번': p.seq_no, '게시판번호': p.board_no, '제안자': p.proposer_name, '직급': p.proposer_rank,
      '제안자_본부/부문': p.proposer_division, '제안자_처/실/단': p.proposer_office, '제안자_부': p.proposer_department,
      '제안구분': p.proposal_type, '분야': p.category, '실행(평가)_본부/부문': p.assigned_division,
      '실행(평가)_처/실/단': p.assigned_office, '실행(평가)_부': p.assigned_department, '접수일자': p.submitted_at,
      '제안제목': p.title, '0차_부서평가_검토결과': row.stage0Result,
      '0차_부서평가_검토의견': submitted.length === 1 ? submitted[0].answers.opinion ?? '' : submitted.map(e => `[${e.department_name}]\n${e.answers.opinion ?? ''}`).join('\n\n') || p.stage0_opinion || '기록 없음',
      '1차심사_마감여부': child ? child.stage1_is_closed === undefined ? '기록 없음' : child.stage1_is_closed ? 'Y (마감완료)' : 'N (심사중)' : '1차 미연계',
      '1차심사_최종판정': exportStage1Decision(child, scores, row.judges.length, Boolean(row.linkIssue)),
      '1차심사_심사일자': child?.stage1_review_date || '', '기여율(%)': child?.contribution_rate ?? '',
      '채점참여_위원수': `${scores.length}/${row.judges.length}명`,
      '평균_창의성(30)': average('creativity'), '평균_실현성(30)': average('feasibility'),
      '평균_효과성(30)': average('effectiveness'), '평균_전파성(10)': average('dissemination'),
      '1차심사_평균총점(100)': average('total_score')
    };
    for (const judge of judges) {
      const matches = scores.filter(s => s.judge_name === judge.name);
      result[`[${judge.dept}] ${judge.name}_총점`] = matches.length === 1 ? matches[0].total_score : '';
      result[`[${judge.dept}] ${judge.name}_의견`] = matches.length === 1 ? matches[0].opinion || '' : '';
    }
    Object.assign(result, {
      '최초_배정부서(이관전)': initialDepartment(row), '부서이동_이력건수': row.transfers.length, '부서이동_상세이력': history,
      '0차_평가부서': submitted.map(e => e.department_name || '기록 없음').join('\n'),
      '0차_평가자': submitted.map(e => e.evaluator_name || '기록 없음').join('\n'),
      '0차_제출상태': row.stage0Complete ? '최종제출 완료' : '미완료',
      '0차_제출일시': submitted.map(e => e.submitted_at || '기록 없음').join('\n'),
      '0차_수정일시': submitted.map(e => e.updated_at || '기록 없음').join('\n'),
      '원본제안ID': p.id, '1차제안ID': row.stage1.map(p => p.id).join('\n'),
      '원본연결근거': row.linkMethod, '연결확인사항': row.linkIssue || '없음'
    });
    return result;
  });
}
