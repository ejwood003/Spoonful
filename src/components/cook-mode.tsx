"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChefHat } from "lucide-react";
import posthog from "posthog-js";
import { AppButton } from "@/components/app-button";
import {
  clearCookProgress,
  readCookProgress,
  saveCookProgress,
} from "@/lib/cook-progress-store";
import { useKeptRecipes, useRemovedSlugs } from "@/lib/use-kept-recipes";
import {
  mergeRecipeLists,
  recipes as seedRecipes,
  type Recipe,
} from "@/lib/recipes";
import { parseServes, scaleAmount } from "@/lib/scale";

function resolveServes(requested: number | null | undefined, baseServes: number) {
  if (
    typeof requested === "number" &&
    Number.isFinite(requested) &&
    requested >= 1
  ) {
    return Math.min(24, Math.round(requested));
  }
  return baseServes;
}

function initialStepIndex(slug: string, total: number) {
  if (total <= 0) return 0;
  const saved = readCookProgress();
  if (!saved || saved.slug !== slug) return 0;
  return Math.min(Math.max(0, saved.stepIndex), total - 1);
}

export function CookMode({
  recipe,
  serves: servesProp = null,
}: {
  recipe: Recipe;
  serves?: number | null;
}) {
  const kept = useKeptRecipes();
  const removed = useRemovedSlugs();
  const catalog = mergeRecipeLists(kept, seedRecipes, removed);
  const live = catalog.find((item) => item.slug === recipe.slug) ?? recipe;
  const baseServes = parseServes(live.servings);
  const serves = resolveServes(servesProp, baseServes);
  const factor = serves / baseServes;
  const scaledIngredients = live.ingredients.map((item) => ({
    ...item,
    kept: scaleAmount(item.kept, factor),
  }));
  const steps = live.steps;
  const total = steps.length;
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const hasSteps = total > 0;
  const safeIndex = hasSteps ? Math.min(index, total - 1) : 0;
  const currentStep = hasSteps ? steps[safeIndex] : null;
  const progress = hasSteps ? ((safeIndex + 1) / total) * 100 : 0;
  const isFirst = safeIndex <= 0;
  const isLast = hasSteps && safeIndex >= total - 1;
  const recipeHref = `/recipe/${live.slug}`;

  useEffect(() => {
    setIndex(initialStepIndex(live.slug, total));
    setReady(true);
  }, [live.slug, total]);

  useEffect(() => {
    if (!ready) return;
    if (!hasSteps) {
      clearCookProgress(live.slug);
      return;
    }
    saveCookProgress({
      slug: live.slug,
      title: live.title,
      emoji: live.emoji,
      stepIndex: safeIndex,
      stepTotal: total,
      serves: servesProp ?? serves,
      updatedAt: new Date().toISOString(),
    });
  }, [
    hasSteps,
    live.emoji,
    live.slug,
    live.title,
    ready,
    safeIndex,
    serves,
    servesProp,
    total,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-[4.5rem] z-10 -mx-[clamp(1rem,4.5vw,2.75rem)] border-b border-border bg-background/95 px-[clamp(1rem,4.5vw,2.75rem)] py-3 backdrop-blur">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AppButton href={recipeHref} variant="secondary">
              <ArrowLeft className="size-4" />
              Back to recipe
            </AppButton>
            <p className="text-sm text-muted-foreground">
              {hasSteps ? (
                <>
                  Step {safeIndex + 1} of {total}
                </>
              ) : (
                <>No steps yet</>
              )}
            </p>
          </div>

          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={hasSteps ? total : 1}
            aria-valuenow={hasSteps ? safeIndex + 1 : 0}
            aria-label={
              hasSteps
                ? `Cooking progress: step ${safeIndex + 1} of ${total}`
                : "Cooking progress: no steps"
            }
            className="h-2.5 overflow-hidden rounded-full bg-secondary"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <header className="flex flex-wrap items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-2xl">
          {live.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="ds-kicker">Cook mode</p>
          <h1 className="ds-title">{live.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {live.time}
            {` · amounts for ${serves} ${serves === 1 ? "person" : "people"}`}
          </p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:items-start">
        <aside className="ds-panel p-5 lg:sticky lg:top-40">
          <h2 className="text-xl">Ingredients</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Amounts for {serves} {serves === 1 ? "person" : "people"}. Keep this
            list visible while you cook.
          </p>
          {scaledIngredients.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No ingredients listed for this recipe.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {scaledIngredients.map((item) => (
                <li key={`${item.name}-${item.kept}`} className="py-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.kept}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="ds-panel flex min-h-[18rem] flex-col p-6 sm:p-8">
          {hasSteps && currentStep ? (
            <>
              <p className="ds-kicker">Current step</p>
              <div className="mt-4 flex gap-4">
                <span
                  aria-hidden
                  className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground"
                >
                  {safeIndex + 1}
                </span>
                <p className="text-[clamp(1.25rem,2vw+0.75rem,1.75rem)] leading-snug font-medium">
                  {currentStep}
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-start justify-center gap-3">
              <ChefHat className="size-8 text-muted-foreground" aria-hidden />
              <h2 className="text-2xl">No steps to cook through</h2>
              <p className="max-w-md text-muted-foreground">
                This recipe does not have steps yet. Add steps on the recipe
                edit screen, or head back when you are ready.
              </p>
              <AppButton href={`/keep?slug=${live.slug}`} variant="secondary">
                Edit recipe
              </AppButton>
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-8">
            <AppButton
              variant="secondary"
              disabled={!hasSteps || isFirst}
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
            >
              <ArrowLeft className="size-4" />
              Back
            </AppButton>

            {hasSteps && isLast ? (
              <AppButton
                href={recipeHref}
                onClick={() => {
                  clearCookProgress(live.slug);
                  posthog.capture("cooking_completed", {
                    servings: serves,
                    step_count: total,
                  });
                  posthog.logger.info("cooking completed", {
                    servings: serves,
                    step_count: total,
                  });
                }}
              >
                <Check className="size-4" />
                Done
              </AppButton>
            ) : (
              <AppButton
                disabled={!hasSteps}
                onClick={() =>
                  setIndex((value) => Math.min(total - 1, value + 1))
                }
              >
                Next
                <ArrowRight className="size-4" />
              </AppButton>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
