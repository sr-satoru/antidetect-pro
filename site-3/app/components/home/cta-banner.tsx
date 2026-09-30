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

          {/* Download buttons grid */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#download-win"
              className="inline-flex items-center gap-3 px-6 py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-all shadow-md active:scale-95"
            >
              <Monitor className="w-4 h-4" />
              <span>Windows (.exe)</span>
            </a>

            <a
              href="#download-mac"
              className="inline-flex items-center gap-3 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#00FF66] to-[#00D655] text-black font-bold text-sm hover:brightness-110 transition-all shadow-md shadow-[#00FF66]/20 active:scale-95"
            >
              <Apple className="w-4 h-4" />
              <span>macOS (Apple Silicon / Intel)</span>
            </a>

            <a
              href="#download-linux"
              className="inline-flex items-center gap-3 px-6 py-3.5 rounded-xl bg-[#15161C] text-zinc-200 border border-white/10 font-bold text-sm hover:bg-[#1E2028] hover:text-white transition-all active:scale-95"
            >
              <Terminal className="w-4 h-4 text-[#00FF66]" />
              <span>Linux (AppImage / .deb)</span>
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
