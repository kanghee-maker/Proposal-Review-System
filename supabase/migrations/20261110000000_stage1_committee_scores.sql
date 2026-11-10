begin;

create table if not exists public.committee_scores (
    id text primary key,
    proposal_id text not null references public.proposals(id) on delete cascade,
    session_id text not null references public.evaluation_sessions(id) on delete cascade,
    judge_name text not null,
    judge_dept text not null,
    judge_title text not null,
    creativity integer not null check (creativity between 0 and 30),
    feasibility integer not null check (feasibility between 0 and 30),
    effectiveness integer not null check (effectiveness between 0 and 30),
    dissemination integer not null check (dissemination between 0 and 10),
    total_score integer not null,
    opinion text not null,
    submitted_at timestamptz not null default now(),
    is_draft boolean not null default false
);

alter table public.committee_scores add column if not exists is_draft boolean not null default false;
create unique index if not exists committee_scores_submission_key
    on public.committee_scores (session_id, proposal_id, judge_name, is_draft);
alter table public.committee_scores enable row level security;
revoke all on table public.committee_scores from public, anon, authenticated;
grant select, insert, update, delete on table public.committee_scores to service_role;

notify pgrst, 'reload schema';
commit;
