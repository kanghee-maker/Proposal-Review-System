const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const rows = new Map();
let failRead = false, failWrite = false, updates = 0;
const supabase = { from() { return {
  select() { return { like() { return { order() { return { async range(start,end) { return {data:[...rows.values()].slice(start,end+1),error:failRead?{}:null}; } }; } }; } }; },
  upsert(row) { return { async select() { if (failWrite) return { error: {}, data: null }; rows.set(row.id, structuredClone(row)); return { data: [{ id: row.id }], error: null }; } }; }
}; } };
function load(file, modules) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports, require(name) { if (!(name in modules)) throw Error(name); return modules[name]; }, Response, URL, console, Date, crypto:require('node:crypto').webcrypto });
  return exports;
}
const transfers = load('lib/proposalTransfers.ts', { './supabaseClient': { supabase } });
const proposal = { id:'p1', title:'제안', assigned_department:'주차관리부', session_id:'s1', assigned_raw_dept:'주차관리부' };
function route() { return load('app/api/proposals/route.ts', {
  '@/lib/proposalTransfers': load('lib/proposalTransfers.ts', { './supabaseClient': { supabase } }),
  '@/lib/store': { getProposalsAsync: async()=>[structuredClone(proposal)], updateProposalAsync: async p=>{ updates++; Object.assign(proposal,p); } },
  'next/server': { NextResponse: { json: (data, init)=>new Response(JSON.stringify(data),init) } }
}); }
async function put(body) { const r = await route().PUT({ json: async()=>body }); return { status:r.status, body:await r.json() }; }
(async()=>{
  let r=await put({id:'p1',transfer_action:'REQUEST',transfer_target_dept:'시설기획부',transfer_reason:'소관 검토'});
  assert.equal(r.status,200);assert.equal(updates,0);
  // A new module instance/request must see the durable request.
  let get=await route().GET(new Request('https://example.test/api/proposals?id=p1'));
  assert.equal((await get.json()).transfer_reason,'소관 검토');
  await put({...proposal,transfer_requested:false});
  assert.equal((await transfers.getProposalTransfers()).p1.transfer_requested,true);
  failWrite=true;r=await put({id:'p1',transfer_action:'REQUEST',transfer_target_dept:'시설기획부',transfer_reason:'새 사유'});
  assert.equal(r.status,500);assert.equal((await transfers.getProposalTransfers()).p1.transfer_reason,'소관 검토');failWrite=false;
  r=await put({id:'p1',transfer_action:'CANCEL'});assert.equal(r.body.proposal.transfer_requested,false);
  r=await put({id:'p1',transfer_action:'REQUEST',transfer_target_dept:'시설기획부',transfer_reason:'재요청'});assert.equal(r.status,200);
  r=await put({id:'p1',transfer_action:'APPROVE',assigned_department:'시설기획부',assigned_office:'시설',assigned_division:'본부',assigned_raw_dept:'시설 시설기획부'});
  assert.equal(r.status,200);assert.equal(proposal.assigned_department,'시설기획부');assert.equal((await transfers.getProposalTransfers()).p1.transfer_status,'APPROVED');
  r=await put({id:'p1',transfer_action:'REQUEST',transfer_target_dept:'',transfer_reason:''});assert.equal(r.status,400);
  const approvedHistory=(await transfers.getProposalTransfers()).p1.transfer_history;
  assert.equal(approvedHistory.length,4);assert.equal(approvedHistory[3].comment,'');assert.equal(approvedHistory[3].actor,'관리자');
  get=await route().GET(new Request('https://example.test/api/proposals?department='+encodeURIComponent('주차관리부')));assert.equal((await get.json()).length,0);
  get=await route().GET(new Request('https://example.test/api/proposals?department='+encodeURIComponent('시설기획부')));assert.equal((await get.json()).length,1);
  get=await route().GET(new Request('https://example.test/api/proposals'));
  assert.equal((await get.json())[0].transfer_history.length,4);
  r=await put({id:'p1',transfer_action:'NOTE',transfer_reviewer:'총괄',transfer_comment:'후속 설명'});assert.equal(r.status,200);
  assert.equal((await transfers.getProposalTransfers()).p1.transfer_status,'APPROVED');
  r=await put({id:'p1',transfer_action:'REQUEST',transfer_target_dept:'주차관리부',transfer_reason:'재검토'});assert.equal(r.status,200);
  r=await put({id:'p1',transfer_action:'REJECT',transfer_comment:42});assert.equal(r.status,400);
  r=await put({id:'p1',transfer_action:'REJECT'});assert.equal(r.status,200);
  let history=(await transfers.getProposalTransfers()).p1.transfer_history;
  assert.equal(history.length,7);assert.equal(history[6].action,'REJECT');assert.equal(proposal.assigned_department,'시설기획부');
  assert.equal(history[0].request_reason,'소관 검토');assert.equal(history[5].request_reason,'재검토');
  rows.set('proposal_transfer_legacy',{id:'proposal_transfer_legacy',description:JSON.stringify({transfer_requested:false,transfer_status:'APPROVED',transfer_reason:'기존 신청'}),updated_at:'2026-01-01T00:00:00Z'});
  assert.equal((await transfers.getProposalTransfers()).legacy.transfer_reason,'기존 신청');
  failRead=true;get=await route().GET(new Request('https://example.test/api/proposals'));assert.equal(get.status,503);
  console.log('PASS: durable request across instances, stale edit preservation, write/read failure, validation, cancellation, approval. No production writes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
