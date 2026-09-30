import React from "react";
import type { Metadata } from "next";
import { PricingHeader } from "@/app/components/pricing/pricing-header";
import { PricingCards } from "@/app/components/pricing/pricing-cards";
import { PricingTable } from "@/app/components/pricing/pricing-table";
import { PricingFaq } from "@/app/components/pricing/pricing-faq";

export const metadata: Metadata = {
  title: "Planos & Preços — Gratuito e Cloud",
  description:
    "Confira os planos do Star Multlogin. Comece com perfis locais ilimitados 100% gratuitos ou evolua para backups em nuvem, automação e proxies dedicados.",
  keywords: [
    "preço navegador antidetect",
    "star multlogin planos",
    "antidetect gratis",
    "multilogin barato",
    "planos antidetect brasil",
    "antidetect para afiliados",
  ],
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Planos & Preços | Star Multlogin",
    description:
      "Perfis locais ilimitados gratuitos e planos Cloud com sincronização, automação e trabalho em equipe.",
    url: "/pricing",
    type: "website",
  },
};

export default function PricingPage() {
  return (
    <div className="pt-12 pb-24">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-7">
        <PricingHeader />
        <PricingCards />
        <PricingTable />
        <PricingFaq />
      </div>
    </div>
  );
}
