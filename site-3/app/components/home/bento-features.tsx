"use client";

import React from "react";
import { Fingerprint, Lock, Compass, Globe, Shield, RefreshCw, Server, EyeOff, Star } from "lucide-react";
import { useI18n } from "@/app/contexts/i18n-context";

export function BentoFeatures() {
  const { t } = useI18n();

  const sections = [
    {
      category: "01 · " + t.bento.card1Badge,
      color: "from-[#00FF66]/20 to-transparent",
      features: [
        {
          num: "01",
          icon: Fingerprint,
          title: t.bento.card1Title,
          description: t.bento.card1Desc,
        },
        {
          num: "02",
          icon: Lock,
          title: t.bento.card3Title,
          description: t.bento.card3Desc,
        },
        {
          num: "03",
          icon: Compass,
          title: t.preview.tabProfiles,
          description: t.preview.feature1Desc,
        },
      ],
    },
    {
      category: "02 · " + t.bento.card2Badge,
      color: "from-[#00D655]/20 to-transparent",
      features: [
        {
          num: "04",
          icon: Globe,
          title: t.bento.card2Title,
          description: t.bento.card2Desc,
        },
        {
          num: "05",
          icon: Shield,
          title: t.preview.feature2Title,
          description: t.preview.feature2Desc,
        },
        {
          num: "06",
          icon: RefreshCw,
          title: t.bento.card6Title,
          description: t.bento.card6Desc,
        },
      ],
    },
    {
      category: "03 · " + t.bento.card5Badge,
      color: "from-[#00FF66]/20 to-transparent",
      features: [
        {
          num: "07",
          icon: Star,
          title: t.bento.card4Title,
          description: t.bento.card4Desc,
        },
        {
          num: "08",
          icon: Server,
          title: t.bento.card5Title,
          description: t.bento.card5Desc,
        },
        {
          num: "09",
          icon: EyeOff,
          title: t.hero.trustTelemetry,
          description: t.hero.description,
        },
      ],
    },
  ];

  return (
    <section id="features" className="py-20 border-t border-[#232530] bg-[#08090C]">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-7">
        <div className="max-w-3xl mb-16">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#00FF66] mb-2">
            {t.bento.badge}
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
            {t.bento.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#9093A2] leading-relaxed">
            {t.bento.subtitle}
          </p>
        </div>

        {/* Categories loop */}
        <div className="space-y-16">
          {sections.map((section) => (
            <div key={section.category}>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-300 px-3 py-1 rounded-lg bg-[#12131A] border border-[#232530]">
                  {section.category}
                </span>
                <div className="h-px flex-1 bg-[#232530]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {section.features.map((item) => (
                  <div
                    key={item.num}
                    className="relative group rounded-2xl bg-[#12131A] border border-[#232530] p-6 hover:border-[#00FF66]/40 hover:bg-[#151620] transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[#0e0f14] border border-[#232530] flex items-center justify-center text-[#00FF66] group-hover:scale-105 group-hover:shadow-[0_0_12px_rgba(0,255,102,0.2)] transition-all">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-xs font-semibold text-[#5E6172]">
                        {item.num}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-white tracking-tight mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#9093A2] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
