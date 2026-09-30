"use client";

import React from "react";
import { Badge } from "@/app/components/ui/badge";
import { useI18n } from "@/app/contexts/i18n-context";

export function PricingHeader() {
  const { t } = useI18n();
  const p = t.pricingPage;

  return (
    <div className="text-center max-w-3xl mx-auto mb-12">
      <Badge variant="star" className="mb-4 font-bold">
        {p.badge}
      </Badge>
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
        {p.title}
      </h1>
      <p className="mt-4 text-base sm:text-lg text-[#9093A2] leading-relaxed">
        {p.subtitle}
      </p>
    </div>
  );
}
