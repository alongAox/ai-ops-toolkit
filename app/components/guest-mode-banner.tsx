"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isGuestSession, exitGuestSession } from "../../lib/guest";

export function GuestModeBanner() {
  const router = useRouter();
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    setIsGuest(isGuestSession());
  }, []);

  if (!isGuest) {
    return null;
  }

  const handleExit = () => {
    exitGuestSession();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs leading-relaxed text-amber-200 lg:px-6">
      <span>
        游客模式：当前分析不会保存到数据库，刷新或退出后将无法找回。登录后可自动保存历史与统计。
      </span>
      <button
        type="button"
        onClick={handleExit}
        className="shrink-0 rounded-md border border-amber-400/40 bg-amber-500/15 px-3 py-1 font-medium text-amber-100 transition-colors hover:bg-amber-500/25"
      >
        退出游客 · 登录
      </button>
    </div>
  );
}
