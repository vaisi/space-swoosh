-- supabase/migrations/20260809160000_high_scores_add_flight_style.sql
-- Changes:
-- - Added `flight_style` so Arc and Zigzag Open Space runs land on separate boards.
-- - Default `'zigzag'` keeps every existing row on the Zigzag leaderboard.
-- - Composite indexes power per-style DISTANCE / OBSTACLES sorts.
-- - INSERT RLS requires flight_style in ('arc', 'zigzag').

alter table public.high_scores
  add column if not exists flight_style text not null default 'zigzag';

alter table public.high_scores
  drop constraint if exists high_scores_flight_style_check;

alter table public.high_scores
  add constraint high_scores_flight_style_check
  check (flight_style in ('arc', 'zigzag'));

comment on column public.high_scores.flight_style is
  'Flight style for the run: arc or zigzag. Legacy rows default to zigzag.';

create index if not exists high_scores_flight_style_score_desc
  on public.high_scores (flight_style, score desc);

create index if not exists high_scores_flight_style_obstacles_desc
  on public.high_scores (flight_style, obstacles_destroyed desc);

drop policy if exists "high_scores_insert_public" on public.high_scores;

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
