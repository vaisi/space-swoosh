-- supabase/migrations/20261017162000_reset_space_board_epoch.sql
-- Changes: Space Board public reads start after the newest row that
-- existed when this ran. Older high_scores stay in the table and are
-- not listed. Applied remotely via Supabase MCP.
--
-- Next reset: update private.leaderboard_epoch set opened_at = clock_timestamp() where id = 1;

create table if not exists private.leaderboard_epoch (
  id integer primary key,
  opened_at timestamptz not null
);

insert into private.leaderboard_epoch (id, opened_at)
select 1, coalesce(max(created_at), clock_timestamp()) + interval '1 millisecond'
from public.high_scores
on conflict (id) do update
set opened_at = excluded.opened_at;

create or replace function private.leaderboard_opened_at()
returns timestamptz
language sql
stable
security definer
set search_path = private, public
as $$
  select opened_at from private.leaderboard_epoch where id = 1;
$$;

revoke all on function private.leaderboard_opened_at() from public;
grant execute on function private.leaderboard_opened_at() to anon, authenticated;

drop policy if exists high_scores_select_public on public.high_scores;
create policy high_scores_select_public
  on public.high_scores
  for select
  to anon, authenticated
  using (created_at >= private.leaderboard_opened_at());

comment on table private.leaderboard_epoch is
  'Space Board season open. Public reads of high_scores hide rows older than opened_at.';
