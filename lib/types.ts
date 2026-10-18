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

export interface EvaluationSession {
  id: string;
  title: string;
  year: string;
  description: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  created_at: string;
  proposals_count: number;
  criteria: EvaluationCriteria[];
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
  content?: string;
  expected_effect?: string;
  is_duplicate: string;
  duplicate_title: string;
  status: '미평가' | '평가작성중' | '평가완료';
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
