"use client";

import React from "react";
import { Download, Monitor, Apple, Terminal, CheckCircle2, ShieldCheck, Cpu } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { useI18n } from "@/app/contexts/i18n-context";

export default function DownloadPage() {
  const { language } = useI18n();

  const downloads = [
    {
      os: "Windows",
      icon: Monitor,
      version: "v2.4.0 (64-bit)",
      format: ".exe Installer",
      requirements: "Windows 10 / Windows 11",
      url: "#download-win",
      featured: true,
    },
    {
      os: "macOS (Apple Silicon)",
      icon: Apple,
      version: "v2.4.0 (arm64)",
      format: ".dmg Installer",
      requirements: "macOS 12+ (M1, M2, M3, M4)",
      url: "#download-mac-arm",
      featured: false,
    },
    {
      os: "macOS (Intel)",
      icon: Apple,
      version: "v2.4.0 (x64)",
      format: ".dmg Installer",
      requirements: "macOS 11+ (Intel Core)",
      url: "#download-mac-intel",
      featured: false,
    },
    {
      os: "Linux",
      icon: Terminal,
      version: "v2.4.0 (x86_64)",
      format: ".AppImage / .deb",
      requirements: "Ubuntu 20+, Debian 11+, Fedora",
      url: "#download-linux",
      featured: false,
    },
  ];

  return (
    <div className="pt-12 pb-24">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-7">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="star" className="mb-4 font-bold">
            {language === "en" ? "Official Downloads" : "Downloads Oficiais"}
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            {language === "en"
              ? "Download Star Multlogin"
              : "Baixe o Star Multlogin"}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#9093A2] leading-relaxed">
            {language === "en"
              ? "Unlimited local profiles, consistent hardware spoofing, and zero telemetry. Available for Windows, macOS, and Linux."
              : "Perfis locais ilimitados, fingerprints reais de hardware e zero telemetria. Disponível para Windows, macOS e Linux."}
          </p>
        </div>

        {/* Cards de Download */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {downloads.map((d) => {
            const Icon = d.icon;
            return (
              <div
                key={d.os}
                className={`flex flex-col justify-between rounded-3xl p-6 transition-all ${
                  d.featured
                    ? "bg-[#14151e] border-2 border-[#00FF66]/50 shadow-[0_0_30px_rgba(0,255,102,0.15)]"
                    : "bg-[#101116] border border-[#232530] hover:border-white/20"
                }`}
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#181924] border border-white/5 flex items-center justify-center text-[#00FF66] mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{d.os}</h3>
                  <div className="text-xs text-[#00FF66] font-mono font-medium mt-0.5">
                    {d.version}
                  </div>
                  <div className="text-xs text-[#9093A2] mt-3">
                    <div className="font-semibold text-zinc-300">{d.format}</div>
                    <div className="text-[11px] mt-0.5">{d.requirements}</div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#1d1f28]">
                  <a href={d.url}>
                    <Button
                      variant={d.featured ? "star" : "secondary"}
                      className="w-full gap-2 text-xs font-bold"
                    >
                      <Download className="w-4 h-4" />
                      <span>{language === "en" ? "Download Now" : "Baixar Agora"}</span>
                    </Button>
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Requisitos de Sistema */}
        <div className="p-8 rounded-3xl bg-[#101116] border border-[#232530] max-w-4xl mx-auto">
          <div className="flex items-center gap-2.5 text-white font-bold text-lg mb-4">
            <ShieldCheck className="w-5 h-5 text-[#00FF66]" />
            <span>{language === "en" ? "System Requirements & Integrity" : "Requisitos de Sistema & Integridade"}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-[#9093A2]">
            <div>
              <span className="font-semibold text-white block mb-1">Memória RAM</span>
              <span>Mínimo 4 GB RAM. Recomendado 8 GB+ para operar múltiplos perfis simultâneos.</span>
            </div>
            <div>
              <span className="font-semibold text-white block mb-1">Armazenamento</span>
              <span>500 MB de espaço livre em disco SSD para instalação e cache isolado.</span>
            </div>
            <div>
              <span className="font-semibold text-white block mb-1">Segurança</span>
              <span>Binários assinados digitalmente com verificação SHA-256 e sem telemetria.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
