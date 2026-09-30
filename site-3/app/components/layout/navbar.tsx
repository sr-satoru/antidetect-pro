"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, Menu, X, Star } from "lucide-react";
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
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: t.nav.home, href: "/" },
    { label: t.nav.pricing, href: "/pricing" },
    { label: t.nav.account, href: "/account" },
    { label: t.nav.docs, href: "/docs" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-[#232530] bg-[#08090C]/90 backdrop-blur-md shadow-lg shadow-black/60"
          : "border-b border-transparent bg-[#08090C]/60 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-5 sm:px-7">
        {/* Logo Star Multlogin */}
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00FF66] to-[#00D655] shadow-md shadow-[#00FF66]/20 group-hover:scale-105 transition-transform">
            <Star className="w-5 h-5 fill-black stroke-black" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              Star Multlogin
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-[#00FF66] border border-[#00FF66]/20">
                PRO
              </span>
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`text-[13.5px] font-medium transition-colors relative py-1 ${
                  isActive
                    ? "text-white font-semibold"
                    : "text-[#9093A2] hover:text-white"
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-[21px] h-[2px] bg-[#00FF66] shadow-[0_0_10px_#00FF66]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSelector />

          <Link
            href="/auth"
            className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-1.5 transition-colors"
          >
            {t.nav.login}
          </Link>

          <Link href="/download">
            <Button size="sm" variant="star" className="gap-1.5 font-bold">
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{t.nav.download}</span>
            </Button>
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <div className="md:hidden flex items-center gap-2">
          <LanguageSelector />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#232530] bg-[#101116] px-5 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-zinc-300 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
            <Link
              href="/auth"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2 text-sm text-zinc-300 hover:text-white bg-[#15161C] rounded-xl border border-white/10"
            >
              {t.nav.login}
            </Link>
            <Link
              href="/download"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2 text-sm font-bold text-black bg-gradient-to-r from-[#00FF66] to-[#00D655] rounded-xl"
            >
              {t.hero.downloadBtn}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
