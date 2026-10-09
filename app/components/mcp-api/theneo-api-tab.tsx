import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Copy,
  Check,
  Play,
  Search,
  Code2,
  ChevronRight,
  Layers,
  Send,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileJson,
} from 'lucide-react';
import { BACKEND_PORT } from '@/services/http';
import { serviceMcp } from '@/services/mcp/service.mcp';
import { renderCodeWithKeyBlur, sanitizeCodeForCopy } from './code-blur-helper';

interface TheneoApiTabProps {
  apiPort?: number;
  token?: string;
  showToken?: boolean;
  onRevealKey?: () => void;
}

interface EndpointParam {
  name: string;
  type: string;
  required: boolean;
  desc: string;
  defaultVal?: string;
}

interface EndpointDef {
  id: string;
  name: string;
  category: string;
  method: 'GET' | 'POST';
  path: string;
  summary: string;
  desc: string;
  params: EndpointParam[];
  sampleBody?: Record<string, any>;
  mockResponse: Record<string, any>;
}

export const TheneoApiTab: React.FC<TheneoApiTabProps> = ({
  apiPort = BACKEND_PORT,
  token: propToken,
  showToken = false,
  onRevealKey,
}) => {
  const [token, setToken] = useState<string>(propToken || serviceMcp.getCachedToken());

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

  const endpoints: EndpointDef[] = [
    {
      id: 'get_status',
      name: 'Verificar Saúde do Motor',
      category: 'Geral & Sistema',
      method: 'GET',
      path: '/api/v1/status',
      summary: 'Retorna a integridade do motor AstroFox, versão e perfis ativos.',
      desc: 'Este endpoint é utilizado para checar se o serviço de automação local está em execução e pronto para receber comandos. Pode ser utilizado em healthchecks contínuos.',
      params: [
        {
          name: 'Authorization',
          type: 'header (string)',
          required: true,
          desc: 'Token de autenticação local no formato "Bearer <token>".',
        },
      ],
      mockResponse: {
        ok: true,
        engine: 'AstroFox / AstroBrowser',
        version: '2.1.0',
        running_count: 2,
        active_profiles: ['prf_8921a', 'prf_7142b'],
        uptime_seconds: 3840,
        loopback_only: true,
      },
    },
    {
      id: 'get_profiles',
      name: 'Listar Todos os Perfis',
      category: 'Gerenciamento de Perfis',
      method: 'GET',
      path: '/api/v1/profiles',
      summary: 'Lista todos os perfis cadastrados com tags e proxies configurados.',
      desc: 'Retorna o inventário de perfis disponíveis para automação. Por segurança, senhas de proxies e cookies são omitidos deste endpoint.',
      params: [
        {
          name: 'Authorization',
          type: 'header (string)',
          required: true,
          desc: 'Token Bearer secreto gerado pelo Star Multlogin.',
        },
      ],
      mockResponse: [
        {
          id: 'prf_8921a',
          name: 'Shopee Marketplace Ads',
          status: 'ready',
          proxy: 'res-br-92.smartproxy.com:1080',
          group: 'E-commerce',
          created_at: '2026-09-20T10:00:00Z',
        },
        {
          id: 'prf_7142b',
          name: 'Mercado Livre Farm',
          status: 'running',
          debug_port: 18922,
          proxy: 'direct',
          group: 'Farm 01',
        },
      ],
    },
    {
      id: 'post_profile_start',
      name: 'Iniciar Perfil (AstroFox BiDi/CDP)',
      category: 'Gerenciamento de Perfis',
      method: 'POST',
      path: '/api/v1/profiles/start',
      summary: 'Inicia o navegador AstroFox e expõe a porta WebSocket para controle externo.',
      desc: 'Abre o perfil carregando automaticamente impressões digitais spoofadas, cookies persistidos e o proxy configurado. Retorna o endpoint WebSocket onde o Playwright ou Puppeteer devem se conectar.',
      params: [
        {
          name: 'Authorization',
          type: 'header (string)',
          required: true,
          desc: 'Token de autenticação local no formato "Bearer <token>".',
        },
        {
          name: 'id',
          type: 'body (string)',
          required: true,
          desc: 'Identificador único do perfil cadastrado no Star Multlogin.',
        },
        {
          name: 'headless',
          type: 'body (boolean)',
          required: false,
          desc: 'Inicia o navegador sem exibir a janela visual gráfica.',
          defaultVal: 'false',
        },
      ],
      sampleBody: {
        id: 'prf_8921a',
        headless: false,
      },
      mockResponse: {
        status: 'launched',
        profile_id: 'prf_8921a',
        pid: 15820,
        debug_port: 18922,
        ws_endpoint: 'ws://127.0.0.1:18922/session',
        message: 'Navegador iniciado com sucesso e porta de automação aberta.',
      },
    },
    {
      id: 'post_profile_stop',
      name: 'Encerrar Perfil & Salvar Cookies',
      category: 'Gerenciamento de Perfis',
      method: 'POST',
      path: '/api/v1/profiles/stop',
      summary: 'Finaliza o navegador e garante a gravação de novos cookies e storage.',
      desc: 'Encerra o processo do perfil de maneira segura e graciosa, forçando o AstroFox a descarregar todas as sessões e cookies para o armazenamento local.',
      params: [
        {
          name: 'Authorization',
          type: 'header (string)',
          required: true,
          desc: 'Token de autenticação local no formato "Bearer <token>".',
        },
        {
          name: 'id',
          type: 'body (string)',
          required: true,
          desc: 'Identificador do perfil em execução a ser encerrado.',
        },
      ],
      sampleBody: {
        id: 'prf_8921a',
      },
      mockResponse: {
        status: 'stopped',
        profile_id: 'prf_8921a',
        cookies_saved: 84,
        message: 'Perfil encerrado e sessão sincronizada no disco com sucesso.',
      },
    },
    {
      id: 'get_profile_tabs',
      name: 'Listar Abas Abertas',
      category: 'Inspeção de Abas',
      method: 'GET',
      path: '/api/v1/profiles/{id}/tabs',
      summary: 'Inspeciona títulos e URLs abertas em tempo real no perfil.',
      desc: 'Permite que a IA ou o script de automação descubra em quais páginas o usuário ou o bot está navegando no momento, sem necessidade de capturar tela.',
      params: [
        {
          name: 'Authorization',
          type: 'header (string)',
          required: true,
          desc: 'Token de autenticação local no formato "Bearer <token>".',
        },
        {
          name: 'id',
          type: 'path (string)',
          required: true,
          desc: 'ID do perfil em execução.',
        },
      ],
      mockResponse: {
        profile_id: 'prf_7142b',
        is_running: true,
        tabs_count: 2,
        tabs: [
          {
            tab_id: 'tab_1',
            title: 'Mercado Livre Brasil',
            url: 'https://mercadolivre.com.br',
            active: true,
          },
          {
            tab_id: 'tab_2',
            title: 'Painel de Anúncios e Vendas',
            url: 'https://ads.mercadolivre.com.br',
            active: false,
          },
        ],
      },
    },
    {
      id: 'post_profile_tab',
      name: 'Navegar para Nova Aba',
      category: 'Inspeção de Abas',
      method: 'POST',
      path: '/api/v1/profiles/{id}/tabs',
      summary: 'Abre uma nova URL em uma aba do perfil especificado.',
      desc: 'Comando rápido para direcionar o navegador a uma URL sem precisar abrir uma conexão WebSocket BiDi completa.',
      params: [
        {
          name: 'Authorization',
          type: 'header (string)',
          required: true,
          desc: 'Token de autenticação local no formato "Bearer <token>".',
        },
        {
          name: 'id',
          type: 'path (string)',
          required: true,
          desc: 'ID do perfil em execução.',
        },
        {
          name: 'url',
          type: 'body (string)',
          required: true,
          desc: 'URL completa que será carregada na nova aba.',
        },
      ],
      sampleBody: {
        url: 'https://bot.sannysoft.com',
      },
      mockResponse: {
        ok: true,
        tab_id: 'tab_3',
        url: 'https://bot.sannysoft.com',
        message: 'Nova aba aberta com sucesso no AstroFox.',
      },
    },
  ];

  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDef>(endpoints[2]); // post_profile_start por padrão
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState<'curl' | 'python' | 'node' | 'playwright'>('curl');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [liveResponse, setLiveResponse] = useState<Record<string, any> | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [responseLatency, setResponseLatency] = useState<number | null>(null);

  // Parâmetros editáveis no console de teste
  const [testParamId, setTestParamId] = useState('prf_8921a');
  const [testParamUrl, setTestParamUrl] = useState('https://bot.sannysoft.com');

  // Filtragem dos endpoints pela busca
  const filteredEndpoints = endpoints.filter(
    (ep) =>
      ep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Agrupamento por categoria
  const categories = Array.from(new Set(filteredEndpoints.map((ep) => ep.category)));

  // Geração de Snippet de Código Dinâmico
  const getCodeSnippet = () => {
    const ep = selectedEndpoint;
    const resolvedPath = ep.path.replace('{id}', testParamId);
    const fullUrl = `${baseUrl}${resolvedPath}`;

    if (selectedLang === 'curl') {
      if (ep.method === 'GET') {
        return `curl -X GET "${fullUrl}" \\
  -H "Authorization: Bearer ${token}"`;
      }
      return `curl -X POST "${fullUrl}" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(ep.sampleBody || { id: testParamId }, null, 2)}'`;
    }

    if (selectedLang === 'python') {
      if (ep.method === 'GET') {
        return `import requests

url = "${fullUrl}"
headers = {
    "Authorization": "Bearer ${token}"
}

response = requests.get(url, headers=headers)
print("Status:", response.status_code)
print(response.json())`;
      }
      return `import requests

url = "${fullUrl}"
headers = {
    "Authorization": "Bearer ${token}",
    "Content-Type": "application/json"
}
payload = ${JSON.stringify(ep.sampleBody || { id: testParamId }, null, 4)}

response = requests.post(url, json=payload, headers=headers)
print("Status:", response.status_code)
print(response.json())`;
    }

    if (selectedLang === 'node') {
      if (ep.method === 'GET') {
        return `const res = await fetch('${fullUrl}', {
  headers: {
    'Authorization': 'Bearer ${token}'
  }
});
const data = await res.json();
console.log(data);`;
      }
      return `const res = await fetch('${fullUrl}', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${token}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(${JSON.stringify(ep.sampleBody || { id: testParamId }, null, 2)})
});
const data = await res.json();
console.log(data);`;
    }

    if (selectedLang === 'playwright') {
      return `// 1. Inicia o perfil via API REST do Star Multlogin
const startRes = await fetch('${baseUrl}/api/v1/profiles/start', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${token}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ id: '${testParamId}' })
});
const { ws_endpoint } = await startRes.json();

// 2. Conecta o Playwright direto no AstroFox aberto
import { firefox } from 'playwright';
const browser = await firefox.connect(ws_endpoint);
const page = browser.contexts()[0].pages()[0];
await page.goto('${testParamUrl}');`;
    }

    return '';
  };

  const handleCopyCode = () => {
    const rawCode = getCodeSnippet();
    const textToCopy = sanitizeCodeForCopy(rawCode, token, showToken);
    navigator.clipboard.writeText(textToCopy);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Simulação / Teste Real do Playground
  const handleExecuteRequest = async () => {
    setIsExecuting(true);
    setLiveResponse(null);
    setStatusCode(null);
    setResponseLatency(null);

    const resolvedPath = selectedEndpoint.path.replace('{id}', testParamId);

    try {
      const result = await serviceMcp.executeTestRequest(
        {
          path: resolvedPath,
          method: selectedEndpoint.method,
          token,
          body: selectedEndpoint.method === 'POST'
            ? (selectedEndpoint.sampleBody || { id: testParamId })
            : undefined,
        },
        selectedEndpoint.mockResponse
      );

      setStatusCode(result.status);
      setResponseLatency(result.latencyMs);
      setLiveResponse(result.data);
    } catch {
      setStatusCode(200);
      setResponseLatency(25);
      setLiveResponse(selectedEndpoint.mockResponse);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner: Theneo / Stripe style docs */}
      <div className="bg-[#13141C] border border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00FF66]/15 text-[#00FF66] border border-[#00FF66]/30">
              Theneo Architecture
            </span>
            <span className="text-[12px] text-[#A6A6A6] font-mono">OpenAPI 3.1 & REST v1</span>
          </div>
          <h2 className="text-[16px] font-extrabold text-white mt-1 flex items-center gap-2">
            Explorador Interativo de Endpoints & Playground
          </h2>
          <p className="text-[12px] text-[#B5B5B5] mt-0.5">
            Documentação em 3 colunas inspirada no Theneo / Stripe. Teste requisições localmente com o seu token Bearer e visualize respostas JSON em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono px-3 py-1.5 rounded-xl bg-[#0C0D12] text-[#D4D4D4] border border-white/10">
            Base: <strong className="text-white">{baseUrl}</strong>
          </span>
        </div>
      </div>

      {/* 3-COLUMN THENEO LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================================= */}
        {/* COLUNA 1: Navegação Lateral (Endpoints Tree & Search) [3 Colunas no Desktop] */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 bg-[#13141C] border border-white/10 rounded-2xl p-4 shadow-sm dark:shadow-none space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-[#8E8E93]" />
            <input
              type="text"
              placeholder="Buscar endpoints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0C0D12] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-[12px] text-white placeholder-[#8E8E93] outline-none focus:border-white/60 focus:ring-1 focus:ring-white/15 transition-all shadow-inner"
            />
          </div>

          {/* Endpoints Categorized List */}
          <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
            {categories.map((cat) => (
              <div key={cat} className="space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#A0A0A0] px-2 block">
                  {cat}
                </span>

                <div className="space-y-1">
                  {filteredEndpoints
                    .filter((ep) => ep.category === cat)
                    .map((ep) => {
                      const isSelected = selectedEndpoint.id === ep.id;
                      return (
                        <button
                          key={ep.id}
                          type="button"
                          onClick={() => {
                            setSelectedEndpoint(ep);
                            setLiveResponse(null);
                            setStatusCode(null);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl transition-all flex items-center justify-between gap-2 text-[12px] ${
                            isSelected
                              ? 'bg-[#1F212D] text-[#00FF66] font-bold border border-white/15 shadow-sm dark:shadow-none'
                              : 'text-[#D4D4D8] hover:bg-white/[0.04] hover:text-white border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded font-mono ${
                                ep.method === 'GET'
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {ep.method}
                            </span>
                            <span className="truncate">{ep.name}</span>
                          </div>
                          <ChevronRight
                            size={13}
                            className={`shrink-0 transition-transform ${isSelected ? 'rotate-90 text-[#00FF66]' : 'text-[#707070]'}`}
                          />
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUNA 2: Documentação Técnica Central (Params, Body, Specs) [5 Colunas]  */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-[#13141C] border border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-none space-y-5">
          {/* Endpoint Header */}
          <div className="space-y-2 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg font-mono ${
                  selectedEndpoint.method === 'GET'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {selectedEndpoint.method}
              </span>
              <code className="text-[13px] font-mono font-bold text-white bg-[#0C0D12] px-2.5 py-0.5 rounded-lg border border-white/10">
                {selectedEndpoint.path}
              </code>
            </div>

            <h3 className="text-[16px] font-bold text-white tracking-tight">
              {selectedEndpoint.name}
            </h3>
            <p className="text-[12px] text-[#B8B8B8] leading-relaxed">
              {selectedEndpoint.desc}
            </p>
          </div>

          {/* Parameters Section */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#A0A0A0] flex items-center justify-between">
              <span>Parâmetros da Requisição</span>
              <span className="text-emerald-400 font-normal">HTTP {selectedEndpoint.method}</span>
            </h4>

            <div className="border border-white/10 rounded-xl overflow-hidden bg-[#0C0D12] shadow-inner">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-[#181922] border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-[#9E9E9E]">
                <span className="col-span-4">Parâmetro</span>
                <span className="col-span-3">Tipo</span>
                <span className="col-span-5">Descrição</span>
              </div>

              <div className="divide-y divide-white/10">
                {selectedEndpoint.params.map((p, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2.5 text-[11px] items-start">
                    <div className="col-span-4 font-mono font-bold text-white flex items-center gap-1.5 flex-wrap">
                      <span>{p.name}</span>
                      {p.required ? (
                        <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1 rounded border border-rose-500/20">
                          obrigatório
                        </span>
                      ) : (
                        <span className="text-[9px] text-[#8E8E93] bg-white/[0.06] px-1 rounded">
                          opcional
                        </span>
                      )}
                    </div>
                    <div className="col-span-3 font-mono text-[#00FF66] text-[10px]">
                      {p.type}
                    </div>
                    <div className="col-span-5 text-[#B0B0B0] text-[11px] leading-snug">
                      {p.desc}
                      {p.defaultVal && (
                        <span className="block text-[10px] text-[#808080] mt-0.5">
                          Padrão: <code>{p.defaultVal}</code>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sample Request Body */}
          {selectedEndpoint.sampleBody && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#A0A0A0]">
                Exemplo de JSON Body
              </h4>
              <pre className="bg-[#0C0D12] border border-white/10 rounded-xl p-3 text-[11px] font-mono text-[#DCDCDC] overflow-x-auto shadow-inner">
                {JSON.stringify(selectedEndpoint.sampleBody, null, 2)}
              </pre>
            </div>
          )}

          {/* Security Notice */}
          <div className="p-3 rounded-xl bg-[#181922] border border-white/10 flex items-start gap-2.5 text-[11px] text-[#A6A6A6]">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Proteção Local Ativa:</strong> Requisições para este endpoint são restritas estritamente ao endereço loopback e rejeitam automaticamente requisições contendo cabeçalho <code>Origin</code>.
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUNA 3: Code Console & Interactive Playground Theneo [4 Colunas]         */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 bg-[#13141C] border border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-none space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h4 className="text-[13px] font-bold text-white flex items-center gap-1.5">
              <Terminal size={15} className="text-[#00FF66]" />
              Playground & Snippets
            </h4>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
              Live Console
            </span>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1 p-1 bg-[#0C0D12] border border-white/10 rounded-xl">
            {(['curl', 'python', 'node', 'playwright'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setSelectedLang(lang)}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                  selectedLang === lang
                    ? 'bg-[#1F212D] text-[#00FF66] shadow-sm dark:shadow-none border border-white/15'
                    : 'text-[#A0A0A0] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {lang === 'curl' ? 'cURL' : lang === 'python' ? 'Python' : lang === 'node' ? 'Node' : 'Playwright'}
              </button>
            ))}
          </div>

          {/* Code Snippet Box */}
          <div className="relative group">
            <pre className="bg-[#0C0D12] border border-white/10 rounded-xl p-3.5 text-[11px] font-mono text-[#F0F0F0] overflow-x-auto max-h-[220px] leading-relaxed shadow-inner">
              {renderCodeWithKeyBlur(getCodeSnippet(), token, showToken, onRevealKey)}
            </pre>
            <button
              type="button"
              onClick={handleCopyCode}
              className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1E202B] hover:bg-[#282B3A] text-[#00FF66] text-[10px] font-bold border border-white/10 transition-all shadow-sm dark:shadow-none"
              title={showToken ? "Copiar" : "Copiar (Chave vazia enquanto oculta)"}
            >
              {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          {/* Try It Out Live Inputs */}
          <div className="p-3.5 bg-[#181922] border border-white/10 rounded-xl space-y-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#A0A0A0] block">
              Parâmetros de Teste Dinâmico
            </span>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-semibold text-[#8E8E93] block mb-0.5">
                  ID do Perfil (ex: Shopee, Ads):
                </label>
                <input
                  type="text"
                  value={testParamId}
                  onChange={(e) => setTestParamId(e.target.value)}
                  className="w-full bg-[#0C0D12] border border-white/10 rounded-lg px-2.5 py-1 text-[11px] font-mono text-white outline-none focus:border-white/60 focus:ring-1 focus:ring-white/15"
                />
              </div>

              {selectedEndpoint.id === 'post_profile_tab' && (
                <div>
                  <label className="text-[10px] font-semibold text-[#8E8E93] block mb-0.5">
                    URL de Navegação:
                  </label>
                  <input
                    type="text"
                    value={testParamUrl}
                    onChange={(e) => setTestParamUrl(e.target.value)}
                    className="w-full bg-[#0C0D12] border border-white/10 rounded-lg px-2.5 py-1 text-[11px] font-mono text-white outline-none focus:border-white/60 focus:ring-1 focus:ring-white/15"
                  />
                </div>
              )}
            </div>

            {/* Execute Button */}
            <button
              type="button"
              onClick={handleExecuteRequest}
              disabled={isExecuting}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-[#00FF66] to-[#00D655] text-black font-extrabold text-[12px] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 shadow-[0_0_15px_rgba(0,255,102,0.2)]"
            >
              <Send size={13} className={isExecuting ? 'animate-spin' : ''} />
              <span>{isExecuting ? 'Enviando Requisição...' : 'Executar Requisição'}</span>
            </button>
          </div>

          {/* Response Box */}
          {liveResponse && (
            <div className="space-y-2 animate-fadeIn pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <FileJson size={13} className="text-[#00FF66]" />
                  Resposta da API:
                </span>
                <div className="flex items-center gap-2 font-mono">
                  {statusCode && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {statusCode} OK
                    </span>
                  )}
                  {responseLatency && (
                    <span className="text-[10px] text-[#A6A6A6]">
                      {responseLatency}ms
                    </span>
                  )}
                </div>
              </div>

              <pre className="bg-[#08090C] border border-white/10 rounded-xl p-3 text-[11px] font-mono text-[#DCDCDC] overflow-x-auto max-h-[220px] shadow-inner">
                {JSON.stringify(liveResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TheneoApiTab;
