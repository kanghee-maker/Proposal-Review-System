const fs = require('fs');
const path = require('path');

// 1. 조직도 매핑 헬퍼 함수
function resolveOrg(rawText, personName) {
  if (!rawText) return { division: '', office: '', department: '' };
  let t = rawText.trim().replace(/\s+/g, ' ');

  // 오타 및 특수 케이스 정규화
  if (t.includes('스마트보부')) t = t.replace('스마트보부', '스마트정보부');
  if (t.includes('추차관리부')) t = t.replace('추차관리부', '주차관리부');
  if (t.includes('체육운영처') && !t.includes('시민회관체육운영처')) t = t.replace('체육운영처', '시민회관체육운영처');
  if (t.includes('판매보상부')) t = t.replace('판매보상부', '판매·보상부');
  
  // 사람 이름이 부서명 뒤에 붙은 경우 (예: 공원수련관관리처 박명진)
  if (t.includes('공원수련관관리처 박명진') || (t === '공원수련관 관리처' && personName === '조준수')) {
    return {
      division: '운영관리본부',
      office: '공원수련관관리처',
      department: '공원운영부'
    };
  }

  // 1) 사장 직속
  if (t.includes('청렴감사단')) {
    return { division: '사장 직속', office: '청렴감사단', department: '청렴감사단' };
  }
  if (t.includes('안전총괄단') || t.includes('안전감사단')) {
    return { division: '사장 직속', office: '안전총괄단', department: '안전총괄단' };
  }

  // 2) 개발사업본부
  if (t.includes('사업계획처') || t.includes('사업계획부') || t.includes('판매·보상부')) {
    const dept = t.includes('판매·보상부') ? '판매·보상부' : '사업계획부';
    return { division: '개발사업본부', office: '사업계획처', department: dept };
  }
  if (t.includes('사업개발처') || t.includes('개발1부') || t.includes('개발2부') || t.includes('개발 1·2부') || t.includes('기술지원부')) {
    let dept = '기술지원부';
    if (t.includes('개발1부')) dept = '개발1부';
    else if (t.includes('개발2부')) dept = '개발2부';
    else if (t.includes('개발 1·2부')) dept = '개발1부·개발2부';
    return { division: '개발사업본부', office: '사업개발처', department: dept };
  }

  // 3) 경영부문
  if (t.includes('경영지원실') || t.includes('총무행정부') || t.includes('재무부') || t.includes('회계부') || t.includes('인사부')) {
    let dept = '총무행정부';
    if (t.includes('재무부')) dept = '재무부';
    else if (t.includes('회계부')) dept = '회계부';
    else if (t.includes('인사부')) dept = '인사부';
    return { division: '경영부문', office: '경영지원실', department: dept };
  }
  if (t.includes('미래전략실') || t.includes('미래혁신부') || t.includes('스마트정보부')) {
    let dept = t.includes('스마트정보부') ? '스마트정보부' : '미래혁신부';
    return { division: '경영부문', office: '미래전략실', department: dept };
  }

  // 4) 운영관리본부
  if (t.includes('시설관리처') || t.includes('시설기획부') || t.includes('시설운영부') || t.includes('주차관리부')) {
    let dept = '시설기획부';
    if (t.includes('시설운영부')) dept = '시설운영부';
    else if (t.includes('주차관리부')) dept = '주차관리부';
    return { division: '운영관리본부', office: '시설관리처', department: dept };
  }
  if (t.includes('시민회관체육운영처') || t.includes('여가체육부') || t.includes('수영부') || t.includes('빙상부') || t.includes('볼링골프부')) {
    let dept = '여가체육부';
    if (t.includes('수영부')) dept = '수영부';
    else if (t.includes('빙상부')) dept = '빙상부';
    else if (t.includes('볼링골프부')) dept = '볼링골프부';
    return { division: '운영관리본부', office: '시민회관체육운영처', department: dept };
  }
  if (t.includes('공원수련관관리처') || t.includes('공원수련관') || t.includes('공원운영부') || t.includes('시설지원부') || t.includes('수련관운영부')) {
    let dept = '공원운영부';
    if (t.includes('시설지원부')) dept = '시설지원부';
    else if (t.includes('수련관운영부')) dept = '수련관운영부';
    return { division: '운영관리본부', office: '공원수련관관리처', department: dept };
  }

  return { division: '공통/기타', office: t, department: t };
}

// 2. CSV 파싱 (따옴표 및 개행 처리)
function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal);
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal);
      rows.push(currentRow);
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal);
    rows.push(currentRow);
  }
  return rows;
}

// 3. CSV 직렬화
function formatCSVRow(arr) {
  return arr.map(cell => {
    const str = String(cell == null ? '' : cell);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }).join(',');
}

// 실행
const rawFile = path.join(__dirname, '../data/proposals_raw.csv');
const rawContent = fs.readFileSync(rawFile, 'utf8');
const rows = parseCSV(rawContent);

const header = rows[0];
console.log('Original Header:', header);

// 새 헤더:
// 제안자 정보: 소속_본부/부문, 소속_처/실/단, 소속_부, 소속_전체
// 실행부서 정보: 실행_본부/부문, 실행_처/실/단, 실행_부, 실행_전체
const newHeader = [
  '연번',
  '게시판번호',
  '제안자',
  '직급',
  '제안자_본부/부문(Division)',
  '제안자_처/실/단(Office)',
  '제안자_부(Department)',
  '제안자_원소속부서',
  '제안구분',
  '분야',
  '실행_본부/부문(Division)',
  '실행_처/실/단(Office)',
  '실행_부(Department)',
  '실행_원부서명',
  '접수일자',
  '제안제목',
  '중복제안 여부',
  '중복제안 제목',
  '평점',
  '과락구분'
];

const processedRows = [newHeader];
const jsonList = [];

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row || row.length < 5 || !row[0]) continue;

  const [
    no, boardNo, proposer, rawDept, rank,
    proposalType, category, rawExecDept,
    submittedAt, title, isDuplicate, dupTitle, score, cutoff
  ] = row;

  const proposerOrg = resolveOrg(rawDept, proposer);
  const execOrg = resolveOrg(rawExecDept, '');

  const newRow = [
    no.trim(),
    boardNo ? boardNo.trim() : '',
    proposer ? proposer.trim() : '',
    rank ? rank.trim() : '',
    proposerOrg.division,
    proposerOrg.office,
    proposerOrg.department,
    rawDept ? rawDept.trim() : '',
    proposalType ? proposalType.trim() : '',
    category ? category.trim() : '',
    execOrg.division,
    execOrg.office,
    execOrg.department,
    rawExecDept ? rawExecDept.trim() : '',
    submittedAt ? submittedAt.trim() : '',
    title ? title.trim() : '',
    isDuplicate ? isDuplicate.trim() : '',
    dupTitle ? dupTitle.trim() : '',
    score ? score.trim() : '',
    cutoff ? cutoff.trim() : ''
  ];

  processedRows.push(newRow);

  jsonList.push({
    no: parseInt(no.trim(), 10),
    board_no: boardNo ? boardNo.trim() : '',
    proposer: proposer ? proposer.trim() : '',
    proposer_rank: rank ? rank.trim() : '',
    proposer_division: proposerOrg.division,
    proposer_office: proposerOrg.office,
    proposer_department: proposerOrg.department,
    proposer_raw_dept: rawDept ? rawDept.trim() : '',
    proposal_type: proposalType ? proposalType.trim() : '',
    category: category ? category.trim() : '',
    assigned_division: execOrg.division,
    assigned_office: execOrg.office,
    assigned_department: execOrg.department,
    assigned_raw_dept: rawExecDept ? rawExecDept.trim() : '',
    submitted_at: submittedAt ? submittedAt.trim() : '',
    title: title ? title.trim() : '',
    is_duplicate: isDuplicate ? isDuplicate.trim() : '',
    duplicate_title: dupTitle ? dupTitle.trim() : ''
  });
}

const csvOutput = processedRows.map(formatCSVRow).join('\r\n');
const targetCsvPath = path.join(__dirname, '../data/proposals_2026_structured.csv');
fs.writeFileSync(targetCsvPath, '\uFEFF' + csvOutput, 'utf8'); // BOM for Excel

const targetJsonPath = path.join(__dirname, '../data/proposals_2026_structured.json');
fs.writeFileSync(targetJsonPath, JSON.stringify(jsonList, null, 2), 'utf8');

console.log(`Successfully processed ${jsonList.length} proposals!`);
console.log('Saved CSV to:', targetCsvPath);
console.log('Saved JSON to:', targetJsonPath);
