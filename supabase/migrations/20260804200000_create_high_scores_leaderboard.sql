-- supabase/migrations/20260804200000_create_high_scores_leaderboard.sql
-- Changes:
-- - Created Open World leaderboard table on vaisi's Project (ptzaxgslzjefaxdkrvyr).
-- - Anonymous call signs only: public SELECT + INSERT via RLS; no UPDATE/DELETE for anon.
-- - Indexes for DISTANCE (score) and OBSTACLES leaderboard tabs.
--
-- Applied remotely via Supabase MCP; kept in-repo so GitHub ↔ Supabase branching
-- can re-apply the same schema on preview branches / fresh environments.

create table if not exists public.high_scores (
  id bigint generated always as identity primary key,
  player_name text not null,
  score integer not null,
  obstacles_destroyed integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.high_scores enable row level security;

drop policy if exists "high_scores_select_public" on public.high_scores;
drop policy if exists "high_scores_insert_public" on public.high_scores;

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

create index if not exists high_scores_score_desc on public.high_scores (score desc);
create index if not exists high_scores_obstacles_desc on public.high_scores (obstacles_destroyed desc);

comment on table public.high_scores is
  'Open World leaderboard: anonymous call signs, distance (score) and obstacles destroyed.';
