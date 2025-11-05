import React from "react";
import { Hero } from "../components/landing/hero";
import { Features } from "../components/landing/features";
import { HowItWorks } from "../components/landing/how-it-works";
import { Stats } from "../components/landing/stats";
import { CTA } from "../components/landing/cta";
import { Header } from "../components/landing/header";
import { Footer } from "../components/landing/footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* ✅ This container centers and balances left/right margins */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Hero />
          <Stats />
          <Features />
          <HowItWorks />
          <CTA />
        </div>
      </main>
      <Footer />
    </div>
  );
}
