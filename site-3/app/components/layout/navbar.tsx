"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, Menu, X, Star, ArrowUpRight } from "lucide-react";
import { Button } from "../ui/button";
import { useI18n } from "@/app/contexts/i18n-context";
import { LanguageSelector } from "../ui/language-selector";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: t.nav.home, href: "/" },
    { label: t.nav.pricing, href: "/pricing" },
    { label: t.nav.account, href: "/account" },
    { label: t.nav.docs, href: "/docs" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full transition-all duration-300">
      {/* Top micro ambient glow border */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00FF66]/40 to-transparent pointer-events-none" />

      {/* Main Bar with Deep Glassmorphism */}
      <div
        className={`w-full transition-all duration-300 ${
          scrolled
            ? "border-b border-white/[0.08] bg-[#08090C]/85 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.7)]"
            : "border-b border-white/[0.04] bg-[#08090C]/65 backdrop-blur-xl"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-5 sm:px-7">
          {/* Logo Star Multlogin */}
          <Link href="/" className="inline-flex items-center gap-3 group select-none">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00FF66] to-[#00D655] shadow-md shadow-[#00FF66]/25 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(0,255,102,0.4)] transition-all duration-200">
              <Star className="w-4 h-4 fill-black stroke-black" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[15px] tracking-tight text-white group-hover:text-zinc-100 transition-colors">
                Star Multlogin
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/25 shadow-[0_0_10px_rgba(0,255,102,0.15)]">
                <span className="w-1 h-1 rounded-full bg-[#00FF66] animate-pulse" />
                PRO
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links - Floating Pill Style */}
          <nav className="hidden md:flex items-center p-1 rounded-full bg-[#101117]/80 border border-[#232530] shadow-inner backdrop-blur-md">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-[12.5px] font-medium transition-all px-4 py-1.5 rounded-full cursor-pointer ${
                    isActive
                      ? "bg-white/[0.08] text-white font-semibold shadow-sm border border-white/10"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSelector variant="navbar" />

            <Link
              href="/auth"
              className="text-xs font-semibold text-zinc-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              {t.nav.login}
            </Link>

            <Link href="/download">
              <Button
                size="sm"
                variant="star"
                className="gap-1.5 font-bold shadow-lg shadow-[#00FF66]/20 hover:shadow-[0_0_20px_rgba(0,255,102,0.35)] transition-all duration-200 cursor-pointer text-xs"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t.nav.download}</span>
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSelector variant="navbar" />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 border border-white/5 transition-all cursor-pointer"
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#232530] bg-[#0c0d12]/95 backdrop-blur-2xl px-5 py-5 space-y-4 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between py-2.5 px-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white/[0.08] text-white font-semibold border border-white/10"
                      : "text-zinc-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66]" />}
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-[#1d1f28] flex flex-col gap-2.5">
            <Link
              href="/auth"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-xs font-semibold text-zinc-300 hover:text-white bg-[#14151b] rounded-xl border border-white/5"
            >
              {t.nav.login}
            </Link>
            <Link
              href="/download"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-black bg-gradient-to-r from-[#00FF66] to-[#00D655] rounded-xl shadow-lg shadow-[#00FF66]/20"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{t.nav.download}</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
