-- Idempotent Postgres roles for vanilla Postgres (VPS / CI).
-- Supabase already has service_role; VPS and GitHub Actions do not.
-- Run BEFORE `prisma migrate deploy` when applying from scratch.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'jms_tenant') THEN
    CREATE ROLE jms_tenant NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'postgres') THEN
    GRANT jms_tenant TO postgres;
  END IF;
END
$$;

DO $$
BEGIN
  EXECUTE format('GRANT jms_tenant TO %I', current_user);
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END
$$;

GRANT USAGE ON SCHEMA public TO jms_tenant;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jms_tenant;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jms_tenant;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO jms_tenant;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO jms_tenant;
