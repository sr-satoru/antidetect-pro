"use client";

import React from "react";
import Link from "next/link";
import { Star, ShieldCheck, Terminal, Send } from "lucide-react";
import { useI18n } from "@/app/contexts/i18n-context";
import { LanguageSelector } from "../ui/language-selector";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="mt-28 border-t border-[#232530] bg-[#060709] text-zinc-400">
      <div className="mx-auto w-full max-w-[1320px] px-5 pt-16 pb-12 sm:px-7">
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10">
          {/* Brand info */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00FF66] to-[#00D655] shadow-md shadow-[#00FF66]/20">
                <Star className="w-4 h-4 fill-black stroke-black" />
              </div>
              <span className="text-base font-bold tracking-tight text-white">
                Star Multlogin
              </span>
            </Link>
            <p className="max-w-[32ch] text-[13px] leading-relaxed text-[#9093A2]">
              {t.footer.desc}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://t.me/starmultlogin"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-[#12131A] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-[#00FF66] hover:border-[#00FF66]/30 transition-all"
                aria-label="Telegram"
              >
                <Send className="w-4 h-4" />
              </a>
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-zinc-500 pt-1">
              <span className="w-2 h-2 rounded-full bg-[#00FF66] shadow-[0_0_8px_#00FF66] animate-pulse" />
              <span className="text-[#9093A2]">{t.footer.statusActive}</span>
            </div>
          </div>

          {/* Coluna 1: Produto */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200 mb-3.5">
              {t.footer.productCol}
            </h4>
            <ul className="space-y-2.5 text-[13.5px]">
              <li>
                <Link href="/" className="hover:text-[#00FF66] transition-colors">
                  {t.nav.home}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-[#00FF66] transition-colors">
                  {t.nav.pricing}
                </Link>
              </li>
              <li>
                <a href="#features" className="hover:text-[#00FF66] transition-colors">
                  {t.preview.tabOverview}
                </a>
              </li>
              <li>
                <Link href="/download" className="hover:text-[#00FF66] transition-colors">
                  {t.nav.download}
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-[#00FF66] transition-colors">
                  {t.nav.account}
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 2: Tecnologia & API */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200 mb-3.5">
              {t.footer.resourcesCol}
            </h4>
            <ul className="space-y-2.5 text-[13.5px]">
              <li>
                <a
                  href="#api"
                  className="hover:text-[#00FF66] transition-colors flex items-center gap-1.5"
                >
                  <Terminal className="w-3.5 h-3.5 text-[#00FF66]" />
                  REST API
                </a>
              </li>
              <li>
                <span className="text-[#9093A2]">Playwright & Puppeteer</span>
              </li>
              <li>
                <span className="text-[#9093A2]">WireGuard VPN</span>
              </li>
              <li>
                <span className="text-[#9093A2]">{t.ticker[1]}</span>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Conformidade & Privacidade */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200 mb-3.5">
              {t.footer.legalCol}
            </h4>
            <ul className="space-y-2.5 text-[13.5px]">
              <li>
                <Link
                  href="/terms"
                  className="hover:text-[#00FF66] transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00FF66]" />
                  {t.footer.terms}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-[#00FF66] transition-colors"
                >
                  {t.footer.privacy}
                </Link>
              </li>
              <li>
                <a
                  href="mailto:privacidade@starmultlogin.com"
                  className="hover:text-[#00FF66] transition-colors text-[#9093A2]"
                >
                  Encarregado DPO / LGPD
                </a>
              </li>
              <li className="text-[#9093A2] flex items-center gap-1 text-xs">
                <span>LGPD · GDPR · Marco Civil</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Linha Inferior com seletor de idioma */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5E6172]">
          <div>
            © {new Date().getFullYear()} Star Multlogin. {t.footer.copyright}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector variant="footer" />
            <span className="px-2 py-0.5 rounded bg-[#101116] border border-white/5 font-mono text-[11px] text-zinc-400">
              macOS · Windows · Linux
            </span>
            <span className="px-2 py-0.5 rounded bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20 text-[11px] font-semibold">
              Star Engine 2026
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
