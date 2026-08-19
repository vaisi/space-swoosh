-- supabase/migrations/20260819220000_create_journey_replies.sql
-- Changes:
-- - Journey written-epilogue replies. Bodies are stored but not publicly
--   readable (anonymous lights in-game). Anon submits only through the
--   security-definer RPC, which returns the live COUNT(*) ordinal.
-- - Skip inserts a null body with skipped=true and still increments N.

create schema if not exists private;

create table if not exists public.journey_replies (
  id bigint generated always as identity primary key,
  body text,
  skipped boolean not null default false,
  created_at timestamptz not null default now(),
  constraint journey_replies_body_len check (body is null or char_length(body) between 1 and 140)
);

alter table public.journey_replies enable row level security;

revoke all on table public.journey_replies from anon, authenticated, public;

comment on table public.journey_replies is
  'Journey epilogue answers. Bodies are private; in-game lights imply others without showing text.';

create or replace function private.submit_journey_reply(p_body text, p_skipped boolean)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
  cleaned text;
begin
  if coalesce(p_skipped, false) then
    insert into public.journey_replies (body, skipped) values (null, true);
  else
    cleaned := nullif(btrim(p_body), '');
    if cleaned is null then
      insert into public.journey_replies (body, skipped) values (null, true);
    else
      if char_length(cleaned) > 140 then
        raise exception 'reply too long';
      end if;
      insert into public.journey_replies (body, skipped) values (cleaned, false);
    end if;
  end if;

  select count(*) into n from public.journey_replies;
  return n;
end;
$$;

revoke all on function private.submit_journey_reply(text, boolean) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.submit_journey_reply(text, boolean) to anon, authenticated;

create or replace function public.submit_journey_reply(p_body text, p_skipped boolean)
returns bigint
language sql
security invoker
set search_path = public, private
as $$
  select private.submit_journey_reply(p_body, p_skipped);
$$;

revoke all on function public.submit_journey_reply(text, boolean) from public;
grant execute on function public.submit_journey_reply(text, boolean) to anon, authenticated;
