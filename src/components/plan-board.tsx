"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ShoppingBasket,
  Users,
} from "lucide-react";
import { useActionFeedback } from "@/components/action-feedback";
import { AppButton } from "@/components/app-button";
import { ConfirmPanel } from "@/components/confirm-panel";
import { fieldClass, fieldCompactClass, fieldGrowClass } from "@/design-system";
import {
  MEAL_SLOTS,
  SLOT_LABELS,
  WEEKDAY_LABELS,
  addPlanCustom,
  addPlanRecipe,
  calendarWeeks,
  clearDessert,
  daysInRange,
  defaultPlanWindow,
  effectivePeople,
  entryIsCounted,
  formatPlanDayLabel,
  getDayMeals,
  listPlannedItems,
  openDessert,
  removePlanEntry,
  setPlanEntryCounted,
  setPlanEntryPeople,
  toISODate,
  useDatePlan,
  type MealEntry,
  type MealSlot,
  type PlanDate,
  type PlannedItem,
} from "@/lib/plan-store";
import {
  mergeRecipeLists,
  recipes as seedRecipes,
  type Recipe,
} from "@/lib/recipes";
import { formatMeasure, measureOf, parseServes } from "@/lib/scale";
import { useKeptRecipes, useRemovedSlugs } from "@/lib/use-kept-recipes";
import {
  applyDefaultPeople,
  readDefaultPeople,
} from "@/components/theme-provider";

const FROM_KEY = "kept-prototype-plan-from-date";
const TO_KEY = "kept-prototype-plan-to-date";
const PEOPLE_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

function isPlanDate(value: string | null): value is PlanDate {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function dayRecipeTitles(
  day: ReturnType<typeof getDayMeals>,
  recipes: Recipe[]
) {
  const titles: string[] = [];
  for (const slot of MEAL_SLOTS) {
    for (const entry of day[slot]) {
      if (entry.kind === "note") {
        titles.push(entry.text);
        continue;
      }
      const recipe = recipes.find((item) => item.slug === entry.slug);
      titles.push(recipe?.title ?? "Removed recipe");
    }
  }
  return titles;
}

function ingredientNeedsFromItems(
  items: PlannedItem[],
  recipes: Recipe[],
  defaultPeople: number
) {
  const buckets = new Map<
    string,
    { name: string; value: number; unit: string; raw: string; count: number }
  >();

  for (const item of items) {
    if (item.entry.kind !== "recipe") continue;
    if (!entryIsCounted(item.entry)) continue;
    const recipe = recipes.find((r) => r.slug === item.entry.slug);
    if (!recipe) continue;
    const people = effectivePeople(item.entry, defaultPeople);
    const factor = people / parseServes(recipe.servings);
    for (const ingredient of recipe.ingredients) {
      const nameKey = ingredient.name.trim().toLowerCase();
      const measured = measureOf(ingredient.kept);
      if (!measured) {
        const raw = ingredient.kept.trim();
        const key = `${nameKey}|raw|${raw.toLowerCase()}`;
        const existing = buckets.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          buckets.set(key, {
            name: ingredient.name.trim(),
            value: 0,
            unit: "",
            raw,
            count: 1,
          });
        }
        continue;
      }
      const unitKey = measured.unit.toLowerCase();
      const key = `${nameKey}|${unitKey}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.value += measured.value * factor;
      } else {
        buckets.set(key, {
          name: ingredient.name.trim(),
          value: measured.value * factor,
          unit: measured.unit,
          raw: "",
          count: 1,
        });
      }
    }
  }

  return [...buckets.values()]
    .map((bucket) => ({
      name: bucket.name,
      amount: bucket.raw
        ? bucket.count > 1
          ? `${bucket.raw} × ${bucket.count}`
          : bucket.raw
        : formatMeasure(bucket.value, bucket.unit),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function PlanBoard({ addSlug }: { addSlug?: string }) {
  const plan = useDatePlan();
  const kept = useKeptRecipes();
  const removed = useRemovedSlugs();
  const recipes = mergeRecipeLists(kept, seedRecipes, removed);
  const pending = addSlug
    ? recipes.find((recipe) => recipe.slug === addSlug)
    : undefined;

  const [slot, setSlot] = useState<MealSlot>("dinner");
  const [placed, setPlaced] = useState("");
  const [people, setPeople] = useState("4");
  const [fromDay, setFromDay] = useState<PlanDate>("");
  const [toDay, setToDay] = useState<PlanDate>("");
  const [hydrated, setHydrated] = useState(false);
  const [expanded, setExpanded] = useState<PlanDate | null>(null);
  const [today, setToday] = useState<PlanDate>("");
  const [weeks, setWeeks] = useState<[PlanDate[], PlanDate[]]>([[], []]);
  const defaultPeople = Math.max(1, Math.round(Number(people)) || 1);

  useEffect(() => {
    const windowDefaults = defaultPlanWindow();
    const nextWeeks = calendarWeeks();
    const storedFrom = window.localStorage.getItem(FROM_KEY);
    const storedTo = window.localStorage.getItem(TO_KEY);
    const now = toISODate(new Date());

    setWeeks(nextWeeks);
    setToday(now);
    setFromDay(isPlanDate(storedFrom) ? storedFrom : windowDefaults.from);
    setToDay(isPlanDate(storedTo) ? storedTo : windowDefaults.to);
    setPeople(String(readDefaultPeople()));
    setExpanded(now);
    setHydrated(true);
  }, []);

  const calendarDates = useMemo(
    () => [...weeks[0], ...weeks[1]],
    [weeks]
  );

  useEffect(() => {
    if (!hydrated || !fromDay || !toDay) return;
    applyDefaultPeople(defaultPeople);
    window.localStorage.setItem(FROM_KEY, fromDay);
    window.localStorage.setItem(TO_KEY, toDay);
  }, [hydrated, defaultPeople, fromDay, toDay]);

  const range = fromDay && toDay ? daysInRange(fromDay, toDay) : [];
  const upcoming = listPlannedItems(plan, range);
  const needs = ingredientNeedsFromItems(upcoming, recipes, defaultPeople);
  const rangeMin = calendarDates[0] || fromDay;
  const rangeMax = calendarDates[calendarDates.length - 1] || toDay;

  function toggleDay(date: PlanDate) {
    setExpanded((current) => (current === date ? null : date));
  }

  function placePending(date: PlanDate) {
    if (!pending) return;
    addPlanRecipe(date, slot, pending.slug);
    setPlaced(`${SLOT_LABELS[slot]} · ${formatPlanDayLabel(date, "short")}`);
    setExpanded(date);
  }

  return (
    <>
      <section className="plan-hero" aria-label="Plan ahead">
        <Image
          src="/plan-food.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="plan-hero-media"
        />
        <div className="plan-hero-scrim" aria-hidden="true" />
        <div className="plan-hero-content">
          <h1 className="text-[clamp(1.75rem,3vw+1rem,2.5rem)]">Plan ahead</h1>
          <p className="plan-hero-lede mt-2">
            This week and next. Open a day to plan meals, then toggle what
            counts toward your shopping list.
          </p>
        </div>
      </section>

      <div className="page-shell page-shell-wide space-y-8 py-[clamp(1.25rem,3vw,2.5rem)]">
        {pending ? (
          <section className="plan-pending" aria-label={`Add ${pending.title}`}>
            <div className="plan-pending-copy">
              <p className="plan-pending-title">
                <span aria-hidden>{pending.emoji}</span> Add {pending.title}
              </p>
              <p className="plan-pending-lede">
                Pick the meal, then click a day on the calendar. New items use
                the default people count until you change them.
              </p>
            </div>
            <div className="plan-pending-picks">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Meal">
                {MEAL_SLOTS.map((item) => (
                  <AppButton
                    key={item}
                    type="button"
                    variant={slot === item ? "primary" : "secondary"}
                    onClick={() => setSlot(item)}
                  >
                    {SLOT_LABELS[item]}
                  </AppButton>
                ))}
              </div>
              {placed ? (
                <p className="text-sm text-muted-foreground">Added to {placed}.</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Waiting for a day click…
                </p>
              )}
            </div>
          </section>
        ) : null}

        <div className="plan-layout">
          <div className="plan-calendar-pane">
            <div className="plan-week-head">
              <h2 className="font-heading text-2xl">Calendar</h2>
              <p className="text-sm text-muted-foreground">
                This week and next. Click a day to expand it.
              </p>
            </div>

            <div className="plan-cal-weekdays" aria-hidden>
              {WEEKDAY_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            {!hydrated ? (
              <p className="text-sm text-muted-foreground">Loading calendar…</p>
            ) : null}

            {hydrated
              ? weeks.map((week, weekIndex) => {
                  const weekExpanded =
                    expanded && week.includes(expanded) ? expanded : null;
                  return (
                    <div
                      key={week[0] ?? `week-${weekIndex}`}
                      className="plan-cal-week"
                    >
                      <p className="plan-cal-week-label">
                        {weekIndex === 0 ? "This week" : "Next week"}
                      </p>
                      <div className="plan-cal-grid">
                        {week.map((date) => {
                          const day = getDayMeals(plan, date);
                          const titles = dayRecipeTitles(day, recipes);
                          const count = titles.length;
                          const selected = expanded === date;
                          const dayIsToday = Boolean(today) && date === today;
                          const inRange = range.includes(date);
                          const preview = titles.slice(0, 2);
                          return (
                            <button
                              key={date}
                              type="button"
                              className={[
                                "plan-cal-day",
                                inRange ? "plan-cal-day-in-range" : "plan-cal-day-out-range",
                                selected ? "plan-cal-day-open" : "",
                                dayIsToday ? "plan-cal-day-today" : "",
                                pending ? "plan-cal-day-placeable" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              aria-expanded={selected}
                              aria-current={dayIsToday ? "date" : undefined}
                              data-in-range={inRange ? "true" : "false"}
                              title={count > 0 ? titles.join(", ") : undefined}
                              onClick={() => {
                                if (pending) {
                                  placePending(date);
                                  return;
                                }
                                toggleDay(date);
                              }}
                            >
                              <span className="plan-cal-day-num">
                                {parseInt(date.slice(8), 10)}
                              </span>
                              <span className="plan-cal-day-status">
                                {count === 0 ? (
                                  "Empty"
                                ) : (
                                  preview.map((title, index) => (
                                    <span
                                      key={`${date}-${index}`}
                                      className="plan-cal-day-line"
                                    >
                                      {title}
                                    </span>
                                  ))
                                )}
                              </span>
                              {count > 0 ? (
                                <span className="plan-cal-day-dots" aria-hidden>
                                  {MEAL_SLOTS.filter(
                                    (item) => day[item].length > 0
                                  ).map((item) => (
                                    <i key={item} data-slot={item} />
                                  ))}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      {weekExpanded ? (
                        <DayEditor
                          date={weekExpanded}
                          day={getDayMeals(plan, weekExpanded)}
                          recipes={recipes}
                          onCollapse={() => setExpanded(null)}
                        />
                      ) : null}
                    </div>
                  );
                })
              : null}

            <section className="plan-calendar-needs" aria-label="What you need">
              <div className="plan-needs-head">
                <ShoppingBasket className="size-5" aria-hidden />
                <div>
                  <h2 className="font-heading text-xl">What you need</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ingredients from toggled recipes only.
                  </p>
                </div>
              </div>

              {needs.length === 0 ? (
                <p className="mt-5 text-sm text-muted-foreground">
                  No toggled recipes in this range yet.
                </p>
              ) : (
                <ul className="plan-needs-list">
                  {needs.map((item) => (
                    <li key={`${item.name}-${item.amount}`}>
                      <span className="plan-needs-amount">{item.amount}</span>
                      <span className="plan-needs-name">{item.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="plan-rail" aria-label="Coming up">
            <div className="plan-rail-inner">
              <div className="plan-rail-block">
                <div className="plan-needs-head">
                  <CalendarDays className="size-5" aria-hidden />
                  <div>
                    <h2 className="font-heading text-xl">Coming up</h2>
                  </div>
                </div>

                <section className="plan-rail-filters" aria-label="Coming up filters">
                  <div className="plan-rail-filter-grid">
                    <label className="plan-toolbar-field">
                      <span className="plan-toolbar-label">
                        <CalendarDays className="size-3.5" aria-hidden />
                        From
                      </span>
                      <input
                        type="date"
                        value={fromDay || rangeMin}
                        min={rangeMin || undefined}
                        max={toDay || rangeMax || undefined}
                        onChange={(event) => setFromDay(event.target.value)}
                        className={`${fieldClass} w-full`}
                        aria-label="From date"
                        disabled={!hydrated}
                      />
                    </label>
                    <label className="plan-toolbar-field">
                      <span className="plan-toolbar-label">To</span>
                      <input
                        type="date"
                        value={toDay || rangeMax}
                        min={fromDay || rangeMin || undefined}
                        max={rangeMax || undefined}
                        onChange={(event) => setToDay(event.target.value)}
                        className={`${fieldClass} w-full`}
                        aria-label="To date"
                        disabled={!hydrated}
                      />
                    </label>
                    <label className="plan-toolbar-field plan-rail-default">
                      <span className="plan-toolbar-label">
                        <Users className="size-3.5" aria-hidden />
                        Default Number of People
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        inputMode="numeric"
                        value={people}
                        onChange={(event) => setPeople(event.target.value)}
                        className={fieldCompactClass}
                        aria-label="Default number of people"
                      />
                    </label>
                  </div>
                </section>

                {upcoming.length === 0 ? (
                  <p className="mt-5 text-sm text-muted-foreground">
                    Nothing planned in this range yet. Expand a day on the
                    calendar, or add a recipe from its page.
                  </p>
                ) : (
                  <ol className="plan-upcoming-list">
                    {upcoming.map((item) => (
                      <ComingUpRow
                        key={`${item.date}-${item.slot}-${item.entry.id}`}
                        item={item}
                        recipes={recipes}
                        defaultPeople={defaultPeople}
                        onOpenDay={() => setExpanded(item.date)}
                      />
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function ComingUpRow({
  item,
  recipes,
  defaultPeople,
  onOpenDay,
}: {
  item: PlannedItem;
  recipes: Recipe[];
  defaultPeople: number;
  onOpenDay: () => void;
}) {
  const counted = entryIsCounted(item.entry);
  const people = effectivePeople(item.entry, defaultPeople);
  const recipe =
    item.entry.kind === "recipe"
      ? recipes.find((r) => r.slug === item.entry.slug)
      : undefined;
  const label =
    item.entry.kind === "note"
      ? item.entry.text
      : (recipe?.title ?? "Removed from catalogue");

  return (
    <li>
      <div
        className={[
          "plan-upcoming-toggle",
          counted ? "plan-upcoming-toggle-on" : "plan-upcoming-toggle-off",
        ].join(" ")}
      >
        <button
          type="button"
          className="plan-upcoming-main"
          aria-pressed={counted}
          onClick={() =>
            setPlanEntryCounted(
              item.date,
              item.slot,
              item.entry.id,
              !counted
            )
          }
          onDoubleClick={onOpenDay}
        >
          <span
            className="plan-upcoming-check"
            aria-hidden
            data-on={counted ? "true" : "false"}
          >
            {counted ? <Check className="size-3.5" /> : null}
          </span>
          <span className="plan-upcoming-copy">
            <span className="plan-upcoming-when">
              {formatPlanDayLabel(item.date, "short")}
              <span aria-hidden> · </span>
              {SLOT_LABELS[item.slot]}
              {item.entry.kind === "note" ? (
                <>
                  <span aria-hidden> · </span>
                  Custom
                </>
              ) : null}
            </span>
            <span className="plan-upcoming-title">
              {item.entry.kind === "recipe" ? (
                <span aria-hidden className="mr-1.5">
                  {recipe?.emoji ?? "🍽️"}
                </span>
              ) : null}
              {label}
            </span>
          </span>
        </button>
        <label className="plan-upcoming-people">
          <span className="sr-only">
            People for {label} on {formatPlanDayLabel(item.date, "short")}
          </span>
          <select
            value={people}
            className={fieldCompactClass}
            aria-label={`People for ${label}`}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              setPlanEntryPeople(
                item.date,
                item.slot,
                item.entry.id,
                Number(event.target.value)
              );
            }}
          >
            {PEOPLE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "person" : "people"}
              </option>
            ))}
          </select>
        </label>
      </div>
    </li>
  );
}

function DayEditor({
  date,
  day,
  recipes,
  onCollapse,
}: {
  date: PlanDate;
  day: ReturnType<typeof getDayMeals>;
  recipes: Recipe[];
  onCollapse: () => void;
}) {
  return (
    <section
      className="plan-day-editor"
      aria-label={`Plan for ${formatPlanDayLabel(date)}`}
    >
      <header className="plan-day-editor-head">
        <div>
          <p className="plan-slot-title">Expanded day</p>
          <h3 className="plan-day-title">{formatPlanDayLabel(date)}</h3>
        </div>
        <AppButton type="button" variant="secondary" onClick={onCollapse}>
          Collapse
          <ChevronDown className="size-4" aria-hidden />
        </AppButton>
      </header>

      {MEAL_SLOTS.filter((item) => item !== "dessert").map((item) => (
        <MealSlotEditor
          key={item}
          date={date}
          slot={item}
          entries={day[item]}
          recipes={recipes}
        />
      ))}

      {day.dessertOpen ? (
        <MealSlotEditor
          date={date}
          slot="dessert"
          entries={day.dessert}
          recipes={recipes}
          onClearSlot={() => clearDessert(date)}
          clearLabel="Remove dessert"
          clearTitle="Remove dessert?"
          clearDescription={`Close dessert for ${formatPlanDayLabel(date)} and clear anything listed there.`}
          clearConfirmLabel="Remove dessert"
        />
      ) : (
        <div className="plan-slot plan-slot-add">
          <AppButton
            type="button"
            variant="secondary"
            onClick={() => openDessert(date)}
          >
            Add dessert
          </AppButton>
        </div>
      )}
    </section>
  );
}

function MealSlotEditor({
  date,
  slot,
  entries,
  recipes,
  onClearSlot,
  clearLabel,
  clearTitle,
  clearDescription,
  clearConfirmLabel,
}: {
  date: PlanDate;
  slot: MealSlot;
  entries: MealEntry[];
  recipes: Recipe[];
  onClearSlot?: () => void;
  clearLabel?: string;
  clearTitle?: string;
  clearDescription?: string;
  clearConfirmLabel?: string;
}) {
  const { notify } = useActionFeedback();
  const [confirmClear, setConfirmClear] = useState(false);
  const takenSlugs = entries
    .filter(
      (entry): entry is Extract<MealEntry, { kind: "recipe" }> =>
        entry.kind === "recipe"
    )
    .map((entry) => entry.slug);

  return (
    <section className="plan-slot">
      <div className="plan-slot-head">
        <h4 className="plan-slot-title">{SLOT_LABELS[slot]}</h4>
        {onClearSlot && clearLabel && !confirmClear ? (
          <AppButton
            type="button"
            variant="secondary"
            onClick={() => setConfirmClear(true)}
            aria-label={`${clearLabel} for ${formatPlanDayLabel(date)}`}
            className="border-destructive/35 text-destructive hover:bg-destructive/10"
          >
            {clearLabel}
          </AppButton>
        ) : null}
      </div>

      {confirmClear && onClearSlot ? (
        <ConfirmPanel
          className="mt-3"
          title={clearTitle ?? `${clearLabel}?`}
          description={
            clearDescription ??
            "This clears the slot. You can add it again later."
          }
          confirmLabel={clearConfirmLabel ?? clearLabel ?? "Remove"}
          cancelLabel="Keep it"
          onConfirm={() => {
            onClearSlot();
            setConfirmClear(false);
            notify(
              slot === "dessert"
                ? `Dessert removed for ${formatPlanDayLabel(date, "short")}.`
                : `Cleared ${SLOT_LABELS[slot]} for ${formatPlanDayLabel(date, "short")}.`
            );
          }}
          onCancel={() => setConfirmClear(false)}
        />
      ) : null}

      {entries.length === 0 ? (
        <p className="plan-slot-empty">Nothing here yet.</p>
      ) : (
        <ul className="plan-meal-list">
          {entries.map((entry) => (
            <MealRow
              key={entry.id}
              date={date}
              slot={slot}
              entry={entry}
              recipes={recipes}
            />
          ))}
        </ul>
      )}

      <RecipeSearchAdd
        date={date}
        slot={slot}
        recipes={recipes}
        takenSlugs={takenSlugs}
      />
    </section>
  );
}

type SearchOption =
  | { kind: "recipe"; recipe: Recipe }
  | { kind: "custom"; text: string };

function RecipeSearchAdd({
  date,
  slot,
  recipes,
  takenSlugs,
}: {
  date: PlanDate;
  slot: MealSlot;
  recipes: Recipe[];
  takenSlugs: string[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const taken = new Set(takenSlugs);
  const trimmed = query.trim();
  const normalized = trimmed.toLowerCase();
  const matches = recipes
    .filter((recipe) => !taken.has(recipe.slug))
    .filter((recipe) => {
      if (!normalized) return true;
      const haystack = [
        recipe.title,
        recipe.folder,
        ...recipe.tags,
        ...recipe.ingredients.map((item) => item.name),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    })
    .slice(0, 8);
  const options: SearchOption[] = [
    ...matches.map((recipe) => ({ kind: "recipe" as const, recipe })),
    { kind: "custom", text: trimmed },
  ];
  const customIndex = options.length - 1;

  function reset() {
    setQuery("");
    setOpen(false);
    setHighlight(0);
  }

  function choose(option: SearchOption) {
    if (option.kind === "recipe") {
      addPlanRecipe(date, slot, option.recipe.slug);
      reset();
      return;
    }
    if (!option.text) {
      setOpen(true);
      setHighlight(customIndex);
      return;
    }
    addPlanCustom(date, slot, option.text);
    reset();
  }

  return (
    <div className="plan-recipe-search">
      <div className="plan-slot-compose">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setHighlight((value) =>
                Math.min(value + 1, options.length - 1)
              );
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((value) => Math.max(value - 1, 0));
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              const option = options[highlight];
              if (option) choose(option);
              return;
            }
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Search recipes or type a custom item…"
          aria-label={`Search recipes for ${SLOT_LABELS[slot]} on ${formatPlanDayLabel(date)}`}
          aria-autocomplete="list"
          aria-expanded={open}
          className={fieldGrowClass}
        />
        <AppButton
          type="button"
          variant="secondary"
          disabled={
            !options[highlight] ||
            (options[highlight]?.kind === "custom" && !trimmed)
          }
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const option = options[highlight];
            if (option) choose(option);
          }}
        >
          {options[highlight]?.kind === "custom" ? "Add Custom" : "Add Recipe"}
        </AppButton>
      </div>

      {open ? (
        <ul className="plan-recipe-suggestions" role="listbox">
          {matches.map((recipe, index) => (
            <li key={recipe.slug} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                className={[
                  "plan-recipe-suggestion",
                  index === highlight ? "plan-recipe-suggestion-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose({ kind: "recipe", recipe })}
              >
                <span aria-hidden>{recipe.emoji}</span>
                <span className="plan-recipe-suggestion-copy">
                  <span className="plan-recipe-suggestion-title">
                    {recipe.title}
                  </span>
                  <span className="plan-recipe-suggestion-meta">
                    {recipe.folder}
                    {recipe.tags.length > 0
                      ? ` · ${recipe.tags.slice(0, 2).join(", ")}`
                      : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
          <li role="option" aria-selected={highlight === customIndex}>
            <button
              type="button"
              className={[
                "plan-recipe-suggestion plan-recipe-suggestion-custom",
                highlight === customIndex
                  ? "plan-recipe-suggestion-active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setHighlight(customIndex)}
              onClick={() => choose({ kind: "custom", text: trimmed })}
            >
              <span aria-hidden>✏️</span>
              <span className="plan-recipe-suggestion-copy">
                <span className="plan-recipe-suggestion-title">
                  {trimmed
                    ? `Custom item: “${trimmed}”`
                    : "Custom non-recipe item"}
                </span>
                <span className="plan-recipe-suggestion-meta">
                  {trimmed
                    ? "Add this as a planned item without a recipe"
                    : "Type above, then choose this"}
                </span>
              </span>
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

function MealRow({
  date,
  slot,
  entry,
  recipes,
}: {
  date: PlanDate;
  slot: MealSlot;
  entry: MealEntry;
  recipes: Recipe[];
}) {
  const { notify } = useActionFeedback();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const recipe =
    entry.kind === "recipe"
      ? recipes.find((item) => item.slug === entry.slug)
      : undefined;
  const label =
    entry.kind === "note"
      ? entry.text
      : (recipe?.title ?? "Removed from catalogue");

  if (confirmRemove) {
    return (
      <li>
        <ConfirmPanel
          title="Remove from plan?"
          description={`Take “${label}” off ${SLOT_LABELS[slot]} for ${formatPlanDayLabel(date)}.`}
          confirmLabel="Remove"
          cancelLabel="Keep it"
          onConfirm={() => {
            removePlanEntry(date, slot, entry.id);
            setConfirmRemove(false);
            notify(
              `Removed from ${SLOT_LABELS[slot]} · ${formatPlanDayLabel(date, "short")}.`
            );
          }}
          onCancel={() => setConfirmRemove(false)}
        />
      </li>
    );
  }

  if (entry.kind === "note") {
    return (
      <li className="plan-meal plan-meal-note">
        <p>
          <span className="plan-meal-custom-tag">Custom</span>
          {entry.text}
        </p>
        <AppButton
          type="button"
          variant="secondary"
          onClick={() => setConfirmRemove(true)}
          className="border-destructive/35 text-destructive hover:bg-destructive/10"
        >
          Remove
        </AppButton>
      </li>
    );
  }

  return (
    <li className="plan-meal plan-meal-recipe">
      <p>
        <span className="mr-2" aria-hidden>
          {recipe?.emoji ?? "🍽️"}
        </span>
        {label}
      </p>
      <div className="plan-meal-actions">
        {recipe ? (
          <AppButton href={`/recipe/${entry.slug}`}>Open</AppButton>
        ) : null}
        <AppButton
          type="button"
          variant="secondary"
          onClick={() => setConfirmRemove(true)}
          className="border-destructive/35 text-destructive hover:bg-destructive/10"
        >
          Remove
        </AppButton>
      </div>
    </li>
  );
}
