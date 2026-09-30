"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Download, ChevronDown, Shield, CheckCircle2, ArrowRight, Apple, Monitor, Terminal, Star } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useI18n } from "@/app/contexts/i18n-context";

export function Hero() {
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDownloadMenuOpen(false);
      }
    };
    if (downloadMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [downloadMenuOpen]);

  const downloadLinks = [
    {
      os: "Windows",
      icon: Monitor,
      desc: t.hero.osWindowsDesc,
      url: "#download-win",
    },
    {
      os: "macOS (Apple Silicon)",
      icon: Apple,
      desc: t.hero.osMacArmDesc,
      url: "#download-mac-arm",
    },
    {
      os: "macOS (Intel)",
      icon: Apple,
      desc: t.hero.osMacIntelDesc,
      url: "#download-mac-intel",
    },
    {
      os: "Linux",
      icon: Terminal,
      desc: t.hero.osLinuxDesc,
      url: "#download-linux",
    },
  ];

  return (
    <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 z-20 overflow-visible">
      {/* Background cyber green glow highlights contained strictly to background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-gradient-to-tr from-[#00FF66]/10 via-[#00D655]/5 to-transparent blur-[140px]" />
      </div>

      <div className="mx-auto max-w-[1320px] px-5 sm:px-7 text-center">
        {/* Top Badges */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2 mb-6">
          <Badge variant="outline" className="border-[#232530] bg-[#101116] text-[#9093A2]">
            {t.hero.platformsBadge}
          </Badge>
          <Badge variant="star" className="font-semibold">
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

        {/* Action CTAs - z-40 ensures dropdown displays above following sections and ticker */}
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 relative z-40">
          {/* Main Download Button with Dropdown */}
          <div ref={dropdownRef} className="relative inline-block w-full sm:w-auto">
            <div className="inline-flex rounded-xl shadow-lg shadow-[#00FF66]/20 w-full sm:w-auto">
              <a
                href="#download"
                className="w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  variant="star"
                  className="w-full sm:w-auto rounded-r-none pr-4 gap-2 text-base font-bold"
                >
                  <Download className="w-5 h-5 stroke-[2.5]" />
                  <span>{t.hero.downloadBtn}</span>
                </Button>
              </a>
              <button
                type="button"
                onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                className="bg-[#00D655] hover:bg-[#00FF66] text-black px-3.5 rounded-r-xl border-l border-black/20 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Selecionar sistema operacional"
                aria-expanded={downloadMenuOpen}
              >
                <ChevronDown
                  className={`w-4 h-4 stroke-[2.5] transition-transform duration-200 ${
                    downloadMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {/* Dropdown for OS options - elevated z-50 to float above Ticker banner */}
            {downloadMenuOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-80 rounded-2xl bg-[#12131A] border border-[#232530] shadow-[0_20px_60px_rgba(0,0,0,0.95)] p-2 z-50 text-left backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[11px] font-semibold text-[#9093A2] uppercase tracking-wider px-3 py-1.5 border-b border-white/5 mb-1 flex items-center justify-between">
                  <span>{t.hero.selectPlatform}</span>
                  <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse" />
                </div>
                {downloadLinks.map((item) => (
                  <a
                    key={item.os}
                    href={item.url}
                    onClick={() => setDownloadMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-zinc-200 transition-colors group"
                  >
                    <item.icon className="w-4 h-4 text-[#00FF66] shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-[#00FF66]">
                        {item.os}
                      </div>
                      <div className="text-[11px] text-[#9093A2]">{item.desc}</div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <Link href="/pricing" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto gap-2 text-base text-zinc-200 hover:text-white"
            >
              <span>{t.hero.viewPlansBtn}</span>
              <ArrowRight className="w-4 h-4 text-zinc-400" />
            </Button>
          </Link>
        </div>

        {/* Small Trust Badges Under Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#9093A2]">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#00FF66]" />
            <span>{t.hero.trustFree}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-[#00FF66]" />
            <span>{t.hero.trustTelemetry}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-[#00FF66] text-[#00FF66]" />
            <span>{t.hero.trustIsolation}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
