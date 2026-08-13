import {
  createSupabaseAdmin,
  isSupabaseConfigured,
} from "../../../../lib/supabase/admin";
import {
  DAILY_REPORT_TYPE,
  ERROR_EXPLAINER_TYPE,
  LOG_ANALYZER_TYPE,
  type AnalysisStats,
} from "../../../../lib/analysis-records";
import { getSessionUser } from "../../../../lib/supabase/auth-server";
import { isSupabaseAuthConfigured } from "../../../../lib/supabase/env";
import { GUEST_SESSION_COOKIE } from "../../../../lib/guest";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const TABLE = "analysis_history";

function supabaseNotConfiguredResponse() {
  return NextResponse.json(
    {
      error:
        "Supabase 未配置。请在 .env.local 中设置 NEXT_PUBLIC_SUPABASE_URL 与 SUPABASE_SECRET_KEY。",
    },
    { status: 503 }
  );
}

function unauthorizedResponse() {
  return NextResponse.json({ error: "请先登录后再操作。" }, { status: 401 });
}

type RpcStatsRow = {
  total: number;
  log_analyzer: number;
  daily_report: number;
  error_explainer: number;
};

function mapRpcStats(row: RpcStatsRow): AnalysisStats {
  return {
    total: row.total ?? 0,
    logAnalyzer: row.log_analyzer ?? 0,
    dailyReport: row.daily_report ?? 0,
    errorExplainer: row.error_explainer ?? 0,
  };
}

async function countByType(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  analysisType: string,
  userId: string | null
): Promise<number> {
  let query = supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("analysis_type", analysisType);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function fetchStatsFromSupabase(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  userId: string | null
): Promise<AnalysisStats> {
  const { data, error } = await supabase.rpc("get_analysis_stats", {
    p_user_id: userId,
  });

  if (!error && data && typeof data === "object") {
    return mapRpcStats(data as RpcStatsRow);
  }

  if (error && !error.message.includes("Could not find the function")) {
    throw new Error(error.message);
  }

  const [logAnalyzer, errorExplainer, dailyReport] = await Promise.all([
    countByType(supabase, LOG_ANALYZER_TYPE, userId),
    countByType(supabase, ERROR_EXPLAINER_TYPE, userId),
    countByType(supabase, DAILY_REPORT_TYPE, userId),
  ]);

  return {
    total: logAnalyzer + errorExplainer + dailyReport,
    logAnalyzer,
    errorExplainer,
    dailyReport,
  };
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return supabaseNotConfiguredResponse();
  }

  const authEnabled = isSupabaseAuthConfigured();
  let userId: string | null = null;

  if (authEnabled) {
    const user = await getSessionUser();
    if (!user) {
      // 游客模式：统计全部为 0（不写入数据库，也无历史可读）
      const store = await cookies();
      if (store.get(GUEST_SESSION_COOKIE)?.value === "1") {
        return NextResponse.json({
          stats: {
            total: 0,
            logAnalyzer: 0,
            dailyReport: 0,
            errorExplainer: 0,
          },
        });
      }
      return unauthorizedResponse();
    }
    userId = user.id;
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return supabaseNotConfiguredResponse();
  }

  try {
    const stats = await fetchStatsFromSupabase(supabase, userId);
    return NextResponse.json({ stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "统计加载失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
