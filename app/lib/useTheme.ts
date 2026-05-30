"use client";

import { useEffect, useState } from "react";

/**
 * Light/dark theme, shared by the Drive home and the document workspace.
 *
 * A pre-paint script in the root layout applies the saved (or system) theme to
 * <html> before React mounts, so this hook only needs to mirror that choice
 * into state (for the toggle icon) and persist future changes. Both the server
 * and first client render start as "light", so the mount effect only ever
 * corrects the icon afterward — no hydration mismatch.
 */
export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("musedoc-theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(stored === "dark" || (!stored && prefersDark) ? "dark" : "light");
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      window.localStorage.setItem("musedoc-theme", next);
      return next;
    });
  }

  return { theme, toggleTheme };
}
