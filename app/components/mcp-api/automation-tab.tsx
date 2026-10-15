import React, { useState, useEffect } from 'react';
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
import { BACKEND_PORT } from '@/services/http';
import { serviceMcp } from '@/services/mcp/service.mcp';
import { renderCodeWithKeyBlur, sanitizeCodeForCopy } from './code-blur-helper';

interface AutomationTabProps {
  apiPort?: number;
  token?: string;
  showToken?: boolean;
  onRevealKey?: () => void;
}

export const AutomationTab: React.FC<AutomationTabProps> = ({
  apiPort = BACKEND_PORT,
  token: propToken,
  showToken = false,
  onRevealKey,
}) => {
  const [token, setToken] = useState<string>(propToken || serviceMcp.getCachedToken());
  const [selectedRecipe, setSelectedRecipe] = useState<string>('astrofox_sync');
  const [selectedLang, setSelectedLang] = useState<'python' | 'node'>('python');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (propToken) {
      setToken(propToken);
    } else {
      serviceMcp.getInfo()
        .then((res) => {
          if (res?.token) setToken(res.token);
        })
        .catch(() => {});
    }
  }, [propToken]);

  const baseUrl = `http://127.0.0.1:${apiPort}`;

  const recipes = [
    {
      id: 'astrofox_sync',
      title: '1. Star Driver: AstroFox (Firefox)',
      tag: 'Firefox / Juggler',
      desc: 'Execução nativa de alta performance no motor Firefox (AstroFox) com isolamento total de fingerprint.',
    },
    {
      id: 'astrobrowser_sync',
      title: '2. Star Driver: AstroBrowser (Chromium)',
      tag: 'Chromium / Chrome',
      desc: 'Execução nativa no motor Chromium (AstroBrowser) com camuflagem de hardware, WebGL e áudio.',
    },
    {
      id: 'multi_profile',
      title: '3. Automação Multi-Perfis Paralela',
      tag: 'Concorrência',
      desc: 'Dispara múltiplos perfis simultaneamente com pastas isoladas e proxies residenciais.',
    },
    {
      id: 'session_cookies',
      title: '4. Aquecimento & Coleta de Cookies',
      tag: 'Persistência',
      desc: 'Navega humanizado, acumula cookies e salva automaticamente no cofre do perfil.',
    },
  ];

  const recipeCodes: Record<string, { python: string; node: string }> = {
    astrofox_sync: {
      python: `#!/usr/bin/env python3
"""
Automação Oficial com Star Driver (Motor Firefox / AstroFox)
Usa o driver Juggler nativo do AstroFox carregando todos os dados do perfil salvo.
Instalação: pip install star-driver (ou motor-fire)
"""
import requests
from astrofox import AstroFox

API_BASE = "${baseUrl}"
API_TOKEN = "${token}"
PROFILE_ID = "seu_perfil_id_aqui"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Accept": "application/json"
}

# 1. Obtém as configurações e diretório do perfil no Star Multlogin (com token)
res = requests.get(f"{API_BASE}/api/profiles/{PROFILE_ID}/playwright", headers=headers)
opts = res.json()

print(f"🦊 Carregando perfil '{opts.get('name')}' via Star Driver AstroFox...")

# 2. Executa direto no driver AstroFox nativo (zero erros de BiDi/CDP)
with AstroFox(
    executable_path=opts.get("executable_path") or None,
    user_data_dir=opts["user_data_dir"],
    persistent_context=True,
    os=opts["os"],
    proxy=opts.get("proxy"),
    config=opts.get("config"),
    firefox_user_prefs=opts.get("firefox_user_prefs"),
    humanize=True,
    headless=False,
) as browser:
    page = browser.new_page()
    page.bring_to_front()
    page.goto("https://bot.sannysoft.com")
    print("✅ Página carregada com sucesso:", page.title())
`,
      node: `// Node.js: Automação com Playwright conectando ao Star Driver (Motor Firefox)
import { firefox } from 'playwright';

const API_BASE = '${baseUrl}';
const API_TOKEN = '${token}';
const PROFILE_ID = 'seu_perfil_id_aqui';

async function main() {
  // 1. Obtém as opções e pasta do perfil do Star Multlogin (com autenticação)
  const res = await fetch(\`\${API_BASE}/api/profiles/\${PROFILE_ID}/playwright\`, {
    headers: {
      'Authorization': \`Bearer \${API_TOKEN}\`,
      'Accept': 'application/json'
    }
  });
  const opts = await res.json();

  console.log(\`🦊 Carregando perfil '\${opts.name}' via Star Driver...\`);

  // 2. Executa via Playwright persistente com camuflagem de fingerprint
  const context = await firefox.launchPersistentContext(opts.user_data_dir, {
    executablePath: opts.executable_path || undefined,
    headless: false,
    proxy: opts.proxy || undefined,
    viewport: null,
  });

  const page = await context.newPage();
  await page.bringToFront();
  await page.goto('https://bot.sannysoft.com');
  console.log('✅ Título da página:', await page.title());
}

main();
`,
    },

    astrobrowser_sync: {
      python: `#!/usr/bin/env python3
"""
Automação Oficial com Star Driver (Motor Chromium / AstroBrowser)
Inicia o binário Chromium seguro com perfis persistentes e camuflagem ativa.
Instalação: pip install astrobrowser (ou clearcote)
"""
import sys
import requests

try:
    from astrobrowser import launch_persistent_context
except ImportError:
    from clearcote import launch_persistent_context

API_BASE = "${baseUrl}"
API_TOKEN = "${token}"
PROFILE_ID = "seu_perfil_id_aqui"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Accept": "application/json"
}

# 1. Puxa as diretrizes do perfil no Star Multlogin (com token)
res = requests.get(f"{API_BASE}/api/profiles/{PROFILE_ID}/playwright", headers=headers)
if res.status_code != 200:
    print(f"❌ Erro ao buscar perfil ({res.status_code}): {res.text}")
    sys.exit(1)

opts = res.json()
print(f"🚀 Carregando perfil '{opts.get('name')}' via AstroBrowser...")

# 2. Filtra --user-data-dir dos args para não conflitar com o Playwright
profile_args = [
    arg for arg in opts.get("args", [])
    if not arg.startswith("--user-data-dir=")
]

# 3. Executa via AstroBrowser nativo com fingerprint completo aplicado
context = launch_persistent_context(
    user_data_dir=opts["user_data_dir"],
    executable_path=opts.get("executable_path") or None,
    headless=False,
    args=profile_args,
    proxy=opts.get("proxy"),
    locale=opts.get("locale"),
    humanize=opts.get("humanize", True),
)

# 4. Abre nova aba dedicada e traz para o foco da tela
page = context.new_page()
page.bring_to_front()
page.goto("https://bot.sannysoft.com")
print("✅ Título da página:", page.title())

input("Pressione Enter no terminal para encerrar o perfil...")
context.close()
`,
      node: `// Node.js: Automação Chromium via CDP / Playwright
import { chromium } from 'playwright';

const API_BASE = '${baseUrl}';
const API_TOKEN = '${token}';
const PROFILE_ID = 'seu_perfil_id_aqui';

async function main() {
  // 1. Inicia o perfil via API do Star Multlogin com CDP ativado e token
  const launchRes = await fetch(\`\${API_BASE}/mcp/profiles/\${PROFILE_ID}/launch?cdp=true\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${API_TOKEN}\`,
      'Content-Type': 'application/json'
    }
  });
  const data = await launchRes.json();
  console.log(\`🚀 Conectando via CDP ao AstroBrowser na porta \${data.debug_port}...\`);

  // 2. Conecta ao navegador ativo
  const browser = await chromium.connectOverCDP(data.ws_endpoint);
  const context = browser.contexts()[0];

  // 3. Abre nova aba e traz para o primeiro plano da tela
  const page = await context.newPage();
  await page.bringToFront();

  await page.goto('https://bot.sannysoft.com');
  console.log('✅ Conectado com sucesso:', await page.title());
}

main();
`,
    },

    multi_profile: {
      python: `#!/usr/bin/env python3
"""
Automação Paralela em Múltiplos Perfis com Star Driver AstroFox
Executa múltiplos perfis simultaneamente usando ThreadPool e dados isolados.
"""
import concurrent.futures
import requests
from astrofox import AstroFox

API_BASE = "${baseUrl}"
API_TOKEN = "${token}"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Accept": "application/json"
}

# 1. Puxa perfis cadastrados pelo endpoint público com suporte a tags e token
res = requests.get(f"{API_BASE}/api/profiles/public", headers=headers)
profiles = res.json()
target_ids = [p["id"] for p in profiles[:3]]

def run_profile(profile_id):
    # Obtém as opções do perfil com token
    opts = requests.get(f"{API_BASE}/api/profiles/{profile_id}/playwright", headers=headers).json()
    print(f"🦊 Iniciando perfil '{opts.get('name')}' em paralelo...")

    with AstroFox(
        executable_path=opts.get("executable_path") or None,
        user_data_dir=opts["user_data_dir"],
        persistent_context=True,
        os=opts["os"],
        proxy=opts.get("proxy"),
        config=opts.get("config"),
        firefox_user_prefs=opts.get("firefox_user_prefs"),
        humanize=True,
        headless=False,
    ) as browser:
        page = browser.pages[0] if browser.pages else browser.new_page()
        page.goto("https://bot.sannysoft.com")
        print(f"[{profile_id}] Sucesso: {page.title()}")

# Roda perfis em paralelo com isolamento total de disco e sem erros de BiDi
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
    executor.map(run_profile, target_ids)
`,
      node: `// Node.js: Execução Multi-Perfis Concorrente com Playwright
import { firefox } from 'playwright';

const API_BASE = '${baseUrl}';
const API_TOKEN = '${token}';

const headers = {
  'Authorization': \`Bearer \${API_TOKEN}\`,
  'Accept': 'application/json'
};

async function runProfile(profileId) {
  const res = await fetch(\`\${API_BASE}/api/profiles/\${profileId}/playwright\`, { headers });
  const opts = await res.json();

  console.log(\`🦊 [\${opts.name}] Iniciando...\`);
  const context = await firefox.launchPersistentContext(opts.user_data_dir, {
    executablePath: opts.executable_path || undefined,
    headless: false,
    proxy: opts.proxy || undefined,
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://bot.sannysoft.com');
  console.log(\`✅ [\${opts.name}] Concluído:\`, await page.title());
  await context.close();
}

async function main() {
  // Puxa os perfis do endpoint público autenticado
  const publicRes = await fetch(\`\${API_BASE}/api/profiles/public\`, { headers });
  const profiles = await publicRes.json();
  const targetIds = profiles.slice(0, 3).map(p => p.id);

  await Promise.all(targetIds.map(id => runProfile(id)));
  console.log('🎉 Todos os perfis concluídos em paralelo!');
}

main();
`,
    },

    session_cookies: {
      python: `#!/usr/bin/env python3
"""
Aquecimento de Perfil & Coleta de Cookies com AstroFox Nativo
Com persistent_context=True, todas as sessões e cookies são salvos automaticamente no disco.
"""
import time
import requests
from astrofox import AstroFox

API_BASE = "${baseUrl}"
API_TOKEN = "${token}"
PROFILE_ID = "seu_perfil_id_aqui"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Accept": "application/json"
}

# 1. Puxa as diretrizes do perfil com token
opts = requests.get(f"{API_BASE}/api/profiles/{PROFILE_ID}/playwright", headers=headers).json()

# 2. Inicia o navegador AstroFox nativo
with AstroFox(
    executable_path=opts.get("executable_path") or None,
    user_data_dir=opts["user_data_dir"],
    persistent_context=True,
    os=opts["os"],
    proxy=opts.get("proxy"),
    config=opts.get("config"),
    firefox_user_prefs=opts.get("firefox_user_prefs"),
    humanize=True,
    headless=False,
) as browser:
    page = browser.pages[0] if browser.pages else browser.new_page()

    page.goto("https://mercadolivre.com.br")
    page.wait_for_load_state("networkidle")

    for _ in range(3):
        page.mouse.wheel(0, 300)
        time.sleep(1.2)

    cookies = browser.contexts[0].cookies() if browser.contexts else []
    print(f"🍪 Cookies na sessão ativa: {len(cookies)}")

# Ao sair do bloco 'with', o AstroFox grava e sincroniza tudo na pasta do perfil!
print("✅ Sessões e cookies persistidos automaticamente no Star Multlogin!")
`,
      node: `// Node.js: Aquecimento de Perfil & Persistência Nativa
import { firefox } from 'playwright';

const API_BASE = '${baseUrl}';
const API_TOKEN = '${token}';
const PROFILE_ID = 'seu_perfil_id_aqui';

async function warmUp() {
  const res = await fetch(\`\${API_BASE}/api/profiles/\${PROFILE_ID}/playwright\`, {
    headers: {
      'Authorization': \`Bearer \${API_TOKEN}\`,
      'Accept': 'application/json'
    }
  });
  const opts = await res.json();

  const context = await firefox.launchPersistentContext(opts.user_data_dir, {
    executablePath: opts.executable_path || undefined,
    headless: false,
    proxy: opts.proxy || undefined,
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://mercadolivre.com.br', { waitUntil: 'networkidle' });
  await page.mouse.wheel(0, 400);

  // Fecha o navegador sincronizando cookies e armazenamento no disco
  await context.close();
  console.log('✅ Cookies e dados da sessão salvos no diretório do perfil!');
}

warmUp();
`,
    },
  };

  const handleCopyCode = () => {
    const rawCode = recipeCodes[selectedRecipe][selectedLang];
    const textToCopy = sanitizeCodeForCopy(rawCode, token, showToken);
    navigator.clipboard.writeText(textToCopy);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Prerequisites Banner - Sem blur de fundo */}
      <div className="bg-white dark:bg-[#13141C] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-[#00FF66]/15 border border-emerald-200 dark:border-[#00FF66]/30 flex items-center justify-center text-emerald-600 dark:text-[#00FF66] shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
              SDK Star Driver: AstroFox (Firefox) & AstroBrowser (Chromium)
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                Driver Oficial
              </span>
            </h3>
            <p className="text-[12px] text-slate-600 dark:text-[#B5B5B5] mt-0.5 max-w-2xl leading-relaxed">
              O Star Driver inicializa diretamente o perfil configurado no Star Multlogin com <strong>AstroFox</strong> ou <strong>AstroBrowser</strong>, com proxy residencial e camuflagem de hardware sem erros de compatibilidade.
            </p>
          </div>
        </div>

        {/* Command Badge */}
        <div className="bg-slate-50 dark:bg-[#0C0D12] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 font-mono text-[11px] text-slate-800 dark:text-[#D8D8D8] shrink-0">
          <span className="text-slate-500 dark:text-[#A0A0A0] block text-[9px] uppercase font-bold font-sans">
            Instalação da SDK:
          </span>
          <code>pip install star-driver astrobrowser clearcote requests</code>
        </div>
      </div>

      {/* Main Grid: Recipe Selector on Left, Code on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recipe Selector - Sem blur */}
        <div className="lg:col-span-4 bg-white dark:bg-[#13141C] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm dark:shadow-none space-y-3">
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-[#A0A0A0] px-1 flex items-center gap-1.5">
            <Boxes size={14} className="text-emerald-600 dark:text-[#00FF66]" />
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
                      ? 'bg-emerald-50/70 border-emerald-300 dark:bg-[#1F212D] dark:border-white/20 shadow-xs text-emerald-800 dark:text-[#00FF66]'
                      : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100 dark:bg-[#181922] dark:border-white/10 dark:hover:bg-[#202230] dark:hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[13px] font-bold ${isSelected ? 'text-emerald-700 dark:text-[#00FF66]' : 'text-slate-900 dark:text-white'}`}>
                      {r.title}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white dark:bg-[#0C0D12] text-slate-700 dark:text-[#C4C4C4] border border-slate-200 dark:border-white/10 shrink-0">
                      {r.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-[#B8B8B8] mt-1 leading-snug">
                    {r.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Code Display - Sem blur */}
        <div className="lg:col-span-8 bg-white dark:bg-[#13141C] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-none space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
            <div>
              <h4 className="text-[14px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCode size={16} className="text-emerald-600 dark:text-[#00FF66]" />
                {recipes.find((r) => r.id === selectedRecipe)?.title}
              </h4>
              <p className="text-[12px] text-slate-600 dark:text-[#B5B5B5]">
                Copie o script e execute no seu ambiente local com Python ou Node.js.
              </p>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#0C0D12] border border-slate-200 dark:border-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedLang('python')}
                className={`py-1.5 px-3 rounded-lg text-[12px] font-bold transition-all ${
                  selectedLang === 'python'
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 dark:bg-[#1F212D] dark:text-[#00FF66] dark:border-white/15'
                    : 'text-slate-600 hover:text-slate-900 dark:text-[#A6A6A6] dark:hover:text-white'
                }`}
              >
                Python (Playwright)
              </button>
              <button
                type="button"
                onClick={() => setSelectedLang('node')}
                className={`py-1.5 px-3 rounded-lg text-[12px] font-bold transition-all ${
                  selectedLang === 'node'
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 dark:bg-[#1F212D] dark:text-[#00FF66] dark:border-white/15'
                    : 'text-slate-600 hover:text-slate-900 dark:text-[#A6A6A6] dark:hover:text-white'
                }`}
              >
                Node.js
              </button>
            </div>
          </div>

          {/* Code Editor Container */}
          <div className="relative group">
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-[12px] font-mono text-[#F0F0F0] overflow-x-auto max-h-[440px] leading-relaxed shadow-inner">
              {renderCodeWithKeyBlur(recipeCodes[selectedRecipe][selectedLang], token, showToken, onRevealKey)}
            </pre>
            <button
              type="button"
              onClick={handleCopyCode}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E202B] hover:bg-[#282B3A] text-[#00FF66] text-[12px] font-bold border border-white/10 transition-all shadow-sm dark:shadow-none cursor-pointer"
              title={showToken ? "Copiar Script" : "Copiar Script (Chave vazia enquanto oculta)"}
            >
              {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedCode ? 'Copiado!' : 'Copiar Script'}</span>
            </button>
          </div>

          {/* Quick Info Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10 text-[11px] text-slate-500 dark:text-[#A6A6A6]">
            <span>Endereço da API: <strong className="text-slate-900 dark:text-white font-mono">{baseUrl}</strong></span>
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
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
