"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDocument,
  IconLogo,
  IconTerminal,
} from "./dashboard-icons";

const NAV_ITEMS = [
  { href: "/log-analyzer", label: "日志分析器", icon: IconTerminal },
  { href: "/daily-report", label: "日报生成器", icon: IconDocument },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800/80 bg-[#0b0f14]/95">
      <div className="flex h-14 items-center gap-3 border-b border-slate-800/80 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10">
          <IconLogo />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-slate-100">
            AI Analyzer
          </p>
          <p className="text-[11px] text-slate-500">运维智能平台</p>
        </div>
      </div>

      <nav className="flex-1 p-3">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
          功能菜单
        </p>
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(`${href}/`);

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "border border-emerald-500/30 bg-emerald-500/10 font-medium text-emerald-400"
                      : "border border-transparent text-slate-400 hover:border-slate-700/80 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${isActive ? "text-emerald-400" : "text-slate-500"}`}
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
