const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(JSON.stringify(data)) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, raw: body });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, raw: body });
        }
      });
    });

    req.on('error', err => reject(err));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

const results = [];
function assert(name, condition, details = '') {
  if (condition) {
    results.push({ name, pass: true, details });
    console.log(`  [PASS] ${name}`);
  } else {
    results.push({ name, pass: false, details });
    console.error(`  [FAIL] ${name} - ${details}`);
  }
}

async function runVerification() {
  console.log('=====================================================');
  console.log(' 과천도시공사 제안 평가 시스템 전체 기능 동작 검증 시작 ');
  console.log('=====================================================\n');

  // 1. 관리자 인증 검증
  console.log('▶ [1] 관리자 인증 기능 검증 (/api/auth/admin)');
  {
    const wrong = await request('POST', '/api/auth/admin', { password: 'wrong' });
    assert('관리자 잘못된 비밀번호 거절 (401)', wrong.status === 401 && !wrong.data.success);

    const right = await request('POST', '/api/auth/admin', { password: '0423' });
    assert('관리자 올바른 비밀번호 인증 성공 (0423)', right.status === 200 && right.data.success);
  }

  // 2. 관리자 부서 비밀번호 발급 및 4자리 Random 관리
  console.log('\n▶ [2] 관리자 부서 비밀번호 발급/관리 검증 (/api/admin/passwords)');
  let testDept = '총무행정부';
  let testPassword = '8821';
  {
    const listRes = await request('GET', '/api/admin/passwords');
    assert('전체 부서 비밀번호 명단 조회', listRes.status === 200 && listRes.data.departments && listRes.data.departments.length >= 20);

    const saveRes = await request('POST', '/api/admin/passwords', {
      dept: testDept,
      password: testPassword
    });
    assert(`특정 부서 [${testDept}] 4자리 비밀번호 발급 및 저장`, saveRes.status === 200 && saveRes.data.success);

    // Verify it is saved
    const recheck = await request('GET', '/api/admin/passwords');
    const found = recheck.data.departments.find(d => d.department === testDept);
    assert(`발급된 비밀번호 일치 확인 (${testDept} -> ${found?.password})`, found && found.password === testPassword);
  }

  // 3. 부서 평가자 로그인 검증 (/api/auth/department)
  console.log('\n▶ [3] 부서 평가자 로그인 검증 (/api/auth/department)');
  {
    // A) 발급된 4자리 번호로 로그인
    const validLogin = await request('POST', '/api/auth/department', {
      dept: testDept,
      password: testPassword
    });
    assert('관리자가 발급한 4자리 번호로 부서 로그인 성공', validLogin.status === 200 && validLogin.data.success);

    // B) 잘못된 번호로 로그인
    const invalidLogin = await request('POST', '/api/auth/department', {
      dept: testDept,
      password: '0000'
    });
    assert('잘못된 부서 비밀번호 로그인 거부 (401)', invalidLogin.status === 401 && !invalidLogin.data.success);

    // C) 관리자 스페셜 테스트 번호 0423으로 로그인
    const masterLogin = await request('POST', '/api/auth/department', {
      dept: testDept,
      password: '0423'
    });
    assert('관리자 스페셜 비밀번호(0423) 테스트 모드 로그인 성공', masterLogin.status === 200 && masterLogin.data.isTestMode);

    // D) 미발급 부서 접속 시 안내 거부
    const unsetDept = '미발급_가상부서_테스트';
    const unsetLogin = await request('POST', '/api/auth/department', {
      dept: unsetDept,
      password: '9999'
    });
    assert('미발급 부서 접속 시 관리자 발급 요청 안내 거부', unsetLogin.status === 401 && unsetLogin.data.message?.includes('관리자'));
  }

  // 4. 평가 회차 관리 및 Flow 강제 정책 검증 (/api/sessions)
  console.log('\n▶ [4] 평가 회차 생성 및 1차 단독 생성 차단 Flow 검증 (/api/sessions)');
  let createdSessionId = '';
  {
    // A) 1차 제안심사 직접 생성 시도 -> 반드시 차단되어야 함
    const directStage1 = await request('POST', '/api/sessions', {
      title: '불법 1차 심사 직접 생성 시도',
      stage: 'STAGE_1'
    });
    assert('1차 제안심사 직접 신규 생성 차단 (400 Bad Request)', directStage1.status === 400 && !directStage1.data.success);

    // B) 정상적인 0차 부서평가 생성 (신규 엑셀 직접 업로드 제안 2건 탑재)
    const newSessionRes = await request('POST', '/api/sessions', {
      title: '2026년 하반기 제안 심사 (동작검증 0차 부서평가)',
      year: '2026',
      stage: 'STAGE_0',
      proposals: [
        {
          seq_no: 1,
          board_no: 'TEST-001',
          proposer_name: '홍길동',
          proposer_department: '기획예산부',
          assigned_department: testDept,
          title: '스마트 전자결재 및 자동 회계 정산 시스템 도입',
          content: '업무 효율성 증진 및 페이퍼리스 추진'
        },
        {
          seq_no: 2,
          board_no: 'TEST-002',
          proposer_name: '이몽룡',
          proposer_department: '개발1부',
          assigned_department: testDept,
          title: '관내 체육공원 태양광 스마트 벤치 설치 건',
          content: '시민 휴게 편의 및 친환경 에너지 활용'
        }
      ]
    });
    assert('0차 부서평가 회차 생성 및 사용자 제안 DB 자동 구축', newSessionRes.status === 200 && newSessionRes.data.success && newSessionRes.data.session.id);
    createdSessionId = newSessionRes.data.session.id;
  }

  // 5. 제안 목록 및 부서별 배정 검증 (/api/proposals)
  console.log('\n▶ [5] 제안 목록 조회 및 부서 배정 검증 (/api/proposals)');
  let testProposalId1 = '';
  let testProposalId2 = '';
  {
    const propList = await request('GET', `/api/proposals?session_id=${encodeURIComponent(createdSessionId)}`);
    assert('신규 생성 회차 제안 2건 정상 조회', propList.status === 200 && Array.isArray(propList.data) && propList.data.length === 2);
    testProposalId1 = propList.data[0].id;
    testProposalId2 = propList.data[1].id;

    // 부서별 필터링
    const deptProps = await request('GET', `/api/proposals?session_id=${encodeURIComponent(createdSessionId)}&department=${encodeURIComponent(testDept)}`);
    assert(`부서 [${testDept}] 배정 제안 필터링 조회`, deptProps.status === 200 && deptProps.data.length === 2);

    // 부서 이관 요청 (담당부서 변경 요청)
    const transferRes = await request('PUT', '/api/proposals', {
      id: testProposalId2,
      transfer_requested: true,
      transfer_target_dept: '시설기획부',
      transfer_reason: '소관 업무 분장 확인에 따른 이관 요청'
    });
    assert('제안 실행부서 이관(변경) 요청 처리', transferRes.status === 200 && transferRes.data.success);
  }

  // 6. 부서 평가자 0차 심사 제출 검증 (/api/evaluations)
  console.log('\n▶ [6] 부서 평가자 0차 심사(Yes/No 및 의견) 제출 검증 (/api/evaluations)');
  {
    // 제안 1: 채택 (Yes)
    const eval1 = await request('POST', '/api/evaluations', {
      proposal_id: testProposalId1,
      session_id: createdSessionId,
      department_name: testDept,
      evaluator_name: `${testDept} 부서장`,
      answers: {
        result: 'Yes',
        opinion: '전사적 업무 능률 향상 및 예산 절감 기대되므로 적극 채택 추진함.'
      },
      is_submitted: true
    });
    assert('부서 평가자 제안 #1 타당성 심사(Yes 채택) 제출', eval1.status === 200 && eval1.data.success);

    // 제안 2: 불채택 (No)
    const eval2 = await request('POST', '/api/evaluations', {
      proposal_id: testProposalId2,
      session_id: createdSessionId,
      department_name: testDept,
      evaluator_name: `${testDept} 부서장`,
      answers: {
        result: 'No',
        opinion: '기존 공원 환경 및 관리 예산 소요 대비 실익 부족.'
      },
      is_submitted: true
    });
    assert('부서 평가자 제안 #2 타당성 심사(No 불채택) 제출', eval2.status === 200 && eval2.data.success);

    // 평가 상태 반영 확인
    const checkProps = await request('GET', `/api/proposals?session_id=${encodeURIComponent(createdSessionId)}`);
    const p1 = checkProps.data.find(p => p.id === testProposalId1);
    assert('평가 완료 후 제안 상태 [평가완료] 업데이트 확인', p1 && p1.status === '평가완료');
  }

  // 7. 0차 결과 취합 및 엑셀 다운로드 검증 (/api/export)
  console.log('\n▶ [7] 0차 결과 집계 및 엑셀 다운로드 검증 (/api/export)');
  {
    const exportRes = await request('GET', `/api/export?session_id=${encodeURIComponent(createdSessionId)}`);
    assert('종합 결과 엑셀(XLSX) 다운로드 응답 (200 OK)', exportRes.status === 200 && exportRes.raw.length > 500);
  }

  // 8. Flow 강제 연계: 0차 완료 결과 기반 1차 제안심사 회차 연계 (/api/stage1/bridge)
  console.log('\n▶ [8] Flow 2단계 연계: 0차 채택 제안 -> 1차 제안심사 연계 (/api/stage1/bridge)');
  let stage1SessionId = '';
  {
    const bridgeRes = await request('POST', '/api/stage1/bridge', {
      sourceSessionId: createdSessionId,
      newTitle: '2026년 하반기 제안 심사 (동작검증 1차 위원회심사)',
      filterOnlyYes: true
    });
    assert('0차 채택(Yes) 결과로 1차 제안심사 연계 생성', bridgeRes.status === 200 && bridgeRes.data.success && bridgeRes.data.proposalsCount === 1);
    stage1SessionId = bridgeRes.data.session.id;

    // 1차 회차 속성 검증
    const s1Props = await request('GET', `/api/proposals?session_id=${encodeURIComponent(stage1SessionId)}`);
    assert('1차 심사 대상에 0차 Yes 제안 1건만 선별 이관 확인', s1Props.status === 200 && s1Props.data.length === 1);
    assert('0차 부서 검토의견이 1차 제안 데이터로 안전하게 연계 보존됨', s1Props.data[0].stage0_opinion && s1Props.data[0].stage0_result === 'Yes');
  }

  // 9. 1차 제안심사 위원회 다면 채점 검증 (/api/stage1/scores)
  console.log('\n▶ [9] 1차 제안심사 위원회 다면 채점 검증 (/api/stage1/scores)');
  {
    const s1Props = await request('GET', `/api/proposals?session_id=${encodeURIComponent(stage1SessionId)}`);
    const stage1PropId = s1Props.data[0].id;

    // 심사위원 채점 등록
    const scoreRes = await request('POST', '/api/stage1/scores', {
      scores: [
        {
          proposal_id: stage1PropId,
          session_id: stage1SessionId,
          judge_name: '박민호',
          judge_dept: '경영감사실',
          judge_title: '제안1차심사자',
          creativity: 24,
          feasibility: 22,
          effectiveness: 23,
          dissemination: 21,
          total_score: 90,
          opinion: '시스템 완성도와 실현 가능성이 높아 적극 추천합니다.'
        }
      ]
    });
    assert('1차 심사위원 다면 채점(창의·실현·효과·전파) 등록', scoreRes.status === 200 && scoreRes.data.success);

    // 심사위원 점수 조회
    const getScores = await request('GET', `/api/stage1/scores?session_id=${encodeURIComponent(stage1SessionId)}&proposal_id=${encodeURIComponent(stage1PropId)}`);
    assert('등록된 심사위원 채점 데이터 조회 확인', getScores.status === 200 && Array.isArray(getScores.data) && getScores.data.length >= 1 && getScores.data[0].total_score === 90);
  }

  // 10. 관리자 회차 삭제 (0423 인증) 검증
  console.log('\n▶ [10] 관리자 회차 삭제 비밀번호 재검증 (/api/sessions DELETE)');
  {
    const wrongDel = await request('DELETE', '/api/sessions', { id: createdSessionId, password: 'wrong' });
    assert('비밀번호 불일치 시 회차 삭제 차단 (401)', wrongDel.status === 401 && !wrongDel.data.success);

    const rightDel1 = await request('DELETE', '/api/sessions', { id: stage1SessionId, password: '0423' });
    assert('1차 심사 회차 영구 삭제 성공 (비밀번호 0423)', rightDel1.status === 200 && rightDel1.data.success);

    const rightDel0 = await request('DELETE', '/api/sessions', { id: createdSessionId, password: '0423' });
    assert('0차 부서평가 회차 영구 삭제 성공 (비밀번호 0423)', rightDel0.status === 200 && rightDel0.data.success);
  }

  // 종합 결과 출력
  console.log('\n=====================================================');
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = total - passed;
  console.log(` 검증 완료 요약: 총 ${total}개 항목 중 ${passed}개 통과 (실패: ${failed}개)`);
  console.log('=====================================================');

  if (failed === 0) {
    console.log('🎉 모든 관리자 및 평가자 기능이 100% 정상 작동합니다!');
  } else {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('검증 실행 중 예기치 않은 오류 발생:', err);
  process.exit(1);
});
