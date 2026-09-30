"use client";

import React from "react";
import { Monitor, Apple, Terminal, Star } from "lucide-react";
import { useI18n } from "@/app/contexts/i18n-context";

export function CtaBanner() {
  const { t } = useI18n();

  return (
    <section id="download" className="py-20 relative overflow-hidden">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-7">
        <div className="relative rounded-3xl bg-gradient-to-b from-[#12131A] to-[#0A0B0E] border border-[#232530] p-8 sm:p-14 text-center overflow-hidden shadow-2xl">
          {/* Subtle background glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#00FF66]/10 blur-[130px] pointer-events-none" />

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00FF66] to-[#00D655] mb-6 shadow-lg shadow-[#00FF66]/20">
            <Star className="w-7 h-7 fill-black stroke-black" />
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white max-w-2xl mx-auto">
            {t.cta.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#9093A2] max-w-xl mx-auto leading-relaxed">
            {t.cta.subtitle}
          </p>

          {/* Direct Download Button */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/download"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-[#00FF66] to-[#00D655] text-black font-extrabold text-base hover:brightness-110 transition-all shadow-xl shadow-[#00FF66]/25 active:scale-95 cursor-pointer"
            >
              <span>{t.hero.downloadBtn}</span>
            </a>
          </div>

          <div className="mt-7 text-xs text-[#5E6172]">
            {t.cta.guarantee}
          </div>
        </div>
      </div>
    </section>
  );
}
