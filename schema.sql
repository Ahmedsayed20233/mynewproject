create table if not exists public.flosy_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"settings":{},"transactions":[]}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.flosy_data enable row level security;
revoke all on public.flosy_data from anon;
grant select,insert,update,delete on public.flosy_data to authenticated;
create policy "flosy_select_own" on public.flosy_data for select to authenticated using ((select auth.uid())=user_id);
create policy "flosy_insert_own" on public.flosy_data for insert to authenticated with check ((select auth.uid())=user_id);
create policy "flosy_update_own" on public.flosy_data for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "flosy_delete_own" on public.flosy_data for delete to authenticated using ((select auth.uid())=user_id);