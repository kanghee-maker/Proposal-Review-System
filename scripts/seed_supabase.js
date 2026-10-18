const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://vkhskdtgvlwlkmgzbpyl.supabase.co';
const supabaseKey = 'sb_publishable_oy_o0E4qYubDWuLpPc-15A_XQCIkO2B';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('🚀 Supabase 데이터베이스 시딩(Seed) 시작...');

  // 1. 조직도 생성
  console.log('1. 조직도 (2026_조직도) 등록 중...');
  const { error: orgErr } = await supabase.from('organization_charts').upsert({
    id: 'org-2026',
    name: '2026_조직도',
    version: '2026-v1.0',
    description: '과천도시공사 2026 조직도'
  });
  if (orgErr) {
    console.error('❌ 조직도 등록 실패 (테이블이 먼저 생성되었는지 확인하세요):', orgErr.message);
    return;
  }

  // 2. 부서 등록
  console.log('2. 부서 (23개 부서) 등록 중...');
  const orgJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/organization_2026.json'), 'utf8'));
  const depts = orgJson.departments.map(d => ({
    code: d.code,
    org_id: 'org-2026',
    division: d.division,
    office: d.office,
    department: d.department,
    name: d.name,
    head_title: d.head_title || '부장'
  }));
  const { error: deptErr } = await supabase.from('departments').upsert(depts);
  if (deptErr) console.error('부서 등록 오류:', deptErr.message);
  else console.log(`✓ 부서 ${depts.length}개 등록 완료`);

  // 3. 제안평가 세션 등록
  console.log('3. 제안평가 기본 세션 등록 중...');
  const defaultCriteria = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/default_evaluation_criteria.json'), 'utf8'));
  const sessionData = {
    id: 'session-2026-gwacheon',
    title: '2026년 상반기 과천도시공사 제안 심사 (0차 부서평가)',
    year: '2026',
    description: '과천도시공사 전 부서 대상 제안평가 0차 부서 타당성 심사 및 검토의견 수렴',
    status: 'ACTIVE',
    proposals_count: 137,
    criteria: defaultCriteria
  };
  const { error: sessErr } = await supabase.from('evaluation_sessions').upsert(sessionData);
  if (sessErr) console.error('세션 등록 오류:', sessErr.message);
  else console.log('✓ 세션 등록 완료');

  // 4. 제안 137건 일괄 등록
  console.log('4. 137건 제안 데이터 등록 중...');
  const proposalsJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/proposals_2026_structured.json'), 'utf8'));
  const proposalsRows = proposalsJson.map(p => ({
    id: `prop-${p.no}`,
    session_id: 'session-2026-gwacheon',
    seq_no: p.no,
    board_no: p.board_no || '',
    proposer_name: p.proposer || '',
    proposer_rank: p.proposer_rank || '',
    proposer_division: p.proposer_division || '',
    proposer_office: p.proposer_office || '',
    proposer_department: p.proposer_department || '',
    proposer_raw_dept: p.proposer_raw_dept || '',
    proposal_type: p.proposal_type || '지정제안',
    category: p.category || '업무개선',
    assigned_division: p.assigned_division || '',
    assigned_office: p.assigned_office || '',
    assigned_department: p.assigned_department || '',
    assigned_raw_dept: p.assigned_raw_dept || '',
    submitted_at: p.submitted_at || '',
    title: p.title || '',
    is_duplicate: p.is_duplicate || '',
    duplicate_title: p.duplicate_title || '',
    status: '미평가'
  }));

  // 50개씩 묶어서 배치 인서트
  for (let i = 0; i < proposalsRows.length; i += 50) {
    const chunk = proposalsRows.slice(i, i + 50);
    const { error: propErr } = await supabase.from('proposals').upsert(chunk);
    if (propErr) {
      console.error(`제안 배치 ${i}~${i + chunk.length} 등록 오류:`, propErr.message);
    } else {
      console.log(`✓ 제안 ${i + 1} ~ ${Math.min(i + 50, proposalsRows.length)}건 등록 완료`);
    }
  }

  console.log('🎉 Supabase 초기 데이터 시딩(Seed) 완료!');
}

seed().catch(console.error);
