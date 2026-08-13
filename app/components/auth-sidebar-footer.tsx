"use client";

import { ToastPopup } from "./toast-popup";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { isSupabaseAuthConfigured } from "../../lib/supabase/env";
import { formatWelcomeMessage } from "../../lib/supabase/user-display";
import { isGuestSession, exitGuestSession } from "../../lib/guest";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function AuthSidebarFooter() {
  const router = useRouter();
  const [welcomeText, setWelcomeText] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [showLogoutToast, setShowLogoutToast] = useState(false);

  useEffect(() => {
    if (!isSupabaseAuthConfigured()) return;

    const guest = isGuestSession();
    setIsGuest(guest);

    // 游客态下无需拉取 Supabase 用户
    if (guest) return;

    const supabase = createSupabaseBrowserClient();

    const syncUser = (email: string | undefined, metadata?: Record<string, unknown>) => {
      if (!email) {
        setWelcomeText(null);
        return;
      }
      setWelcomeText(formatWelcomeMessage(email, metadata));
    };

    void supabase.auth.getUser().then(({ data: { user } }) => {
      syncUser(user?.email, user?.user_metadata);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUser(session?.user.email, session?.user.user_metadata);
    });

    return () => subscription.unsubscribe();
  }, []);

  const completeLogout = useCallback(async () => {
    try {
      if (isSupabaseAuthConfigured()) {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
      }

      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
      setShowLogoutToast(false);
    }
  }, [router]);

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setShowLogoutToast(true);
  };

  const handleExitGuest = useCallback(() => {
    exitGuestSession();
    router.push("/login");
    router.refresh();
  }, [router]);

  if (!isSupabaseAuthConfigured()) {
    return null;
  }

  // 游客模式：展示提示并提供"退出游客"入口
  if (isGuest) {
    return (
      <div className="border-t border-slate-800/80 p-3">
        <div className="mb-2 flex items-center gap-2 px-2 text-xs text-amber-400">
          <span className="status-dot status-dot--live" />
          游客模式
        </div>
        <button
          type="button"
          onClick={handleExitGuest}
          className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800"
        >
          退出游客 · 登录
        </button>
      </div>
    );
  }

  return (
    <>
      {showLogoutToast && (
        <ToastPopup
          message="Logout"
          variant="neutral"
          onDone={() => void completeLogout()}
        />
      )}
      <div className="border-t border-slate-800/80 p-3">
        {welcomeText && (
          <p className="mb-2 px-2 text-xs leading-relaxed text-slate-300">
            {welcomeText}
          </p>
        )}
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoggingOut ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </>
  );
}
