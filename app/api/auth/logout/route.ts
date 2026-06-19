import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { AUTH_REMEMBER_DAYS_COOKIE } from "../../../../lib/supabase/cookie-options";
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    /* ignore when auth not configured */
  }

  response.cookies.set(AUTH_REMEMBER_DAYS_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });

  return response;
}
