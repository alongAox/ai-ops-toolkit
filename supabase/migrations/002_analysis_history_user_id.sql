-- 若已执行过旧版 001（无 user_id、公开 RLS），再执行本脚本升级

alter table public.analysis_history
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists analysis_history_user_created_idx
  on public.analysis_history (user_id, created_at desc);

create index if not exists analysis_history_user_type_idx
  on public.analysis_history (user_id, analysis_type);

drop policy if exists "Allow public read analysis_history" on public.analysis_history;
drop policy if exists "Allow public insert analysis_history" on public.analysis_history;
drop policy if exists "Allow public delete analysis_history" on public.analysis_history;

drop policy if exists "Users read own analysis_history" on public.analysis_history;
drop policy if exists "Users insert own analysis_history" on public.analysis_history;
drop policy if exists "Users delete own analysis_history" on public.analysis_history;

create policy "Users read own analysis_history"
  on public.analysis_history
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own analysis_history"
  on public.analysis_history
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users delete own analysis_history"
  on public.analysis_history
  for delete
  to authenticated
  using (auth.uid() = user_id);
