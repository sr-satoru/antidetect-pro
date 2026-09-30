"use client";

import React from "react";
import { useI18n } from "@/app/contexts/i18n-context";

export function Ticker() {
  const { t } = useI18n();
  const items = t.ticker;

  return (
    <div className="relative z-10 w-full overflow-hidden border-y border-[#232530] bg-[#0c0d12] py-3.5 my-10">
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#08090C] to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#08090C] to-transparent z-10" />

      <div className="flex w-max animate-ticker gap-8 whitespace-nowrap">
        {[...items, ...items, ...items].map((item, idx) => (
          <div
            key={idx}
            className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-medium text-zinc-300 tracking-wide"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] shadow-[0_0_8px_#00FF66]" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
