"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChefHat, Heart, Pencil, Share2, ShoppingBasket, Trash2 } from "lucide-react";
import posthog from "posthog-js";
import { useActionFeedback } from "@/components/action-feedback";
import { AppButton } from "@/components/app-button";
import { ConfirmPanel } from "@/components/confirm-panel";
import { fieldClass, fieldCompactClass } from "@/design-system";
import { addIngredientsToGrocery } from "@/lib/grocery-store";
import {
  addCookEvent,
  removeRecipeFromCatalog,
  saveKeptRecipe,
} from "@/lib/kept-store";
import { removeRecipeFromPlan } from "@/lib/plan-store";
import {
  kitchenHref,
  mergeRecipeLists,
  recipes as seedRecipes,
  type Recipe,
} from "@/lib/recipes";
import { parseServes, scaleAmount } from "@/lib/scale";
import { useKeptRecipes, useRemovedSlugs } from "@/lib/use-kept-recipes";

export function RecipeCook({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const { notify } = useActionFeedback();
  const kept = useKeptRecipes();
  const removed = useRemovedSlugs();
  const catalog = mergeRecipeLists(kept, seedRecipes, removed);
  const live = catalog.find((item) => item.slug === recipe.slug) ?? recipe;
  const baseServes = parseServes(live.servings);
  const [serves, setServes] = useState(baseServes);
  const [copied, setCopied] = useState(false);
  const [listed, setListed] = useState(false);
  const [logNote, setLogNote] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const factor = serves / baseServes;
  const similar = catalog.filter(
    (item) =>
      item.slug !== live.slug &&
      item.tags.some((tag) => live.tags.includes(tag))
  );

  const scaledIngredients = live.ingredients.map((item) => ({
    ...item,
    kept: scaleAmount(item.kept, factor),
  }));

  function toggleFavorite() {
    saveKeptRecipe({ ...live, favorite: !live.favorite });
  }

  function removeFromCatalog() {
    removeRecipeFromCatalog(live.slug);
    removeRecipeFromPlan(live.slug);
    notify(`Removed “${live.title}” from your catalogue.`);
    router.push("/kitchen");
  }

  async function share() {
    const text = [
      live.title,
      `Serves ${serves}`,
      "",
      "Ingredients",
      ...scaledIngredients.map((item) => `- ${item.kept} ${item.name}`),
      "",
      "Steps",
      ...live.steps.map((step, index) => `${index + 1}. ${step}`),
      live.notes.length ? `\nNotes\n${live.notes.map((note) => `- ${note}`).join("\n")}` : "",
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function mark(kind: "made" | "planned") {
    addCookEvent(live, {
      date: new Date().toLocaleDateString(),
      kind,
      note: logNote.trim() || (kind === "made" ? `Made for ${serves}` : `Plan for ${serves}`),
    });
    posthog.capture("recipe_cook_logged", {
      cook_status: kind,
      servings: serves,
    });
    setLogNote("");
  }

  return (
    <>
      {live.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={live.photo}
          alt=""
          className="mb-6 h-56 w-full rounded-3xl object-cover shadow-mealtime sm:h-80"
        />
      ) : null}

      <div className="flex flex-wrap items-start gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-3xl">
          {live.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[clamp(1.75rem,3vw+1rem,2.75rem)]">{live.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {live.time} · last cooked {live.lastCooked.toLowerCase()}
            {live.source ? ` · from ${live.source}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <AppButton
          href={`/recipe/${live.slug}/cook?serves=${serves}`}
          onClick={() =>
            posthog.capture("cooking_started", {
              servings: serves,
              step_count: live.steps.length,
            })
          }
        >
          <ChefHat className="size-4" />
          Make this recipe
        </AppButton>
        <AppButton onClick={toggleFavorite} variant={live.favorite ? "primary" : "secondary"}>
          <Heart className={live.favorite ? "size-4 fill-current" : "size-4"} />
          {live.favorite ? "Favorited" : "Favorite"}
        </AppButton>
        <AppButton href={`/keep?slug=${live.slug}`} variant="secondary">
          <Pencil className="size-4" />
          Edit
        </AppButton>
        <AppButton onClick={share} variant="secondary">
          <Share2 className="size-4" />
          {copied ? "Copied" : "Share"}
        </AppButton>
        <AppButton href={`/plan?add=${live.slug}`} variant="secondary">
          Add to plan
        </AppButton>
        <AppButton
          variant="secondary"
          onClick={() => {
            addIngredientsToGrocery(
              scaledIngredients.map((item) => ({
                name: item.name,
                amount: item.kept,
                recipeTitle: live.title,
              }))
            );
            posthog.capture("recipe_added_to_grocery_list", {
              ingredient_count: scaledIngredients.length,
              servings: serves,
            });
            setListed(true);
          }}
        >
          <ShoppingBasket className="size-4" />
          {listed ? "On the list" : "Add to grocery list"}
        </AppButton>
        {listed ? (
          <AppButton href="/grocery" variant="peach">
            Open list
          </AppButton>
        ) : null}
        <AppButton
          variant="secondary"
          onClick={() => setConfirmRemove(true)}
          className="border-destructive/35 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-4" />
          Remove from catalogue
        </AppButton>
      </div>

      {confirmRemove ? (
        <ConfirmPanel
          className="mt-4"
          title="Remove this recipe?"
          description="It will leave your catalogue, favorites, and meal plan. Grocery items you already added stay on the list."
          confirmLabel="Remove recipe"
          cancelLabel="Keep it"
          onConfirm={removeFromCatalog}
          onCancel={() => setConfirmRemove(false)}
        />
      ) : null}

      <section className="mt-8 ds-panel p-5">
        <p className="text-sm font-medium">This recipe serves</p>
        <p className="mt-1 font-heading text-[clamp(1.75rem,3vw+0.5rem,2.25rem)]">
          {serves} {serves === 1 ? "person" : "people"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Written for {baseServes}. Scale it up or down for the table tonight.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[2, 4, 6, 8, 12].map((count) => (
            <AppButton
              key={count}
              variant={serves === count ? "primary" : "secondary"}
              onClick={() => setServes(count)}
              className="min-h-10 px-3"
            >
              {count}
            </AppButton>
          ))}
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium">Custom</span>
            <input
              type="number"
              min={1}
              max={24}
              value={serves}
              onChange={(event) =>
                setServes(Math.max(1, Number(event.target.value) || 1))
              }
              aria-label="Custom serving count"
              className={fieldCompactClass}
            />
          </label>
        </div>
      </section>

      {live.notes.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-2xl">Notes</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed">
            {live.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-2xl">Ingredients</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Amounts below are for {serves} people.
          </p>
          <ul className="mt-4 divide-y divide-border">
            {scaledIngredients.map((item) => (
              <li key={`${item.name}-${item.kept}`} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{item.name}</span>
                  <span>{item.kept}</span>
                </div>
                {item.changed ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Blog called for {item.original}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl">Steps</h2>
          <ol className="mt-4 space-y-3">
            {live.steps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                  {index + 1}
                </span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="mt-12">
        <h2 className="text-2xl">Tags</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap a tag to see other recipes like this.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {live.tags.map((tag) => (
            <AppButton
              key={tag}
              href={kitchenHref({ tag })}
              variant="secondary"
            >
              {tag}
            </AppButton>
          ))}
        </div>
        {similar.length > 0 ? (
          <div className="mt-10">
            <h3 className="font-heading text-xl">More with these tags</h3>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {similar.slice(0, 3).map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/recipe/${item.slug}`}
                    className="block ds-panel p-4 hover:border-primary/40"
                  >
                    <p className="text-lg">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.tags.join(" · ")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="mt-12 ds-panel p-5">
        <h2 className="text-2xl">Previous edits and cooks</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Mark when you make it or plan it, and leave a note about what you
          changed.
        </p>
        <input
          value={logNote}
          onChange={(event) => setLogNote(event.target.value)}
          placeholder="Used browned butter again, extra salt"
          className={`mt-4 ${fieldClass}`}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <AppButton onClick={() => mark("made")}>I made this</AppButton>
          <AppButton variant="secondary" onClick={() => mark("planned")}>
            Plan this
          </AppButton>
        </div>
        {(live.cookLog ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No cooks logged yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {(live.cookLog ?? []).map((event) => (
              <li key={event.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                <span className="font-medium">
                  {event.kind === "made" ? "Made" : "Planned"} {event.date}
                </span>
                {event.note ? <p className="text-muted-foreground">{event.note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
