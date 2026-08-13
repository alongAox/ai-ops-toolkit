import { LandingPage } from "./components/landing-page";
import { getSessionUser } from "../lib/supabase/auth-server";
import { cookies } from "next/headers";
import { GUEST_SESSION_COOKIE } from "../lib/guest";

export default async function Home() {
  const user = await getSessionUser();
  const store = await cookies();
  const isGuest = store.get(GUEST_SESSION_COOKIE)?.value === "1";
  const isIn = Boolean(user) || isGuest;

  return <LandingPage isAuthenticated={isIn} isGuest={isGuest} />;
}
