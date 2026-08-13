import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { AUTH_REMEMBER_DAYS_COOKIE } from "../../../../lib/supabase/cookie-options";
import { GUEST_SESSION_COOKIE } from "../../../../lib/guest";
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
  response.cookies.set(GUEST_SESSION_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });

  return response;
}
