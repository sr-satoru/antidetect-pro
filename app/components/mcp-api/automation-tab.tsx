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
      title: '1. Biblioteca Nativa Camoufox',
      tag: 'Recomendado',
      desc: 'Inicia o perfil usando a SDK oficial do Camoufox com Juggler nativo (Zero BiDi).',
    },
    {
      id: 'multi_profile',
      title: '2. Automação Multi-Perfis Paralela',
      tag: 'Concorrência',
      desc: 'Dispara múltiplos perfis simultaneamente com pastas isoladas e proxies residenciais.',
    },
    {
      id: 'session_cookies',
      title: '3. Aquecimento & Coleta de Cookies',
      tag: 'Persistência',
      desc: 'Navega humanizado, acumula cookies e salva automaticamente na pasta do perfil.',
    },
    {
      id: 'tag_dispatch',
      title: '4. Seleção Inteligente por Tags (IA / Bot)',
      tag: 'Agentes & Tags',
      desc: 'Filtra perfis públicos pelas tags de negócio e executa tarefas sob demanda.',
    },
  ];

  const recipeCodes: Record<string, { python: string; node: string }> = {
    basic_connect: {
      python: `#!/usr/bin/env python3
"""
Automação Nativa com Camoufox + Star Multlogin (Zero BiDi)
Usa o driver Juggler nativo do Camoufox carregando todos os dados do perfil salvo.
"""
import requests
from camoufox.sync_api import Camoufox

API_BASE = "${baseUrl}"
# (Dica: Você pode puxar o ID, Nome e Tags pelo endpoint público: requests.get(f"{API_BASE}/api/profiles/public?name=Meu Perfil"))
PROFILE_ID = "seu_perfil_id_aqui"

# 1. Obtém as configurações e diretório do perfil no Star Multlogin
res = requests.get(f"{API_BASE}/api/profiles/{PROFILE_ID}/playwright")
opts = res.json()

print(f"🦊 Carregando perfil '{opts.get('name')}' via Camoufox...")

# 2. Executa direto na biblioteca nativa do Camoufox (zero erros de BiDi/CDP)
with Camoufox(
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
    print("✅ Página carregada com sucesso:", page.title())
`,
      node: `// Node.js: Automação Nativa com @camoufox/camoufox (Zero BiDi)
import { Camoufox } from '@camoufox/camoufox';

const API_BASE = '${baseUrl}';
// (Dica: Você pode puxar o ID, Nome e Tags pelo endpoint público: await fetch(\`\${API_BASE}/api/profiles/public?name=Meu Perfil\`))
const PROFILE_ID = 'seu_perfil_id_aqui';

async function main() {
  // 1. Obtém as opções e pasta do perfil do Star Multlogin
  const res = await fetch(\`\${API_BASE}/api/profiles/\${PROFILE_ID}/playwright\`);
  const opts = await res.json();

  console.log(\`🦊 Carregando perfil '\${opts.name}' via Camoufox...\`);

  // 2. Executa via biblioteca nativa do Camoufox com contexto persistente
  const browser = await Camoufox({
    executable_path: opts.executable_path || undefined,
    user_data_dir: opts.user_data_dir,
    persistent_context: true,
    os: opts.os,
    proxy: opts.proxy || undefined,
    config: opts.config,
    firefox_user_prefs: opts.firefox_user_prefs,
    humanize: true,
    headless: false,
  });

  const page = browser.pages()[0] || await browser.newPage();
  await page.goto('https://bot.sannysoft.com');
  console.log('✅ Título da página:', await page.title());
}

main();
`,
    },

    multi_profile: {
      python: `#!/usr/bin/env python3
"""
Automação Paralela em Múltiplos Perfis com Camoufox Nativo (Zero BiDi)
Executa múltiplos perfis simultaneamente usando ThreadPool e pastas de dados isoladas.
"""
import concurrent.futures
import requests
from camoufox.sync_api import Camoufox

API_BASE = "${baseUrl}"

# 1. Puxa perfis cadastrados pelo endpoint público (com suporte a tags)
res = requests.get(f"{API_BASE}/api/profiles/public")
profiles = res.json()
target_ids = [p["id"] for p in profiles[:3]]

def run_profile(profile_id):
    # Obtém as opções específicas do perfil (caminho dos dados, proxy, resolução)
    opts = requests.get(f"{API_BASE}/api/profiles/{profile_id}/playwright").json()
    print(f"🦊 Iniciando perfil '{opts.get('name')}' em paralelo...")

    with Camoufox(
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
      node: `// Node.js: Execução Multi-Perfis Concorrente com @camoufox/camoufox
import { Camoufox } from '@camoufox/camoufox';

const API_BASE = '${baseUrl}';

async function runProfile(profileId) {
  const res = await fetch(\`\${API_BASE}/api/profiles/\${profileId}/playwright\`);
  const opts = await res.json();

  console.log(\`🦊 [\${opts.name}] Iniciando...\`);
  const browser = await Camoufox({
    executable_path: opts.executable_path || undefined,
    user_data_dir: opts.user_data_dir,
    persistent_context: true,
    os: opts.os,
    proxy: opts.proxy || undefined,
    config: opts.config,
    firefox_user_prefs: opts.firefox_user_prefs,
    humanize: true,
    headless: false,
  });

  const page = browser.pages()[0] || await browser.newPage();
  await page.goto('https://bot.sannysoft.com');
  console.log(\`✅ [\${opts.name}] Concluído:\`, await page.title());
  await browser.close();
}

async function main() {
  const publicRes = await fetch(\`\${API_BASE}/api/profiles/public\`);
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
Aquecimento de Perfil & Coleta de Cookies com Camoufox Nativo
Com persistent_context=True, todas as sessões e cookies são salvos automaticamente no disco.
"""
import time
import requests
from camoufox.sync_api import Camoufox

API_BASE = "${baseUrl}"
PROFILE_ID = "seu_perfil_id_aqui"

# 1. Puxa as diretrizes do perfil
opts = requests.get(f"{API_BASE}/api/profiles/{PROFILE_ID}/playwright").json()

# 2. Inicia o navegador Camoufox nativo
with Camoufox(
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

    # Navega com fingerprint realista
    page.goto("https://mercadolivre.com.br")
    page.wait_for_load_state("networkidle")

    # Rolagem e interação humanizada (anti-detect)
    for _ in range(3):
        page.mouse.wheel(0, 300)
        time.sleep(1.2)

    cookies = browser.contexts[0].cookies() if browser.contexts else []
    print(f"🍪 Cookies na sessão ativa: {len(cookies)}")

# Ao sair do bloco 'with', o Camoufox grava e sincroniza tudo na pasta do perfil!
print("✅ Sessões e cookies persistidos automaticamente no Star Multlogin!")
`,
      node: `// Node.js: Aquecimento de Perfil & Persistência Nativa Camoufox
import { Camoufox } from '@camoufox/camoufox';

const API_BASE = '${baseUrl}';
const PROFILE_ID = 'seu_perfil_id_aqui';

async function warmUp() {
  const res = await fetch(\`\${API_BASE}/api/profiles/\${PROFILE_ID}/playwright\`);
  const opts = await res.json();

  const browser = await Camoufox({
    executable_path: opts.executable_path || undefined,
    user_data_dir: opts.user_data_dir,
    persistent_context: true,
    os: opts.os,
    proxy: opts.proxy || undefined,
    config: opts.config,
    firefox_user_prefs: opts.firefox_user_prefs,
    humanize: true,
    headless: false,
  });

  const page = browser.pages()[0] || await browser.newPage();
  await page.goto('https://mercadolivre.com.br', { waitUntil: 'networkidle' });
  await page.mouse.wheel(0, 400);

  // Fecha o navegador sincronizando cookies e armazenamento no disco
  await browser.close();
  console.log('✅ Cookies e dados da sessão salvos no diretório do perfil!');
}

warmUp();
`,
    },

    tag_dispatch: {
      python: `#!/usr/bin/env python3
"""
Seleção por Tags para Agentes de IA & Pipelines
Usa o endpoint público GET /api/profiles/public?tag=... que expõe apenas ID, Nome e Tags.
"""
import requests
from camoufox.sync_api import Camoufox

API_BASE = "${baseUrl}"
TAG_FILTRO = "aquecimento"

# 1. Agente consulta apenas perfis que possuem a tag desejada
res = requests.get(f"{API_BASE}/api/profiles/public", params={"tag": TAG_FILTRO})
perfis_alvo = res.json()

print(f"🎯 Perfis encontrados com a tag '{TAG_FILTRO}':", len(perfis_alvo))

for perfil in perfis_alvo:
    print(f"\\n🚀 Executando perfil: {perfil['name']} (ID: {perfil['id']}) [Tags: {perfil.get('tags', [])}]")
    
    # 2. Carrega configuração nativa para o perfil filtrado
    opts = requests.get(f"{API_BASE}/api/profiles/{perfil['id']}/playwright").json()
    
    with Camoufox(
        executable_path=opts.get("executable_path") or None,
        user_data_dir=opts["user_data_dir"],
        persistent_context=True,
        os=opts["os"],
        proxy=opts.get("proxy"),
        config=opts.get("config"),
        humanize=True,
        headless=False,
    ) as browser:
        page = browser.pages[0] if browser.pages else browser.new_page()
        page.goto("https://bot.sannysoft.com")
        print(f"✅ Concluído: {perfil['name']} - Título:", page.title())
`,
      node: `// Node.js: Seleção por Tags e Execução para Agentes de IA
import { Camoufox } from '@camoufox/camoufox';

const API_BASE = '${baseUrl}';
const TAG_FILTRO = 'aquecimento';

async function runTaggedAutomation() {
  // 1. Consulta pública por tags (zero vazamento de cofre ou credenciais)
  const res = await fetch(\`\${API_BASE}/api/profiles/public?tag=\${TAG_FILTRO}\`);
  const profiles = await res.json();

  console.log(\`🎯 Perfis com a tag '\${TAG_FILTRO}':\`, profiles.length);

  for (const p of profiles) {
    console.log(\`🚀 Executando \${p.name} (ID: \${p.id})...\`);
    const optsRes = await fetch(\`\${API_BASE}/api/profiles/\${p.id}/playwright\`);
    const opts = await optsRes.json();

    const browser = await Camoufox({
      executable_path: opts.executable_path || undefined,
      user_data_dir: opts.user_data_dir,
      persistent_context: true,
      os: opts.os,
      proxy: opts.proxy || undefined,
      config: opts.config,
      humanize: true,
      headless: false,
    });

    const page = browser.pages()[0] || await browser.newPage();
    await page.goto('https://bot.sannysoft.com');
    console.log(\`✅ [\${p.name}] Concluído:\`, await page.title());
    await browser.close();
  }
}

runTaggedAutomation();
`,
    },
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(recipeCodes[selectedRecipe][selectedLang]);
    setCopiedCode(true);
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
              Cookbook de Automação Playwright & Camoufox (Zero BiDi)
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Driver Nativo
              </span>
            </h3>
            <p className="text-[12px] text-[#B5B5B5] mt-0.5 max-w-2xl leading-relaxed">
              O Camoufox inicializa diretamente o perfil configurado no Star Multlogin com Juggler nativo, proxy residencial e camuflagem de hardware <strong>sem erros de BiDi ou portas CDP</strong>.
            </p>
          </div>
        </div>

        {/* Command Badge */}
        <div className="bg-[#0C0D12] border border-white/10 rounded-xl px-3.5 py-2 font-mono text-[11px] text-[#D8D8D8] shrink-0">
          <span className="text-[#A0A0A0] block text-[9px] uppercase font-bold font-sans">
            Instalação Recomendada:
          </span>
          <code>pip install camoufox requests</code>
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
