const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const jsonPath = path.join(__dirname, '../data/proposals_2026_structured.json');
const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// 엑셀 시트에 들어갈 행 구성
const sheetData = items.map(item => ({
  '연번': item.no,
  '게시판번호': item.board_no,
  '제안자': item.proposer,
  '직급': item.proposer_rank,
  '제안자_본부/부문 (Division)': item.proposer_division,
  '제안자_처/실/단 (Office)': item.proposer_office,
  '제안자_부 (Department)': item.proposer_department,
  '제안자_기존소속표기': item.proposer_raw_dept,
  '제안구분': item.proposal_type,
  '분야': item.category,
  '실행(평가)_본부/부문 (Division)': item.assigned_division,
  '실행(평가)_처/실/단 (Office)': item.assigned_office,
  '실행(평가)_부 (Department)': item.assigned_department,
  '실행(평가)_기존부서표기': item.assigned_raw_dept,
  '접수일자': item.submitted_at,
  '제안제목': item.title,
  '중복제안 여부': item.is_duplicate,
  '중복제안 제목': item.duplicate_title
}));

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(sheetData);

// 열 너비 자동 조정
const colWidths = [
  { wch: 6 },  // 연번
  { wch: 10 }, // 게시판번호
  { wch: 10 }, // 제안자
  { wch: 10 }, // 직급
  { wch: 16 }, // 제안자 본부
  { wch: 18 }, // 제안자 처/실
  { wch: 16 }, // 제안자 부
  { wch: 22 }, // 제안자 기존
  { wch: 10 }, // 제안구분
  { wch: 14 }, // 분야
  { wch: 16 }, // 실행 본부
  { wch: 18 }, // 실행 처/실
  { wch: 16 }, // 실행 부
  { wch: 22 }, // 실행 기존
  { wch: 20 }, // 접수일자
  { wch: 45 }, // 제안제목
  { wch: 12 }, // 중복여부
  { wch: 30 }  // 중복제목
];
ws['!cols'] = colWidths;

XLSX.utils.book_append_sheet(wb, ws, '2026_제안목록');

const outputPath = path.join(__dirname, '../data/2026_과천도시공사_제안목록_구조화.xlsx');
XLSX.writeFile(wb, outputPath);
console.log('Successfully created Excel file at:', outputPath);
