"use client";

import { SiteHeader } from "@/components/site-header";
import { PageShell } from "@/components/page-shell";
import { RecipeCook } from "@/components/recipe-view";
import { AppButton } from "@/components/app-button";
import { useKeptRecipe, useRecipeRemoved } from "@/lib/use-kept-recipes";
import type { Recipe } from "@/lib/recipes";

export function RecipeScreen({
  slug,
  baked,
}: {
  slug: string;
  baked: Recipe | null;
}) {
  const stored = useKeptRecipe(slug);
  const removed = useRecipeRemoved(slug);
  const recipe = removed ? null : stored ?? baked ?? null;

  if (!recipe) {
    return (
      <div className="flex min-h-full flex-col">
        <SiteHeader current="recipe" />
        <PageShell>
          <h1 className="text-3xl">That recipe is not here</h1>
          <p className="mt-2 text-muted-foreground">
            It may have been removed from your catalogue, or only lived in
            another browser.
          </p>
          <AppButton href="/kitchen" className="mt-4">
            Back to My recipes
          </AppButton>
        </PageShell>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader current="recipe" />
      <PageShell wide>
        <RecipeCook recipe={recipe} />
      </PageShell>
    </div>
  );
}
