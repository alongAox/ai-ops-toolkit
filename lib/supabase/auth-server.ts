import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isSupabaseAuthConfigured } from "./env";
import { createSupabaseServerClient } from "./server";
import { GUEST_SESSION_COOKIE } from "../guest";

export async function getSessionUser() {
  if (!isSupabaseAuthConfigured()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireAuth() {
  if (!isSupabaseAuthConfigured()) {
    return;
  }

  const user = await getSessionUser();
  if (user) {
    return;
  }

  // 游客模式下免登录即可访问（不写入数据库）
  const store = await cookies();
  if (store.get(GUEST_SESSION_COOKIE)?.value === "1") {
    return;
  }

  redirect("/login");
}
