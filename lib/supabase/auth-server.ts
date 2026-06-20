import { redirect } from "next/navigation";
import { isSupabaseAuthConfigured } from "./env";
import { createSupabaseServerClient } from "./server";

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

  if (!user) {
    redirect("/login");
  }
}
