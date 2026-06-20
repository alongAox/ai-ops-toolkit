-- 在 Supabase Dashboard → SQL Editor 中执行（全新建表）

create table if not exists public.analysis_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  analysis_type text not null,
  input_content text not null,
  result text not null,
  user_id uuid references auth.users (id) on delete cascade
);

create index if not exists analysis_history_user_created_idx
  on public.analysis_history (user_id, created_at desc);

create index if not exists analysis_history_user_type_idx
  on public.analysis_history (user_id, analysis_type);

alter table public.analysis_history enable row level security;

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
