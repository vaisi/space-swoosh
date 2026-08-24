-- supabase/migrations/20260825120000_journey_replies_add_ship_id.sql
-- Changes:
-- - Nullable ship_id on public.journey_replies so the L42 ending stores
--   which roster skin flew the reply, next to the message.
-- - submit_journey_reply accepts optional p_ship_id (same id format as
--   high_scores). Invalid ids store null so a bad ship never drops the reply.
-- - Old 2-arg RPC is dropped; the 3-arg form defaults p_ship_id so older
--   clients that omit it still insert.

alter table public.journey_replies
  add column if not exists ship_id text;

comment on column public.journey_replies.ship_id is
  'Roster skin id flown when the player answered the Journey (e.g. flicker). Null for legacy rows.';

alter table public.journey_replies
  drop constraint if exists journey_replies_ship_id_fmt;

alter table public.journey_replies
  add constraint journey_replies_ship_id_fmt check (
    ship_id is null
    or (
      char_length(ship_id) between 2 and 32
      and ship_id ~ '^[a-z][a-zA-Z0-9_]*$'
    )
  );

drop function if exists public.submit_journey_reply(text, boolean);
drop function if exists private.submit_journey_reply(text, boolean);

create function private.submit_journey_reply(
  p_body text,
  p_skipped boolean,
  p_ship_id text default null
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
begin
  ship := nullif(btrim(coalesce(p_ship_id, '')), '');
  if ship is not null and not (
    char_length(ship) between 2 and 32
    and ship ~ '^[a-z][a-zA-Z0-9_]*$'
  ) then
    ship := null;
  end if;

  if coalesce(p_skipped, false) then
    insert into public.journey_replies (body, skipped, ship_id)
    values (null, true, ship);
  else
    cleaned := nullif(btrim(p_body), '');
    if cleaned is null then
      insert into public.journey_replies (body, skipped, ship_id)
      values (null, true, ship);
    else
      if char_length(cleaned) > 140 then
        raise exception 'reply too long';
      end if;
      insert into public.journey_replies (body, skipped, ship_id)
      values (cleaned, false, ship);
    end if;
  end if;

  select count(*) into n from public.journey_replies;
  return n;
end;
$$;

revoke all on function private.submit_journey_reply(text, boolean, text) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.submit_journey_reply(text, boolean, text) to anon, authenticated;

create function public.submit_journey_reply(
  p_body text,
  p_skipped boolean,
  p_ship_id text default null
)
returns bigint
language sql
security invoker
set search_path = public, private
as $$
  select private.submit_journey_reply(p_body, p_skipped, p_ship_id);
$$;

revoke all on function public.submit_journey_reply(text, boolean, text) from public;
grant execute on function public.submit_journey_reply(text, boolean, text) to anon, authenticated;
