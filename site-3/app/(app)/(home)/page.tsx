import React from "react";
import { Hero } from "@/app/components/home/hero";
import { Ticker } from "@/app/components/home/ticker";
import { PreviewSection } from "@/app/components/home/preview-section";
import { BentoFeatures } from "@/app/components/home/bento-features";
import { ApiSection } from "@/app/components/home/api-section";
import { FaqAccordion } from "@/app/components/home/faq-accordion";
import { CtaBanner } from "@/app/components/home/cta-banner";

export default function HomePage() {
  return (
    <div className="relative">
      <Hero />
      <Ticker />
      <PreviewSection />
      <BentoFeatures />
      <ApiSection />
      <FaqAccordion />
      <CtaBanner />
    </div>
  );
}
