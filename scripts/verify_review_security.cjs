// Integration tests use a disposable local Supabase stub and a temporary data directory.
// No request or write is sent to the production database or the repository's data folder.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const {spawn} = require('node:child_process');
const {randomBytes,createHmac,createHash} = require('node:crypto');
const root=path.resolve(__dirname,'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gcprs-security-'));
const catalog=require('../data/proposal_source_catalog.json');
const original=JSON.parse(fs.readFileSync(path.join(root,'data/proposals_store.json'),'utf8'));
const defaults=JSON.parse(fs.readFileSync(path.join(root,'data/proposals_2026_structured.json'),'utf8'));
const a=defaults[0],b=defaults[1];
const adminPass=randomBytes(20).toString('hex'),secret=randomBytes(32).toString('hex');
let passwords={'테스트A':'department-test-A','테스트B':'department-test-B'};
const sessions=[{id:'s-active',title:'부서평가',stage:'STAGE_0',status:'ACTIVE',year:'2026',criteria:[{key:'result',required:true},{key:'opinion',required:true}]},
 {id:'s-closed',title:'마감',stage:'STAGE_0',status:'CLOSED',criteria:[]},
 {id:'s-stage1',title:'심사',stage:'STAGE_1',status:'ACTIVE',criteria:[{key:'creativity'}]},
 {id:'s-draft',title:'초안',stage:'STAGE_0',status:'DRAFT',criteria:[]}];
const make=(raw,id,dept,session='s-active')=>({...original[0],id,session_id:session,board_no:raw.board_no,seq_no:1,title:raw.title,proposer_name:raw.proposer,assigned_department:dept,assigned_office:dept,assigned_raw_dept:dept,status:'미평가',attachments:[]});
let proposals=[make(a,'p-a','테스트A'),make(b,'p-b','테스트B'),make(a,'p-closed','테스트A','s-closed'),make(a,'p-stage1','테스트A','s-stage1'),make(a,'p-draft','테스트A','s-draft'),make(defaults.find(p=>p.board_no==='126'),'p-video','테스트A')];
let evaluations=[];let failSave=false;let rpcSaves=0;
for(const file of fs.readdirSync(path.join(root,'data')).filter(f=>f.endsWith('.json') && f!=='auth_store.json'))fs.copyFileSync(path.join(root,'data',file),path.join(temp,file));
fs.writeFileSync(path.join(temp,'sessions.json'),JSON.stringify(sessions));
fs.writeFileSync(path.join(temp,'proposals_store.json'),JSON.stringify(proposals));
fs.writeFileSync(path.join(temp,'evaluations_store.json'),'[]');
const response=(res,value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
const stub=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');let body='';for await(const c of req)body+=c;
 if(url.pathname.endsWith('/rpc/set_department_passwords')){
  const {changes}=JSON.parse(body);for(const [d,p] of Object.entries(changes)){if(p)passwords[d]=p;else delete passwords[d];}return response(res,null);
 }
 if(url.pathname.endsWith('/rpc/save_department_evaluation')){
  rpcSaves++;if(failSave)return response(res,{message:'simulated DB failure',code:'XX000'},500);
  const {evaluation:e}=JSON.parse(body);evaluations=[...evaluations.filter(x=>x.proposal_id!==e.proposal_id),e];return response(res,null);
 }
 const table=url.pathname.split('/').at(-1);let rows=[];
 if(table==='organization_charts')rows=[{id:'dept_passwords_store',description:JSON.stringify(passwords)}];
 if(table==='departments')rows=[{code:'A',department:'테스트A',office:'테스트',division:'테스트',name:'테스트A'},{code:'B',department:'테스트B',office:'테스트',division:'테스트',name:'테스트B'}];
 if(table==='evaluation_sessions')rows=sessions;
 if(table==='proposals')rows=proposals;
 if(table==='evaluations')rows=evaluations;
 for(const [key,value] of url.searchParams)if(value.startsWith('eq.'))rows=rows.filter(x=>String(x[key])===value.slice(3));
 if(req.method==='PATCH'&&table==='proposals'){
  const change=JSON.parse(body);rows.forEach(p=>Object.assign(p,change));return response(res,null);
 }
 if((req.headers.accept||'').includes('vnd.pgrst.object'))return response(res,rows[0]||null);
 return response(res,rows);
});
let app;
async function call(base,url,{cookie,method='GET',body,origin}={}){
 const headers={};if(cookie)headers.Cookie=cookie;if(body!==undefined)headers['Content-Type']='application/json';if(origin)headers.Origin=origin;
 const r=await fetch(base+url,{method,headers,body:body!==undefined?JSON.stringify(body):undefined,redirect:'manual'});
 let data;const bytes=Buffer.from(await r.arrayBuffer());try{data=JSON.parse(bytes.toString());}catch{data=bytes;}
 return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0],headers:r.headers,bytes};
}
async function run(){
 await new Promise(resolve=>stub.listen(0,'127.0.0.1',resolve));
 const stubPort=stub.address().port;const port=3116;const base=`http://127.0.0.1:${port}`;
 app=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','-p',String(port)],{cwd:root,env:{...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',PROPOSAL_DATA_DIR:temp,SUPABASE_URL:`http://127.0.0.1:${stubPort}`,SUPABASE_SECRET_KEY:'isolated-stub-key',AUTH_SESSION_SECRET:secret,ADMIN_PASSWORD:adminPass,ADMIN_PASSWORD_HASH:''},stdio:['ignore','pipe','pipe']});
 let logs='';app.stdout.on('data',d=>logs+=d);app.stderr.on('data',d=>logs+=d);
 for(let i=0;i<80;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,250));}if(i===79)throw Error(logs);}
 const paths=['/api/admin/passwords','/api/sessions','/api/proposals','/api/evaluations','/api/stage1/scores','/api/export','/api/sample-excel','/api/proposals/attachments?id=x'];
 for(const url of paths)assert.equal((await call(base,url)).status,401,url);
 assert.equal((await call(base,'/admin')).status,307);
 assert.equal((await call(base,'/api/auth/department',{method:'POST',body:{dept:'테스트A',password:'0423'}})).status,401);
 const login=await call(base,'/api/auth/department',{method:'POST',body:{dept:'테스트A',password:passwords['테스트A']}});assert.equal(login.status,200);assert(login.cookie);assert.match(login.headers.get('set-cookie'),/HttpOnly/i);assert.match(login.headers.get('set-cookie'),/SameSite=strict/i);
 const cookie=login.cookie;
 assert.equal((await call(base,'/api/admin/passwords',{cookie})).status,403);
 assert.equal((await call(base,'/api/stage1/scores',{cookie})).status,403);
 assert.equal((await call(base,'/api/proposals?department='+encodeURIComponent('테스트B'),{cookie})).data.length,0);
 const visible=(await call(base,'/api/proposals',{cookie})).data;
 assert.deepEqual(visible.map(p=>p.id).sort(),['p-a','p-closed','p-video']);
 assert.equal((await call(base,'/api/proposals?id=p-b',{cookie})).data,null);
 const foreign=(await call(base,'/api/proposals',{cookie:(await call(base,'/api/auth/admin',{method:'POST',body:{password:adminPass}})).cookie})).data.find(p=>p.id==='p-b');
 assert.equal((await call(base,foreign.attachments[0].static_url,{cookie})).status,400);
 const attachment=visible.find(p=>p.id==='p-a').attachments[0];
 assert.equal((await call(base,attachment.static_url)).status,401);
 const downloaded=await call(base,attachment.static_url,{cookie}); if(downloaded.status!==200) console.error("Download diagnostic", attachment.static_url, downloaded.data, "API id status", (await call(base,"/api/proposals/attachments?id="+encodeURIComponent(attachment.id)+"&download=1",{cookie})).status, "API source status", (await call(base,"/api/proposals/attachments?source="+encodeURIComponent(attachment.static_url),{cookie})).status); assert.equal(downloaded.status,200);
 assert.equal(createHash('sha256').update(downloaded.bytes).digest('hex'),attachment.sha256);
 const video=visible.find(p=>p.id==='p-video').attachments.find(a=>a.type==='video/mp4');
 const videoDownload=await call(base,video.static_url,{cookie});assert.equal(videoDownload.status,200);assert(videoDownload.bytes.length>4.5*1024*1024);assert.equal(createHash('sha256').update(videoDownload.bytes).digest('hex'),video.sha256);
 const evalBody={proposal_id:'p-a',session_id:'s-active',department_name:'테스트B',is_submitted:false,answers:{result:'Yes',opinion:'테스트'}};
 assert.equal((await call(base,'/api/evaluations',{cookie,method:'POST',body:{...evalBody,proposal_id:'p-b'}})).status,403);
 assert.equal((await call(base,'/api/evaluations',{cookie,method:'POST',body:{...evalBody,proposal_id:'p-closed',session_id:'s-closed'}})).status,409);
 assert.equal((await call(base,'/api/evaluations',{cookie,method:'POST',origin:'https://attacker.invalid',body:evalBody})).status,403);
 assert.equal((await call(base,'/api/evaluations',{cookie,method:'POST',body:{...evalBody,is_submitted:true,answers:{result:'Yes'}}})).status,400);
 failSave=true;assert.equal((await call(base,'/api/evaluations',{cookie,method:'POST',body:evalBody})).status,500);assert.equal(evaluations.length,0);failSave=false;
 const saved=await call(base,'/api/evaluations',{cookie,method:'POST',body:{...evalBody,id:'foreign-id'}});assert.equal(saved.status,200);assert.equal(evaluations[0].department_name,'테스트A');assert.notEqual(evaluations[0].id,'foreign-id');
 assert.equal((await call(base,'/api/evaluations',{cookie,method:'POST',body:{...evalBody,is_submitted:true}})).status,200);
 assert.equal((await call(base,'/api/evaluations',{cookie,method:'POST',body:evalBody})).status,409);
 evaluations.push({id:'foreign',proposal_id:'p-b',session_id:'s-active',department_name:'테스트B',answers:{opinion:'PRIVATE'}});
 assert.equal((await call(base,'/api/evaluations',{cookie})).data.length,1);
 assert.equal((await call(base,'/api/proposals',{cookie,method:'PUT',body:{...proposals[0],assigned_department:'テストB',transfer_requested:true,transfer_target_dept:'테스트B',transfer_reason:'요청'}})).status,200);
 assert.equal(proposals[0].assigned_department,'테스트A');
 const admin=await call(base,'/api/auth/admin',{method:'POST',body:{password:adminPass}});assert.equal(admin.status,200);
 const result=await call(base,'/api/admin/passwords',{cookie:admin.cookie});assert.equal(result.status,200);assert(result.data.departments.every(d=>!('password' in d)));
 assert.equal((await call(base,'/api/admin/passwords',{cookie:admin.cookie,method:'POST',body:{passwords:{'테스트B':'new-test-password-B'}}})).status,200);
 assert(passwords['테스트B'].startsWith('scrypt$'));assert.equal(passwords['테스트A'],'department-test-A');
 assert.equal((await call(base,'/api/auth/department',{method:'POST',body:{dept:'테스트B',password:'new-test-password-B'}})).status,200);
 // A signed cookie must not survive a password change.
 assert.equal((await call(base,'/api/admin/passwords',{cookie:admin.cookie,method:'POST',body:{passwords:{'테스트A':'new-test-password-A'}}})).status,200);
 assert.equal((await call(base,'/api/proposals',{cookie})).status,401);
 const token=cookie.split('=')[1];const parts=decodeURIComponent(token).split('.');
 const payload=JSON.parse(Buffer.from(parts[0],'base64url'));payload.role='ADMIN';
 const forged=`gcprs_session=${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${parts[1]}`;
 assert.equal((await call(base,'/api/admin/passwords',{cookie:forged})).status,401);
 const expiredPayload={...payload,exp:Math.floor(Date.now()/1000)-1};const data=Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');const expired=`gcprs_session=${data}.${createHmac('sha256',secret).update(data).digest('base64url')}`;
 assert.equal((await call(base,'/api/admin/passwords',{cookie:expired})).status,401);
 const logout=await call(base,'/api/auth/logout',{cookie:admin.cookie,method:'POST',body:{}});assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/i);
 for(let i=0;i<11;i++){const r=await call(base,'/api/auth/department',{method:'POST',body:{dept:'unknown-account',password:'wrong'}});assert.equal(r.status,i<10?401:429);}
 assert(rpcSaves>=2);
 console.log('PASS security HTTP integration: auth, role/department scopes, direct file URLs, forged/expired/revoked cookies, CSRF, password hashes and unchanged departments, draft save, closed sessions, DB failure, throttling, logout. Production DB untouched.');
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{app?.kill();stub.close();console.log('Disposable fixtures:',temp);});
