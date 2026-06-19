import { AppSidebar } from "../../components/app-sidebar";
import { WelcomeBanner } from "../../components/welcome-banner";
import { requireAuth } from "../../../lib/supabase/auth-server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAuth();

  return (
    <div className="dashboard-bg flex min-h-screen text-slate-100">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <WelcomeBanner />
        {children}
      </div>
    </div>
  );
}
