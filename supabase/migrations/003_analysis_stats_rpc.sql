-- 在 Supabase Dashboard → SQL Editor 中执行
-- 通过 RPC 聚合 analysis_history 统计（按用户隔离）

create or replace function public.get_analysis_stats(p_user_id uuid default null)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'total', count(*)::int,
    'log_analyzer', count(*) filter (where analysis_type = 'log-analyzer')::int,
    'daily_report', count(*) filter (where analysis_type = 'daily-report')::int,
    'error_explainer', count(*) filter (where analysis_type = 'error-explainer')::int
  )
  from public.analysis_history
  where p_user_id is null or user_id = p_user_id;
$$;

revoke all on function public.get_analysis_stats(uuid) from public;
grant execute on function public.get_analysis_stats(uuid) to service_role;
