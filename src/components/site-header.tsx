"use client";

import Link from "next/link";
import { BookOpen, CalendarDays, Plus } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { BrandMark } from "@/design-system";

type NavId =
  | "home"
  | "kitchen"
  | "recipe"
  | "keep"
  | "plan"
  | "pantry"
  | "grocery"
  | "profile"
  | "system";

const links: {
  id: NavId;
  href: string;
  label: string;
  icon: typeof BookOpen;
}[] = [
  { id: "kitchen", href: "/kitchen", label: "Recipes", icon: BookOpen },
  { id: "keep", href: "/keep", label: "Add recipe", icon: Plus },
  { id: "plan", href: "/plan", label: "Plan ahead", icon: CalendarDays },
];

export function SiteHeader({ current }: { current?: NavId }) {
  const activeId = current === "recipe" ? "kitchen" : current;

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="page-shell page-shell-wide py-3">
        <nav aria-label="Main" className="site-nav">
          <BrandMark current={activeId === "home"} />
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <AppButton
                key={link.id}
                href={link.href}
                variant={activeId === link.id ? "primary" : "secondary"}
                className="shrink-0"
                aria-current={activeId === link.id ? "page" : undefined}
              >
                <Icon className="size-4" aria-hidden />
                {link.label}
              </AppButton>
            );
          })}
          <Link
            href="/profile"
            aria-current={activeId === "profile" ? "page" : undefined}
            className={`ml-auto shrink-0 px-2 text-sm underline-offset-4 ${
              activeId === "profile"
                ? "font-medium text-foreground underline"
                : "text-muted-foreground"
            }`}
          >
            Profile
          </Link>
        </nav>
      </div>
    </header>
  );
}
