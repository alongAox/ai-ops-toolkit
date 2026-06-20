"use client";

import { FEATURE_SESSION_STASH_EVENT } from "../../lib/feature-session-cache";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function useAutoStashOnNavigation(
  shouldStash: () => boolean,
  stash: () => void
) {
  const pathname = usePathname();
  const shouldStashRef = useRef(shouldStash);
  const stashRef = useRef(stash);

  shouldStashRef.current = shouldStash;
  stashRef.current = stash;

  useEffect(() => {
    const handleStash = () => {
      if (shouldStashRef.current()) {
        stashRef.current();
      }
    };

    window.addEventListener(FEATURE_SESSION_STASH_EVENT, handleStash);

    return () => {
      window.removeEventListener(FEATURE_SESSION_STASH_EVENT, handleStash);
      handleStash();
    };
  }, [pathname]);
}
