import { useSyncExternalStore } from "react";

export const MEAL_SLOTS = ["dinner", "lunch", "breakfast", "dessert"] as const;

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  dessert: "Dessert",
};

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type MealSlot = (typeof MEAL_SLOTS)[number];
/** ISO date string YYYY-MM-DD */
export type PlanDate = string;

type MealEntryBase = {
  id: string;
  /**
   * Headcount for this item. null/undefined means use the plan default.
   * A concrete number means the user overrode it.
   */
  people?: number | null;
  /** When false, excluded from What you need. Defaults to true. */
  counted?: boolean;
};

export type MealEntry =
  | (MealEntryBase & { kind: "recipe"; slug: string })
  | (MealEntryBase & { kind: "note"; text: string });

export type DayMeals = {
  breakfast: MealEntry[];
  lunch: MealEntry[];
  dinner: MealEntry[];
  dessert: MealEntry[];
  dessertOpen: boolean;
};

/** Sparse map of ISO date → meals */
export type DatePlan = Record<PlanDate, DayMeals>;

export type PlannedItem = {
  date: PlanDate;
  slot: MealSlot;
  entry: MealEntry;
};

const STORAGE_KEY = "kept-prototype-plan-dates";

let snapshotRaw: string | null = null;
let snapshotPlan: DatePlan = {};
const listeners = new Set<() => void>();

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyDay(): DayMeals {
  return {
    breakfast: [],
    lunch: [],
    dinner: [],
    dessert: [],
    dessertOpen: false,
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toISODate(date: Date): PlanDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseISODate(value: PlanDate): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDaysISO(value: PlanDate, days: number): PlanDate {
  const date = parseISODate(value);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Monday of the week containing `date` (local). */
export function startOfWeekMonday(date = new Date()): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = next.getDay(); // 0 Sun … 6 Sat
  const offset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + offset);
  return next;
}

export function defaultPlanWindow(today = new Date()) {
  const start = startOfWeekMonday(today);
  const from = toISODate(start);
  const to = addDaysISO(from, 13);
  return { from, to };
}

export function calendarWeeks(today = new Date()): [PlanDate[], PlanDate[]] {
  const { from } = defaultPlanWindow(today);
  const week1 = Array.from({ length: 7 }, (_, i) => addDaysISO(from, i));
  const week2 = Array.from({ length: 7 }, (_, i) => addDaysISO(from, i + 7));
  return [week1, week2];
}

export function daysInRange(from: PlanDate, to: PlanDate): PlanDate[] {
  let start = from;
  let end = to;
  if (start > end) {
    [start, end] = [end, start];
  }
  const days: PlanDate[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDaysISO(cursor, 1);
    if (days.length > 60) break;
  }
  return days;
}

const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatPlanDayLabel(date: PlanDate, style: "short" | "long" = "long") {
  const parsed = parseISODate(date);
  const weekday =
    style === "short"
      ? WEEKDAYS_SHORT[parsed.getDay()]
      : WEEKDAYS_LONG[parsed.getDay()];
  const month = MONTHS_SHORT[parsed.getMonth()];
  const day = parsed.getDate();
  return `${weekday}, ${month} ${day}`;
}

export function isToday(date: PlanDate, today = new Date()) {
  return date === toISODate(today);
}

export function dayMealCount(day: DayMeals) {
  return MEAL_SLOTS.reduce((count, slot) => count + day[slot].length, 0);
}

function normalizePeople(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(24, Math.round(n));
}

export function entryIsCounted(entry: MealEntry) {
  return entry.counted !== false;
}

export function effectivePeople(entry: MealEntry, defaultPeople: number) {
  const override = normalizePeople(entry.people ?? null);
  if (override != null) return override;
  return Math.max(1, Math.min(24, Math.round(defaultPeople) || 1));
}

function asEntries(value: unknown): MealEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const entries: MealEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const entry = item as {
      id?: string;
      kind?: string;
      slug?: string;
      text?: string;
      people?: unknown;
      counted?: unknown;
    };
    const people = normalizePeople(entry.people);
    const counted = entry.counted === false ? false : true;
    if (entry.kind === "recipe" && typeof entry.slug === "string") {
      entries.push({
        id: entry.id || newId(),
        kind: "recipe",
        slug: entry.slug,
        people,
        counted,
      });
    } else if (
      entry.kind === "note" &&
      typeof entry.text === "string" &&
      entry.text.trim()
    ) {
      entries.push({
        id: entry.id || newId(),
        kind: "note",
        text: entry.text.trim(),
        people,
        counted,
      });
    }
  }
  return entries;
}

function normalizeDay(value: unknown): DayMeals {
  if (!value || typeof value !== "object") {
    return emptyDay();
  }
  const day = value as Partial<DayMeals>;
  const dessert = asEntries(day.dessert);
  return {
    breakfast: asEntries(day.breakfast),
    lunch: asEntries(day.lunch),
    dinner: asEntries(day.dinner),
    dessert,
    dessertOpen: Boolean(day.dessertOpen) || dessert.length > 0,
  };
}

function isISODateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizePlan(parsed: unknown): DatePlan {
  if (!parsed || typeof parsed !== "object") {
    return {};
  }
  const source = parsed as Record<string, unknown>;
  const next: DatePlan = {};
  for (const [key, value] of Object.entries(source)) {
    if (!isISODateKey(key)) continue;
    const day = normalizeDay(value);
    if (
      dayMealCount(day) === 0 &&
      !day.dessertOpen
    ) {
      continue;
    }
    next[key] = day;
  }
  return next;
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribePlan(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStoreChange);
  }
  return () => {
    listeners.delete(onStoreChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStoreChange);
    }
  };
}

export function readDatePlan(): DatePlan {
  if (typeof window === "undefined") {
    return snapshotPlan;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === snapshotRaw) {
    return snapshotPlan;
  }

  snapshotRaw = raw;
  try {
    snapshotPlan = normalizePlan(raw ? JSON.parse(raw) : {});
  } catch {
    snapshotPlan = {};
  }
  return snapshotPlan;
}

export function saveDatePlan(plan: DatePlan) {
  const next = normalizePlan(plan);
  const raw = JSON.stringify(next);
  window.localStorage.setItem(STORAGE_KEY, raw);
  snapshotRaw = raw;
  snapshotPlan = next;
  emit();
}

export function getDayMeals(plan: DatePlan, date: PlanDate): DayMeals {
  return plan[date] ?? emptyDay();
}

function updateDay(date: PlanDate, recipe: (current: DayMeals) => DayMeals) {
  const plan = readDatePlan();
  const nextDay = recipe(getDayMeals(plan, date));
  const next = { ...plan };
  if (dayMealCount(nextDay) === 0 && !nextDay.dessertOpen) {
    delete next[date];
  } else {
    next[date] = nextDay;
  }
  saveDatePlan(next);
}

export function addPlanRecipe(date: PlanDate, slot: MealSlot, slug: string) {
  updateDay(date, (current) => {
    const entries = current[slot];
    if (entries.some((entry) => entry.kind === "recipe" && entry.slug === slug)) {
      return slot === "dessert" ? { ...current, dessertOpen: true } : current;
    }
    return {
      ...current,
      dessertOpen: current.dessertOpen || slot === "dessert",
      [slot]: [
        ...entries,
        {
          id: newId(),
          kind: "recipe" as const,
          slug,
          people: null,
          counted: true,
        },
      ],
    };
  });
}

export function addPlanCustom(date: PlanDate, slot: MealSlot, text: string) {
  const note = text.trim();
  if (!note) return;
  updateDay(date, (current) => ({
    ...current,
    dessertOpen: current.dessertOpen || slot === "dessert",
    [slot]: [
      ...current[slot],
      {
        id: newId(),
        kind: "note" as const,
        text: note,
        people: null,
        counted: true,
      },
    ],
  }));
}

export function removePlanEntry(date: PlanDate, slot: MealSlot, id: string) {
  updateDay(date, (current) => ({
    ...current,
    [slot]: current[slot].filter((entry) => entry.id !== id),
  }));
}

function patchEntry(
  date: PlanDate,
  slot: MealSlot,
  id: string,
  patch: (entry: MealEntry) => MealEntry
) {
  updateDay(date, (current) => ({
    ...current,
    [slot]: current[slot].map((entry) =>
      entry.id === id ? patch(entry) : entry
    ),
  }));
}

export function setPlanEntryCounted(
  date: PlanDate,
  slot: MealSlot,
  id: string,
  counted: boolean
) {
  patchEntry(date, slot, id, (entry) => ({ ...entry, counted }));
}

export function setPlanEntryPeople(
  date: PlanDate,
  slot: MealSlot,
  id: string,
  people: number
) {
  const next = normalizePeople(people);
  if (next == null) return;
  patchEntry(date, slot, id, (entry) => ({ ...entry, people: next }));
}

export function removeRecipeFromPlan(slug: string) {
  const plan = readDatePlan();
  let changed = false;
  const next: DatePlan = {};

  for (const [date, current] of Object.entries(plan)) {
    const breakfast = current.breakfast.filter(
      (entry) => !(entry.kind === "recipe" && entry.slug === slug)
    );
    const lunch = current.lunch.filter(
      (entry) => !(entry.kind === "recipe" && entry.slug === slug)
    );
    const dinner = current.dinner.filter(
      (entry) => !(entry.kind === "recipe" && entry.slug === slug)
    );
    const dessert = current.dessert.filter(
      (entry) => !(entry.kind === "recipe" && entry.slug === slug)
    );
    if (
      breakfast.length !== current.breakfast.length ||
      lunch.length !== current.lunch.length ||
      dinner.length !== current.dinner.length ||
      dessert.length !== current.dessert.length
    ) {
      changed = true;
    }
    const day: DayMeals = {
      breakfast,
      lunch,
      dinner,
      dessert,
      dessertOpen: current.dessertOpen && dessert.length > 0,
    };
    if (dayMealCount(day) > 0 || day.dessertOpen) {
      next[date] = day;
    }
  }

  if (changed) {
    saveDatePlan(next);
  }
}

export function openDessert(date: PlanDate) {
  updateDay(date, (current) => ({ ...current, dessertOpen: true }));
}

export function clearDessert(date: PlanDate) {
  updateDay(date, (current) => ({
    ...current,
    dessert: [],
    dessertOpen: false,
  }));
}

export function listPlannedItems(
  plan: DatePlan,
  dates: PlanDate[]
): PlannedItem[] {
  const items: PlannedItem[] = [];
  for (const date of dates) {
    const day = getDayMeals(plan, date);
    for (const slot of MEAL_SLOTS) {
      for (const entry of day[slot]) {
        items.push({ date, slot, entry });
      }
    }
  }
  return items;
}

const serverPlan: DatePlan = {};

/** @deprecated Prefer useDatePlan — kept name for fewer call-site edits during transition. */
export function useWeekPlan(): DatePlan {
  return useSyncExternalStore(subscribePlan, readDatePlan, () => serverPlan);
}

export function useDatePlan(): DatePlan {
  return useWeekPlan();
}
