"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useI18n, AVAILABLE_LANGUAGES } from "@/app/contexts/i18n-context";

interface LanguageSelectorProps {
  className?: string;
  variant?: "navbar" | "footer";
}

export function LanguageSelector({ className = "", variant = "navbar" }: LanguageSelectorProps) {
  const { language, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentOption = AVAILABLE_LANGUAGES.find((l) => l.code === language) || AVAILABLE_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
          variant === "navbar"
            ? "border border-[#232530] bg-[#101116] hover:bg-[#181922] text-zinc-300 hover:text-white"
            : "border border-white/5 bg-white/[0.03] hover:bg-white/[0.08] text-[#9093A2] hover:text-white"
        }`}
        aria-label="Alterar idioma / Change language"
        aria-expanded={open}
      >
        <span className="text-sm leading-none">{currentOption.flag}</span>
        <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-200">
          {currentOption.code}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#9093A2] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute ${
            variant === "footer" ? "bottom-full mb-2" : "top-full mt-2"
          } right-0 w-44 rounded-xl bg-[#12131A] border border-[#232530] p-1.5 shadow-2xl shadow-black/80 z-50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="text-[10px] font-semibold text-[#9093A2] uppercase tracking-wider px-2.5 py-1 border-b border-white/5 mb-1 flex items-center justify-between">
            <span>Idioma / Language</span>
            <Globe className="w-3 h-3 text-[#00FF66]" />
          </div>
          {AVAILABLE_LANGUAGES.map((opt) => {
            const isSelected = opt.code === language;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => {
                  setLanguage(opt.code);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                  isSelected
                    ? "bg-[#00FF66]/10 text-[#00FF66] font-semibold border border-[#00FF66]/20"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm leading-none">{opt.flag}</span>
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#00FF66]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
