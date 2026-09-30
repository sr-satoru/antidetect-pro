"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Apple,
  Monitor,
  Terminal as TerminalIcon,
  ExternalLink,
  Laptop,
  Globe,
  ArrowRight,
} from "lucide-react";
import { useI18n } from "@/app/contexts/i18n-context";

interface DownloadItem {
  id: string;
  label: string;
  url: string;
  arch?: string;
  format?: string;
}

interface Release {
  version: string;
  isLatest?: boolean;
  date?: string;
  mac: DownloadItem[];
  windows: DownloadItem[];
  linux: DownloadItem[];
}

const RELEASES: Release[] = [
  {
    version: "2.4.2",
    isLatest: true,
    date: "15 Mar 2026",
    mac: [
      { id: "mac-arm64", label: "Mac (ARM64)", url: "#download-mac-arm64" },
      { id: "mac-x64", label: "Mac (x64)", url: "#download-mac-x64" },
      { id: "mac-universal", label: "Mac Universal", url: "#download-mac-universal" },
    ],
    windows: [
      { id: "win-x64-system", label: "Windows (x64) (System)", url: "#download-win-x64-system" },
      { id: "win-x64-user", label: "Windows (x64) (User)", url: "#download-win-x64-user" },
      { id: "win-arm64-system", label: "Windows (ARM64) (System)", url: "#download-win-arm64-system" },
      { id: "win-arm64-user", label: "Windows (ARM64) (User)", url: "#download-win-arm64-user" },
    ],
    linux: [
      { id: "linux-deb-arm64", label: "Linux .deb (ARM64)", url: "#download-linux-deb-arm64" },
      { id: "linux-deb-x64", label: "Linux .deb (x64)", url: "#download-linux-deb-x64" },
      { id: "linux-rpm-arm64", label: "Linux RPM (ARM64)", url: "#download-linux-rpm-arm64" },
      { id: "linux-rpm-x64", label: "Linux RPM (x64)", url: "#download-linux-rpm-x64" },
      { id: "linux-appimage-arm64", label: "Linux AppImage (ARM64)", url: "#download-linux-appimage-arm64" },
      { id: "linux-appimage-x64", label: "Linux AppImage (x64)", url: "#download-linux-appimage-x64" },
    ],
  },
  {
    version: "2.4.1",
    date: "28 Fev 2026",
    mac: [
      { id: "mac-arm64-241", label: "Mac (ARM64)", url: "#download-mac-arm64" },
      { id: "mac-x64-241", label: "Mac (x64)", url: "#download-mac-x64" },
      { id: "mac-universal-241", label: "Mac Universal", url: "#download-mac-universal" },
    ],
    windows: [
      { id: "win-x64-system-241", label: "Windows (x64) (System)", url: "#download-win-x64-system" },
      { id: "win-x64-user-241", label: "Windows (x64) (User)", url: "#download-win-x64-user" },
      { id: "win-arm64-system-241", label: "Windows (ARM64) (System)", url: "#download-win-arm64-system" },
      { id: "win-arm64-user-241", label: "Windows (ARM64) (User)", url: "#download-win-arm64-user" },
    ],
    linux: [
      { id: "linux-deb-arm64-241", label: "Linux .deb (ARM64)", url: "#download-linux-deb-arm64" },
      { id: "linux-deb-x64-241", label: "Linux .deb (x64)", url: "#download-linux-deb-x64" },
      { id: "linux-appimage-x64-241", label: "Linux AppImage (x64)", url: "#download-linux-appimage-x64" },
    ],
  },
  {
    version: "2.4.0",
    date: "10 Fev 2026",
    mac: [
      { id: "mac-arm64-240", label: "Mac (ARM64)", url: "#download-mac-arm64" },
      { id: "mac-x64-240", label: "Mac (x64)", url: "#download-mac-x64" },
    ],
    windows: [
      { id: "win-x64-system-240", label: "Windows (x64) (System)", url: "#download-win-x64-system" },
      { id: "win-x64-user-240", label: "Windows (x64) (User)", url: "#download-win-x64-user" },
    ],
    linux: [
      { id: "linux-deb-x64-240", label: "Linux .deb (x64)", url: "#download-linux-deb-x64" },
      { id: "linux-appimage-x64-240", label: "Linux AppImage (x64)", url: "#download-linux-appimage-x64" },
    ],
  },
  {
    version: "2.3.9",
    date: "15 Jan 2026",
    mac: [
      { id: "mac-arm64-239", label: "Mac (ARM64)", url: "#download-mac-arm64" },
    ],
    windows: [
      { id: "win-x64-system-239", label: "Windows (x64) (System)", url: "#download-win-x64-system" },
    ],
    linux: [
      { id: "linux-appimage-x64-239", label: "Linux AppImage (x64)", url: "#download-linux-appimage-x64" },
    ],
  },
  {
    version: "2.3.8",
    date: "20 Dez 2025",
    mac: [
      { id: "mac-arm64-238", label: "Mac (ARM64)", url: "#download-mac-arm64" },
    ],
    windows: [
      { id: "win-x64-system-238", label: "Windows (x64) (System)", url: "#download-win-x64-system" },
    ],
    linux: [
      { id: "linux-appimage-x64-238", label: "Linux AppImage (x64)", url: "#download-linux-appimage-x64" },
    ],
  },
];

export default function DownloadPage() {
  const { language } = useI18n();
  const [copied, setCopied] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>("2.4.2");

  const terminalCommand = "curl -fsSL https://starmultilogin.com/install.sh | bash";

  const handleCopyCommand = () => {
    navigator.clipboard?.writeText(terminalCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleVersion = (ver: string) => {
    setExpandedVersion((prev) => (prev === ver ? null : ver));
  };

  const scrollToReleases = () => {
    const el = document.getElementById("releases-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="pt-10 pb-28 text-white">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        
        {/* Top Header - Estilo Minimalista Cursor */}
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
            {language === "en"
              ? "Use Star Multlogin everywhere you work"
              : language === "es"
              ? "Usa Star Multlogin dondequiera que trabajes"
              : language === "fr"
              ? "Utilisez Star Multlogin partout où vous travaillez"
              : "Use o Star Multlogin em qualquer lugar"}
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-zinc-400">
            {language === "en"
              ? "A unified, isolated workspace for profiles and automation across every surface."
              : language === "es"
              ? "Un espacio de trabajo unificado y aislado para perfiles y automatización en cualquier superficie."
              : language === "fr"
              ? "Un espace de travail unifié et isolé pour les profils et l'automatisation sur toutes les surfaces."
              : "Um ambiente unificado e isolado para perfis e automação em qualquer plataforma."}
          </p>
        </div>

        {/* 3 Top Cards (Desktop, Terminal, Web) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          
          {/* Card 1: Desktop */}
          <div className="flex flex-col justify-between rounded-xl bg-[#0f1015] border border-white/[0.08] p-5 hover:border-white/[0.15] transition-all">
            <div>
              {/* Preview Box */}
              <div className="h-44 rounded-lg bg-[#08090C] border border-white/5 p-3 flex flex-col justify-between overflow-hidden relative mb-5">
                {/* Window top bar */}
                <div className="flex items-center gap-1.5 pb-2 border-b border-white/5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                  <span className="ml-2 text-[10px] text-zinc-500 font-mono">Star Profile Dashboard</span>
                </div>
                {/* Mockup Content */}
                <div className="space-y-2 py-2">
                  <div className="flex items-center justify-between text-[11px] bg-white/[0.03] p-1.5 rounded border border-white/5">
                    <span className="text-zinc-300 font-medium">Perfil #01 - Google ADS</span>
                    <span className="text-[9px] text-[#00FF66] font-mono">Pronto</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] bg-white/[0.03] p-1.5 rounded border border-white/5">
                    <span className="text-zinc-300 font-medium">Perfil #02 - Facebook ADS</span>
                    <span className="text-[9px] text-zinc-400 font-mono">Pausado</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] bg-white/[0.03] p-1.5 rounded border border-white/5">
                    <span className="text-zinc-300 font-medium">Perfil #03 - TikTok Matrix</span>
                    <span className="text-[9px] text-[#00FF66] font-mono">Ativo</span>
                  </div>
                </div>
              </div>

              <h2 className="text-base font-medium text-white">Desktop</h2>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed min-h-[36px]">
                {language === "en"
                  ? "An anti-detect native experience, with complete hardware isolation and fingerprint spoofing."
                  : "Uma experiência nativa completa, com isolamento total de hardware e fingerprints reais."}
              </p>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={scrollToReleases}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                <span>{language === "en" ? "Download for Desktop" : "Baixar para Desktop"}</span>
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Card 2: Terminal */}
          <div className="flex flex-col justify-between rounded-xl bg-[#0f1015] border border-white/[0.08] p-5 hover:border-white/[0.15] transition-all">
            <div>
              {/* Terminal Box */}
              <div className="h-44 rounded-lg bg-[#08090C] border border-white/5 p-3 flex flex-col justify-between overflow-hidden relative mb-5">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">Star CLI & Automation</span>
                </div>
                <div className="py-2 text-[11px] font-mono text-zinc-300 space-y-1">
                  <p className="text-zinc-500">$ star-agent --launch --port=9222</p>
                  <p className="text-[#00FF66]">✓ Chromium CDP connected</p>
                  <p className="text-zinc-400">⚡ Fingerprint Canvas/Audio injected</p>
                  <p className="text-zinc-500">> Waiting for Puppeteer script...</p>
                </div>
              </div>

              <h2 className="text-base font-medium text-white">Terminal</h2>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed min-h-[36px]">
                {language === "en"
                  ? "Run automated profiles in any terminal or script, with Puppeteer, Playwright or API."
                  : "Automatize perfis em qualquer terminal ou script com integração a Puppeteer e Playwright."}
              </p>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-2 p-1.5 pl-3 rounded-lg bg-[#08090C] border border-white/10 font-mono text-[11px] text-zinc-300">
                <span className="truncate">{terminalCommand}</span>
                <button
                  type="button"
                  onClick={handleCopyCommand}
                  className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Copiar comando"
                  aria-label="Copiar comando"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#00FF66]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Web */}
          <div className="flex flex-col justify-between rounded-xl bg-[#0f1015] border border-white/[0.08] p-5 hover:border-white/[0.15] transition-all">
            <div>
              {/* Web Preview Box */}
              <div className="h-44 rounded-lg bg-[#08090C] border border-white/5 p-3 flex flex-col justify-between overflow-hidden relative mb-5">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-[#00FF66]" />
                    <span className="text-[10px] text-zinc-400 font-mono">app.starmultilogin.com</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 font-mono">Cloud</span>
                </div>
                <div className="space-y-1.5 py-2">
                  <div className="p-2 rounded bg-white/[0.02] border border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-300">Licença Premium</span>
                    <span className="text-[10px] text-[#00FF66] font-mono">Ativa</span>
                  </div>
                  <div className="p-2 rounded bg-white/[0.02] border border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-300">Proxies Conectados</span>
                    <span className="text-[10px] text-zinc-400 font-mono">14 / 14</span>
                  </div>
                </div>
              </div>

              <h2 className="text-base font-medium text-white">Web</h2>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed min-h-[36px]">
                {language === "en"
                  ? "Manage licenses, shared proxies, and team permissions directly in the cloud."
                  : "Gerencie licenças, proxies compartilhados e permissões de equipe diretamente na nuvem."}
              </p>
            </div>

            <div className="mt-5">
              <Link
                href="/account"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                <span>{language === "en" ? "Start Star in Web" : "Acessar Painel Web"}</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </Link>
            </div>
          </div>

        </div>

        {/* Separator Text */}
        <div id="releases-section" className="mb-6 pt-4">
          <p className="text-sm font-medium text-zinc-200">
            {language === "en"
              ? "The Star Multlogin desktop app is available for macOS, Windows, and Linux."
              : "O Star Multlogin desktop está disponível para macOS, Windows e Linux."}
          </p>
        </div>

        {/* Releases Accordion - Estilo Idêntico ao Cursor */}
        <div className="border-t border-white/[0.08]">
          {RELEASES.map((release) => {
            const isOpen = expandedVersion === release.version;

            return (
              <div key={release.version} className="border-b border-white/[0.08]">
                {/* Accordion Header Row */}
                <button
                  type="button"
                  onClick={() => toggleVersion(release.version)}
                  className="w-full py-4 flex items-center justify-between text-left hover:text-white transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium text-zinc-200 group-hover:text-white">
                      {release.version}
                    </span>
                    {release.isLatest && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-zinc-300 border border-white/10">
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="text-zinc-500 group-hover:text-zinc-300">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Accordion Content: 3 Columns (macOS, Windows, Linux) */}
                {isOpen && (
                  <div className="pb-8 pt-1 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-white/[0.08] rounded-xl overflow-hidden bg-[#0c0d12]">
                      
                      {/* Column 1: macOS */}
                      <div className="p-4 sm:p-5 border-b md:border-b-0 md:border-r border-white/[0.08]">
                        <div className="flex items-center gap-2 text-xs font-semibold text-white mb-3">
                          <Apple className="w-4 h-4" />
                          <span>macOS</span>
                        </div>
                        <div className="space-y-1">
                          {release.mac.map((item) => (
                            <a
                              key={item.id}
                              href={item.url}
                              className="flex items-center justify-between py-2 px-2.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors group"
                            >
                              <span>{item.label}</span>
                              <Download className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white" />
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Column 2: Windows */}
                      <div className="p-4 sm:p-5 border-b md:border-b-0 md:border-r border-white/[0.08]">
                        <div className="flex items-center gap-2 text-xs font-semibold text-white mb-3">
                          <Monitor className="w-4 h-4" />
                          <span>Windows</span>
                        </div>
                        <div className="space-y-1">
                          {release.windows.map((item) => (
                            <a
                              key={item.id}
                              href={item.url}
                              className="flex items-center justify-between py-2 px-2.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors group"
                            >
                              <span>{item.label}</span>
                              <Download className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white" />
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Column 3: Linux */}
                      <div className="p-4 sm:p-5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-white mb-3">
                          <TerminalIcon className="w-4 h-4" />
                          <span>Linux</span>
                        </div>
                        <div className="space-y-1">
                          {release.linux.map((item) => (
                            <a
                              key={item.id}
                              href={item.url}
                              className="flex items-center justify-between py-2 px-2.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors group"
                            >
                              <span>{item.label}</span>
                              <Download className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white" />
                            </a>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* View release notes link */}
                    <div className="mt-4">
                      <Link
                        href="/docs"
                        className="text-xs text-orange-400 hover:text-orange-300 transition-colors inline-flex items-center gap-1 font-medium"
                      >
                        <span>{language === "en" ? "View release notes →" : "Ver notas de lançamento →"}</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
