import Image from "next/image";
import { ArrowRight, Plus } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { EarlyPrototypeModal } from "@/components/early-prototype-modal";
import { HomeGreeting } from "@/components/home-greeting";
import { SiteHeader } from "@/components/site-header";

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <EarlyPrototypeModal />
      <section className="landing-hero" aria-label="Spoonful landing">
        <Image
          src="/landing-food.jpg"
          alt="A plated meal on a dark table — warm light catching herbs and sauce"
          fill
          priority
          sizes="100vw"
          className="landing-hero-media"
        />
        <div className="landing-hero-scrim" aria-hidden="true" />
        <div className="landing-hero-content">
          <p className="landing-brand">Spoonful</p>
          <HomeGreeting />
          <h1 className="mt-4 text-[clamp(1.6rem,3.2vw+0.5rem,2.4rem)] leading-[1.15] text-balance">
            Your recipes, your way
          </h1>
          <p className="landing-lede mt-4 max-w-md text-lg leading-relaxed">
            Find it in your list, or add one you want to keep.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <AppButton href="/" className="w-full sm:w-auto">
              Go to my kitchen
              <ArrowRight className="size-4" />
            </AppButton>
            <AppButton
              href="/keep"
              variant="secondary"
              className="w-full sm:w-auto"
            >
              <Plus className="size-4" />
              Add a recipe
            </AppButton>
          </div>
        </div>
      </section>
    </div>
  );
}
