export function getUserDisplayName(
  email: string,
  metadata?: Record<string, unknown> | null
): string {
  const fullName = metadata?.full_name ?? metadata?.name;
  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  const localPart = email.split("@")[0]?.trim();
  return localPart || email;
}

export function formatWelcomeMessage(
  email: string,
  metadata?: Record<string, unknown> | null
): string {
  const name = getUserDisplayName(email, metadata);
  return `欢迎 ${name}（${email}）`;
}

export const AUTH_WELCOME_STORAGE_KEY = "auth-welcome";
