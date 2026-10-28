const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const catalog = require('../data/proposal_source_catalog.json');
const base = require('../data/proposals_2026_structured.json');
const manifest = require('../docs/proposal-source-manifest.json');
const excluded = new Set(['23','36','62','87','100','129','131','141']);
const filename = path.join(root, 'lib/proposalSources.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }
}).outputText;
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(compiled, filename);
const { applyProposalSource, findSourceAttachment, isExcludedProposal } = loaded.exports;
assert.equal(base.length, 134);
assert.equal(Object.keys(catalog).length, 134);
assert.equal(new Set(base.map(p => p.board_no)).size, 134);
let files = 0;
for (const p of base) {
  assert(!excluded.has(p.board_no));
  assert.equal(p.title, catalog[p.board_no].title);
  assert.equal(p.proposer, catalog[p.board_no].proposer);
  const custom = {id:'user-upload',name:'notes.txt',data_url:'data:text/plain;base64,eA=='};
  const existing = {id:'cloned-session-prop-1',seq_no:1,board_no:p.board_no,
    proposer_name:p.proposer,title:'old title',content:'old content',status:'평가완료',
    assigned_department:'unchanged',stage1_avg_score:78,
    attachments:[{id:'old-att-default-1',static_url:'/default-attachments/old.xlsx'},custom]};
  const result = applyProposalSource(existing);
  assert.equal(result.title,p.title);
  assert.equal(result.content,p.content);
  assert.equal(result.status,existing.status);
  assert.equal(result.assigned_department,existing.assigned_department);
  assert.equal(result.stage1_avg_score,78);
  assert.equal(result.attachments.length,p.default_attachments.length+1);
  assert.equal(result.attachments.at(-1),custom);
  assert.equal(applyProposalSource({...existing,proposer_name:'different person'}).content,'old content');
  for (const a of result.attachments.slice(0,-1)) {
    assert.deepEqual(findSourceAttachment(a.id),a);
    const target=path.resolve(root,'public',decodeURIComponent(a.static_url).replace(/^\//,''));
    assert(!path.relative(path.join(root,'public'),target).startsWith('..'));
    const bytes=fs.readFileSync(target);
    assert.equal(bytes.length,a.size);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.sha256);
    files++;
  }
}
for(const board_no of excluded)assert(isExcludedProposal({board_no}));
assert.equal(findSourceAttachment('unknown'),null);
assert.equal(findSourceAttachment('x-att-source-23-1'),null);
assert.equal(files,152);
assert.equal(manifest.file_count,files);
console.log('PASS: 134 identities, 152 file hashes/download paths, cloned-session matching, uploaded-file preservation, evaluation-state preservation, and 8 excluded boards.');
