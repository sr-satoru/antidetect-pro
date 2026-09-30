import React, { useState } from 'react';
import {
  Code,
  Copy,
  Check,
  Terminal,
  FileCode,
  Sparkles,
  Layers,
  Cpu,
  ShieldCheck,
  Boxes,
  Zap,
} from 'lucide-react';
import { toast } from '@/components/ui/notification';

interface AutomationTabProps {
  apiPort?: number;
  token?: string;
}

export const AutomationTab: React.FC<AutomationTabProps> = ({
  apiPort = 18922,
  token = 'star_sec_8f92a10b48c34791a82f091c7823e4590d1e345f8a213904',
}) => {
  const [selectedRecipe, setSelectedRecipe] = useState<string>('basic_connect');
  const [selectedLang, setSelectedLang] = useState<'python' | 'node'>('python');
  const [copiedCode, setCopiedCode] = useState(false);

  const baseUrl = `http://127.0.0.1:${apiPort}`;

  const recipes = [
    {
      id: 'basic_connect',
      title: '1. Conexão Direta Playwright',
      tag: 'Recomendado',
      desc: 'Inicia o perfil e conecta o Playwright ao AstroFox sem baixar navegadores externos.',
    },
    {
      id: 'multi_profile',
      title: '2. Automação Multi-Perfis Paralela',
      tag: 'Concorrência',
      desc: 'Dispara múltiplos perfis simultaneamente com proxies residenciais e portas independentes.',
    },
    {
      id: 'session_cookies',
      title: '3. Aquecimento & Coleta de Cookies',
      tag: 'Persistência',
      desc: 'Navega humanizado, acumula cookies e encerra sincronizando as sessões no disco.',
    },
    {
      id: 'puppeteer_cdp',
      title: '4. Integração com Puppeteer',
      tag: 'Node.js',
      desc: 'Para desenvolvedores que utilizam a biblioteca Puppeteer tradicional em pipelines.',
    },
  ];

  const recipeCodes: Record<string, { python: string; node: string }> = {
    basic_connect: {
      python: `#!/usr/bin/env python3
"""
Conexão Direta Playwright -> Star Multlogin Core
Preserva 100% dos cookies, proxy residencial e camuflagem de hardware.
SEM baixar navegadores extras ('playwright install' não é necessário!).
"""
import requests
from playwright.sync_api import sync_playwright

API_BASE = "${baseUrl}"
TOKEN = "${token}"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}

# 1. Inicia o perfil no Star Multlogin
profile_id = "seu_perfil_id_aqui"
res = requests.post(f"{API_BASE}/api/v1/profiles/start", json={"id": profile_id}, headers=HEADERS)
data = res.json()

ws_endpoint = data.get("ws_endpoint")
print(f"🚀 Camoufox ativo! Conectando via BiDi/CDP em: {ws_endpoint}")

# 2. Conecta o Playwright direto no processo Camoufox já aberto
with sync_playwright() as pw:
    browser = pw.firefox.connect(ws_endpoint)
    context = browser.contexts[0]
    page = context.pages[0] if context.pages else context.new_page()

    page.goto("https://bot.sannysoft.com")
    print("✅ Página carregada com sucesso:", page.title())

    # 3. Finaliza e persiste todos os cookies novos no banco SQLite do Star Multlogin
    requests.post(f"{API_BASE}/api/v1/profiles/stop", json={"id": profile_id}, headers=HEADERS)
    print("🔒 Sessão encerrada e dados gravados com sucesso.")
`,
      node: `// Node.js: Conexão Direta Playwright -> Camoufox
import { firefox } from 'playwright';

const API_BASE = '${baseUrl}';
const TOKEN = '${token}';
const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': \`Bearer \${TOKEN}\`
};

async function main() {
  const profileId = 'seu_perfil_id_aqui';

  // 1. Inicia o perfil via API REST do Star Multlogin
  const startRes = await fetch(\`\${API_BASE}/api/v1/profiles/start\`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ id: profileId })
  });
  const { ws_endpoint, pid } = await startRes.json();
  console.log(\`🚀 Camoufox iniciado no PID \${pid}. Conectando em \${ws_endpoint}...\`);

  // 2. Conecta ao Camoufox existente sem baixar novos binários
  const browser = await firefox.connect(ws_endpoint);
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();

  await page.goto('https://bot.sannysoft.com');
  console.log('✅ Título da página:', await page.title());

  // 3. Encerra e persiste cookies no disco
  await fetch(\`\${API_BASE}/api/v1/profiles/stop\`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ id: profileId })
  });
  console.log('🔒 Perfil finalizado com segurança.');
}

main();
`,
    },

    multi_profile: {
      python: `#!/usr/bin/env python3
"""
Automação Paralela em Múltiplos Perfis com AstroFox
Cada perfil roda isolado na sua própria porta com seu proxy residencial próprio.
"""
import concurrent.futures
import requests
from playwright.sync_api import sync_playwright

API_BASE = "${baseUrl}"
HEADERS = {"Authorization": "Bearer ${token}"}

PROFILES_TO_RUN = ["perfil_shopee_01", "perfil_mercado_02", "perfil_google_03"]

def automate_profile(profile_id):
    # Inicia o perfil e obtém a porta WebSocket
    res = requests.post(f"{API_BASE}/api/v1/profiles/start", json={"id": profile_id}, headers=HEADERS)
    ws_endpoint = res.json()["ws_endpoint"]
    
    with sync_playwright() as pw:
        browser = pw.firefox.connect(ws_endpoint)
        page = browser.contexts[0].new_page()
        page.goto("https://httpbin.org/ip")
        print(f"[{profile_id}] IP Detectado:", page.inner_text("body"))
        browser.close()
    
    # Encerra o perfil
    requests.post(f"{API_BASE}/api/v1/profiles/stop", json={"id": profile_id}, headers=HEADERS)
    return f"Perfil {profile_id} finalizado."

# Executa em paralelo usando ThreadPool
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
    results = executor.map(automate_profile, PROFILES_TO_RUN)
    for r in results:
        print(r)
`,
      node: `// Automação Multi-Perfis Simultânea em Node.js
import { firefox } from 'playwright';

const API_BASE = '${baseUrl}';
const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ${token}'
};

const PROFILES = ['perfil_01', 'perfil_02', 'perfil_03'];

async function runWorker(profileId) {
  const start = await fetch(\`\${API_BASE}/api/v1/profiles/start\`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ id: profileId })
  });
  const { ws_endpoint } = await start.json();

  const browser = await firefox.connect(ws_endpoint);
  const page = await browser.contexts()[0].newPage();
  await page.goto('https://httpbin.org/ip');
  console.log(\`[\${profileId}] Terminado.\`);

  await fetch(\`\${API_BASE}/api/v1/profiles/stop\`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ id: profileId })
  });
}

// Roda todos os perfis em paralelo
Promise.all(PROFILES.map(id => runWorker(id)))
  .then(() => console.log('🎉 Todos os perfis foram executados com sucesso!'));
`,
    },

    session_cookies: {
      python: `#!/usr/bin/env python3
"""
Aquecimento de Perfil & Coleta de Cookies com Rolagem Humanizada
Garante que novos tokens de sessão sejam descarregados para o banco de dados local.
"""
import time
import requests
from playwright.sync_api import sync_playwright

API_BASE = "${baseUrl}"
HEADERS = {"Authorization": "Bearer ${token}"}
profile_id = "perfil_aquecer_01"

# 1. Inicia o navegador Camoufox
res = requests.post(f"{API_BASE}/api/v1/profiles/start", json={"id": profile_id}, headers=HEADERS)
ws = res.json()["ws_endpoint"]

with sync_playwright() as pw:
    browser = pw.firefox.connect(ws)
    page = browser.contexts[0].pages[0]

    # Navega para o site desejado
    page.goto("https://mercadolivre.com.br")
    page.wait_for_load_state("networkidle")

    # Rolagem humanizada suave (anti-detect)
    for _ in range(3):
        page.mouse.wheel(0, 300)
        time.sleep(1.2)

    print("Cookies na sessão ativa:", len(page.context.cookies()))

# 2. Descarrega cookies e persistência no disco do Star Multlogin
requests.post(f"{API_BASE}/api/v1/profiles/stop", json={"id": profile_id}, headers=HEADERS)
print("✅ Cookies gravados no armazenamento local do perfil!")
`,
      node: `// Aquecimento & Persistência de Cookies em Node.js
import { firefox } from 'playwright';

const API_BASE = '${baseUrl}';
const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ${token}'
};

async function warmUp() {
  const profileId = 'perfil_aquecer_01';

  const res = await fetch(\`\${API_BASE}/api/v1/profiles/start\`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ id: profileId })
  });
  const { ws_endpoint } = await res.json();

  const browser = await firefox.connect(ws_endpoint);
  const page = browser.contexts()[0].pages()[0];

  await page.goto('https://mercadolivre.com.br', { waitUntil: 'networkidle' });
  await page.mouse.wheel(0, 400);

  // Fecha o perfil de forma graciosa
  await fetch(\`\${API_BASE}/api/v1/profiles/stop\`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ id: profileId })
  });
  console.log('✅ Cookies persistidos com sucesso!');
}

warmUp();
`,
    },

    puppeteer_cdp: {
      python: `"""
Nota: No ecossistema Python recomenda-se Playwright por suporte nativo a Firefox/Camoufox.
Caso use Puppeteer, utilize o script em Node.js na aba ao lado.
"""
print("Selecione a aba Node.js para o exemplo de Puppeteer!")
`,
      node: `// Conexão via Puppeteer Core
import puppeteer from 'puppeteer-core';

const API_BASE = '${baseUrl}';
const TOKEN = '${token}';

async function runPuppeteer() {
  const profileId = 'seu_perfil_id_aqui';

  // Inicia o Camoufox
  const res = await fetch(\`\${API_BASE}/api/v1/profiles/start\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${TOKEN}\`
    },
    body: JSON.stringify({ id: profileId })
  });
  const { ws_endpoint } = await res.json();

  // Conecta via browserWSEndpoint
  const browser = await puppeteer.connect({
    browserWSEndpoint: ws_endpoint
  });

  const page = (await browser.pages())[0];
  await page.goto('https://bot.sannysoft.com');
  console.log('Puppeteer conectado com sucesso!');
}

runPuppeteer();
`,
    },
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(recipeCodes[selectedRecipe][selectedLang]);
    setCopiedCode(true);
    toast.success('Exemplo de automação copiado!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Prerequisites Banner */}
      <div className="bg-[#13141C] backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_12px_40px_-5px_rgba(0,0,0,0.7)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#00FF66]/15 border border-[#00FF66]/30 flex items-center justify-center text-[#00FF66] shrink-0 shadow-[0_0_15px_rgba(0,255,102,0.18)]">
            <Zap size={20} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-white flex items-center gap-2">
              Cookbook de Automação Playwright & AstroFox
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Zero Download Extra
              </span>
            </h3>
            <p className="text-[12px] text-[#B5B5B5] mt-0.5 max-w-2xl leading-relaxed">
              Você <strong>não</strong> precisa baixar Chromium ou Firefox adicionais (<code className="text-[#00FF66]">playwright install</code> é desnecessário). O Playwright se acopla diretamente ao processo do AstroFox que já está configurado com seu proxy e perfil anti-detect.
            </p>
          </div>
        </div>

        {/* Command Badge */}
        <div className="bg-[#0C0D12] border border-white/10 rounded-xl px-3.5 py-2 font-mono text-[11px] text-[#D8D8D8] shrink-0">
          <span className="text-[#A0A0A0] block text-[9px] uppercase font-bold font-sans">
            Instalação Mínima:
          </span>
          <code>pip install playwright requests</code>
        </div>
      </div>

      {/* Main Grid: Recipe Selector on Left, Code on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recipe Selector */}
        <div className="lg:col-span-4 bg-[#13141C] backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_12px_40px_-5px_rgba(0,0,0,0.7)] space-y-3">
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#A0A0A0] px-1 flex items-center gap-1.5">
            <Boxes size={14} className="text-[#00FF66]" />
            Cenários de Automação
          </h4>

          <div className="space-y-2">
            {recipes.map((r) => {
              const isSelected = selectedRecipe === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRecipe(r.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#1F212D] border-white/20 shadow-md text-[#00FF66]'
                      : 'bg-[#181922] border-white/10 hover:bg-[#202230] hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[13px] font-bold ${isSelected ? 'text-[#00FF66]' : 'text-white'}`}>
                      {r.title}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#0C0D12] text-[#C4C4C4] border border-white/10 shrink-0">
                      {r.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#B8B8B8] mt-1 leading-snug">
                    {r.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Code Display */}
        <div className="lg:col-span-8 bg-[#13141C] backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_12px_40px_-5px_rgba(0,0,0,0.7)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <h4 className="text-[14px] font-bold text-white flex items-center gap-2">
                <FileCode size={16} className="text-[#00FF66]" />
                {recipes.find((r) => r.id === selectedRecipe)?.title}
              </h4>
              <p className="text-[12px] text-[#B5B5B5]">
                Copie o script e execute no seu ambiente local com Python ou Node.js.
              </p>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-[#0C0D12] border border-white/10 rounded-xl backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setSelectedLang('python')}
                className={`py-1.5 px-3 rounded-lg text-[12px] font-bold transition-all ${
                  selectedLang === 'python'
                    ? 'bg-[#1F212D] text-[#00FF66] font-bold shadow-sm border border-white/15'
                    : 'text-[#A6A6A6] hover:text-white'
                }`}
              >
                Python (Playwright)
              </button>
              <button
                type="button"
                onClick={() => setSelectedLang('node')}
                className={`py-1.5 px-3 rounded-lg text-[12px] font-bold transition-all ${
                  selectedLang === 'node'
                    ? 'bg-[#1F212D] text-[#00FF66] font-bold shadow-sm border border-white/15'
                    : 'text-[#A6A6A6] hover:text-white'
                }`}
              >
                Node.js
              </button>
            </div>
          </div>

          {/* Code Editor Container */}
          <div className="relative group">
            <pre className="bg-[#0C0D12] border border-white/10 rounded-xl p-4 text-[12px] font-mono text-[#F0F0F0] overflow-x-auto max-h-[440px] leading-relaxed shadow-inner">
              {recipeCodes[selectedRecipe][selectedLang]}
            </pre>
            <button
              type="button"
              onClick={handleCopyCode}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E202B] hover:bg-[#282B3A] text-[#00FF66] text-[12px] font-bold border border-white/10 transition-all shadow-sm"
            >
              {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedCode ? 'Copiado!' : 'Copiar Script'}</span>
            </button>
          </div>

          {/* Quick Info Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-[#A6A6A6]">
            <span>Endereço da API: <strong className="text-white font-mono">{baseUrl}</strong></span>
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck size={13} />
              Isolamento Anti-Origin Ativo
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationTab;
