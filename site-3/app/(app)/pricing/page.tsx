import React from "react";
import { PricingHeader } from "@/app/components/pricing/pricing-header";
import { PricingCards } from "@/app/components/pricing/pricing-cards";
import { PricingTable } from "@/app/components/pricing/pricing-table";
import { PricingFaq } from "@/app/components/pricing/pricing-faq";

export const metadata = {
  title: "Planos & Preços — Star Multlogin",
  description:
    "Perfis locais ilimitados gratuitos. Solo, Pro e Team adicionam backups na nuvem, API de alta performance e colaboração de equipe.",
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
