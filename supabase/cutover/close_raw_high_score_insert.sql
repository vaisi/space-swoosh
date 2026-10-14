-- supabase/cutover/close_raw_high_score_insert.sql
-- Changes:
-- - Drops the public high_scores INSERT policy so a raw score can no longer
--   be posted with the anon key.
-- - NOT a migration. Do not apply until the iOS build that calls
--   start_score_run / submit_verified_score is live on the App Store.
--   Web and Android must be on that same client first.
-- - After this runs, only private.submit_verified_score (security definer)
--   can insert. Installed builds that still insert the table directly will
--   fail to submit until they update.

drop policy if exists "high_scores_insert_public" on public.high_scores;
