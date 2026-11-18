"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Heart, Plus, Search } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { chipClass, chipMutedClass, fieldIconClass } from "@/design-system";
import { useKeptRecipes, useRemovedSlugs } from "@/lib/use-kept-recipes";
import {
  allTags as seedTags,
  filterRecipes,
  folders,
  KITCHEN_PAGE_SIZE,
  kitchenHref,
  mergeRecipeLists,
  recipes as seedRecipes,
  type Recipe,
} from "@/lib/recipes";

type KitchenBoardProps = {
  folder?: string;
  tag?: string;
  query?: string;
  favorite?: boolean;
  page?: number;
};

export function KitchenBoard({
  folder,
  tag,
  query = "",
  favorite = false,
  page: pageProp = 1,
}: KitchenBoardProps) {
  const router = useRouter();
  const kept = useKeptRecipes();
  const removed = useRemovedSlugs();
  const recipes = mergeRecipeLists(kept, seedRecipes, removed);
  const tags = Array.from(
    new Set([...seedTags, ...kept.flatMap((recipe) => recipe.tags), "favorites"])
  ).sort();
  const visible = filterRecipes({
    folder,
    tag: tag === "favorites" ? undefined : tag,
    query,
    favorite: favorite || tag === "favorites",
    list: recipes,
  });

  const totalPages = Math.max(1, Math.ceil(visible.length / KITCHEN_PAGE_SIZE));
  const page = Math.min(Math.max(1, pageProp), totalPages);
  const pageStart = (page - 1) * KITCHEN_PAGE_SIZE;
  const pageItems = visible.slice(pageStart, pageStart + KITCHEN_PAGE_SIZE);
  const rangeStart = visible.length === 0 ? 0 : pageStart + 1;
  const rangeEnd = pageStart + pageItems.length;

  useEffect(() => {
    if (pageProp !== page && visible.length > 0) {
      router.replace(
        kitchenHref({ folder, tag, query, favorite, page })
      );
    }
  }, [pageProp, page, visible.length, folder, tag, query, favorite, router]);

  function folderCount(name: string) {
    return recipes.filter((recipe) => recipe.folder === name).length;
  }

  function filterSuffix() {
    return (
      <>
        {folder ? ` in ${folder}` : ""}
        {tag ? ` tagged ${tag}` : ""}
        {favorite ? " in Favorites" : ""}
        {query.trim() ? ` matching “${query.trim()}”` : ""}
      </>
    );
  }

  function countLabel() {
    if (visible.length === 0) return null;
    if (totalPages === 1 || rangeStart === rangeEnd) {
      return (
        <>
          Showing {rangeEnd} of {visible.length}
          {filterSuffix()}
        </>
      );
    }
    return (
      <>
        Showing {rangeStart}–{rangeEnd} of {visible.length}
        {filterSuffix()}
      </>
    );
  }

  return (
    <>
      <section className="kitchen-hero" aria-label="My recipes">
        <Image
          src="/kitchen-food.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="kitchen-hero-media"
        />
        <div className="kitchen-hero-scrim" aria-hidden="true" />
        <div className="kitchen-hero-content">
          <h1 className="text-[clamp(1.75rem,3vw+1rem,2.5rem)]">My recipes</h1>
          <p className="kitchen-hero-lede mt-2">
            Your personal catalogue. Find a recipe you already made work — by
            folder, tag, favorite, name, or an ingredient — then open it to cook.
          </p>
          <form
            action="/kitchen"
            method="get"
            className="kitchen-hero-search relative mt-6 w-full max-w-xl"
          >
            {folder ? <input type="hidden" name="folder" value={folder} /> : null}
            {tag ? <input type="hidden" name="tag" value={tag} /> : null}
            {favorite ? (
              <input type="hidden" name="favorite" value="1" />
            ) : null}
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search names, tags, or ingredients"
              aria-label="Search your recipes"
              className={fieldIconClass}
            />
            <AppButton
              type="submit"
              className="absolute top-1/2 right-1.5 min-h-9 -translate-y-1/2 px-3"
            >
              Find
            </AppButton>
          </form>
        </div>
      </section>

      <div className="page-shell page-shell-wide space-y-8 py-[clamp(1.25rem,3vw,2.5rem)]">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-start">
        <aside className="order-1 space-y-4 lg:order-2">
          <AppButton href="/keep" className="w-full">
            <Plus className="size-4" />
            Add a recipe
          </AppButton>
          <FilterGroup
            title="Folders"
            hint="One place you would look"
            legend="Filter by folder"
          >
            {folders.map((item) => (
              <FilterChip
                key={item}
                href={kitchenHref({
                  folder: folder === item ? undefined : item,
                  tag,
                  query,
                  favorite,
                })}
                label={`${item} (${folderCount(item)})`}
                kind="folder"
                active={folder === item}
              />
            ))}
          </FilterGroup>
          <FilterGroup
            title="Tags"
            hint="Find the same recipe another way"
            legend="Filter by tag"
          >
            <FilterChip
              href={kitchenHref({
                folder,
                tag,
                query,
                favorite: !favorite,
              })}
              label={`Favorites (${recipes.filter((recipe) => recipe.favorite).length})`}
              kind="tag"
              active={favorite}
            />
            {tags
              .filter((item) => item !== "favorites")
              .map((item) => (
                <FilterChip
                  key={item}
                  href={kitchenHref({
                    folder,
                    tag: tag === item ? undefined : item,
                    query,
                    favorite,
                  })}
                  label={item}
                  kind="tag"
                  active={tag === item}
                />
              ))}
          </FilterGroup>
        </aside>

        <div className="order-2 flex flex-col lg:order-1">
          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <p className="font-medium">No recipes match that.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Clear a folder or tag, or try a different name or ingredient.
              </p>
              <AppButton href="/kitchen" variant="secondary" className="mt-4">
                Show everything
              </AppButton>
            </div>
          ) : (
            <>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pageItems.map((recipe) => (
                  <li key={recipe.slug}>
                    <RecipeCard recipe={recipe} />
                  </li>
                ))}
              </ul>

              <footer className="kitchen-results-footer mt-8">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {countLabel()}
                </p>
                <nav
                  className="kitchen-pagination"
                  aria-label="Recipe results pages"
                >
                  {page <= 1 ? (
                    <AppButton
                      type="button"
                      variant="secondary"
                      className="min-h-10 px-3"
                      disabled
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="size-4" aria-hidden />
                      Previous
                    </AppButton>
                  ) : (
                    <AppButton
                      href={kitchenHref({
                        folder,
                        tag,
                        query,
                        favorite,
                        page: page - 1,
                      })}
                      variant="secondary"
                      className="min-h-10 px-3"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="size-4" aria-hidden />
                      Previous
                    </AppButton>
                  )}
                  <span className="kitchen-pagination-status text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  {page >= totalPages ? (
                    <AppButton
                      type="button"
                      variant="secondary"
                      className="min-h-10 px-3"
                      disabled
                      aria-label="Next page"
                    >
                      Next
                      <ChevronRight className="size-4" aria-hidden />
                    </AppButton>
                  ) : (
                    <AppButton
                      href={kitchenHref({
                        folder,
                        tag,
                        query,
                        favorite,
                        page: page + 1,
                      })}
                      variant="secondary"
                      className="min-h-10 px-3"
                      aria-label="Next page"
                    >
                      Next
                      <ChevronRight className="size-4" aria-hidden />
                    </AppButton>
                  )}
                </nav>
              </footer>
            </>
          )}
        </div>
      </div>
      </div>
    </>
  );
}

function FilterGroup({
  title,
  hint,
  legend,
  children,
  defaultOpen = true,
}: {
  title: string;
  hint: string;
  legend: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div role="group" aria-label={legend} className="ds-panel p-4">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>
          <span className="font-heading text-lg leading-none">{title}</span>
          <span className="mt-1 block text-sm text-muted-foreground">{hint}</span>
        </span>
        <ChevronDown
          className={`mt-0.5 size-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-0" : "-rotate-90"
          }`}
          aria-hidden
        />
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="mt-3 flex flex-wrap gap-2"
      >
        {children}
      </div>
    </div>
  );
}

function FilterChip({
  href,
  label,
  kind,
  active,
}: {
  href: string;
  label: string;
  kind: "folder" | "tag";
  active: boolean;
}) {
  return (
    <AppButton
      href={href}
      aria-current={active ? "true" : undefined}
      variant={active ? "primary" : kind === "folder" ? "peach" : "secondary"}
    >
      {label}
    </AppButton>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      href={`/recipe/${recipe.slug}`}
      className="block h-full overflow-hidden ds-panel p-3 transition-transform hover:-translate-y-0.5"
    >
      {recipe.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.photo}
          alt=""
          className="h-40 w-full rounded-2xl object-cover"
        />
      ) : (
        <div className="flex h-28 items-center justify-center rounded-2xl bg-secondary text-4xl">
          {recipe.emoji}
        </div>
      )}
      <div className="px-2 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg leading-snug">{recipe.title}</h2>
          {recipe.favorite ? (
            <Heart className="size-4 shrink-0 fill-primary text-primary" />
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{recipe.whyKept}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={chipClass}>{recipe.folder}</span>
          {recipe.tags.map((item) => (
            <span key={item} className={chipMutedClass}>
              {item}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
