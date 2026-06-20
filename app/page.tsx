import { LandingPage } from "./components/landing-page";
import { getSessionUser } from "../lib/supabase/auth-server";

export default async function Home() {
  const user = await getSessionUser();

  return <LandingPage isAuthenticated={Boolean(user)} />;
}
