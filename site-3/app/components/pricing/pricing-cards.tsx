"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, Star } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useI18n } from "@/app/contexts/i18n-context";

export function PricingCards() {
  const { t, language } = useI18n();
  const p = t.pricingPage;

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const currencySymbol = language === "pt" ? "R$" : "$";
  const rate = language === "pt" ? 1 : 0.2; // roughly converted for international display if needed

  const plans = [
    {
      id: "free",
      name: p.freePlan.name,
      tagline: p.freePlan.tagline,
      description: p.freePlan.description,
      priceMonthly: 0,
      priceYearly: 0,
      highlight: false,
      ctaText: p.freePlan.cta,
      ctaHref: "/download",
      ctaVariant: "secondary" as const,
      note: p.freePlan.note,
      features: p.freePlan.features,
    },
    {
      id: "solo",
      name: p.soloPlan.name,
      tagline: p.soloPlan.tagline,
      description: p.soloPlan.description,
      priceMonthly: language === "pt" ? 29 : 6,
      priceYearly: language === "pt" ? 23 : 5,
      highlight: false,
      ctaText: p.soloPlan.cta,
      ctaHref: "/auth?action=register",
      ctaVariant: "outline" as const,
      note: p.soloPlan.note,
      features: p.soloPlan.features,
    },
    {
      id: "pro",
      name: p.proPlan.name,
      tagline: p.proPlan.tagline,
      description: p.proPlan.description,
      priceMonthly: language === "pt" ? 89 : 18,
      priceYearly: language === "pt" ? 69 : 14,
      highlight: true,
      ctaText: p.proPlan.cta,
      ctaHref: "/auth?action=register",
      ctaVariant: "star" as const,
      note: p.proPlan.note,
      features: p.proPlan.features,
    },
    {
      id: "team",
      name: p.teamPlan.name,
      tagline: p.teamPlan.tagline,
      description: p.teamPlan.description,
      priceMonthly: language === "pt" ? 179 : 36,
      priceYearly: language === "pt" ? 139 : 28,
      highlight: false,
      ctaText: p.teamPlan.cta,
      ctaHref: "/auth?action=register",
      ctaVariant: "secondary" as const,
      note: p.teamPlan.note,
      features: p.teamPlan.features,
    },
  ];

  return (
    <div className="w-full">
      {/* Billing Switcher */}
      <div className="flex items-center justify-center mb-12">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#12131A] border border-[#232530]">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              billingCycle === "monthly"
                ? "bg-white text-black shadow-sm"
                : "text-[#9093A2] hover:text-white"
            }`}
          >
            {p.monthly}
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              billingCycle === "yearly"
                ? "bg-white text-black shadow-sm"
                : "text-[#9093A2] hover:text-white"
            }`}
          >
            <span>{p.yearly}</span>
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/30">
              {p.yearlyDiscount}
            </span>
          </button>
        </div>
      </div>

      {/* Grid of 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const price = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-3xl p-6 transition-all duration-300 ${
                plan.highlight
                  ? "bg-gradient-to-b from-[#181A24] to-[#111219] border-2 border-[#00FF66]/60 shadow-[0_0_35px_rgba(0,255,102,0.18)] ring-1 ring-[#00FF66]/30"
                  : "bg-[#12131A] border border-[#232530] hover:border-white/20 hover:bg-[#151622]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge variant="star" className="font-bold py-1 px-3 shadow-md flex items-center gap-1.5">
                    <Star className="w-3 h-3 fill-[#00FF66]" />
                    <span>{plan.tagline}</span>
                  </Badge>
                </div>
              )}

              {/* Title & Tagline */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <span className="text-[11px] font-mono text-[#9093A2]">
                    {plan.tagline}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#9093A2] min-h-[32px] leading-relaxed">
                  {plan.description}
                </p>
              </div>

              {/* Price display */}
              <div className="my-4 pb-4 border-b border-[#232530]">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                    {currencySymbol}{price}
                  </span>
                  <span className="text-xs text-[#9093A2]">
                    {price > 0 ? (language === "en" ? "/ mo" : "/ mês") : ""}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-[#5E6172] font-medium">
                  {plan.note}
                </div>
              </div>

              {/* CTA Button */}
              <div className="mb-6">
                <Link href={plan.ctaHref}>
                  <Button variant={plan.ctaVariant} className="w-full gap-2 font-bold">
                    <span>{plan.ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              {/* Feature List */}
              <div className="flex-1 space-y-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9093A2] mb-2">
                  {language === "en"
                    ? "Included features:"
                    : language === "es"
                    ? "Funciones incluidas:"
                    : language === "fr"
                    ? "Fonctionnalités incluses :"
                    : "Recursos inclusos:"}
                </div>
                {plan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-[#00FF66]" />
                    <span className="leading-snug">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
