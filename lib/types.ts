export type Role = 'ADMIN' | 'EVALUATOR';

export interface Department {
  code: string;
  division: string;   // 본부 / 부문 (Division)
  office: string;     // 처 / 실 / 단 (Office)
  department: string; // 부 (Department)
  name: string;
  head_title?: string;
}

export interface OrganizationChart {
  name: string;
  version: string;
  updated_at: string;
  description: string;
  departments: Department[];
}

export interface EvaluationCriteria {
  id: string;
  key: string;
  label: string;
  type: 'RADIO' | 'SELECT' | 'TEXT' | 'TEXTAREA' | 'NUMBER';
  options?: string[];
  required: boolean;
  display_order: number;
  description?: string;
}

export type EvaluationStage = 'STAGE_0' | 'STAGE_1'; // STAGE_0: 부서평가(0차), STAGE_1: 제안심사(1차)

export interface CommitteeJudge {
  id: string;
  name: string;
  dept: string;
  title: string; // 예: '제안1차심사자'
}

export const DEFAULT_STAGE1_JUDGES: CommitteeJudge[] = [
  { id: 'j-1', name: '박민호', dept: '경영감사실', title: '제안1차심사자' },
  { id: 'j-2', name: '유경모', dept: '미래전략실', title: '제안1차심사자' },
  { id: 'j-3', name: '배규한', dept: '교육시설부', title: '제안1차심사자' },
  { id: 'j-4', name: '곽현석', dept: '시설기획부', title: '제안1차심사자' },
  { id: 'j-5', name: '김동수', dept: '시설기획부', title: '제안1차심사자' },
  { id: 'j-6', name: '이정문', dept: '시설기획부', title: '제안1차심사자' },
  { id: 'j-7', name: '박종원', dept: '사업기획부', title: '제안1차심사자' },
  { id: 'j-8', name: '김수호', dept: '개발1부', title: '제안1차심사자' },
  { id: 'j-9', name: '최종순', dept: '여가체육부', title: '제안1차심사자' },
  { id: 'j-10', name: '이기범', dept: '솔빛정원부', title: '제안1차심사자' },
  { id: 'j-11', name: '오세풍', dept: '안전총괄단', title: '제안1차심사자' }
];

export interface CommitteeScore {
  id: string;
  proposal_id: string;
  session_id: string;
  judge_id?: string;
  judge_name: string;
  judge_dept: string;
  judge_title: string;
  creativity: number;    // 창의성
  feasibility: number;   // 실현성
  effectiveness: number; // 효과성
  dissemination: number; // 전파성
  total_score: number;   // 총점
  opinion: string;       // 의견
  submitted_at?: string;
}

export interface EvaluationSession {
  id: string;
  title: string;
  year: string;
  description: string;
  stage?: EvaluationStage; // 기본 'STAGE_0'
  source_session_id?: string; // 0차에서 연계 생성된 경우 출처 세션 ID
  judges?: CommitteeJudge[]; // 1차 평가 심사위원단
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  created_at: string;
  proposals_count: number;
  criteria: EvaluationCriteria[];
}

export interface ProposalAttachment {
  id: string;
  proposal_id: string;
  name: string;
  size: number;
  type: string;
  uploaded_at: string;
  data_url?: string;
  static_url?: string;
}

export interface ProposalExtraSheet {
  sheetName: string;
  rows: string[][];
}

export interface Proposal {
  id: string;
  session_id: string;
  seq_no: number;
  board_no: string;
  proposer_name: string;
  proposer_rank: string;
  proposer_division: string;
  proposer_office: string;
  proposer_department: string;
  proposer_raw_dept: string;
  proposal_type: string;
  category: string;
  assigned_division: string;
  assigned_office: string;
  assigned_department: string;
  assigned_raw_dept: string;
  assigned_dept_code?: string;
  submitted_at: string;
  title: string;
  background?: string;
  content?: string;
  expected_effect?: string;
  attachment_note?: string;
  extra_sheets?: ProposalExtraSheet[];
  is_duplicate: string;
  duplicate_title: string;
  status: '미평가' | '평가작성중' | '평가완료';
  attachments?: ProposalAttachment[];
  transfer_requested?: boolean;
  transfer_target_dept?: string;
  transfer_reason?: string;
  transfer_requested_at?: string;
  transfer_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  // 0차 부서평가 연계 정보
  stage0_result?: string;
  stage0_opinion?: string;
  stage0_dept?: string;
  // 1차 제안심사 전용 정보
  contribution_rate?: number; // 기여율 (%) - 기본 100
  stage1_is_closed?: boolean; // 1차마감여부 (YES/NO)
  stage1_decision?: '미결' | '채택' | '불채택' | '심사중' | string; // 심사결과
  stage1_avg_score?: number; // 심사위원 평균 총점
  stage1_review_date?: string; // 심사일자
}

export interface Evaluation {
  id: string;
  proposal_id: string;
  session_id: string;
  department_name: string;
  evaluator_name: string;
  answers: {
    result?: 'Yes' | 'No' | string;
    opinion?: string;
    [key: string]: any;
  };
  is_submitted: boolean;
  submitted_at?: string;
  updated_at: string;
}

