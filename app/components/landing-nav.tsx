"use client";

import { IconLogo } from "./dashboard-icons";
import Link from "next/link";
import { useState } from "react";

type LandingNavProps = {
  isAuthenticated: boolean;
  primaryHref: string;
  primaryLabel: string;
};

const NAV_LINKS = [
  { href: "#intro", label: "项目介绍" },
  { href: "#features", label: "功能特性" },
  { href: "#workflow", label: "使用流程" },
  { href: "#tech", label: "技术栈" },
] as const;

export function LandingNav({
  isAuthenticated,
  primaryHref,
  primaryLabel,
}: LandingNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0b0f14]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <IconLogo />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">AI Analyzer</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-emerald-500/80">
              Ops Intelligence
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!isAuthenticated && (
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              登录
            </Link>
          )}
          <Link
            href={primaryHref}
            className="btn-primary rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(16,185,129,0.25)]"
          >
            {primaryLabel}
          </Link>
        </div>

        <button
          type="button"
          aria-label="打开菜单"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-300 md:hidden"
        >
          {mobileOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/5 bg-[#0b0f14]/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-white/5 pt-4">
            {!isAuthenticated && (
              <Link
                href="/login"
                className="rounded-lg border border-slate-700 px-4 py-3 text-center text-sm font-medium text-slate-300"
              >
                登录
              </Link>
            )}
            <Link
              href={primaryHref}
              className="btn-primary rounded-lg px-4 py-3 text-center text-sm font-semibold text-white"
            >
              {primaryLabel}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
