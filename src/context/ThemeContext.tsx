"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  syncThemeFromApi: (apiValue: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const COOKIE_NAME = "theme_settings";

// API mapping: "0" = Dark, "1" = Light, "2" = System Default
const API_TO_PREFERENCE: Record<string, ThemePreference> = {
  "0": "dark",
  "1": "light",
  "2": "system",
};

const PREFERENCE_TO_API: Record<ThemePreference, string> = {
  dark: "0",
  light: "1",
  system: "2",
};

export function themePreferenceToApi(pref: ThemePreference): string {
  return PREFERENCE_TO_API[pref] || "0";
}

export function apiToThemePreference(apiValue: string): ThemePreference {
  return API_TO_PREFERENCE[apiValue] || "dark";
}

function getThemeCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)theme_settings=(\d)/);
  return match ? match[1] : null;
}

function setThemeCookie(apiValue: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${apiValue}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemeClass(theme: ResolvedTheme) {
  if (typeof document === "undefined") return;
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] =
    useState<ThemePreference>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  // Read theme from theme_settings cookie on mount
  useEffect(() => {
    const cookieValue = getThemeCookie();
    if (cookieValue) {
      const pref = apiToThemePreference(cookieValue);
      setPreferenceState(pref);
    }
  }, []);

  // Resolve theme and apply class whenever preference changes
  useEffect(() => {
    const resolved: ResolvedTheme =
      preference === "system" ? getSystemTheme() : preference;
    setResolvedTheme(resolved);
    applyThemeClass(resolved);

    // Listen for system theme changes when preference is 'system'
    if (preference === "system" && typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        const newTheme: ResolvedTheme = e.matches ? "dark" : "light";
        setResolvedTheme(newTheme);
        applyThemeClass(newTheme);
      };
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [preference]);

  // Set preference and update cookie
  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    setThemeCookie(themePreferenceToApi(pref));
  }, []);

  // Sync theme from API value (e.g., "0", "1", "2") without triggering API call
  const syncThemeFromApi = useCallback((apiValue: string) => {
    const pref = apiToThemePreference(apiValue);
    setPreferenceState(pref);
    setThemeCookie(apiValue);
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference, syncThemeFromApi }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
