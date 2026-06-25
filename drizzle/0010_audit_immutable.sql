-- Make audit_log append-only at the database level (E9-S3 / B-015).
-- The app already never exposes update/delete routes; this enforces it in
-- Postgres so even a compromised app, a stray query, or a mistaken migration
-- cannot rewrite or remove history.

CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_log_no_mutation ON audit_log;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_mutation
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_log_no_truncate ON audit_log;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
