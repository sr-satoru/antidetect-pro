"use client";

import React, { useState } from "react";
import { Terminal, Copy, Check, Bot, Zap, Star } from "lucide-react";
import { useI18n } from "@/app/contexts/i18n-context";

export function ApiSection() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"curl" | "python" | "node">("curl");

  const codeSnippets = {
    curl: `# Star Multlogin Local REST API
curl -X POST http://127.0.0.1:12540/api/v1/profiles \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Star Profile #01",
    "group": "E-Commerce",
    "proxy": "socks5://user:pass@192.168.1.100:1080",
    "os": "windows",
    "fingerprint": "auto"
  }'`,
    python: `import requests

# Star Multlogin Local Python Automation
API_URL = "http://127.0.0.1:12540/api/v1"

profile = requests.post(f"{API_URL}/profiles", json={
    "name": "Campaign Profile #01",
    "group": "Marketing",
    "proxy": "http://proxy.star.io:8080"
}).json()

# Launch browser with isolated CDP WebSocket port
requests.post(f"{API_URL}/profiles/{profile['id']}/start")
print("Star Profile active:", profile["wsEndpoint"])`,
    node: `import fetch from 'node-fetch';

const STAR_API = 'http://127.0.0.1:12540/api/v1';

async function launchStarProfile() {
  const res = await fetch(\`\${STAR_API}/profiles/start\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: 'target_id_here' })
  });
  
  const data = await res.json();
  console.log('Connected to Star Multlogin:', data.debug_port);
}

launchStarProfile();`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="api" className="py-20 border-t border-[#232530] bg-[#0c0d12]">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-7">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column: Description */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/20 text-xs font-mono text-[#00FF66] mb-4">
              <Zap className="w-3.5 h-3.5" />
              <span>{t.api.badge}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              {t.api.title}
            </h2>
            <p className="mt-4 text-base text-[#9093A2] leading-relaxed">
              {t.api.subtitle}
            </p>
            <ul className="mt-6 space-y-3 text-sm text-[#9093A2]">
              <li className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#00FF66] shadow-[0_0_8px_#00FF66]" />
                <span>{t.api.feature1Title}: {t.api.feature1Desc}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#00FF66] shadow-[0_0_8px_#00FF66]" />
                <span>{t.api.feature2Title}: {t.api.feature2Desc}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#00FF66] shadow-[0_0_8px_#00FF66]" />
                <span>{t.api.feature3Title}: {t.api.feature3Desc}</span>
              </li>
            </ul>
          </div>

          {/* Right Column: Code block */}
          <div className="rounded-2xl bg-[#08090C] border border-[#232530] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 bg-[#12131A] border-b border-[#232530]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("curl")}
                  className={`text-xs font-mono px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeTab === "curl"
                      ? "bg-white/10 text-[#00FF66] font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {t.api.tabBash}
                </button>
                <button
                  onClick={() => setActiveTab("python")}
                  className={`text-xs font-mono px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeTab === "python"
                      ? "bg-white/10 text-[#00FF66] font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {t.api.tabPython}
                </button>
                <button
                  onClick={() => setActiveTab("node")}
                  className={`text-xs font-mono px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeTab === "node"
                      ? "bg-white/10 text-[#00FF66] font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {t.api.tabNode}
                </button>
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#00FF66] transition-colors cursor-pointer"
                aria-label="Copiar código"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#00FF66]" />
                    <span className="text-[#00FF66]">OK</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-5 text-xs sm:text-sm font-mono text-zinc-300 overflow-x-auto leading-relaxed">
              <code>{codeSnippets[activeTab]}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
