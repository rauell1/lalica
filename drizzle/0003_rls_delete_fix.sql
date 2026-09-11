-- The original delete policies restricted content/media deletes to
-- administrator only, but the app's actual permission model
-- (src/lib/auth/roles.ts) grants deleteContent/deleteMedia to editors too
-- (canEditContent/canUploadMedia are both true for editor). Fix the
-- policies to match the real permission matrix instead of a guess.
DROP POLICY content_admin_delete ON content;
--> statement-breakpoint
CREATE POLICY content_staff_delete ON content FOR DELETE
  USING (app.current_role() IN ('administrator', 'editor'));
--> statement-breakpoint
DROP POLICY media_admin_delete ON media;
--> statement-breakpoint
CREATE POLICY media_staff_delete ON media FOR DELETE
  USING (app.current_role() IN ('administrator', 'editor'));
