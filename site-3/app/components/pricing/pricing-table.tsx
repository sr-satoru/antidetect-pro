"use client";

import React from "react";
import { Check, Minus } from "lucide-react";
import { useI18n } from "@/app/contexts/i18n-context";

export function PricingTable() {
  const { t, language } = useI18n();
  const p = t.pricingPage;

  const categories = language === "en" ? [
    {
      name: "Profiles & Browser",
      rows: [
        { feature: "Local profiles on your computer", free: "Unlimited", solo: "Unlimited", pro: "Unlimited", team: "Unlimited" },
        { feature: "Star Anti-Detect Chromium Engine", free: true, solo: true, pro: true, team: true },
        { feature: "Cookie, local storage, and extension isolation", free: true, solo: true, pro: true, team: true },
        { feature: "Consistent real hardware fingerprints", free: true, solo: true, pro: true, team: true },
        { feature: "Cross-platform OS spoofing (Windows on Mac, etc.)", free: false, solo: false, pro: true, team: true },
      ],
    },
    {
      name: "Network & Proxies",
      rows: [
        { feature: "HTTP, HTTPS, and SOCKS5 proxies", free: true, solo: true, pro: true, team: true },
        { feature: "Native WireGuard VPN connection (.conf)", free: true, solo: true, pro: true, team: true },
        { feature: "Dynamic IP rotation URLs", free: true, solo: true, pro: true, team: true },
        { feature: "Built-in tracker and ad blocker", free: true, solo: true, pro: true, team: true },
      ],
    },
    {
      name: "Cloud & Sync",
      rows: [
        { feature: "End-to-end E2E encryption", free: true, solo: true, pro: true, team: true },
        { feature: "Managed cloud backups on Star Cloud", free: "0", solo: "25 profiles", pro: "100 profiles", team: "Unlimited" },
        { feature: "Sharing with team operators", free: false, solo: false, pro: false, team: "Up to 5 seats" },
      ],
    },
    {
      name: "Automation & API",
      rows: [
        { feature: "Local REST Daemon (port 12540 / 35000)", free: true, solo: true, pro: true, team: true },
        { feature: "CDP connection with Playwright and Puppeteer", free: true, solo: true, pro: true, team: true },
        { feature: "Automated cookie warming", free: false, solo: true, pro: true, team: true },
      ],
    },
    {
      name: "Support",
      rows: [
        { feature: "Customer Support Channels", free: "Community", solo: "Email & Telegram", pro: "Priority WhatsApp", team: "Dedicated Manager" },
      ],
    },
  ] : language === "es" ? [
    {
      name: "Perfiles y Navegador",
      rows: [
        { feature: "Perfiles locales en su equipo", free: "Ilimitados", solo: "Ilimitados", pro: "Ilimitados", team: "Ilimitados" },
        { feature: "Motor Chromium Star Anti-Detect", free: true, solo: true, pro: true, team: true },
        { feature: "Aislamiento de cookies, almacenamiento y extensiones", free: true, solo: true, pro: true, team: true },
        { feature: "Huellas de hardware reales y consistentes", free: true, solo: true, pro: true, team: true },
        { feature: "Spoofing multiplataforma (Windows en Mac, etc.)", free: false, solo: false, pro: true, team: true },
      ],
    },
    {
      name: "Red y Proxies",
      rows: [
        { feature: "Proxies HTTP, HTTPS y SOCKS5", free: true, solo: true, pro: true, team: true },
        { feature: "Conexión VPN WireGuard nativa (.conf)", free: true, solo: true, pro: true, team: true },
        { feature: "URLs dinámicas de rotación de IP", free: true, solo: true, pro: true, team: true },
        { feature: "Bloqueador de rastreadores integrado", free: true, solo: true, pro: true, team: true },
      ],
    },
    {
      name: "Nube y Sincronización",
      rows: [
        { feature: "Cifrado de extremo a extremo E2E", free: true, solo: true, pro: true, team: true },
        { feature: "Copias de seguridad en la nube Star", free: "0", solo: "25 perfiles", pro: "100 perfiles", team: "Ilimitados" },
        { feature: "Compartir perfiles con miembros del equipo", free: false, solo: false, pro: false, team: "Hasta 5 puestos" },
      ],
    },
    {
      name: "Automatización y API",
      rows: [
        { feature: "Daemon local REST (puerto 12540 / 35000)", free: true, solo: true, pro: true, team: true },
        { feature: "Conexión CDP con Playwright y Puppeteer", free: true, solo: true, pro: true, team: true },
        { feature: "Calentamiento automatizado de cookies", free: false, solo: true, pro: true, team: true },
      ],
    },
    {
      name: "Soporte",
      rows: [
        { feature: "Canales de Asistencia", free: "Comunidad", solo: "Correo y Telegram", pro: "WhatsApp Prioritario", team: "Gestor Dedicado" },
      ],
    },
  ] : language === "fr" ? [
    {
      name: "Profils & Navigateur",
      rows: [
        { feature: "Profils locaux sur votre ordinateur", free: "Illimités", solo: "Illimités", pro: "Illimités", team: "Illimités" },
        { feature: "Moteur Chromium Star Anti-Detect", free: true, solo: true, pro: true, team: true },
        { feature: "Isolation des cookies, stockage et extensions", free: true, solo: true, pro: true, team: true },
        { feature: "Empreintes matérielles réelles et cohérentes", free: true, solo: true, pro: true, team: true },
        { feature: "Usurpation d'OS multiplateforme (Windows sur Mac)", free: false, solo: false, pro: true, team: true },
      ],
    },
    {
      name: "Réseau & Proxys",
      rows: [
        { feature: "Proxys HTTP, HTTPS et SOCKS5", free: true, solo: true, pro: true, team: true },
        { feature: "Connexion VPN WireGuard native (.conf)", free: true, solo: true, pro: true, team: true },
        { feature: "URLs de rotation dynamique d'IP", free: true, solo: true, pro: true, team: true },
        { feature: "Bloqueur de traceurs et publicités intégré", free: true, solo: true, pro: true, team: true },
      ],
    },
    {
      name: "Cloud & Synchronisation",
      rows: [
        { feature: "Chiffrement de bout en bout E2E", free: true, solo: true, pro: true, team: true },
        { feature: "Sauvegardes gérées sur le cloud Star", free: "0", solo: "25 profils", pro: "100 profils", team: "Illimités" },
        { feature: "Partage sécurisé avec votre équipe", free: false, solo: false, pro: false, team: "Jusqu'à 5 sièges" },
      ],
    },
    {
      name: "Automatisation & API",
      rows: [
        { feature: "Daemon local REST (port 12540 / 35000)", free: true, solo: true, pro: true, team: true },
        { feature: "Connexion CDP avec Playwright et Puppeteer", free: true, solo: true, pro: true, team: true },
        { feature: "Chauffage automatisé des cookies", free: false, solo: true, pro: true, team: true },
      ],
    },
    {
      name: "Assistance",
      rows: [
        { feature: "Canaux d'Assistance Client", free: "Communauté", solo: "E-mail & Telegram", pro: "WhatsApp Prioritaire", team: "Responsable Dédié" },
      ],
    },
  ] : [
    {
      name: "Perfis & Navegador",
      rows: [
        { feature: "Perfis locais no seu computador", free: "Ilimitados", solo: "Ilimitados", pro: "Ilimitados", team: "Ilimitados" },
        { feature: "Motor Star Anti-Detect Chromium", free: true, solo: true, pro: true, team: true },
        { feature: "Isolamento de cookies, storage e extensões", free: true, solo: true, pro: true, team: true },
        { feature: "Fingerprints reais e consistentes de hardware", free: true, solo: true, pro: true, team: true },
        { feature: "Spoofing multiplataforma (Windows em Mac, etc.)", free: false, solo: false, pro: true, team: true },
      ],
    },
    {
      name: "Rede & Proxies",
      rows: [
        { feature: "Proxies HTTP, HTTPS e SOCKS5", free: true, solo: true, pro: true, team: true },
        { feature: "Conexão VPN WireGuard nativa (.conf)", free: true, solo: true, pro: true, team: true },
        { feature: "URLs dinâmicas de rotação de IP", free: true, solo: true, pro: true, team: true },
        { feature: "Bloqueador de rastreadores integrado", free: true, solo: true, pro: true, team: true },
      ],
    },
    {
      name: "Nuvem & Sincronização",
      rows: [
        { feature: "Criptografia E2E ponta a ponta", free: true, solo: true, pro: true, team: true },
        { feature: "Backups gerenciados na nuvem Star", free: "0", solo: "25 perfis", pro: "100 perfis", team: "Ilimitados" },
        { feature: "Compartilhamento com operadores de equipe", free: false, solo: false, pro: false, team: "Até 5 vagas" },
      ],
    },
    {
      name: "Automação & API",
      rows: [
        { feature: "Daemon local REST (porta 12540)", free: true, solo: true, pro: true, team: true },
        { feature: "Conexão CDP com Playwright e Puppeteer", free: true, solo: true, pro: true, team: true },
        { feature: "Aquecimento automatizado de cookies", free: false, solo: true, pro: true, team: true },
      ],
    },
    {
      name: "Suporte",
      rows: [
        { feature: "Canais de Atendimento", free: "Comunidade", solo: "E-mail & Telegram", pro: "Suporte VIP WhatsApp", team: "Gerente Dedicado" },
      ],
    },
  ];

  const renderValue = (val: string | boolean) => {
    if (typeof val === "boolean") {
      return val ? (
        <Check className="w-4 h-4 text-[#00FF66] mx-auto" />
      ) : (
        <Minus className="w-4 h-4 text-zinc-600 mx-auto" />
      );
    }
    return <span className="text-xs font-semibold text-zinc-300">{val}</span>;
  };

  return (
    <div className="mt-24 w-full">
      <div className="text-center mb-10">
        <h3 className="text-2xl sm:text-3xl font-bold text-white">
          {p.tableTitle}
        </h3>
        <p className="mt-2 text-sm text-[#9093A2]">
          {p.tableSubtitle}
        </p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-[#232530] bg-[#12131A]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#232530] bg-[#161720]">
              <th className="py-4 px-6 text-sm font-semibold text-white min-w-[240px]">
                {p.tableHeaders.feature}
              </th>
              <th className="py-4 px-4 text-center text-sm font-semibold text-zinc-300 min-w-[120px]">
                {p.tableHeaders.free}
              </th>
              <th className="py-4 px-4 text-center text-sm font-semibold text-zinc-300 min-w-[120px]">
                {p.tableHeaders.solo}
              </th>
              <th className="py-4 px-4 text-center text-sm font-bold text-[#00FF66] min-w-[120px] bg-[#00FF66]/5">
                {p.tableHeaders.pro}
              </th>
              <th className="py-4 px-4 text-center text-sm font-semibold text-zinc-300 min-w-[120px]">
                {p.tableHeaders.team}
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <React.Fragment key={cat.name}>
                <tr className="border-b border-[#232530] bg-[#0e0f14]">
                  <td
                    colSpan={5}
                    className="py-3 px-6 text-xs font-mono font-semibold uppercase tracking-wider text-[#9093A2]"
                  >
                    {cat.name}
                  </td>
                </tr>
                {cat.rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3.5 px-6 text-xs sm:text-sm text-zinc-300">
                      {row.feature}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {renderValue(row.free)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {renderValue(row.solo)}
                    </td>
                    <td className="py-3.5 px-4 text-center bg-[#00FF66]/5">
                      {renderValue(row.pro)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {renderValue(row.team)}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
