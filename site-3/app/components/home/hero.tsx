"use client";

import React from "react";
import Link from "next/link";
import {
  Download,
  CheckCircle2,
  ArrowRight,
  Star,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useI18n } from "@/app/contexts/i18n-context";

export function Hero() {
  const { t } = useI18n();

  return (
    <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 z-20 overflow-visible">
      {/* Background cyber green glow highlights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-gradient-to-tr from-[#00FF66]/10 via-[#00D655]/5 to-transparent blur-[140px]" />
      </div>

      <div className="mx-auto max-w-[1320px] px-5 text-center sm:px-7">
        {/* Top Badges */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2 mb-8">
          <Badge variant="star" className="gap-1.5 font-bold">
            <Star className="w-3 h-3 fill-[#00FF66]" />
            {t.hero.starBadge}
          </Badge>
          <Badge variant="outline" className="border-[#232530] bg-[#101116] text-zinc-300">
            {t.hero.unlimitedProfilesBadge}
          </Badge>
        </div>

        {/* Main Heading */}
        <h1 className="mx-auto max-w-4xl text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
          {t.hero.titleLine1} <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-white via-[#00FF66] to-[#00D655] bg-clip-text text-transparent">
            {t.hero.titleHighlight}
          </span>
        </h1>

        {/* Subhead description */}
        <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-[#9093A2] leading-relaxed font-normal">
          {t.hero.description}
        </p>

        {/* Action CTAs */}
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 relative z-40">
          <Link href="/download" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="star"
              className="w-full sm:w-auto gap-2.5 text-base font-bold cursor-pointer shadow-lg shadow-[#00FF66]/20"
            >
              <Download className="w-5 h-5 stroke-[2.2]" />
              <span>{t.hero.downloadBtn}</span>
            </Button>
          </Link>

          <Link href="/pricing" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto gap-2 text-base text-zinc-200 hover:text-white cursor-pointer"
            >
              <span>{t.hero.viewPlansBtn}</span>
              <ArrowRight className="w-4 h-4 text-zinc-400" />
            </Button>
          </Link>
        </div>

        {/* Small trust features */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-[#9093A2]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00FF66]" />
            <span>{t.hero.trustFree}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00FF66]" />
            <span>{t.hero.trustTelemetry}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00FF66]" />
            <span>{t.hero.trustIsolation}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
