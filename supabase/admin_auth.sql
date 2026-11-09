BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS gcprs_private;
REVOKE ALL ON SCHEMA gcprs_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS gcprs_private.admin_credential (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  password_hash text NOT NULL
);
REVOKE ALL ON TABLE gcprs_private.admin_credential FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.verify_gcprs_admin_password(candidate text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((
    SELECT password_hash = extensions.crypt(candidate, password_hash)
    FROM gcprs_private.admin_credential
    WHERE singleton
  ), false);
$$;

REVOKE ALL ON FUNCTION public.verify_gcprs_admin_password(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_gcprs_admin_password(text) TO service_role;

COMMIT;

-- SQL Editor에서 아래 문장을 별도로 실행해 비밀번호를 등록하거나 변경합니다.
-- INSERT INTO gcprs_private.admin_credential (singleton, password_hash)
-- VALUES (true, extensions.crypt('여기에_비밀번호_입력', extensions.gen_salt('bf', 12)))
-- ON CONFLICT (singleton) DO UPDATE SET password_hash = EXCLUDED.password_hash;
