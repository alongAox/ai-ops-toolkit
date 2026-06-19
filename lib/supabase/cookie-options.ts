type AuthCookieOptions = {
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  sameSite?: boolean | "lax" | "strict" | "none";
  secure?: boolean;
  httpOnly?: boolean;
  priority?: "low" | "medium" | "high";
  partitioned?: boolean;
};

export const AUTH_REMEMBER_DAYS_COOKIE = "auth-remember-days";
export const AUTH_REMEMBER_EMAIL_KEY = "auth-remember-email";

export const REMEMBER_DAY_OPTIONS = [7, 14, 30] as const;
export type RememberDays = (typeof REMEMBER_DAY_OPTIONS)[number];

export function parseRememberDays(value: string | undefined | null): number {
  const days = Number(value);
  if (!Number.isFinite(days) || days <= 0) {
    return 0;
  }
  return Math.min(Math.floor(days), 30);
}

/** 未勾选记住登录：会话 Cookie（关闭浏览器后失效）；勾选：按天数持久化 */
export function applyAuthCookieOptions(
  options: AuthCookieOptions,
  rememberDays: number
): AuthCookieOptions {
  if (rememberDays > 0) {
    return {
      ...options,
      maxAge: rememberDays * 24 * 60 * 60,
    };
  }

  const { maxAge: _maxAge, expires: _expires, ...sessionOptions } = options;
  return sessionOptions;
}

export function buildRememberPreferenceCookie(
  rememberDays: number
): { name: string; value: string; options: AuthCookieOptions } {
  if (rememberDays > 0) {
    return {
      name: AUTH_REMEMBER_DAYS_COOKIE,
      value: String(rememberDays),
      options: {
        path: "/",
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: rememberDays * 24 * 60 * 60,
      },
    };
  }

  return {
    name: AUTH_REMEMBER_DAYS_COOKIE,
    value: "0",
    options: {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
  };
}
