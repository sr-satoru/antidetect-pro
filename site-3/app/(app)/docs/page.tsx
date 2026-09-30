"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Terminal,
  BookOpen,
  Code,
  ShieldCheck,
  Network,
  Cpu,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { useI18n } from "@/app/contexts/i18n-context";

export default function DocsPage() {
  const { language } = useI18n();
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const pythonSnippet = `from playwright.sync_api import sync_playwright
import requests

# 1. Inicia o perfil via Star Daemon Local
response = requests.post("http://127.0.0.1:12540/api/v1/profiles/start", json={
    "profile_id": "meu-perfil-01"
})
data = response.json()
ws_endpoint = data["ws_endpoint"]  # ws://127.0.0.1:35100/devtools/browser/...

# 2. Conecta o Playwright diretamente via CDP
with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(ws_endpoint)
    page = browser.contexts[0].new_page()
    page.goto("https://browserleaks.com/canvas")
    print("Fingerprint protegido com sucesso!")
    browser.close()`;

  const nodeSnippet = `const { chromium } = require("playwright");
const axios = require("axios");

async function run() {
  // 1. Inicia o perfil no Star Multlogin
  const res = await axios.post("http://127.0.0.1:12540/api/v1/profiles/start", {
    profile_id: "meu-perfil-01",
  });

  // 2. Conecta via Chrome DevTools Protocol (CDP)
  const browser = await chromium.connectOverCDP(res.data.ws_endpoint);
  const context = browser.contexts()[0];
  const page = await context.newPage();

  await page.goto("https://whoer.net");
  console.log("Sessão iniciada com fingerprint e proxy isolados.");
}
run();`;

  const restSnippet = `curl -X POST http://127.0.0.1:12540/api/v1/profiles/start \\
  -H "Content-Type: application/json" \\
  -d '{"profile_id": "p_fb_ads_01"}'`;

  return (
    <div className="pt-10 pb-24">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-7">
        {/* Top Header */}
        <div className="max-w-3xl mb-12">
          <Badge variant="star" className="mb-3 font-bold">
            {language === "en" ? "Developer Documentation" : "Documentação para Desenvolvedores"}
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            {language === "en"
              ? "Star Multlogin API & Automation"
              : "API Local & Automação Star Multlogin"}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#9093A2] leading-relaxed">
            {language === "en"
              ? "Comprehensive guides for controlling anti-detect browser profiles programmatically with Python, Node.js, Playwright, Puppeteer, and local REST endpoints."
              : "Guias completos para controlar perfis antidetecção programaticamente com Python, Node.js, Playwright, Puppeteer e requisições REST locais."}
          </p>
        </div>

        {/* Grid de Seções */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10">
          {/* Menu Lateral de Documentação */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="p-4 rounded-2xl bg-[#12131A] border border-[#232530] space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9093A2] px-2 block mb-2">
                {language === "en" ? "Sections" : "Conteúdo"}
              </span>
              <a
                href="#quickstart"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white hover:bg-white/5 transition-colors"
              >
                <Terminal className="w-4 h-4 text-[#00FF66]" />
                <span>Quick Start</span>
              </a>
              <a
                href="#playwright"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Code className="w-4 h-4 text-[#00FF66]" />
                <span>Playwright (Python)</span>
              </a>
              <a
                href="#puppeteer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Cpu className="w-4 h-4 text-[#00FF66]" />
                <span>Node.js / Puppeteer</span>
              </a>
              <a
                href="#rest"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Network className="w-4 h-4 text-[#00FF66]" />
                <span>REST API Daemon</span>
              </a>
              <a
                href="#proxies"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-[#00FF66]" />
                <span>Proxies & WireGuard</span>
              </a>
            </div>
          </aside>

          {/* Área Principal de Conteúdo */}
          <main className="space-y-12">
            {/* Quick Start */}
            <section id="quickstart" className="scroll-mt-28 space-y-4">
              <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#00FF66]" />
                <span>1. {language === "en" ? "Quick Start & Daemon Port" : "Início Rápido e Porta do Daemon"}</span>
              </h2>
              <p className="text-sm text-[#9093A2] leading-relaxed">
                {language === "en"
                  ? "When the Star Multlogin application is running on your machine, it automatically starts a lightweight local daemon at port 12540. You can interact with it via HTTP requests or through CDP."
                  : "Quando o Star Multlogin está aberto na sua máquina, ele executa um daemon local ultraleve na porta 12540. Você pode controlá-lo diretamente via HTTP ou CDP (Chrome DevTools Protocol)."}
              </p>
              <div className="p-4 rounded-xl bg-[#101116] border border-[#232530] text-xs font-mono text-zinc-300 space-y-1">
                <div><span className="text-[#00FF66]">Host:</span> 127.0.0.1 (localhost)</div>
                <div><span className="text-[#00FF66]">Port:</span> 12540 (REST API)</div>
                <div><span className="text-[#00FF66]">Protocol:</span> HTTP / WebSocket CDP</div>
              </div>
            </section>

            {/* Playwright Python */}
            <section id="playwright" className="scroll-mt-28 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  2. Playwright (Python)
                </h2>
                <button
                  type="button"
                  onClick={() => handleCopy(pythonSnippet, "python")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#333644] bg-[#14151b] hover:bg-[#1c1d24] text-xs font-medium text-white transition-colors cursor-pointer"
                >
                  {copiedSnippet === "python" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#00FF66]" />
                      <span>{language === "en" ? "Copied!" : "Copiado!"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{language === "en" ? "Copy Code" : "Copiar Código"}</span>
                    </>
                  )}
                </button>
              </div>
              <div className="rounded-2xl bg-[#0e0f14] border border-[#232530] overflow-hidden">
                <pre className="p-5 text-xs sm:text-sm font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                  <code>{pythonSnippet}</code>
                </pre>
              </div>
            </section>

            {/* Node.js / Puppeteer */}
            <section id="puppeteer" className="scroll-mt-28 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  3. Node.js & Puppeteer
                </h2>
                <button
                  type="button"
                  onClick={() => handleCopy(nodeSnippet, "node")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#333644] bg-[#14151b] hover:bg-[#1c1d24] text-xs font-medium text-white transition-colors cursor-pointer"
                >
                  {copiedSnippet === "node" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#00FF66]" />
                      <span>{language === "en" ? "Copied!" : "Copiado!"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{language === "en" ? "Copy Code" : "Copiar Código"}</span>
                    </>
                  )}
                </button>
              </div>
              <div className="rounded-2xl bg-[#0e0f14] border border-[#232530] overflow-hidden">
                <pre className="p-5 text-xs sm:text-sm font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                  <code>{nodeSnippet}</code>
                </pre>
              </div>
            </section>

            {/* REST API cURL */}
            <section id="rest" className="scroll-mt-28 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  4. REST API Endpoint
                </h2>
                <button
                  type="button"
                  onClick={() => handleCopy(restSnippet, "rest")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#333644] bg-[#14151b] hover:bg-[#1c1d24] text-xs font-medium text-white transition-colors cursor-pointer"
                >
                  {copiedSnippet === "rest" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#00FF66]" />
                      <span>{language === "en" ? "Copied!" : "Copiado!"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{language === "en" ? "Copy Code" : "Copiar Código"}</span>
                    </>
                  )}
                </button>
              </div>
              <div className="rounded-2xl bg-[#0e0f14] border border-[#232530] overflow-hidden">
                <pre className="p-5 text-xs sm:text-sm font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                  <code>{restSnippet}</code>
                </pre>
              </div>
            </section>

            {/* Proxies & WireGuard */}
            <section id="proxies" className="scroll-mt-28 space-y-4">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                5. {language === "en" ? "Proxy & WireGuard Setup" : "Configuração de Proxies e WireGuard"}
              </h2>
              <p className="text-sm text-[#9093A2] leading-relaxed">
                {language === "en"
                  ? "Star Multlogin supports automatic proxy rotation, SOCKS5 UDP relay, and native WireGuard tunnels configured directly inside each profile JSON."
                  : "O Star Multlogin suporta rotação de IP via URLs dinâmicas, relay SOCKS5 UDP e túneis WireGuard nativos configurados individualmente por perfil."}
              </p>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
