import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  applyAuthCookieOptions,
  buildRememberPreferenceCookie,
  parseRememberDays,
} from "../../../../lib/supabase/cookie-options";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseAuthConfigured,
} from "../../../../lib/supabase/env";

export async function POST(request: Request) {
  if (!isSupabaseAuthConfigured()) {
    return NextResponse.json({ error: "Supabase Auth 未配置。" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效。" }, { status: 400 });
  }

  const email =
    typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email.trim()
      : "";
  const password =
    typeof (body as { password?: unknown }).password === "string"
      ? (body as { password: string }).password
      : "";
  const rememberDays = parseRememberDays(
    String((body as { rememberDays?: unknown }).rememberDays ?? "0")
  );

  if (!email || !password) {
    return NextResponse.json({ error: "请填写邮箱和密码。" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const url = getSupabaseUrl()!;
  const key = getSupabasePublishableKey()!;
  let response = NextResponse.json({ ok: true });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const finalOptions = applyAuthCookieOptions(options, rememberDays);
          response.cookies.set(name, value, finalOptions);
        });
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const rememberCookie = buildRememberPreferenceCookie(rememberDays);
  response.cookies.set(
    rememberCookie.name,
    rememberCookie.value,
    rememberCookie.options
  );

  return response;
}
