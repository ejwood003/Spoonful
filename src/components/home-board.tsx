"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChefHat,
  Plus,
} from "lucide-react";
import { AppButton } from "@/components/app-button";
import { HomeGreeting } from "@/components/home-greeting";
import {
  cookProgressHref,
  useCookProgress,
} from "@/lib/cook-progress-store";
import {
  MEAL_SLOTS,
  SLOT_LABELS,
  addDaysISO,
  formatPlanDayLabel,
  getDayMeals,
  toISODate,
  useDatePlan,
  type PlanDate,
} from "@/lib/plan-store";
import {
  mergeRecipeLists,
  recipes as seedRecipes,
} from "@/lib/recipes";
import { useKeptRecipes, useRemovedSlugs } from "@/lib/use-kept-recipes";

export function HomeBoard() {
  const progress = useCookProgress();
  const plan = useDatePlan();
  const kept = useKeptRecipes();
  const removed = useRemovedSlugs();
  const recipes = mergeRecipeLists(kept, seedRecipes, removed);
  const [upcomingDays, setUpcomingDays] = useState<PlanDate[]>([]);

  useEffect(() => {
    const today = toISODate(new Date());
    setUpcomingDays([today, addDaysISO(today, 1)]);
  }, []);

  const hasResume =
    progress != null &&
    progress.stepTotal > 0 &&
    progress.stepIndex < progress.stepTotal;

  const dayGroups = upcomingDays.map((date) => {
    const day = getDayMeals(plan, date);
    const items = MEAL_SLOTS.flatMap((slot) =>
      day[slot].map((entry) => {
        if (entry.kind === "note") {
          return {
            id: entry.id,
            slot,
            label: entry.text,
            emoji: null as string | null,
            href: null as string | null,
            custom: true,
          };
        }
        const recipe = recipes.find((item) => item.slug === entry.slug);
        return {
          id: entry.id,
          slot,
          label: recipe?.title ?? "Removed from catalogue",
          emoji: recipe?.emoji ?? "🍽️",
          href: recipe ? `/recipe/${entry.slug}` : null,
          custom: false,
        };
      })
    );
    return { date, items };
  });
  const hasUpcoming = dayGroups.some((group) => group.items.length > 0);

  return (
    <section className="landing-hero" aria-label="Spoonful home">
      <Image
        src="/landing-food.jpg"
        alt="A plated meal on a dark table — warm light catching herbs and sauce"
        fill
        priority
        sizes="100vw"
        className="landing-hero-media"
      />
      <div className="landing-hero-scrim" aria-hidden="true" />
      <div className="landing-hero-shell">
        <div className="landing-hero-content">
          <p className="landing-brand">Spoonful</p>
          <HomeGreeting />
          <h1 className="mt-4 text-[clamp(1.6rem,3.2vw+0.5rem,2.4rem)] leading-[1.15] text-balance">
            {hasResume ? "Pick up where you left off" : "Ready when you are"}
          </h1>
          <p className="landing-lede mt-4 max-w-md text-lg leading-relaxed">
            {hasResume
              ? "You have a cook-through in progress. Jump back in, or head to your catalogue."
              : "Open a recipe you already keep, add a new one, or plan the week ahead."}
          </p>

          {hasResume && progress ? (
            <div className="home-resume mt-6">
              <div className="home-resume-copy">
                <span className="home-resume-emoji" aria-hidden>
                  {progress.emoji || "🍽️"}
                </span>
                <div className="min-w-0">
                  <p className="home-resume-kicker">
                    <ChefHat className="size-3.5" aria-hidden />
                    In progress
                  </p>
                  <p className="home-resume-title">{progress.title}</p>
                  <p className="home-resume-meta">
                    Step {progress.stepIndex + 1} of {progress.stepTotal}
                  </p>
                </div>
              </div>
              <AppButton
                href={cookProgressHref(progress)}
                className="w-full sm:w-auto"
              >
                Continue cooking
                <ArrowRight className="size-4" />
              </AppButton>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <AppButton href="/kitchen" className="w-full sm:w-auto">
              <BookOpen className="size-4" />
              Recipes
            </AppButton>
            <AppButton
              href="/keep"
              variant="secondary"
              className="w-full sm:w-auto"
            >
              <Plus className="size-4" />
              Add a recipe
            </AppButton>
            <AppButton
              href="/plan"
              variant="secondary"
              className="w-full sm:w-auto"
            >
              <CalendarDays className="size-4" />
              Plan ahead
            </AppButton>
          </div>
        </div>

        <aside className="home-upcoming" aria-label="Planned for the next two days">
          <div className="home-upcoming-head">
            <p className="home-resume-kicker">
              <CalendarDays className="size-3.5" aria-hidden />
              Next 2 days
            </p>
            <AppButton href="/plan" variant="secondary" className="shrink-0">
              Plan
            </AppButton>
          </div>

          {!upcomingDays.length ? (
            <p className="home-upcoming-empty">Loading your plan…</p>
          ) : !hasUpcoming ? (
            <p className="home-upcoming-empty">
              Nothing planned for today or tomorrow yet.
            </p>
          ) : (
            <div className="home-upcoming-days">
              {dayGroups.map((group) => (
                <div key={group.date} className="home-upcoming-day">
                  <h2 className="home-upcoming-day-title">
                    {formatPlanDayLabel(group.date, "short")}
                  </h2>
                  {group.items.length === 0 ? (
                    <p className="home-upcoming-empty">Nothing planned</p>
                  ) : (
                    <ul className="home-upcoming-list">
                      {group.items.map((item) => (
                        <li key={item.id}>
                          {item.href ? (
                            <a href={item.href} className="home-upcoming-item">
                              <span className="home-upcoming-slot">
                                {SLOT_LABELS[item.slot]}
                              </span>
                              <span className="home-upcoming-label">
                                {item.emoji ? (
                                  <span aria-hidden className="mr-1.5">
                                    {item.emoji}
                                  </span>
                                ) : null}
                                {item.label}
                              </span>
                            </a>
                          ) : (
                            <div className="home-upcoming-item">
                              <span className="home-upcoming-slot">
                                {SLOT_LABELS[item.slot]}
                                {item.custom ? " · Custom" : ""}
                              </span>
                              <span className="home-upcoming-label">
                                {item.label}
                              </span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
