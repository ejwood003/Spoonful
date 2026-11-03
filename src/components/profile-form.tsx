"use client";

import { useState, useSyncExternalStore } from "react";
import { AppButton } from "@/components/app-button";
import { fieldClass, fieldCompactClass } from "@/design-system";
import {
  applyDefaultPeople,
  applyProfileName,
  applyTheme,
  readDefaultPeople,
  themes,
} from "@/components/theme-provider";

function subscribeProfile(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("kept-profile", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("kept-profile", onStoreChange);
  };
}

function readName() {
  return window.localStorage.getItem("kept-name") ?? "";
}

function readTheme() {
  return window.localStorage.getItem("kept-theme") ?? "peach";
}

export function ProfileForm() {
  const storedName = useSyncExternalStore(subscribeProfile, readName, () => "");
  const storedTheme = useSyncExternalStore(
    subscribeProfile,
    readTheme,
    () => "peach"
  );
  const storedPeople = useSyncExternalStore(
    subscribeProfile,
    readDefaultPeople,
    () => 4
  );
  const [name, setName] = useState<string | null>(null);
  const [theme, setTheme] = useState<string | null>(null);
  const [people, setPeople] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const liveName = name ?? storedName;
  const liveTheme = theme ?? storedTheme;
  const livePeople = people ?? String(storedPeople);

  return (
    <form
      className="max-w-xl space-y-8"
      onSubmit={(event) => {
        event.preventDefault();
        applyProfileName(liveName.trim());
        applyTheme(liveTheme);
        applyDefaultPeople(Number(livePeople));
        setSaved(true);
      }}
    >
      <div>
        <h1 className="text-[clamp(1.75rem,3vw+1rem,2.5rem)]">Profile</h1>
        <p className="mt-2 text-muted-foreground">
          Your name, the kitchen color, and the rest of your settings.
          Coral is the default from the recipe kit. Rose and berry only
          change that accent.
        </p>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium">Your name</span>
        <input
          value={liveName}
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
          placeholder="The cook this kitchen belongs to"
          className={fieldClass}
        />
      </label>

      <label className="block max-w-[12rem]">
        <span className="mb-2 block text-sm font-medium">
          Default number of people
        </span>
        <p className="mb-3 text-sm text-muted-foreground">
          How many you usually cook recipes for. Plan ahead starts from this.
        </p>
        <input
          type="number"
          min={1}
          max={24}
          inputMode="numeric"
          value={livePeople}
          onChange={(event) => {
            setPeople(event.target.value);
            setSaved(false);
          }}
          className={fieldCompactClass}
          aria-label="Default number of people to cook recipes for"
        />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Kitchen color</legend>
        <p className="mb-3 text-sm text-muted-foreground">
          Coral is the default. Rose and berry keep the same cream paper.
        </p>
        <div className="flex flex-wrap gap-2">
          {themes.map((item) => (
            <AppButton
              key={item.id}
              type="button"
              variant={liveTheme === item.id ? "primary" : "secondary"}
              aria-pressed={liveTheme === item.id}
              onClick={() => {
                setTheme(item.id);
                applyTheme(item.id);
                setSaved(false);
              }}
            >
              {item.label}
            </AppButton>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <AppButton type="submit">Save profile</AppButton>
        {saved ? (
          <p className="text-sm text-muted-foreground">Saved in this browser.</p>
        ) : null}
      </div>
    </form>
  );
}
