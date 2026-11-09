"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import posthog from "posthog-js";
import { AppButton } from "@/components/app-button";
import { applyProfileName } from "@/components/theme-provider";
import { Field, Panel } from "@/design-system";

type Mode = "signin" | "signup";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignup = mode === "signup";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (isSignup && !name.trim()) {
      setError("Add your name so the kitchen knows who it belongs to.");
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Passwords are at least 8 characters.");
      return;
    }

    const userEmail = email.trim().toLowerCase();
    const userName = name.trim();

    let previousUser = "";

    setPending(true);
    try {
      previousUser = window.localStorage.getItem("kept-user") ?? "";
      window.localStorage.setItem("kept-user", userEmail);
      if (isSignup) {
        applyProfileName(userName);
      }
    } catch {
      // Storage can be blocked (private window). The prototype still continues.
    }

    if (
      process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
      process.env.NEXT_PUBLIC_POSTHOG_HOST
    ) {
      if (previousUser && previousUser !== userEmail) {
        posthog.reset();
      }
      posthog.identify(userEmail, {
        email: userEmail,
        ...(isSignup ? { name: userName } : {}),
      });
      posthog.capture(isSignup ? "account_created" : "user_signed_in", {
        authentication_method: "password",
      });
      posthog.logger.info("account authentication completed", {
        authentication_method: "password",
        account_flow: isSignup ? "signup" : "signin",
      });
    }

    router.push("/kitchen");
  }

  return (
    <Panel className="w-full max-w-md p-[clamp(1.5rem,4vw,2.25rem)]">
      <div className="mb-6">
        <h1 className="text-[clamp(1.6rem,2.5vw+1rem,2.1rem)]">
          {isSignup ? "Start your kitchen" : "Welcome back"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isSignup
            ? "Make an account to keep the recipes you already cook."
            : "Sign in to cook from the recipes you saved."}
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {isSignup ? (
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Your name</span>
            <Field
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              placeholder="The cook this kitchen belongs to"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-2 block text-sm font-medium">Email</span>
          <Field
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 flex items-center justify-between text-sm font-medium">
            Password
            {!isSignup ? (
              <button
                type="button"
                className="text-sm font-normal text-muted-foreground underline-offset-4 hover:underline"
                onClick={() =>
                  setError("Password reset isn't hooked up yet in the prototype.")
                }
              >
                Forgot password?
              </button>
            ) : null}
          </span>
          <span className="relative block">
            <Field
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={isSignup ? "At least 8 characters" : "Your password"}
              className="pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </span>
        </label>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <AppButton type="submit" className="w-full" disabled={pending}>
          {pending ? "One moment…" : isSignup ? "Create account" : "Sign in"}
        </AppButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignup ? "Already have an account?" : "New to Spoonful?"}{" "}
        <button
          type="button"
          className="font-medium text-foreground underline underline-offset-4"
          onClick={() => {
            setMode(isSignup ? "signin" : "signup");
            setError(null);
          }}
        >
          {isSignup ? "Sign in" : "Create an account"}
        </button>
      </p>
    </Panel>
  );
}
