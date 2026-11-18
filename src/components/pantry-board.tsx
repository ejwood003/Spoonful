"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { useActionFeedback } from "@/components/action-feedback";
import { AppButton } from "@/components/app-button";
import { ConfirmPanel } from "@/components/confirm-panel";
import { fieldGrowClass } from "@/design-system";
import { addIngredientsToGrocery } from "@/lib/grocery-store";
import { ingredientCovered } from "@/lib/pantry-match";
import { addPantryItem, removePantryItem, usePantry } from "@/lib/pantry-store";
import {
  mergeRecipeLists,
  recipes as seedRecipes,
  type Ingredient,
  type Recipe,
} from "@/lib/recipes";
import { useKeptRecipes, useRemovedSlugs } from "@/lib/use-kept-recipes";

export function PantryBoard() {
  const { notify } = useActionFeedback();
  const pantry = usePantry();
  const kept = useKeptRecipes();
  const removed = useRemovedSlugs();
  const recipes = mergeRecipeLists(kept, seedRecipes, removed);
  const [draft, setDraft] = useState("");
  const [scanned, setScanned] = useState(false);
  const [added, setAdded] = useState("");
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const pendingRemove = pantry.find((item) => item.id === pendingRemoveId);
  const names = pantry.map((item) => item.name);
  const matches = recipes
    .map((recipe) => {
      const missing = recipe.ingredients.filter(
        (item) => !ingredientCovered(item.name, names)
      );
      if (missing.length === 0 && recipe.ingredients.length > 0) {
        return { recipe, kind: "make" as const, missing };
      }
      if (missing.length > 0 && missing.length <= 2) {
        return { recipe, kind: "almost" as const, missing };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => Number(a.kind === "almost") - Number(b.kind === "almost"));

  function addItem() {
    if (!draft.trim()) {
      return;
    }
    addPantryItem(draft);
    posthog.capture("pantry_item_added");
    setDraft("");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[clamp(1.75rem,3vw+1rem,2.5rem)]">My Pantry</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          What you already have at home. See which kept recipes you can cook
          without a store run.
        </p>
      </div>

      <section className="ds-panel p-4 sm:p-5">
        <h2 className="font-heading text-xl">On hand</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addItem();
              }
            }}
            placeholder="Yoghurt, tortillas, cheddar…"
            aria-label="Add a pantry ingredient"
            className={fieldGrowClass}
          />
          <AppButton type="button" onClick={addItem}>
            Add ingredient
          </AppButton>
        </div>
        {pantry.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            The pantry is empty. Add what is actually in the kitchen.
          </p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {pantry.map((item) => (
              <li key={item.id}>
                <AppButton
                  type="button"
                  variant="secondary"
                  onClick={() => setPendingRemoveId(item.id)}
                  aria-label={`Remove ${item.name}`}
                  className={
                    pendingRemoveId === item.id
                      ? "border-destructive/35 text-destructive"
                      : undefined
                  }
                >
                  {item.name}
                  <span aria-hidden="true">×</span>
                </AppButton>
              </li>
            ))}
          </ul>
        )}
        {pendingRemove ? (
          <ConfirmPanel
            className="mt-4"
            title={`Remove ${pendingRemove.name}?`}
            description="Take it off the pantry list. You can add it again anytime."
            confirmLabel="Remove"
            cancelLabel="Keep it"
            onConfirm={() => {
              removePantryItem(pendingRemove.id);
              setPendingRemoveId(null);
              notify(`Removed ${pendingRemove.name} from pantry.`);
            }}
            onCancel={() => setPendingRemoveId(null)}
          />
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Tap an ingredient to take it off the list.
          </p>
        )}
      </section>

      <div>
        <AppButton type="button" onClick={() => setScanned(true)}>
          See what I can make
        </AppButton>
      </div>

      {scanned ? (
        <section className="space-y-4">
          <h2 className="font-heading text-2xl">From this pantry</h2>
          {matches.length === 0 ? (
            <p className="text-muted-foreground">
              Nothing close yet. Add a few more staples, or keep another recipe.
            </p>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {matches.map((match) => (
                <li key={match.recipe.slug}>
                  <article className="flex h-full flex-col ds-panel p-4">
                    <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                      {match.kind === "make" ? "Make this" : "Almost"}
                    </p>
                    <h3 className="mt-1 font-heading text-xl">
                      {match.recipe.emoji} {match.recipe.title}
                    </h3>
                    {match.kind === "almost" ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Still need {match.missing.map((item) => item.name).join(", ")}.
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Everything in this recipe is already at home.
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <AppButton href={`/recipe/${match.recipe.slug}`}>Open</AppButton>
                      {match.kind === "almost" ? (
                        <AppButton
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            addMissing(match.recipe, match.missing);
                            posthog.capture("pantry_missing_items_added", {
                              item_count: match.missing.length,
                            });
                            setAdded(match.recipe.title);
                          }}
                        >
                          Add missing items
                        </AppButton>
                      ) : null}
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
          {added ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Missing items for {added} are on the grocery list.
              </p>
              <AppButton href="/grocery" variant="secondary">
                Open list
              </AppButton>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function addMissing(recipe: Recipe, missing: Ingredient[]) {
  addIngredientsToGrocery(
    missing.map((item) => ({
      name: item.name,
      amount: item.kept,
      recipeTitle: recipe.title,
    }))
  );
}
