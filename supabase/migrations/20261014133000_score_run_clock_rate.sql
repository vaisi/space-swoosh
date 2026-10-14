-- supabase/migrations/20261014133000_score_run_clock_rate.sql
-- Changes:
-- - Raises the Open Space clock from 220 km/s + 1760 to 500 km/s + 5000.
-- - 500 sits above a boosted arc climb (~430 km/s) with room for camera
--   catch-up and a wormhole hop. 5000 km is ten seconds at that cap, so a
--   slow start check-in still accepts a real boosted run.
-- - The first clock migration was applied before this cruise check. This
--   file is what updates an already-applied database. Fresh installs get
--   the same numbers from both files.

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
