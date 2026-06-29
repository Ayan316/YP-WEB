"use client";

import { useEffect } from "react";

/**
 * Forces dark theme while this component is mounted.
 * Uses a MutationObserver to prevent ThemeContext from overriding it.
 * Restores the user's theme preference on unmount.
 */
export default function ForceDarkTheme() {
  useEffect(() => {
    const html = document.documentElement;
    // Force dark immediately
    html.classList.add("dark");

    // Watch for any removal of the "dark" class and re-add it
    const observer = new MutationObserver(() => {
      if (!html.classList.contains("dark")) {
        html.classList.add("dark");
      }
    });

    observer.observe(html, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      // Restore previous state based on theme_settings cookie (0=dark, 1=light, 2=system)
      const match = document.cookie.match(/(?:^|;\s*)theme_settings=(\d)/);
      const apiVal = match ? match[1] : "0";
      const map: Record<string, string> = { "0": "dark", "1": "light", "2": "system" };
      const pref = map[apiVal] || "dark";
      if (pref === "light") {
        html.classList.remove("dark");
      } else if (pref === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (!prefersDark) {
          html.classList.remove("dark");
        }
      }
      // If pref is "dark" or unknown, keep dark class
    };
  }, []);

  return null;
}
