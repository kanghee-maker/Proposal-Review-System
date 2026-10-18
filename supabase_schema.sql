-- 과천도시공사 제안 평가 시스템 Supabase DDL Schema
-- Supabase 대시보드 -> SQL Editor 에서 아래 전체를 붙여넣고 "Run"을 실행하세요.

-- 1. 조직도 테이블 (2026_조직도 등 버전 관리)
CREATE TABLE IF NOT EXISTS public.organization_charts (
    id TEXT PRIMARY KEY DEFAULT 'org-2026',
    name TEXT NOT NULL DEFAULT '2026_조직도',
    version TEXT NOT NULL DEFAULT '2026-v1.0',
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 부서 테이블 (본부/부문 - 처/실/단 - 부 3단 계층)
CREATE TABLE IF NOT EXISTS public.departments (
    code TEXT PRIMARY KEY,
    org_id TEXT REFERENCES public.organization_charts(id) ON DELETE CASCADE DEFAULT 'org-2026',
    division TEXT NOT NULL,      -- 본부 / 부문 (Division)
    office TEXT NOT NULL,        -- 처 / 실 / 단 (Office)
    department TEXT NOT NULL,    -- 부 (Department)
    name TEXT NOT NULL,          -- 전체 표기명
    head_title TEXT DEFAULT '부장'
);

-- 3. 제안평가 회차/세션 테이블
CREATE TABLE IF NOT EXISTS public.evaluation_sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    year TEXT NOT NULL DEFAULT '2026',
    description TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    proposals_count INT DEFAULT 0,
    criteria JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 제안 테이블 (137건 및 신규 등록 제안)
CREATE TABLE IF NOT EXISTS public.proposals (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES public.evaluation_sessions(id) ON DELETE CASCADE,
    seq_no INT NOT NULL,
    board_no TEXT,
    proposer_name TEXT NOT NULL,
    proposer_rank TEXT,
    proposer_division TEXT,
    proposer_office TEXT,
    proposer_department TEXT,
    proposer_raw_dept TEXT,
    proposal_type TEXT DEFAULT '지정제안',
    category TEXT DEFAULT '업무개선',
    assigned_division TEXT NOT NULL,
    assigned_office TEXT NOT NULL,
    assigned_department TEXT NOT NULL,
    assigned_raw_dept TEXT,
    submitted_at TEXT,
    title TEXT NOT NULL,
    content TEXT,
    is_duplicate TEXT DEFAULT '',
    duplicate_title TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT '미평가',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 0차 부서평가 답변 테이블
CREATE TABLE IF NOT EXISTS public.evaluations (
    id TEXT PRIMARY KEY,
    proposal_id TEXT REFERENCES public.proposals(id) ON DELETE CASCADE,
    session_id TEXT REFERENCES public.evaluation_sessions(id) ON DELETE CASCADE,
    department_name TEXT NOT NULL,
    evaluator_name TEXT,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_submitted BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) 활성화 및 Anon 권한 허용 (배포 및 테스트용)
ALTER TABLE public.organization_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write on organization_charts" ON public.organization_charts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on departments" ON public.departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on evaluation_sessions" ON public.evaluation_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on proposals" ON public.proposals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on evaluations" ON public.evaluations FOR ALL USING (true) WITH CHECK (true);
