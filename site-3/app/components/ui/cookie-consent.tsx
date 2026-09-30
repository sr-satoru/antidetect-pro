"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, Shield, Check, X } from "lucide-react";
import { useI18n } from "@/app/contexts/i18n-context";

const COOKIE_STORAGE_KEY = "star_multlogin_cookie_consent";
const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000; // 60 dias (~2 meses)

export function CookieConsent() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COOKIE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const consentDate = new Date(parsed.timestamp).getTime();
        const now = Date.now();

        // Se ainda estiver dentro do prazo de 60 dias (2 meses), mantém oculto
        if (!isNaN(consentDate) && now - consentDate < TWO_MONTHS_MS) {
          return;
        }
      }
    } catch {
      // Se houver erro de parsing ou armazenamento, prossegue para solicitar consentimento
    }

    // Se não há consentimento ou se já passou de 2 meses, exibe suavemente
    const timer = setTimeout(() => {
      setVisible(true);
    }, 750);
    return () => clearTimeout(timer);
  }, []);

  const handleChoice = (type: "all" | "essential") => {
    try {
      localStorage.setItem(
        COOKIE_STORAGE_KEY,
        JSON.stringify({ type, timestamp: new Date().toISOString() })
      );
    } catch {
      // Ignora falhas em navegadores com storage desabilitado
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      role="dialog"
      aria-live="polite"
      aria-label={t.cookieConsent.title}
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="rounded-2xl bg-[#0e0f15]/95 backdrop-blur-xl border border-[#232530] p-5 shadow-2xl shadow-black/80 relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className="pointer-events-none absolute -top-12 -right-12 w-28 h-28 bg-[#00FF66]/10 rounded-full blur-2xl" />

        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/20 flex items-center justify-center text-[#00FF66] shrink-0 mt-0.5">
            <Cookie className="w-4 h-4" />
          </div>
          <div className="space-y-1.5 flex-1 pr-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              {t.cookieConsent.title}
            </h3>
            <p className="text-xs text-[#9093A2] leading-relaxed">
              {t.cookieConsent.desc}{" "}
              <Link
                href="/privacy"
                className="text-[#00FF66] underline hover:text-[#00FF66]/80 transition-colors"
              >
                {t.cookieConsent.learnMore}
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#232530] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => handleChoice("essential")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all cursor-pointer"
          >
            {t.cookieConsent.essentialOnly}
          </button>
          <button
            type="button"
            onClick={() => handleChoice("all")}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-black bg-[#00FF66] hover:bg-[#00D655] shadow-sm shadow-[#00FF66]/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{t.cookieConsent.acceptAll}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
