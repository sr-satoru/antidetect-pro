"use client";

import React, { useState } from "react";
import {
  Layers,
  Network,
  Terminal,
  ShieldAlert,
  Star,
  Search,
  Plus,
  Play,
  Square,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Globe,
  Radio,
  SlidersHorizontal,
  Folder,
} from "lucide-react";
import { useI18n } from "@/app/contexts/i18n-context";

export function PreviewSection() {
  const { t, language } = useI18n();
  const [selectedTag, setSelectedTag] = useState<string>("all");

  const tags = language === "en" ? [
    { id: "all", label: "All Profiles (14)" },
    { id: "active", label: "Active (5)" },
    { id: "fb", label: "Facebook Ads" },
    { id: "google", label: "Google Ads" },
    { id: "tiktok", label: "TikTok Shop" },
  ] : language === "es" ? [
    { id: "all", label: "Todos los Perfiles (14)" },
    { id: "active", label: "Activos (5)" },
    { id: "fb", label: "Facebook Ads" },
    { id: "google", label: "Google Ads" },
    { id: "tiktok", label: "TikTok Shop" },
  ] : language === "fr" ? [
    { id: "all", label: "Tous les Profils (14)" },
    { id: "active", label: "Actifs (5)" },
    { id: "fb", label: "Facebook Ads" },
    { id: "google", label: "Google Ads" },
    { id: "tiktok", label: "TikTok Shop" },
  ] : [
    { id: "all", label: "Todos os Perfis (14)" },
    { id: "active", label: "Ativos (5)" },
    { id: "fb", label: "Facebook Ads" },
    { id: "google", label: "Google Ads" },
    { id: "tiktok", label: "TikTok Shop" },
  ];

  const profiles = [
    {
      id: "p1",
      name: "FB Ads - Campanha Escala 01",
      tag: "Facebook Ads",
      tagColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      os: "Windows 11",
      browser: "Chrome 134",
      fingerprint: "RTX 4090 • Canvas OK",
      proxy: "São Paulo, BR (Residencial)",
      ip: "177.18.92.10",
      status: "active",
      uptime: language === "en" ? "Running 42m" : "Ativo há 42m",
    },
    {
      id: "p2",
      name: "Google Ads - E-commerce Black",
      tag: "Google Ads",
      tagColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      os: "macOS Sonoma",
      browser: "Chrome 134",
      fingerprint: "Apple M2 Max • Audio OK",
      proxy: "Rio de Janeiro, BR (Móvel 4G)",
      ip: "189.40.12.55",
      status: "active",
      uptime: language === "en" ? "Running 18m" : "Ativo há 18m",
    },
    {
      id: "p3",
      name: "TikTok Shop - Criador Afiliado 04",
      tag: "TikTok Shop",
      tagColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      os: "Windows 10",
      browser: "Chrome 133",
      fingerprint: "GTX 1660 • WebRTC Mascarado",
      proxy: "Miami, US (Datacenter Dedicado)",
      ip: "104.28.19.4",
      status: "stopped",
      uptime: language === "en" ? "Ready" : "Pronto para iniciar",
    },
    {
      id: "p4",
      name: "Mercado Livre - Operação Loja 02",
      tag: "E-commerce",
      tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      os: "Windows 11",
      browser: "Chrome 134",
      fingerprint: "Intel Iris Xe • Fonts OK",
      proxy: "Curitiba, BR (Residencial Estático)",
      ip: "201.86.10.12",
      status: "active",
      uptime: language === "en" ? "Running 2h 15m" : "Ativo há 2h 15m",
    },
    {
      id: "p5",
      name: "Kwai Ads - Aquecimento de Contas",
      tag: "Aquecimento",
      tagColor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      os: "Windows 11",
      browser: "Chrome 134",
      fingerprint: "RTX 3070 • Cookies Sync",
      proxy: "Belo Horizonte, BR (Móvel 5G)",
      ip: "179.108.4.91",
      status: "stopped",
      uptime: language === "en" ? "Ready" : "Pronto para iniciar",
    },
  ];

  const filteredProfiles = profiles.filter((p) => {
    if (selectedTag === "all") return true;
    if (selectedTag === "active") return p.status === "active";
    if (selectedTag === "fb") return p.tag.includes("Facebook");
    if (selectedTag === "google") return p.tag.includes("Google");
    if (selectedTag === "tiktok") return p.tag.includes("TikTok");
    return true;
  });

  return (
    <section className="relative py-12 md:py-20">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-7">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#12131A] border border-[#232530] text-xs text-[#9093A2] mb-4">
            <Star className="w-3.5 h-3.5 text-[#00FF66] fill-[#00FF66]" />
            <span>{t.preview.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            {t.preview.title}
          </h2>
          <p className="mt-4 text-base text-[#9093A2] leading-relaxed">
            {t.preview.subtitle}
          </p>
        </div>

        {/* Browser Mockup Container */}
        <div className="relative mx-auto rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-[#00FF66]/20 via-white/5 to-transparent shadow-2xl border border-white/10">
          {/* Mac-style Window Controls */}
          <div className="bg-[#0c0d12] rounded-2xl overflow-hidden border border-[#232530]">
            <div className="h-11 bg-[#12131A] border-b border-[#232530] px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF334B]/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-[#00FF66]/80" />
              </div>
              <div className="text-xs font-mono text-zinc-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00FF66] shadow-[0_0_8px_#00FF66]" />
                <span className="font-semibold text-white">Star Multlogin Pro</span>
                <span className="hidden sm:inline text-zinc-500">—</span>
                <span className="hidden sm:inline text-zinc-400">
                  {language === "en" ? "Workspace • 14 profiles configured" : "Workspace • 14 perfis configurados"}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-[#00FF66] bg-[#00FF66]/10 px-2.5 py-1 rounded-md border border-[#00FF66]/20">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>API 12540: ONLINE</span>
              </div>
            </div>

            {/* Inner Dashboard Interface (100% Original Star Multlogin Code Mockup) */}
            <div className="w-full bg-[#08090C] text-left select-none p-4 sm:p-6 space-y-5">
              {/* Header Bar inside App */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-[#1f212b]">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    readOnly
                    placeholder={
                      language === "en"
                        ? "Search profiles, proxies or tags..."
                        : language === "es"
                        ? "Buscar perfiles, proxies o etiquetas..."
                        : language === "fr"
                        ? "Rechercher profils, proxys ou tags..."
                        : "Buscar perfis, proxies ou etiquetas..."
                    }
                    className="w-full pl-10 pr-4 py-2 bg-[#101116] border border-[#232530] rounded-xl text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101116] border border-[#232530] text-xs text-zinc-400">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Filtros</span>
                  </div>

                  <button
                    type="button"
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#00FF66] hover:bg-[#00D655] text-black text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,255,102,0.2)] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{language === "en" ? "New Profile" : "Novo Perfil"}</span>
                  </button>
                </div>
              </div>

              {/* Tag Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setSelectedTag(tag.id)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                      selectedTag === tag.id
                        ? "bg-white text-black font-semibold shadow-sm"
                        : "bg-[#12131A] text-zinc-400 hover:text-white border border-[#232530]"
                    }`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>

              {/* Profiles Table */}
              <div className="overflow-x-auto rounded-xl border border-[#232530] bg-[#101116]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1f212b] bg-[#14151e] text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      <th className="py-3 px-4 min-w-[220px]">
                        {language === "en" ? "Profile Name" : "Nome do Perfil"}
                      </th>
                      <th className="py-3 px-4 min-w-[160px]">
                        {language === "en" ? "OS & Fingerprint" : "Sistema & Fingerprint"}
                      </th>
                      <th className="py-3 px-4 min-w-[180px]">
                        {language === "en" ? "Proxy & Geolocation" : "Proxy & Geolocalização"}
                      </th>
                      <th className="py-3 px-4 min-w-[140px]">
                        Status
                      </th>
                      <th className="py-3 px-4 text-right min-w-[120px]">
                        {language === "en" ? "Action" : "Ação"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b1c26]">
                    {filteredProfiles.map((p) => {
                      const isActive = p.status === "active";
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          {/* Name & Tag */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-[#181924] border border-white/5 flex items-center justify-center font-bold text-[11px] text-[#00FF66]">
                                S
                              </div>
                              <div>
                                <div className="font-semibold text-white">
                                  {p.name}
                                </div>
                                <span
                                  className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border ${p.tagColor}`}
                                >
                                  {p.tag}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* OS & Fingerprint */}
                          <td className="py-3 px-4">
                            <div className="text-zinc-200 font-medium">
                              {p.os} • {p.browser}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-0.5">
                              <ShieldCheck className="w-3 h-3 text-[#00FF66]" />
                              <span>{p.fingerprint}</span>
                            </div>
                          </td>

                          {/* Proxy */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-zinc-200">
                              <Globe className="w-3.5 h-3.5 text-zinc-400" />
                              <span>{p.proxy}</span>
                            </div>
                            <div className="font-mono text-[10px] text-zinc-500 mt-0.5">
                              IP: {p.ip}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isActive
                                    ? "bg-[#00FF66] shadow-[0_0_8px_#00FF66] animate-pulse"
                                    : "bg-zinc-600"
                                }`}
                              />
                              <span
                                className={`font-medium ${
                                  isActive ? "text-[#00FF66]" : "text-zinc-400"
                                }`}
                              >
                                {p.uptime}
                              </span>
                            </div>
                          </td>

                          {/* Action Button */}
                          <td className="py-3 px-4 text-right">
                            {isActive ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors cursor-pointer"
                              >
                                <Square className="w-3 h-3 fill-current" />
                                <span>{language === "en" ? "Stop" : "Parar"}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00FF66]/15 hover:bg-[#00FF66]/25 border border-[#00FF66]/30 text-[#00FF66] text-xs font-semibold transition-colors cursor-pointer"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>{language === "en" ? "Launch" : "Iniciar"}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mini Status Bar in Mockup */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-[11px] text-zinc-500">
                <div className="flex items-center gap-3">
                  <span>RAM: 1.2 GB / 16 GB</span>
                  <span>•</span>
                  <span>CPU: 4%</span>
                  <span>•</span>
                  <span className="text-[#00FF66]">WireGuard: Ativo</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Cpu className="w-3.5 h-3.5 text-[#00FF66]" />
                  <span>Daemon Local REST v2.4 (localhost:12540)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid Below Mockup */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#12131A] border border-[#232530] hover:border-[#00FF66]/30 transition-all">
            <div className="w-9 h-9 rounded-xl bg-[#00FF66]/10 text-[#00FF66] flex items-center justify-center mb-3">
              <Layers className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-white">{t.preview.tabProfiles}</h4>
            <p className="mt-1 text-xs text-[#9093A2] leading-normal">
              {t.preview.feature1Desc}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#12131A] border border-[#232530] hover:border-[#00FF66]/30 transition-all">
            <div className="w-9 h-9 rounded-xl bg-[#00FF66]/10 text-[#00FF66] flex items-center justify-center mb-3">
              <Network className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-white">{t.preview.tabSecurity}</h4>
            <p className="mt-1 text-xs text-[#9093A2] leading-normal">
              {t.preview.feature2Desc}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#12131A] border border-[#232530] hover:border-[#00FF66]/30 transition-all">
            <div className="w-9 h-9 rounded-xl bg-[#00FF66]/10 text-[#00FF66] flex items-center justify-center mb-3">
              <Terminal className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-white">{t.preview.tabAutomation}</h4>
            <p className="mt-1 text-xs text-[#9093A2] leading-normal">
              {t.preview.feature3Desc}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#12131A] border border-[#232530] hover:border-[#00FF66]/30 transition-all">
            <div className="w-9 h-9 rounded-xl bg-[#00FF66]/10 text-[#00FF66] flex items-center justify-center mb-3">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-white">{t.preview.tabCloud}</h4>
            <p className="mt-1 text-xs text-[#9093A2] leading-normal">
              {t.preview.feature1Title}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
