import { BackgroundOrbs } from "@/components/BackgroundOrbs";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Nav } from "@/components/Nav";
import { WhatIsMaia } from "@/components/WhatIsMaia";
import { CaseContext } from "@/components/CaseContext";
import { LiveDemo } from "@/components/LiveDemo";
import { HowItThinks } from "@/components/HowItThinks";
import { Footer } from "@/components/Footer";
import { SHOW_INTERNALS } from "@/lib/featureFlags";

export default function App() {
  return (
    <div className="relative min-h-screen bg-bg text-fg font-sans antialiased overflow-x-hidden">
      <BackgroundOrbs />
      <ScrollProgress />
      <Nav />
      <main className="relative z-10">
        <LiveDemo />
        <CaseContext />
        <WhatIsMaia />
        {SHOW_INTERNALS && <HowItThinks />}
      </main>
      <Footer />
    </div>
  );
}
