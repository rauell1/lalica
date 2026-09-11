-- app_runtime needs USAGE on the app schema (for app.current_user_id() /
-- app.current_role()) and explicit EXECUTE on those two functions; the
-- previous migration granted USAGE on public only.
GRANT USAGE ON SCHEMA app TO app_runtime;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.current_user_id() TO app_runtime;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.current_role() TO app_runtime;
