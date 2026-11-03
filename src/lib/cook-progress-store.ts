import { useSyncExternalStore } from "react";

export type CookProgress = {
  slug: string;
  title: string;
  emoji: string;
  stepIndex: number;
  stepTotal: number;
  serves: number | null;
  updatedAt: string;
};

const STORAGE_KEY = "kept-prototype-cook-progress";
const EVENT_NAME = "kept-cook-progress";

let snapshotRaw: string | null = null;
let snapshot: CookProgress | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
}

function isValidProgress(value: unknown): value is CookProgress {
  if (!value || typeof value !== "object") return false;
  const item = value as CookProgress;
  return (
    typeof item.slug === "string" &&
    item.slug.length > 0 &&
    typeof item.title === "string" &&
    typeof item.emoji === "string" &&
    typeof item.stepIndex === "number" &&
    Number.isFinite(item.stepIndex) &&
    item.stepIndex >= 0 &&
    typeof item.stepTotal === "number" &&
    Number.isFinite(item.stepTotal) &&
    item.stepTotal >= 0 &&
    (item.serves === null ||
      (typeof item.serves === "number" && Number.isFinite(item.serves))) &&
    typeof item.updatedAt === "string"
  );
}

export function subscribeCookProgress(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener(EVENT_NAME, onStoreChange);
  }
  return () => {
    listeners.delete(onStoreChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStoreChange);
      window.removeEventListener(EVENT_NAME, onStoreChange);
    }
  };
}

export function readCookProgress(): CookProgress | null {
  if (typeof window === "undefined") {
    return snapshot;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === snapshotRaw) {
    return snapshot;
  }

  snapshotRaw = raw;
  if (!raw) {
    snapshot = null;
    return snapshot;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    snapshot = isValidProgress(parsed) ? parsed : null;
  } catch {
    snapshot = null;
  }
  return snapshot;
}

export function saveCookProgress(next: CookProgress) {
  const normalized: CookProgress = {
    ...next,
    stepIndex: Math.max(0, Math.floor(next.stepIndex)),
    stepTotal: Math.max(0, Math.floor(next.stepTotal)),
    serves:
      typeof next.serves === "number" && Number.isFinite(next.serves)
        ? Math.min(24, Math.max(1, Math.round(next.serves)))
        : null,
    updatedAt: next.updatedAt || new Date().toISOString(),
  };
  const raw = JSON.stringify(normalized);
  window.localStorage.setItem(STORAGE_KEY, raw);
  snapshotRaw = raw;
  snapshot = normalized;
  emit();
}

export function clearCookProgress(slug?: string) {
  const current = readCookProgress();
  if (!current) return;
  if (slug && current.slug !== slug) return;
  window.localStorage.removeItem(STORAGE_KEY);
  snapshotRaw = null;
  snapshot = null;
  emit();
}

export function cookProgressHref(progress: CookProgress) {
  const base = `/recipe/${progress.slug}/cook`;
  if (progress.serves == null) return base;
  return `${base}?serves=${progress.serves}`;
}

export function useCookProgress(): CookProgress | null {
  return useSyncExternalStore(subscribeCookProgress, readCookProgress, () => null);
}
