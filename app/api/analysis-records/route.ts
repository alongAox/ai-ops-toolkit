import {
  createSupabaseAdmin,
  isSupabaseConfigured,
  type AnalysisRecordRow,
} from "../../../lib/supabase/admin";
import { getSessionUser } from "../../../lib/supabase/auth-server";
import { isSupabaseAuthConfigured } from "../../../lib/supabase/env";
import { NextResponse } from "next/server";

const TABLE = "analysis_history";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function supabaseNotConfiguredResponse() {
  return NextResponse.json(
    {
      error:
        "Supabase 未配置。请在 .env.local 中设置 NEXT_PUBLIC_SUPABASE_URL 与 SUPABASE_SECRET_KEY（或旧版 SUPABASE_SERVICE_ROLE_KEY），并确认已创建 public.analysis_history 表。",
    },
    { status: 503 }
  );
}

function unauthorizedResponse() {
  return NextResponse.json({ error: "请先登录后再操作。" }, { status: 401 });
}

async function resolveUserScope(): Promise<
  { ok: true; userId: string | null; authEnabled: boolean } | { ok: false; response: Response }
> {
  const authEnabled = isSupabaseAuthConfigured();

  if (!authEnabled) {
    return { ok: true, userId: null, authEnabled: false };
  }

  const user = await getSessionUser();
  if (!user) {
    return { ok: false, response: unauthorizedResponse() };
  }

  return { ok: true, userId: user.id, authEnabled: true };
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return supabaseNotConfiguredResponse();
  }

  const scope = await resolveUserScope();
  if (!scope.ok) {
    return scope.response;
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return supabaseNotConfiguredResponse();
  }

  const { searchParams } = new URL(request.url);
  const analysisType = searchParams.get("type")?.trim();
  const limit = Math.min(
    Number(searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT,
    MAX_LIMIT
  );

  let query = supabase
    .from(TABLE)
    .select("id, analysis_type, input_content, result, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (scope.userId) {
    query = query.eq("user_id", scope.userId);
  }

  if (analysisType) {
    query = query.eq("analysis_type", analysisType);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ records: (data ?? []) as AnalysisRecordRow[] });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return supabaseNotConfiguredResponse();
  }

  const scope = await resolveUserScope();
  if (!scope.ok) {
    return scope.response;
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return supabaseNotConfiguredResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效。" }, { status: 400 });
  }

  const analysisType =
    typeof (body as { analysisType?: unknown }).analysisType === "string"
      ? (body as { analysisType: string }).analysisType.trim()
      : "";
  const userInput =
    typeof (body as { userInput?: unknown }).userInput === "string"
      ? (body as { userInput: string }).userInput.trim()
      : "";
  const aiResult =
    typeof (body as { aiResult?: unknown }).aiResult === "string"
      ? (body as { aiResult: string }).aiResult.trim()
      : "";

  if (!analysisType) {
    return NextResponse.json({ error: "缺少 analysisType。" }, { status: 400 });
  }
  if (!userInput) {
    return NextResponse.json({ error: "缺少 userInput。" }, { status: 400 });
  }
  if (!aiResult) {
    return NextResponse.json({ error: "缺少 aiResult。" }, { status: 400 });
  }

  const row: Record<string, string> = {
    analysis_type: analysisType,
    input_content: userInput,
    result: aiResult,
  };

  if (scope.userId) {
    row.user_id = scope.userId;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select("id, analysis_type, input_content, result, created_at, user_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ record: data as AnalysisRecordRow });
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
    return supabaseNotConfiguredResponse();
  }

  const scope = await resolveUserScope();
  if (!scope.ok) {
    return scope.response;
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return supabaseNotConfiguredResponse();
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json({ error: "缺少 id。" }, { status: 400 });
  }

  let query = supabase.from(TABLE).delete().eq("id", id);

  if (scope.userId) {
    query = query.eq("user_id", scope.userId);
  }

  const { data, error } = await query.select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (scope.authEnabled && (!data || data.length === 0)) {
    return NextResponse.json({ error: "记录不存在或无权删除。" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
