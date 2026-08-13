/**
 * 游客模式（Guest Mode）
 *
 * 行为约定：
 * - 游客无需登录即可使用所有分析功能（日志分析 / 错误解释 / 日报 / 对话）；
 * - 游客的分析记录【不会】写入数据库——客户端跳过保存接口调用，接口侧也会拒绝落库；
 * - 游客态通过一个非 HttpOnly 的 Cookie（guest_session=1）标识，
 *   服务端（中间件 / Route Handler / Server Component）与客户端（React 组件）均可读取。
 *
 * 该文件只导出 Cookie 名称常量与纯客户端辅助函数，不引入 next/headers，
 * 以便客户端组件安全复用（服务端读取 Cookie 由各调用方自行用 cookies()/request.cookies 处理）。
 */

export const GUEST_SESSION_COOKIE = "guest_session";
const GUEST_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 天

function readCookieValue(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const prefix = `${name}=`;
  const found = document.cookie
    .split("; ")
    .find((part) => part.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

/** 客户端：当前是否为游客态 */
export function isGuestSession(): boolean {
  return readCookieValue(GUEST_SESSION_COOKIE) === "1";
}

/** 客户端：进入游客模式（写入 Cookie） */
export function enterGuestSession(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${GUEST_SESSION_COOKIE}=1; path=/; max-age=${GUEST_MAX_AGE_SECONDS}; samesite=lax`;
}

/** 客户端：退出游客模式（清除 Cookie） */
export function exitGuestSession(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${GUEST_SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
