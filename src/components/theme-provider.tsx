"use client";

import { type ReactNode, useEffect } from "react";

export const themes = [
  { id: "peach", label: "Coral" },
  { id: "sage", label: "Rose" },
  { id: "berry", label: "Berry" },
] as const;

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const theme = window.localStorage.getItem("kept-theme") ?? "peach";
    const name = window.localStorage.getItem("kept-name") ?? "";
    document.documentElement.dataset.theme = theme;
    if (name) {
      document.documentElement.dataset.profileName = name;
    }
  }, []);
  return children;
}

export function applyTheme(theme: string) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("kept-theme", theme);
  window.dispatchEvent(new Event("kept-profile"));
}

export function applyProfileName(name: string) {
  document.documentElement.dataset.profileName = name;
  window.localStorage.setItem("kept-name", name);
  window.dispatchEvent(new Event("kept-profile"));
}

export const DEFAULT_PEOPLE_KEY = "kept-default-people";
const LEGACY_PLAN_PEOPLE_KEY = "kept-prototype-plan-people";

export function readDefaultPeople() {
  if (typeof window === "undefined") return 4;
  const stored = window.localStorage.getItem(DEFAULT_PEOPLE_KEY);
  if (stored && Number(stored) >= 1) {
    return Math.min(24, Math.round(Number(stored)));
  }
  const legacy = window.localStorage.getItem(LEGACY_PLAN_PEOPLE_KEY);
  if (legacy && Number(legacy) >= 1) {
    return Math.min(24, Math.round(Number(legacy)));
  }
  return 4;
}

export function applyDefaultPeople(people: number) {
  const next = Math.max(1, Math.min(24, Math.round(people) || 1));
  window.localStorage.setItem(DEFAULT_PEOPLE_KEY, String(next));
  window.dispatchEvent(new Event("kept-profile"));
  return next;
}
