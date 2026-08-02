-- supabase/rls.sql
-- Changes:
-- - Created: Row Level Security for high_scores. Run in the Supabase SQL editor
--   before / as part of the store launch. The anon key is public; RLS is what
--   stops anyone from updating or wiping the board.
--
-- Goal: anyone can read the leaderboard and insert a new row; nobody can
-- update or delete via the anon key. (Cleanup of abusive names is a dashboard
-- / service-role task, not a client privilege.)

alter table public.high_scores enable row level security;

-- Drop older policies if you re-run this file.
drop policy if exists "high_scores_select_public" on public.high_scores;
drop policy if exists "high_scores_insert_public" on public.high_scores;
drop policy if exists "high_scores_no_update" on public.high_scores;
drop policy if exists "high_scores_no_delete" on public.high_scores;

create policy "high_scores_select_public"
  on public.high_scores
  for select
  to anon, authenticated
  using (true);

create policy "high_scores_insert_public"
  on public.high_scores
  for insert
  to anon, authenticated
  with check (
    char_length(player_name) between 2 and 15
    and score >= 0
    and obstacles_destroyed >= 0
  );

-- No update / delete policies for anon → denied by default when RLS is on.

-- Optional: index for the common leaderboard sorts.
create index if not exists high_scores_score_desc on public.high_scores (score desc);
create index if not exists high_scores_obstacles_desc on public.high_scores (obstacles_destroyed desc);
