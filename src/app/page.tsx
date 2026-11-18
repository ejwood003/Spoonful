import { EarlyPrototypeModal } from "@/components/early-prototype-modal";
import { HomeBoard } from "@/components/home-board";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader current="home" />
      <EarlyPrototypeModal />
      <HomeBoard />
    </div>
  );
}
