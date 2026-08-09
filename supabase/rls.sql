-- supabase/rls.sql
-- Changes:
-- - INSERT with-check now requires flight_style in ('arc', 'zigzag') to match
--   migrations/20260809160000_high_scores_add_flight_style.sql.
-- - Documented as a re-runnable policy patch; the canonical schema lives in
--   migrations/ (already applied to vaisi's Project). Keep this file for
--   store-compliance checklists that point at it.
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
    and flight_style in ('arc', 'zigzag')
    and (
      ship_id is null
      or (
        char_length(ship_id) between 2 and 32
        and ship_id ~ '^[a-z][a-zA-Z0-9_]*$'
      )
    )
  );

-- No update / delete policies for anon → denied by default when RLS is on.

-- Optional: indexes for the common leaderboard sorts.
create index if not exists high_scores_score_desc on public.high_scores (score desc);
create index if not exists high_scores_obstacles_desc on public.high_scores (obstacles_destroyed desc);
create index if not exists high_scores_flight_style_score_desc
  on public.high_scores (flight_style, score desc);
create index if not exists high_scores_flight_style_obstacles_desc
  on public.high_scores (flight_style, obstacles_destroyed desc);
