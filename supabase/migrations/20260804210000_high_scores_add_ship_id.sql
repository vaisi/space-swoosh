-- supabase/migrations/20260804210000_high_scores_add_ship_id.sql
-- Changes:
-- - Added nullable `ship_id` on public.high_scores so Open World submissions
--   record which skin flew the run (displayed on the leaderboard).
-- - INSERT RLS allows null (legacy) or a short camel/snake skin id.

alter table public.high_scores
  add column if not exists ship_id text;

comment on column public.high_scores.ship_id is
  'Skin id flown on the submitted Open World run (e.g. ink, needle). Null for legacy rows.';

drop policy if exists "high_scores_insert_public" on public.high_scores;

create policy "high_scores_insert_public"
  on public.high_scores
  for insert
  to anon, authenticated
  with check (
    char_length(player_name) between 2 and 15
    and score >= 0
    and obstacles_destroyed >= 0
    and (
      ship_id is null
      or (
        char_length(ship_id) between 2 and 32
        and ship_id ~ '^[a-z][a-zA-Z0-9_]*$'
      )
    )
  );
