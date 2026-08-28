-- supabase/migrations/20260828120000_add_platform_to_scores_and_replies.sql
-- Changes:
-- - Nullable `platform` on public.high_scores and public.journey_replies
--   (ios | android | web) so operator queries can split boards by client.
--   Not shown on the public SPACE BOARD.
-- - submit_journey_reply accepts optional p_platform; invalid values store null.
-- - high_scores INSERT RLS allows the new column (null OK for legacy rows).

alter table public.high_scores
  add column if not exists platform text;

alter table public.high_scores
  drop constraint if exists high_scores_platform_check;

alter table public.high_scores
  add constraint high_scores_platform_check
  check (platform is null or platform in ('ios', 'android', 'web'));

comment on column public.high_scores.platform is
  'Client that submitted the Open World score: ios, android, or web. Null for legacy rows.';

alter table public.journey_replies
  add column if not exists platform text;

alter table public.journey_replies
  drop constraint if exists journey_replies_platform_check;

alter table public.journey_replies
  add constraint journey_replies_platform_check
  check (platform is null or platform in ('ios', 'android', 'web'));

comment on column public.journey_replies.platform is
  'Client that sent or skipped the L42 ending: ios, android, or web. Null for legacy rows.';

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
    and (
      platform is null
      or platform in ('ios', 'android', 'web')
    )
  );

drop function if exists public.submit_journey_reply(text, boolean, text);
drop function if exists private.submit_journey_reply(text, boolean, text);

create function private.submit_journey_reply(
  p_body text,
  p_skipped boolean,
  p_ship_id text default null,
  p_platform text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
  cleaned text;
  ship text;
  plat text;
begin
  ship := nullif(btrim(coalesce(p_ship_id, '')), '');
  if ship is not null and not (
    char_length(ship) between 2 and 32
    and ship ~ '^[a-z][a-zA-Z0-9_]*$'
  ) then
    ship := null;
  end if;

  plat := lower(nullif(btrim(coalesce(p_platform, '')), ''));
  if plat is not null and plat not in ('ios', 'android', 'web') then
    plat := null;
  end if;

  if coalesce(p_skipped, false) then
    insert into public.journey_replies (body, skipped, ship_id, platform)
    values (null, true, ship, plat);
  else
    cleaned := nullif(btrim(p_body), '');
    if cleaned is null then
      insert into public.journey_replies (body, skipped, ship_id, platform)
      values (null, true, ship, plat);
    else
      if char_length(cleaned) > 140 then
        raise exception 'reply too long';
      end if;
      insert into public.journey_replies (body, skipped, ship_id, platform)
      values (cleaned, false, ship, plat);
    end if;
  end if;

  select count(*) into n from public.journey_replies;
  return n;
end;
$$;

revoke all on function private.submit_journey_reply(text, boolean, text, text) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.submit_journey_reply(text, boolean, text, text) to anon, authenticated;

create function public.submit_journey_reply(
  p_body text,
  p_skipped boolean,
  p_ship_id text default null,
  p_platform text default null
)
returns bigint
language sql
security invoker
set search_path = public, private
as $$
  select private.submit_journey_reply(p_body, p_skipped, p_ship_id, p_platform);
$$;

revoke all on function public.submit_journey_reply(text, boolean, text, text) from public;
grant execute on function public.submit_journey_reply(text, boolean, text, text) to anon, authenticated;
