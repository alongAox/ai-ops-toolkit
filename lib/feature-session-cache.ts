export const FEATURE_SESSION_STASH_EVENT = "ai-analyzer:stash-session";

export function dispatchFeatureSessionStash(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FEATURE_SESSION_STASH_EVENT));
}

export function readSessionCache<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function writeSessionCache<T>(key: string, items: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* ignore quota errors */
  }
}

export function prependSessionCache<T>(
  key: string,
  item: T,
  maxItems: number
): T[] {
  const next = [item, ...readSessionCache<T>(key)].slice(0, maxItems);
  writeSessionCache(key, next);
  return next;
}

export function prependSessionCacheIfNew<T>(
  key: string,
  item: T,
  maxItems: number,
  isSame: (previous: T, next: T) => boolean
): T[] {
  const items = readSessionCache<T>(key);
  if (items.length > 0 && isSame(items[0]!, item)) {
    return items;
  }
  return prependSessionCache(key, item, maxItems);
}

export function removeSessionCacheItem<T extends { id: string }>(
  key: string,
  id: string
): T[] {
  const next = readSessionCache<T>(key).filter((item) => item.id !== id);
  writeSessionCache(key, next);
  return next;
}
