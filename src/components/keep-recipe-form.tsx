"use client";

import { type FormEvent, type ReactNode, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, ImagePlus, Link2, PenLine, Plus, Trash2 } from "lucide-react";
import posthog from "posthog-js";
import { useActionFeedback } from "@/components/action-feedback";
import { AppButton } from "@/components/app-button";
import { ConfirmPanel } from "@/components/confirm-panel";
import { areaClass, fieldClass } from "@/design-system";
import { recipeFromPastedUrl } from "@/lib/demo-from-url";
import {
  removeRecipeFromCatalog,
  saveKeptRecipe,
  slugifyTitle,
} from "@/lib/kept-store";
import { readMealPhoto } from "@/lib/photo";
import { removeRecipeFromPlan } from "@/lib/plan-store";
import { allTags, folders, type Recipe } from "@/lib/recipes";

const emojis = [
  "🍪",
  "🍋",
  "🍞",
  "🍖",
  "🍌",
  "🌿",
  "🍲",
  "🥗",
  "🥧",
  "☕",
  "🍝",
  "🌮",
  "🥞",
  "🍕",
  "🐟",
  "🥑",
  "🧀",
  "🥕",
  "🍜",
  "🧁",
  "🥘",
  "🍗",
  "🍩",
  "🍳",
];

type IngredientDraft = {
  name: string;
  kept: string;
  original: string;
};

function draftsFrom(recipe?: Recipe): IngredientDraft[] {
  if (!recipe || recipe.ingredients.length === 0) {
    return [
      { name: "", kept: "", original: "" },
      { name: "", kept: "", original: "" },
    ];
  }
  return recipe.ingredients.map((item) => ({
    name: item.name,
    kept: item.kept,
    original: item.original,
  }));
}

export function KeepRecipeForm({ initial }: { initial?: Recipe }) {
  const router = useRouter();
  const { notify } = useActionFeedback();
  const photoInputId = useId();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const editing = Boolean(initial);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "🍪");
  const [photo, setPhoto] = useState(initial?.photo ?? "");
  const [photoError, setPhotoError] = useState("");
  const [folder, setFolder] = useState<(typeof folders)[number]>(
    (initial?.folder as (typeof folders)[number]) ?? "Weeknight"
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(initial?.tags ?? []);
  const [customTag, setCustomTag] = useState("");
  const [favorite, setFavorite] = useState(Boolean(initial?.favorite));
  const [time, setTime] = useState(initial?.time ?? "");
  const [servings, setServings] = useState(initial?.servings ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [pasteUrl, setPasteUrl] = useState("");
  const [urlNotice, setUrlNotice] = useState("");
  const [step, setStep] = useState<"choose" | "link" | "form">(
    editing ? "form" : "choose"
  );
  const [whyKept, setWhyKept] = useState(initial?.whyKept ?? "");
  const [notes, setNotes] = useState(initial?.notes.join("\n") ?? "");
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    draftsFrom(initial)
  );
  const [steps, setSteps] = useState(initial?.steps.join("\n") ?? "");
  const [confirmRemove, setConfirmRemove] = useState(false);

  function applyRecipe(recipe: Recipe, keepSource?: string) {
    setTitle(recipe.title);
    setEmoji(recipe.emoji);
    setPhoto(recipe.photo ?? "");
    setFolder(
      folders.includes(recipe.folder as (typeof folders)[number])
        ? (recipe.folder as (typeof folders)[number])
        : "Weeknight"
    );
    setSelectedTags(recipe.tags);
    setFavorite(Boolean(recipe.favorite));
    setTime(recipe.time);
    setServings(recipe.servings);
    setSource(keepSource ?? recipe.source);
    setWhyKept(recipe.whyKept);
    setNotes(recipe.notes.join("\n"));
    setIngredients(draftsFrom(recipe));
    setSteps(recipe.steps.join("\n"));
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    );
  }

  function addCustomTag() {
    const tag = customTag.trim().toLowerCase();
    if (!tag) {
      return;
    }
    setSelectedTags((current) =>
      current.includes(tag) ? current : [...current, tag]
    );
    setCustomTag("");
  }

  function updateIngredient(
    index: number,
    key: keyof IngredientDraft,
    value: string
  ) {
    setIngredients((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    );
  }

  async function handlePhoto(file?: File) {
    setPhotoError("");
    if (!file) {
      return;
    }
    try {
      const dataUrl = await readMealPhoto(file);
      setPhoto(dataUrl);
    } catch {
      setPhotoError("That photo could not be added. Try another image.");
    }
  }

  function fillFromUrl() {
    const recipe = recipeFromPastedUrl(pasteUrl);
    applyRecipe(recipe, pasteUrl.trim() || recipe.source);
    setUrlNotice(
      "Brought in from your link. This prototype fills a sample — change anything that isn’t how you actually cook it."
    );
    setStep("form");
  }

  function startOver() {
    setStep("choose");
    setPasteUrl("");
    setUrlNotice("");
    setTitle("");
    setEmoji("🍪");
    setPhoto("");
    setPhotoError("");
    setFolder("Weeknight");
    setSelectedTags([]);
    setCustomTag("");
    setFavorite(false);
    setTime("");
    setServings("");
    setSource("");
    setWhyKept("");
    setNotes("");
    setIngredients(draftsFrom());
    setSteps("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim() || "Untitled kept recipe";
    const noteLines = notes
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const stepLines = steps
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const keptIngredients = ingredients
      .filter((item) => item.name.trim() && item.kept.trim())
      .map((item) => ({
        name: item.name.trim(),
        kept: item.kept.trim(),
        original: item.original.trim(),
        changed: Boolean(item.original.trim()),
      }));

    const recipe: Recipe = {
      slug: initial?.slug ?? slugifyTitle(trimmedTitle),
      title: trimmedTitle,
      emoji,
      folder,
      tags: selectedTags,
      source: source.trim() || "A blog I do not want to hunt for again",
      lastCooked: initial?.lastCooked ?? "Today",
      time: time.trim() || "Weeknight",
      servings: servings.trim() || "4",
      whyKept:
        whyKept.trim() || "The version that actually worked in this kitchen.",
      notes: noteLines,
      ingredients:
        keptIngredients.length > 0
          ? keptIngredients
          : [
              {
                name: "your ingredients",
                original: "",
                kept: "as you actually use them",
                changed: false,
              },
            ],
      steps:
        stepLines.length > 0
          ? stepLines
          : ["Cook it the way you already know works."],
      favorite,
      photo: photo || undefined,
      cookLog: initial?.cookLog,
    };

    saveKeptRecipe(recipe);
    posthog.capture(editing ? "recipe_updated" : "recipe_created", {
      creation_method: urlNotice ? "url_import" : "manual",
      has_photo: Boolean(recipe.photo),
      ingredient_count: recipe.ingredients.length,
      step_count: recipe.steps.length,
      tag_count: recipe.tags.length,
    });
    posthog.logger.info("recipe saved", {
      save_mode: editing ? "update" : "create",
      creation_method: urlNotice ? "url_import" : "manual",
      has_photo: Boolean(recipe.photo),
      ingredient_count: recipe.ingredients.length,
      step_count: recipe.steps.length,
      tag_count: recipe.tags.length,
    });
    notify(
      editing
        ? `Saved “${recipe.title}”.`
        : `Kept “${recipe.title}” in your catalogue.`
    );
    router.push(`/recipe/${recipe.slug}`);
  }

  function removeFromCatalog() {
    if (!initial) {
      return;
    }
    removeRecipeFromCatalog(initial.slug);
    removeRecipeFromPlan(initial.slug);
    posthog.capture("recipe_deleted");
    notify(`Removed “${initial.title}” from your catalogue.`);
    router.push("/kitchen");
  }

  if (!editing && step === "choose") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <OptionCard
          number="1"
          icon={<Link2 className="size-5" />}
          title="From a link"
          body="Paste a blog, pin, or shared recipe. We’ll bring it in, then you keep the amounts you actually use."
          action="Paste a link"
          onClick={() => setStep("link")}
        />
        <OptionCard
          number="2"
          icon={<PenLine className="size-5" />}
          title="Write it yourself"
          body="Start blank. Name it, add a photo, and write the version that already worked in this kitchen."
          action="Start from scratch"
          onClick={() => setStep("form")}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {!editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <AppButton type="button" variant="secondary" onClick={startOver}>
            Choose a different way
          </AppButton>
        </div>
      ) : null}

      {!editing && step === "link" ? (
        <section className="ds-panel-wash p-4 sm:p-5">
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Option 1
          </p>
          <h2 className="mt-1 font-heading text-xl">Paste the link</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Drop in a URL. We’ll pull the recipe across so you can edit it into
            the version you keep.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={pasteUrl}
              onChange={(event) => setPasteUrl(event.target.value)}
              placeholder="https://…"
              className={fieldClass}
              aria-label="Recipe URL"
            />
            <AppButton
              type="button"
              className="shrink-0"
              onClick={fillFromUrl}
            >
              Bring it in
            </AppButton>
          </div>
        </section>
      ) : null}

      {urlNotice ? (
        <p className="ds-panel px-4 py-3 text-sm text-muted-foreground">
          {urlNotice}
        </p>
      ) : null}

      {step === "form" || editing ? (
        <>
      {!editing && !urlNotice ? (
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Option 2 · Write it yourself
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Icon</legend>
          <div className="flex flex-wrap gap-2">
            {emojis.map((item) => (
              <AppButton
                key={item}
                type="button"
                onClick={() => setEmoji(item)}
                aria-pressed={emoji === item}
                variant={emoji === item ? "primary" : "secondary"}
                className="min-h-11 w-11 px-0 text-xl"
              >
                {item}
              </AppButton>
            ))}
          </div>
        </fieldset>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Recipe name</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Brown butter chocolate chip cookies"
              className={fieldClass}
            />
          </label>
          <AppButton
            type="button"
            variant={favorite ? "primary" : "secondary"}
            onClick={() => setFavorite((current) => !current)}
            aria-pressed={favorite}
          >
            <Heart className={favorite ? "size-4 fill-current" : "size-4"} />
            {favorite ? "Favorited" : "Add to Favorites"}
          </AppButton>
        </div>
      </div>

      <section className="ds-panel p-4 sm:p-5">
        <h2 className="font-heading text-xl">Picture of the meal</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional. Shows on the kitchen card and at the top of the recipe.
        </p>
        {photo ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt="Meal preview"
              className="h-48 w-full object-cover sm:h-64"
            />
          </div>
        ) : (
          <label
            htmlFor={photoInputId}
            className="mt-4 flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-muted/40 px-4 text-center"
          >
            <ImagePlus className="size-6 text-muted-foreground" />
            <span className="text-sm font-medium">Tap to add a photo</span>
            <span className="text-sm text-muted-foreground">
              Phone camera or a picture from your library
            </span>
          </label>
        )}
        <input
          id={photoInputId}
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            void handlePhoto(file);
            event.target.value = "";
          }}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <AppButton
            type="button"
            variant="secondary"
            onClick={() => photoInputRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            {photo ? "Change picture" : "Choose picture"}
          </AppButton>
          {photo ? (
            <AppButton
              type="button"
              variant="secondary"
              onClick={() => setPhoto("")}
            >
              Remove picture
            </AppButton>
          ) : null}
        </div>
        {photoError ? (
          <p className="mt-2 text-sm text-destructive">{photoError}</p>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <fieldset className="ds-panel p-4">
          <legend className="font-heading text-lg">Folder</legend>
          <p className="mb-3 text-sm text-muted-foreground">
            One place you would look
          </p>
          <div className="flex flex-wrap gap-2">
            {folders.map((item) => (
              <AppButton
                key={item}
                type="button"
                onClick={() => setFolder(item)}
                aria-pressed={folder === item}
                variant={folder === item ? "primary" : "peach"}
              >
                {item}
              </AppButton>
            ))}
          </div>
        </fieldset>

        <fieldset className="ds-panel p-4">
          <legend className="font-heading text-lg">Tags</legend>
          <p className="mb-3 text-sm text-muted-foreground">
            Find this recipe another way
          </p>
          <div className="flex flex-wrap gap-2">
            {allTags.map((item) => (
              <AppButton
                key={item}
                type="button"
                onClick={() => toggleTag(item)}
                aria-pressed={selectedTags.includes(item)}
                variant={selectedTags.includes(item) ? "primary" : "secondary"}
              >
                {item}
              </AppButton>
            ))}
            {selectedTags
              .filter((item) => !allTags.includes(item))
              .map((item) => (
                <AppButton
                  key={item}
                  type="button"
                  onClick={() => toggleTag(item)}
                  variant="primary"
                >
                  {item}
                </AppButton>
              ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={customTag}
              onChange={(event) => setCustomTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomTag();
                }
              }}
              placeholder="Add a tag"
              className={fieldClass}
            />
            <AppButton type="button" variant="secondary" onClick={addCustomTag}>
              Add tag
            </AppButton>
          </div>
        </fieldset>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Time</span>
          <input
            value={time}
            onChange={(event) => setTime(event.target.value)}
            placeholder="30 min"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Servings</span>
          <input
            value={servings}
            onChange={(event) => setServings(event.target.value)}
            placeholder="4"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Where it came from</span>
          <input
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="A Pinterest pin, 2022"
            className={fieldClass}
          />
        </label>
      </div>

      <section className="ds-panel-wash p-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">
            Why this is the one you keep
          </span>
          <input
            value={whyKept}
            onChange={(event) => setWhyKept(event.target.value)}
            placeholder="The version that actually came out chewy in this oven."
            className={fieldClass}
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-medium">
            Notes (one per line)
          </span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={"Cut the sugar by ¼ cup.\nChill the dough overnight."}
            className={areaClass}
          />
        </label>
      </section>

      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[clamp(1.35rem,2vw+0.8rem,1.75rem)]">
              Ingredients
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              What amount is the one you cook from. Fill in the blog amount only
              if you changed it.
            </p>
          </div>
          <AppButton
            type="button"
            variant="secondary"
            onClick={() =>
              setIngredients((current) => [
                ...current,
                { name: "", kept: "", original: "" },
              ])
            }
          >
            <Plus className="size-4" />
            Add ingredient
          </AppButton>
        </div>
        <ul className="mt-4 space-y-3">
          {ingredients.map((item, index) => (
            <li
              key={index}
              className="grid gap-2 ds-panel p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <input
                value={item.name}
                onChange={(event) =>
                  updateIngredient(index, "name", event.target.value)
                }
                placeholder="Ingredient"
                aria-label={`Ingredient ${index + 1} name`}
                className={fieldClass}
              />
              <input
                value={item.kept}
                onChange={(event) =>
                  updateIngredient(index, "kept", event.target.value)
                }
                placeholder="What amount"
                aria-label={`Ingredient ${index + 1} kept amount`}
                className={fieldClass}
              />
              <input
                value={item.original}
                onChange={(event) =>
                  updateIngredient(index, "original", event.target.value)
                }
                placeholder="Blog called for…"
                aria-label={`Ingredient ${index + 1} original amount`}
                className={fieldClass}
              />
              <AppButton
                type="button"
                variant="secondary"
                onClick={() =>
                  setIngredients((current) =>
                    current.length === 1
                      ? current
                      : current.filter((_, itemIndex) => itemIndex !== index)
                  )
                }
                className="w-11 px-0"
                aria-label={`Remove ingredient ${index + 1}`}
              >
                <Trash2 className="size-4" />
              </AppButton>
            </li>
          ))}
        </ul>
      </section>

      <label className="block">
        <span className="mb-2 block font-heading text-[clamp(1.35rem,2vw+0.8rem,1.75rem)]">
          Steps
        </span>
        <p className="mb-3 text-sm text-muted-foreground">One step per line.</p>
        <textarea
          value={steps}
          onChange={(event) => setSteps(event.target.value)}
          placeholder={
            "Brown the butter until it smells nutty.\nChill overnight.\nBake 10–12 minutes."
          }
          className={`${areaClass} min-h-40`}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <AppButton type="submit" className="min-h-12 px-6 text-base">
          {editing ? "Save this recipe" : "Keep this recipe"}
        </AppButton>
        {editing ? (
          <AppButton
            type="button"
            variant="secondary"
            onClick={() => setConfirmRemove(true)}
            className="border-destructive/35 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" />
            Remove from catalogue
          </AppButton>
        ) : null}
      </div>

      {editing && confirmRemove ? (
        <ConfirmPanel
          title="Remove this recipe?"
          description="It will leave your catalogue, favorites, and meal plan. Grocery items you already added stay on the list."
          confirmLabel="Remove recipe"
          cancelLabel="Keep it"
          onConfirm={removeFromCatalog}
          onCancel={() => setConfirmRemove(false)}
        />
      ) : null}
        </>
      ) : null}
    </form>
  );
}

function OptionCard({
  number,
  icon,
  title,
  body,
  action,
  onClick,
}: {
  number: string;
  icon: ReactNode;
  title: string;
  body: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col items-start ds-panel p-5 text-left transition-colors hover:border-primary/40 hover:bg-secondary"
    >
      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-forest text-sm font-semibold text-white">
        {number}
      </span>
      <span className="mt-4 inline-flex items-center gap-2 font-heading text-xl">
        {icon}
        {title}
      </span>
      <span className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {body}
      </span>
      <span className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">
        {action}
      </span>
    </button>
  );
}
