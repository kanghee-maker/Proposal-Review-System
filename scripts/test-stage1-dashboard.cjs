// Run with node scripts/test-stage1-dashboard.cjs. No DB reads or writes.
const fs = require('fs'), ts = require('typescript'), assert = require('node:assert/strict');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
}).outputText, file);
const { dashboardEntry, dashboardSummary, dashboardGroups } = require('../lib/stage1Dashboard.ts');
function fixture(values, rank = '체육 6급') {
  return { proposal: { proposer_rank: rank, proposer_office: '시설관리처' }, stage1: [{}], linkIssue: '',
    judges: values.map((_, i) => ({ name: '위원' + i })), scores: values.map((total_score, i) => ({ judge_name: '위원' + i, total_score, is_draft: false })) };
}
assert.equal(dashboardEntry(fixture([49, 49, 49])).decision, '불채택');
assert.equal(dashboardEntry(fixture([40, 40, 40, 80])).decision, '과락');
assert.equal(dashboardEntry(fixture([50, 50])).decision, '채택');
const partial = fixture([49, 49, 49]); partial.scores[2].is_draft = true;
assert.equal(dashboardEntry(partial).decision, '심사 중');
assert.equal(dashboardEntry(partial).average, 49);
assert.equal(dashboardSummary([dashboardEntry(partial)]).bins.reduce((n, b) => n + b.count, 0), 0);
const duplicate = fixture([70, 80]); duplicate.scores.push({ ...duplicate.scores[0] });
assert.equal(dashboardEntry(duplicate).decision, '연결 확인 필요');
const entries = [dashboardEntry(fixture([70, 80])), dashboardEntry(fixture([60, 70], '체육6급'))];
assert.equal(dashboardGroups(entries, 'proposer_rank').length, 1);
assert.equal(dashboardGroups(entries, 'proposer_rank')[0].total, 2);
const before = JSON.stringify(entries); dashboardSummary(entries); dashboardGroups(entries, 'proposer_office');
assert.equal(JSON.stringify(entries), before);
console.log('PASS: average cutoff, disqualification, drafts, partial submissions, duplicate judges, rank spacing, immutable input');
const { criteriaStatistics, taskIndex } = require('../lib/stage1Analytics.ts');
const partialEntry = dashboardEntry(partial);
assert.equal(criteriaStatistics([partialEntry])[0].count, 0);
assert.equal(taskIndex({ ...entries[0], row: { ...entries[0].row, proposal: { id: 'unknown', proposal_type: '지정제안' } } }), undefined);
console.log('PASS: incomplete ratings excluded from criteria averages; unknown task IDs are not guessed');
