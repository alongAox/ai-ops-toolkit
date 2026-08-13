"use client";

import { IconLogo } from "../../components/dashboard-icons";
import { isSupabaseAuthConfigured } from "../../../lib/supabase/env";
import {
  AUTH_REMEMBER_EMAIL_KEY,
  REMEMBER_DAY_OPTIONS,
  type RememberDays,
} from "../../../lib/supabase/cookie-options";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";
import { AUTH_WELCOME_STORAGE_KEY } from "../../../lib/supabase/user-display";
import { enterGuestSession, exitGuestSession } from "../../../lib/guest";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type AuthMode = "signin" | "signup";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");

  const authConfigured = isSupabaseAuthConfigured();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(false);
  const [rememberDays, setRememberDays] = useState<RememberDays>(7);
  const [error, setError] = useState(
    callbackError === "auth_callback_failed" ? "登录回调失败，请重试。" : ""
  );
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem(AUTH_REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberLogin(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authConfigured || isLoading) return;

    setIsLoading(true);
    setError("");
    setNotice("");

    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      if (!trimmedEmail || !trimmedPassword) {
        setError("请填写邮箱和密码。");
        return;
      }

      if (mode === "signin") {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmedEmail,
            password: trimmedPassword,
            rememberDays: rememberLogin ? rememberDays : 0,
          }),
        });

        let data: { error?: string; ok?: boolean } = {};
        try {
          data = await response.json();
        } catch {
          setError("登录服务响应异常，请重启 dev 服务器后重试。");
          return;
        }

        if (!response.ok) {
          setError(data.error ?? "登录失败。");
          return;
        }

        if (rememberLogin) {
          localStorage.setItem(AUTH_REMEMBER_EMAIL_KEY, trimmedEmail);
        } else {
          localStorage.removeItem(AUTH_REMEMBER_EMAIL_KEY);
        }

        sessionStorage.setItem(AUTH_WELCOME_STORAGE_KEY, trimmedEmail);
        exitGuestSession();
        router.push("/");
        router.refresh();
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setNotice("注册成功。若项目开启了邮箱验证，请查收邮件后再登录。");
      setMode("signin");
    } catch {
      setError("登录服务不可用，请检查 Supabase 配置。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestEnter = () => {
    enterGuestSession();
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="dashboard-bg flex min-h-screen items-center justify-center p-4">
      <div className="dashboard-panel w-full max-w-md p-6 sm:p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
            <IconLogo className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-100">
            AI Analyzer
          </h1>
          <p className="mt-1 text-sm text-slate-500">运维智能平台登录</p>
        </div>

        {!authConfigured && (
          <div
            className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300"
            role="alert"
          >
            未配置 Supabase Auth。请在 .env.local 设置{" "}
            <code className="text-amber-200">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>
            。未配置时可直接{" "}
            <Link href="/log-analyzer" className="underline">
              进入系统
            </Link>
            。
          </div>
        )}

        <div className="mb-6 flex rounded-lg border border-slate-800 bg-[#080c10] p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
              mode === "signin"
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
              mode === "signup"
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400"
              role="alert"
            >
              {error}
            </div>
          )}
          {notice && (
            <div
              className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400"
              role="status"
            >
              {notice}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-medium text-slate-400"
            >
              邮箱
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!authConfigured || isLoading}
              className="w-full rounded-lg border border-slate-700 bg-[#080c10] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-500/50 disabled:opacity-50"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium text-slate-400"
            >
              密码
            </label>
            <input
              id="password"
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!authConfigured || isLoading}
              className="w-full rounded-lg border border-slate-700 bg-[#080c10] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-500/50 disabled:opacity-50"
              placeholder="至少 6 位"
            />
          </div>

          {mode === "signin" && (
            <div className="space-y-3 rounded-lg border border-slate-800 bg-[#080c10]/60 px-3 py-3">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={rememberLogin}
                  onChange={(e) => setRememberLogin(e.target.checked)}
                  disabled={!authConfigured || isLoading}
                  className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-[#080c10] text-emerald-500 focus:ring-emerald-500/40 disabled:opacity-50"
                />
                <span className="text-xs leading-relaxed text-slate-400">
                  记住登录状态
                  <span className="mt-1 block text-[11px] text-slate-600">
                    未勾选时关闭浏览器后需重新登录；密码不会被保存，仅浏览器可记住密码。
                  </span>
                </span>
              </label>

              {rememberLogin && (
                <div>
                  <label
                    htmlFor="remember-days"
                    className="mb-1.5 block text-[11px] font-medium text-slate-500"
                  >
                    自动登录有效期
                  </label>
                  <select
                    id="remember-days"
                    value={rememberDays}
                    onChange={(e) =>
                      setRememberDays(Number(e.target.value) as RememberDays)
                    }
                    disabled={!authConfigured || isLoading}
                    className="w-full rounded-lg border border-slate-700 bg-[#080c10] px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500/50 disabled:opacity-50"
                  >
                    {REMEMBER_DAY_OPTIONS.map((days) => (
                      <option key={days} value={days}>
                        {days} 天内免登录
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!authConfigured || isLoading}
            className="btn-primary w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:text-slate-500"
          >
            {isLoading
              ? "处理中…"
              : mode === "signin"
                ? "登录"
                : "注册账号"}
          </button>
        </form>

        {authConfigured && (
          <div className="mt-4 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={handleGuestEnter}
              className="w-full rounded-lg border border-dashed border-slate-700 bg-transparent px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
            >
              以游客身份体验
            </button>
            <p className="mt-2 text-center text-[11px] leading-relaxed text-slate-600">
              无需登录即可使用全部分析功能，但分析结果不会保存到数据库。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="dashboard-bg flex min-h-screen items-center justify-center text-sm text-slate-500">
          加载中…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
