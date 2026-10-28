-- Run after setting SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) on the server.
-- Take a database backup first. This migration changes permissions/functions only;
-- it does not delete, truncate or replace proposals, scores, attachments or passwords.
BEGIN;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['organization_charts','departments','evaluation_sessions','proposals','evaluations','committee_scores']
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.set_department_passwords(changes jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE existing jsonb; merged jsonb;
BEGIN
  IF jsonb_typeof(changes) <> 'object' THEN RAISE EXCEPTION 'Invalid password changes'; END IF;
  INSERT INTO public.organization_charts(id, name, version, description)
    VALUES('dept_passwords_store','department_passwords','2026-v1.0','{}')
    ON CONFLICT(id) DO NOTHING;
  SELECT COALESCE(NULLIF(description, '')::jsonb, '{}'::jsonb) INTO existing
    FROM public.organization_charts WHERE id = 'dept_passwords_store' FOR UPDATE;
  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb) INTO merged
    FROM jsonb_each(existing || changes) WHERE value <> '""'::jsonb AND value <> 'null'::jsonb;
  UPDATE public.organization_charts SET description = merged::text, updated_at = now() WHERE id = 'dept_passwords_store';
END $$;
REVOKE ALL ON FUNCTION public.set_department_passwords(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_department_passwords(jsonb) TO service_role;

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS transfer_requested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS transfer_target_dept text,
  ADD COLUMN IF NOT EXISTS transfer_reason text,
  ADD COLUMN IF NOT EXISTS transfer_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS transfer_status text;

CREATE OR REPLACE FUNCTION public.save_department_evaluation(evaluation jsonb, allow_admin boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  PERFORM p.id FROM public.proposals p JOIN public.evaluation_sessions s ON s.id = p.session_id
    WHERE p.id = evaluation->>'proposal_id' AND p.session_id = evaluation->>'session_id'
      AND p.assigned_department = evaluation->>'department_name' AND s.status = 'ACTIVE'
      AND COALESCE(to_jsonb(s)->>'stage', 'STAGE_0') = 'STAGE_0'
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(s.criteria, '[]'::jsonb)) c WHERE c->>'key' = 'creativity')
    FOR UPDATE OF p, s;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal/session mismatch';
  END IF;
  IF NOT allow_admin AND EXISTS(SELECT 1 FROM public.evaluations WHERE proposal_id = evaluation->>'proposal_id' AND session_id = evaluation->>'session_id' AND is_submitted) THEN
    RAISE EXCEPTION 'Evaluation is already submitted';
  END IF;
  INSERT INTO public.evaluations(id,proposal_id,session_id,department_name,evaluator_name,answers,is_submitted,submitted_at,updated_at)
    VALUES(evaluation->>'id',evaluation->>'proposal_id',evaluation->>'session_id',evaluation->>'department_name',evaluation->>'evaluator_name',evaluation->'answers',
      (evaluation->>'is_submitted')::boolean,(evaluation->>'submitted_at')::timestamptz,(evaluation->>'updated_at')::timestamptz)
    ON CONFLICT(id) DO UPDATE SET answers=EXCLUDED.answers,department_name=EXCLUDED.department_name,evaluator_name=EXCLUDED.evaluator_name,
      is_submitted=EXCLUDED.is_submitted,submitted_at=EXCLUDED.submitted_at,updated_at=EXCLUDED.updated_at
    WHERE evaluations.proposal_id=EXCLUDED.proposal_id AND evaluations.session_id=EXCLUDED.session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Evaluation identity conflict'; END IF;
  UPDATE public.proposals SET status=CASE WHEN (evaluation->>'is_submitted')::boolean THEN '평가완료' ELSE '평가작성중' END
    WHERE id=evaluation->>'proposal_id';
END $$;
REVOKE ALL ON FUNCTION public.save_department_evaluation(jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_department_evaluation(jsonb, boolean) TO service_role;
COMMIT;
