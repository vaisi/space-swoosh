-- supabase/migrations/20261014130000_score_run_clock.sql
-- Changes:
-- - Open Space score clock. start_score_run stamps started_at on the server.
--   submit_verified_score inserts high_scores only when the distance fits
--   the time since that stamp. Cap is 500 km/s: boosted arc cruise is ~430
--   (speed 0.08 of screen height, cruise 1.1, snappy tick 2, boost 1.82),
--   and 500 leaves room for camera catch-up plus a wormhole hop. Grace is
--   5000 km, ten seconds at that cap, so a slow start check-in still accepts
--   a boosted climb. The old 90–110 km/s note in GameConfig is behind this.
-- - Tickets older than 24 hours, already consumed, or for a different flight
--   style are rejected. Call-sign length and character rules match NameFilter.
-- - The public high_scores INSERT policy is left in place. Old builds keep
--   posting raw rows until supabase/cutover/close_raw_high_score_insert.sql
--   is applied by hand after the new iOS build is live.

create schema if not exists private;

create table if not exists public.score_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  consumed_at timestamptz,
  flight_style text not null,
  platform text not null,
  constraint score_runs_flight_style_check check (flight_style in ('arc', 'zigzag')),
  constraint score_runs_platform_check check (platform in ('ios', 'android', 'web'))
);

comment on table public.score_runs is
  'Open Space leaderboard tickets. started_at is the server clock for one run. Consumed on a successful verified submit.';

alter table public.score_runs enable row level security;

revoke all on table public.score_runs from anon, authenticated, public;

create or replace function private.start_score_run(
  p_platform text,
  p_flight_style text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  plat text;
  style text;
  new_id uuid;
begin
  plat := lower(btrim(coalesce(p_platform, '')));
  style := lower(btrim(coalesce(p_flight_style, '')));

  if plat not in ('ios', 'android', 'web') then
    raise exception 'That platform cannot be started.';
  end if;
  if style not in ('arc', 'zigzag') then
    raise exception 'That board cannot be started.';
  end if;

  insert into public.score_runs (flight_style, platform)
  values (style, plat)
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function private.start_score_run(text, text) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.start_score_run(text, text) to anon, authenticated;

create or replace function public.start_score_run(
  p_platform text,
  p_flight_style text
)
returns uuid
language sql
security invoker
set search_path = public, private
as $$
  select private.start_score_run(p_platform, p_flight_style);
$$;

revoke all on function public.start_score_run(text, text) from public;
grant execute on function public.start_score_run(text, text) to anon, authenticated;

create or replace function private.submit_verified_score(
  p_run_id uuid,
  p_score integer,
  p_player_name text,
  p_obstacles integer,
  p_ship_id text,
  p_flight_style text,
  p_platform text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.score_runs%rowtype;
  player text;
  ship text;
  style text;
  plat text;
  elapsed_seconds numeric;
  allowed numeric;
  new_id bigint;
begin
  select * into rec
  from public.score_runs
  where id = p_run_id
  for update;

  if not found then
    raise exception 'This run was not started online.';
  end if;
  if rec.consumed_at is not null then
    raise exception 'This run was already submitted.';
  end if;
  if rec.started_at < clock_timestamp() - interval '24 hours' then
    raise exception 'This run is too old to submit.';
  end if;

  style := lower(btrim(coalesce(p_flight_style, '')));
  if style is distinct from rec.flight_style then
    raise exception 'This run does not match the board.';
  end if;

  if p_score is null or p_score < 0 or p_obstacles is null or p_obstacles < 0 then
    raise exception 'That score cannot be submitted.';
  end if;

  elapsed_seconds := greatest(
    0,
    floor(extract(epoch from (clock_timestamp() - rec.started_at)))
  );
  allowed := elapsed_seconds * 500 + 5000;
  if p_score::numeric > allowed then
    raise exception 'That score is faster than this run allows.';
  end if;

  player := btrim(regexp_replace(coalesce(p_player_name, ''), '\s+', ' ', 'g'));
  if char_length(player) < 2 or char_length(player) > 15 then
    raise exception 'Call sign needs 2–15 characters.';
  end if;
  if player !~ '^[A-Za-z0-9 _.\-]+$' then
    raise exception 'Use letters, numbers, spaces, - _ .';
  end if;

  ship := nullif(btrim(coalesce(p_ship_id, '')), '');
  if ship is not null and not (
    char_length(ship) between 2 and 32
    and ship ~ '^[a-z][a-zA-Z0-9_]*$'
  ) then
    raise exception 'That ship cannot be submitted.';
  end if;

  plat := lower(btrim(coalesce(p_platform, '')));
  if plat not in ('ios', 'android', 'web') then
    plat := rec.platform;
  end if;

  insert into public.high_scores (
    player_name,
    score,
    obstacles_destroyed,
    flight_style,
    platform,
    ship_id
  )
  values (
    player,
    p_score,
    p_obstacles,
    style,
    plat,
    ship
  )
  returning id into new_id;

  update public.score_runs
  set consumed_at = clock_timestamp()
  where id = rec.id;

  return new_id;
end;
$$;

revoke all on function private.submit_verified_score(uuid, integer, text, integer, text, text, text) from public;
grant execute on function private.submit_verified_score(uuid, integer, text, integer, text, text, text) to anon, authenticated;

create or replace function public.submit_verified_score(
  p_run_id uuid,
  p_score integer,
  p_player_name text,
  p_obstacles integer,
  p_ship_id text,
  p_flight_style text,
  p_platform text
)
returns bigint
language sql
security invoker
set search_path = public, private
as $$
  select private.submit_verified_score(
    p_run_id,
    p_score,
    p_player_name,
    p_obstacles,
    p_ship_id,
    p_flight_style,
    p_platform
  );
$$;

revoke all on function public.submit_verified_score(uuid, integer, text, integer, text, text, text) from public;
grant execute on function public.submit_verified_score(uuid, integer, text, integer, text, text, text) to anon, authenticated;
