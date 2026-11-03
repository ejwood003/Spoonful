"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AppButton } from "@/components/app-button";

/**
 * Shown on every home and /landing visit. Intentionally not persisted — the
 * product asked for an early-prototype reminder each time, not a forever dismiss.
 */
export function EarlyPrototypeModal() {
  const [open, setOpen] = useState(true);
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="early-prototype-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setOpen(false);
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="early-prototype-dialog"
      >
        <p className="ds-kicker">Spoonful prototype</p>
        <h2 id={titleId}>This is an early prototype</h2>
        <p id={descriptionId}>
          Spoonful is still in early stages. Flows may be incomplete, sample
          data may stand in for real cooking, and things can change quickly.
          Thanks for trying it while we shape the kitchen.
        </p>
        <div className="early-prototype-actions">
          <AppButton ref={closeRef} onClick={() => setOpen(false)}>
            Continue
          </AppButton>
        </div>
      </div>
    </div>
  );
}
