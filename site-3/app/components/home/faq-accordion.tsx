"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle, Star } from "lucide-react";
import { useI18n } from "@/app/contexts/i18n-context";

export function FaqAccordion() {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = t.faq.items.map((item) => ({
    q: item.question,
    a: item.answer,
  }));

  return (
    <section className="py-20 border-t border-[#232530] bg-[#08090C]">
      <div className="mx-auto max-w-4xl px-5 sm:px-7">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#12131A] border border-[#232530] text-xs text-[#9093A2] mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-[#00FF66]" />
            <span>{t.faq.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            {t.faq.title}
          </h2>
          <p className="mt-3 text-base text-[#9093A2]">
            {t.faq.subtitle}
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-[#232530] bg-[#12131A] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-white/5 cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-semibold text-zinc-200">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-zinc-400 transition-transform duration-200 shrink-0 ml-4 ${
                      isOpen ? "rotate-180 text-[#00FF66]" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm leading-relaxed text-[#9093A2] border-t border-[#232530]">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
