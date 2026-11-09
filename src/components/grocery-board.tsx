"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { useActionFeedback } from "@/components/action-feedback";
import { AppButton } from "@/components/app-button";
import { ConfirmPanel } from "@/components/confirm-panel";
import { areaMutedClass } from "@/design-system";
import {
  AISLES,
  clearCheckedGrocery,
  groceryAsText,
  setGroceryAisle,
  toggleGroceryItem,
  useGrocery,
  type Aisle,
  type GroceryItem,
} from "@/lib/grocery-store";

export function GroceryBoard() {
  const { notify } = useActionFeedback();
  const items = useGrocery();
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const needed = items.filter((item) => !item.checked).length;
  const checkedCount = items.filter((item) => item.checked).length;
  const listText = groceryAsText(items);

  async function copyList() {
    try {
      await navigator.clipboard.writeText(listText);
      setCopied(true);
    } catch {
      const area = document.createElement("textarea");
      area.value = listText;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      setCopied(true);
    }
    posthog.capture("grocery_list_copied", {
      item_count: items.length,
      pending_item_count: needed,
    });
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[clamp(1.75rem,3vw+1rem,2.5rem)]">Grocery list</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            What a recipe still needs, grouped the way you walk the store.
            {needed > 0 ? ` ${needed} still to buy.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AppButton type="button" onClick={copyList}>
            {copied ? "Copied" : "Copy list"}
          </AppButton>
          {checkedCount > 0 && !confirmClear ? (
            <AppButton
              type="button"
              variant="secondary"
              onClick={() => setConfirmClear(true)}
              className="border-destructive/35 text-destructive hover:bg-destructive/10"
            >
              Clear checked
            </AppButton>
          ) : null}
        </div>
      </div>

      {confirmClear ? (
        <ConfirmPanel
          title="Clear checked items?"
          description={`Remove ${checkedCount} checked ${
            checkedCount === 1 ? "item" : "items"
          } from the grocery list. Unchecked items stay.`}
          confirmLabel="Clear checked"
          cancelLabel="Keep them"
          onConfirm={() => {
            clearCheckedGrocery();
            posthog.capture("grocery_items_cleared", {
              item_count: checkedCount,
            });
            setConfirmClear(false);
            notify("Cleared checked grocery items.");
          }}
          onCancel={() => setConfirmClear(false)}
        />
      ) : null}

      {items.length > 0 ? (
        <section className="ds-panel p-4">
          <h2 className="font-heading text-xl">Text to share</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Copy this into a message or your phone’s list. Checked items stay off it.
          </p>
          <textarea
            readOnly
            value={listText}
            aria-label="Grocery list as text"
            className={`mt-3 min-h-40 ${areaMutedClass}`}
          />
        </section>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="font-medium">Nothing to buy yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a recipe and add it to the grocery list.
          </p>
          <AppButton href="/kitchen" variant="secondary" className="mt-4">
            Find a recipe
          </AppButton>
        </div>
      ) : (
        <div className="space-y-6">
          {AISLES.map((aisle) => {
            const rows = items.filter((item) => item.aisle === aisle);
            if (rows.length === 0) {
              return null;
            }
            return (
              <section key={aisle} className="ds-panel p-4">
                <h2 className="font-heading text-xl">{aisle}</h2>
                <ul className="mt-3 space-y-3">
                  {rows.map((item) => (
                    <GroceryRow key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GroceryRow({ item }: { item: GroceryItem }) {
  return (
    <li className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className={item.checked ? "font-medium text-muted-foreground line-through" : "font-medium"}>
          {item.amount ? `${item.amount} ` : ""}
          {item.name}
        </p>
        {item.recipes.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            For {item.recipes.join(", ")}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium">Aisle</span>
          <select
            value={item.aisle}
            onChange={(event) =>
              setGroceryAisle(item.id, event.target.value as Aisle)
            }
            aria-label={`Aisle for ${item.name}`}
            className="h-11 rounded-full border border-border bg-card px-3"
          >
            {AISLES.map((aisle) => (
              <option key={aisle} value={aisle}>
                {aisle}
              </option>
            ))}
          </select>
        </label>
        <AppButton
          type="button"
          variant={item.checked ? "primary" : "secondary"}
          onClick={() => {
            toggleGroceryItem(item.id);
            posthog.capture("grocery_item_checked", {
              checked: !item.checked,
            });
          }}
        >
          {item.checked ? "Got it" : "Check off"}
        </AppButton>
      </div>
    </li>
  );
}
