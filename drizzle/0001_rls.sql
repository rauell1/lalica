-- Row Level Security for the six application tables, enforced against a
-- dedicated, non-owner "app_runtime" role. RLS is not evaluated for a
-- table's owner unless FORCE ROW LEVEL SECURITY is set; forcing it would
-- also block Better Auth's own internal writes and the admin bootstrap
-- script, neither of which run inside an actor-scoped transaction. The
-- app connects as app_runtime for all normal traffic (see
-- APP_DATABASE_URL); migrations and one-off scripts keep using the owner
-- connection (DATABASE_URL), which naturally bypasses RLS as the owner.
--
-- Better Auth's own sessions/accounts/verifications tables intentionally
-- have no RLS: they are only ever touched by the Better Auth library
-- itself through one trusted code path, so table-level RLS adds no real
-- protection there and risks breaking sign-in.
-- Created with no usable password; the real password is set separately,
-- directly against each environment's database, and is never committed.
-- See docs/deployment.md.
CREATE ROLE app_runtime LOGIN PASSWORD NULL;
GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  users, content, site_settings, enquiries, media, audit_log
  TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.current_role() RETURNS user_role
LANGUAGE sql STABLE AS $$
  SELECT role FROM users
  WHERE id = app.current_user_id() AND active = true
$$;
--> statement-breakpoint
-- users: self read; administrator reads/writes everyone.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY users_self_select ON users FOR SELECT
  USING (id = app.current_user_id());
--> statement-breakpoint
CREATE POLICY users_admin_all ON users FOR ALL
  USING (app.current_role() = 'administrator')
  WITH CHECK (app.current_role() = 'administrator');
--> statement-breakpoint
-- content: public reads published only; staff read everything;
-- editor/administrator write; administrator only deletes.
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY content_public_read ON content FOR SELECT
  USING (app.current_user_id() IS NULL AND status = 'published');
--> statement-breakpoint
CREATE POLICY content_staff_read ON content FOR SELECT
  USING (app.current_role() IS NOT NULL);
--> statement-breakpoint
CREATE POLICY content_staff_insert ON content FOR INSERT
  WITH CHECK (app.current_role() IN ('administrator', 'editor'));
--> statement-breakpoint
CREATE POLICY content_staff_update ON content FOR UPDATE
  USING (app.current_role() IN ('administrator', 'editor'))
  WITH CHECK (app.current_role() IN ('administrator', 'editor'));
--> statement-breakpoint
CREATE POLICY content_admin_delete ON content FOR DELETE
  USING (app.current_role() = 'administrator');
--> statement-breakpoint
-- media: same shape as content.
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY media_public_read ON media FOR SELECT
  USING (app.current_user_id() IS NULL AND status = 'published');
--> statement-breakpoint
CREATE POLICY media_staff_read ON media FOR SELECT
  USING (app.current_role() IS NOT NULL);
--> statement-breakpoint
CREATE POLICY media_staff_insert ON media FOR INSERT
  WITH CHECK (app.current_role() IN ('administrator', 'editor'));
--> statement-breakpoint
CREATE POLICY media_staff_update ON media FOR UPDATE
  USING (app.current_role() IN ('administrator', 'editor'))
  WITH CHECK (app.current_role() IN ('administrator', 'editor'));
--> statement-breakpoint
CREATE POLICY media_admin_delete ON media FOR DELETE
  USING (app.current_role() = 'administrator');
--> statement-breakpoint
-- site_settings: public and staff read (no draft/published split today);
-- administrator only writes.
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY settings_read ON site_settings FOR SELECT
  USING (app.current_user_id() IS NULL OR app.current_role() IS NOT NULL);
--> statement-breakpoint
CREATE POLICY settings_admin_insert ON site_settings FOR INSERT
  WITH CHECK (app.current_role() = 'administrator');
--> statement-breakpoint
CREATE POLICY settings_admin_update ON site_settings FOR UPDATE
  USING (app.current_role() = 'administrator')
  WITH CHECK (app.current_role() = 'administrator');
--> statement-breakpoint
-- enquiries: public may only insert (the contact form), never read;
-- administrator/enquiry_manager read and update; administrator deletes.
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY enquiries_public_insert ON enquiries FOR INSERT
  WITH CHECK (app.current_user_id() IS NULL);
--> statement-breakpoint
CREATE POLICY enquiries_staff_select ON enquiries FOR SELECT
  USING (app.current_role() IN ('administrator', 'enquiry_manager'));
--> statement-breakpoint
CREATE POLICY enquiries_staff_update ON enquiries FOR UPDATE
  USING (app.current_role() IN ('administrator', 'enquiry_manager'))
  WITH CHECK (app.current_role() IN ('administrator', 'enquiry_manager'));
--> statement-breakpoint
CREATE POLICY enquiries_admin_delete ON enquiries FOR DELETE
  USING (app.current_role() = 'administrator');
--> statement-breakpoint
-- audit_log: administrator reads; any active staff member appends;
-- append-only, no UPDATE/DELETE policy for anyone, ever.
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY audit_admin_select ON audit_log FOR SELECT
  USING (app.current_role() = 'administrator');
--> statement-breakpoint
CREATE POLICY audit_staff_insert ON audit_log FOR INSERT
  WITH CHECK (app.current_role() IS NOT NULL);
