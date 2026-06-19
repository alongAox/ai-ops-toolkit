"use client";

import { ToastPopup } from "./toast-popup";
import {
  AUTH_WELCOME_STORAGE_KEY,
  formatWelcomeMessage,
} from "../../lib/supabase/user-display";
import { useEffect, useState } from "react";

export function WelcomeBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const email = sessionStorage.getItem(AUTH_WELCOME_STORAGE_KEY);
    if (!email) return;

    sessionStorage.removeItem(AUTH_WELCOME_STORAGE_KEY);
    setMessage(formatWelcomeMessage(email));
  }, []);

  if (!message) {
    return null;
  }

  return (
    <ToastPopup message={message} onDone={() => setMessage(null)} variant="success" />
  );
}
