import React, { useState } from 'react';
import {
  Copy,
  Check,
  ChevronDown,
  Maximize2,
  Minimize2,
  X,
  Play,
  Send,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { toast } from '@/components/ui/notification';
import { BACKEND_PORT, http } from '@/services/http';

interface ApiTabProps {
  apiPort?: number;
  token?: string;
}

type SupportedLang = 'curl' | 'ruby' | 'python' | 'php' | 'java' | 'node' | 'go' | 'dotnet';

interface EndpointItem {
  id: string;
  name: string;
  method: 'GET' | 'POST';
  path: string;
  desc: string;
  sampleBody?: Record<string, any>;
  mockResponse: Record<string, any>;
}

export const ApiTab: React.FC<ApiTabProps> = ({
  apiPort = BACKEND_PORT,
  token: initialToken,
}) => {
  const [token, setToken] = useState(initialToken || localStorage.getItem('star_mcp_token') || 'star_sec_loading');

  React.useEffect(() => {
    if (!initialToken || initialToken.includes('8f92a10b48c34791')) {
      http.get<{ token: string }>('/mcp/info')
        .then((res) => {
          if (res?.token) {
            setToken(res.token);
            localStorage.setItem('star_mcp_token', res.token);
          }
        })
        .catch(() => {});
    }
  }, [initialToken]);

  const baseUrl = `http://127.0.0.1:${apiPort}`;
  const sandboxUrl = `http://127.0.0.1:${apiPort}/api-sandbox`;

  const endpoints: EndpointItem[] = [
    {
      id: 'start_profile',
      name: 'Iniciar Perfil (AstroFox)',
      method: 'POST',
      path: '/api/v1/profiles/start',
      desc: 'Inicia o perfil com cookies, proxy e camuflagem de hardware, expondo a porta WebSocket para controle do Playwright/Puppeteer.',
      sampleBody: {
        id: 'prf_shopee_01',
        headless: false,
      },
      mockResponse: {
        status: 'launched',
        profile_id: 'prf_shopee_01',
        pid: 15820,
        debug_port: 18922,
        ws_endpoint: 'ws://127.0.0.1:18922/session',
      },
    },
    {
      id: 'stop_profile',
      name: 'Encerrar Perfil & Salvar',
      method: 'POST',
      path: '/api/v1/profiles/stop',
      desc: 'Encerra o processo do navegador de forma graciosa e salva novos cookies/storage no banco local.',
      sampleBody: {
        id: 'prf_shopee_01',
      },
      mockResponse: {
        status: 'stopped',
        profile_id: 'prf_shopee_01',
        cookies_saved: 42,
        message: 'Perfil encerrado e cookies sincronizados com sucesso.',
      },
    },
    {
      id: 'list_profiles',
      name: 'Listar Todos os Perfis',
      method: 'GET',
      path: '/api/v1/profiles',
      desc: 'Lista todos os perfis cadastrados com tags, proxies associados e status.',
      mockResponse: [
        { id: 'prf_shopee_01', name: 'Shopee Ads', status: 'ready', proxy: 'res-br:1080' },
        { id: 'prf_ml_02', name: 'Mercado Livre Farm', status: 'running', debug_port: 18922 },
      ],
    },
    {
      id: 'get_status',
      name: 'Verificar Saúde do Motor',
      method: 'GET',
      path: '/api/v1/status',
      desc: 'Verifica a integridade do motor AstroFox e quantos perfis estão abertos no momento.',
      mockResponse: {
        ok: true,
        engine: 'camoufox',
        version: '2.1.0',
        running_count: 1,
        loopback_only: true,
      },
    },
    {
      id: 'tabs_inspect',
      name: 'Inspecionar Abas do Perfil',
      method: 'GET',
      path: '/api/v1/profiles/{id}/tabs',
      desc: 'Lê títulos e URLs das abas abertas no perfil em tempo real via BiDi.',
      mockResponse: {
        tabs: [
          { id: 'tab_1', title: 'Mercado Livre', url: 'https://mercadolivre.com.br' },
          { id: 'tab_2', title: 'Painel de Vendas', url: 'https://ads.mercadolivre.com.br' },
        ],
      },
    },
  ];

  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointItem>(endpoints[0]);
  const [selectedLang, setSelectedLang] = useState<SupportedLang>('curl');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modal / Drawer "Try in API Explorer"
  const [showExplorer, setShowExplorer] = useState(false);
  const [testParamId, setTestParamId] = useState('prf_shopee_01');
  const [isExecuting, setIsExecuting] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);

  // Idiomas da Language Box (Idêntico ao print)
  const languages: { id: SupportedLang; name: string; icon: React.ReactNode }[] = [
    {
      id: 'curl',
      name: 'cURL',
      icon: (
        <span className="font-mono font-black text-[13px] tracking-tight text-white px-0.5">
          curl://
        </span>
      ),
    },
    {
      id: 'ruby',
      name: 'Ruby',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#E0115F">
          <path d="M12 2L3 9l9 13 9-13-9-7zm0 2.8L18.4 9H5.6L12 4.8zM5.1 10.5h4.6l-3 7.8-1.6-7.8zm6.1 0h1.6l-0.8 8.6-0.8-8.6zm3.1 0h4.6l-1.6 7.8-3-7.8z" />
        </svg>
      ),
    },
    {
      id: 'python',
      name: 'Python',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#3776AB"
            d="M11.9 2c-3.1 0-4.9 1.4-4.9 3.2v2.4h5v.8H5.2c-1.8 0-3.2 1.4-3.2 3.6 0 2.4 1.4 3.7 3.2 3.7h1.4v-1.9c0-2 1.7-3.7 3.7-3.7h5V7.6c0-2-1.9-3.6-4.9-3.6h1.5zm-1.8 1.6c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9z"
          />
          <path
            fill="#FFD438"
            d="M12.1 22c3.1 0 4.9-1.4 4.9-3.2v-2.4h-5v-.8h6.8c1.8 0 3.2-1.4 3.2-3.6 0-2.4-1.4-3.7-3.2-3.7h-1.4v1.9c0 2-1.7 3.7-3.7 3.7h-5v2.5c0 2 1.9 3.6 4.9 3.6h-1.5zm1.8-1.6c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9z"
          />
        </svg>
      ),
    },
    {
      id: 'php',
      name: 'PHP',
      icon: (
        <svg className="w-6 h-5" viewBox="0 0 24 24" fill="#777BB4">
          <path d="M7.8 7.5H4.2l-1.4 9h2.2l.5-3.3h2.3c2.4 0 3.8-1.5 4.3-4.5.3-2-0.8-3.2-2.3-3.2zm-.8 4H5.9l.4-2.5h1.2c.9 0 1.5.4 1.3 1.5-.2 1-.7 1-1.8 1zm8.7-4h-3.6l-1.4 9h2.2l.5-3.3h2.3c2.4 0 3.8-1.5 4.3-4.5.3-2-0.8-3.2-2.3-3.2zm-.8 4h-1.1l.4-2.5h1.2c.9 0 1.5.4 1.3 1.5-.2 1-.7 1-1.8 1z" />
        </svg>
      ),
    },
    {
      id: 'java',
      name: 'Java',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#5382A1"
            d="M9.1 19.3c3.2.2 6.5-.4 8.7-1.7-2.3.8-5.3 1-8.7 1.7zm9.4-4.8c1.2-1.1 1.7-2.4 1.2-3.2-.5-.8-1.9-.9-3.4-.4.8.4 1.6 1.4 1.1 2.3-.3.7-1.1 1.1-1.9 1.3 1.5-.2 2.6-.7 3-1.2z"
          />
          <path
            fill="#E76F00"
            d="M11.8 2.5c.8 1.3.4 2.8-.7 4.1 1.4-.9 2.4-2.2 2-3.4-.4-1.2-1.3-1.1-1.3-.7zm-1.9 4.3c.7 1.1.2 2.3-.7 3.3 1.1-.7 2-1.8 1.6-2.7-.4-.9-.9-.9-.9-.6zm3.5 11.5c-4.4.4-8.8-.4-11.4-2.3 2.9 1.4 7.2 2 11.4 1.6 3.6-.3 6.9-1.5 8.9-3.2-2.4 2.1-5.7 3.5-8.9 3.9z"
          />
        </svg>
      ),
    },
    {
      id: 'node',
      name: 'Node.js',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#339933">
          <path d="M12 2l9 5.2v10.4L12 23l-9-5.4V7.2L12 2zm0 2.3L4.9 8.4v7.2L12 19.7l7.1-4.1V8.4L12 4.3z" />
        </svg>
      ),
    },
    {
      id: 'go',
      name: 'Go',
      icon: (
        <svg className="w-6 h-5" viewBox="0 0 24 24" fill="#00ADD8">
          <path d="M1.8 10.5c.3-.8.7-1.5 1.3-2.1 1-1 2.3-1.6 3.8-1.6 2.3 0 4 1.4 4.5 3.5H9.1c-.4-1.2-1.3-1.9-2.3-1.9-1.5 0-2.6 1.2-2.6 3.1s1.1 3.1 2.6 3.1c1.2 0 2.1-.7 2.4-1.8H6.5V11h4.9v4.2c-.8 1.1-2.4 2-4.5 2-3 0-5.1-2-5.1-4.7v-2zM15 14.6c0 1.6 1.3 2.6 3 2.6s3-1 3-2.6-1.3-2.6-3-2.6-3 1-3 2.6zm-1.8 0c0-2.6 2.1-4.4 4.8-4.4s4.8 1.8 4.8 4.4-2.1 4.4-4.8 4.4-4.8-1.8-4.8-4.4z" />
        </svg>
      ),
    },
    {
      id: 'dotnet',
      name: '.NET',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#512BD4">
          <path d="M3.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm4.5-5.5h2.5l5.5 8V6.5H18v11h-2.5l-5.5-8v8H8v-11z" />
        </svg>
      ),
    },
  ];

  // Geração do Código com quebra de linhas para numeração
  const getSnippetLines = (): string[] => {
    const ep = selectedEndpoint;
    const resolvedPath = ep.path.replace('{id}', testParamId);
    const fullUrl = `${baseUrl}${resolvedPath}`;

    if (selectedLang === 'curl') {
      if (ep.method === 'GET') {
        return [
          `curl --location '${fullUrl}' \\`,
          `--header 'Authorization: Bearer ${token}' \\`,
          `--header 'Accept: application/json'`,
        ];
      }
      return [
        `curl --location '${fullUrl}' \\`,
        `--header 'Authorization: Bearer' \\`,
        `--header 'Accept: application/json' \\`,
        `--header 'Content-Type: application/json' \\`,
        `--data '{`,
        `  "id": "${testParamId}",`,
        `  "headless": false`,
        `}'`,
      ];
    }

    if (selectedLang === 'python') {
      if (ep.method === 'GET') {
        return [
          `import requests`,
          ``,
          `url = '${fullUrl}'`,
          `headers = { 'Authorization': 'Bearer ${token}' }`,
          `response = requests.get(url, headers=headers)`,
          `print(response.json())`,
        ];
      }
      return [
        `import requests`,
        ``,
        `url = '${fullUrl}'`,
        `headers = {`,
        `  'Authorization': 'Bearer ${token}',`,
        `  'Content-Type': 'application/json'`,
        `}`,
        `payload = { 'id': '${testParamId}', 'headless': False }`,
        `response = requests.post(url, json=payload, headers=headers)`,
        `print(response.json())`,
      ];
    }

    if (selectedLang === 'node') {
      if (ep.method === 'GET') {
        return [
          `const res = await fetch('${fullUrl}', {`,
          `  headers: { 'Authorization': 'Bearer ${token}' }`,
          `});`,
          `const data = await res.json();`,
          `console.log(data);`,
        ];
      }
      return [
        `const res = await fetch('${fullUrl}', {`,
        `  method: 'POST',`,
        `  headers: {`,
        `    'Authorization': 'Bearer ${token}',`,
        `    'Content-Type': 'application/json'`,
        `  },`,
        `  body: JSON.stringify({ id: '${testParamId}', headless: false })`,
        `});`,
        `console.log(await res.json());`,
      ];
    }

    if (selectedLang === 'ruby') {
      return [
        `require 'net/http'`,
        `require 'uri'`,
        `require 'json'`,
        ``,
        `uri = URI.parse('${fullUrl}')`,
        `request = Net::HTTP::Post.new(uri)`,
        `request['Authorization'] = 'Bearer ${token}'`,
        `request['Content-Type'] = 'application/json'`,
        `request.body = JSON.dump({ id: '${testParamId}' })`,
        `response = Net::HTTP.start(uri.hostname, uri.port) { |http| http.request(request) }`,
        `puts response.body`,
      ];
    }

    if (selectedLang === 'php') {
      return [
        `<?php`,
        `$curl = curl_init();`,
        `curl_setopt_array($curl, array(`,
        `  CURLOPT_URL => '${fullUrl}',`,
        `  CURLOPT_RETURNTRANSFER => true,`,
        `  CURLOPT_CUSTOMREQUEST => '${ep.method}',`,
        `  CURLOPT_HTTPHEADER => array('Authorization: Bearer ${token}'),`,
        `));`,
        `$response = curl_exec($curl);`,
        `curl_close($curl);`,
        `echo $response;`,
      ];
    }

    if (selectedLang === 'java') {
      return [
        `HttpRequest request = HttpRequest.newBuilder()`,
        `    .uri(URI.create("${fullUrl}"))`,
        `    .header("Authorization", "Bearer ${token}")`,
        `    .header("Content-Type", "application/json")`,
        `    .method("${ep.method}", HttpRequest.BodyPublishers.noBody())`,
        `    .build();`,
        `HttpResponse<String> response = HttpClient.newHttpClient()`,
        `    .send(request, HttpResponse.BodyHandlers.ofString());`,
      ];
    }

    if (selectedLang === 'go') {
      return [
        `package main`,
        `import ("fmt"; "net/http")`,
        `func main() {`,
        `  req, _ := http.NewRequest("${ep.method}", "${fullUrl}", nil)`,
        `  req.Header.Set("Authorization", "Bearer ${token}")`,
        `  resp, _ := http.DefaultClient.Do(req)`,
        `  fmt.Println(resp.Status)`,
        `}`,
      ];
    }

    if (selectedLang === 'dotnet') {
      return [
        `using var client = new HttpClient();`,
        `client.DefaultRequestHeaders.Add("Authorization", "Bearer ${token}");`,
        `var res = await client.GetAsync("${fullUrl}");`,
        `Console.WriteLine(await res.Content.ReadAsStringAsync());`,
      ];
    }

    return [];
  };

  const lines = getSnippetLines();
  const rawCode = lines.join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(rawCode);
    setCopied(true);
    toast.success('Snippet de código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteInExplorer = () => {
    setIsExecuting(true);
    setApiResponse(null);
    setTimeout(() => {
      setIsExecuting(false);
      setApiResponse(selectedEndpoint.mockResponse);
      toast.success('Requisição executada com sucesso (200 OK)!');
    }, 400);
  };

  return (
    <div className="bg-white dark:bg-[#13141C] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm shadow-slate-200/50 dark:shadow-[0_12px_40px_-5px_rgba(0,0,0,0.7)] flex flex-col md:flex-row min-h-[580px]">
      {/* PAINEL ESQUERDO: Lista de Endpoints para Navegação */}
      <div className="w-full md:w-[260px] bg-slate-50 dark:bg-[#101117] border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10 p-3.5 flex flex-col shrink-0 space-y-3">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-[#8E92A2] px-2 block">
          Catálogo de Rotas
        </span>

        <div className="space-y-1">
          {endpoints.map((ep) => {
            const isSelected = selectedEndpoint.id === ep.id;
            return (
              <button
                key={ep.id}
                type="button"
                onClick={() => {
                  setSelectedEndpoint(ep);
                  setApiResponse(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-[12px] font-medium transition-all flex items-center justify-between gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-[#1F212D] dark:text-[#00FF66] font-bold shadow-2xs border border-emerald-200 dark:border-white/15'
                    : 'text-slate-600 dark:text-[#C4C7D5] hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/[0.05] dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${
                      ep.method === 'GET'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="truncate">{ep.name}</span>
                </div>
                {isSelected && <ChevronRight size={13} className="text-emerald-600 dark:text-[#00FF66] shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* PAINEL DIREITO: IDÊNTICO À IMAGEM DO USUÁRIO (3 CARDS VERTICAIS) */}
      <div className="flex-1 p-5 md:p-6 flex flex-col space-y-5 overflow-y-auto bg-slate-50/50 dark:bg-[#151620]">
        {/* ========================================================================= */}
        {/* CARD 1: Base URL                                                          */}
        {/* ========================================================================= */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121319] shadow-sm">
          {/* Header Bar */}
          <div className="bg-slate-100 dark:bg-[#181922] px-5 py-3 border-b border-slate-200 dark:border-white/10">
            <h3 className="text-[13px] font-bold text-slate-900 dark:text-white tracking-wide">Base URL</h3>
          </div>

          {/* Body */}
          <div className="p-5 space-y-3.5 text-xs bg-white dark:bg-[#121319]">
            <div>
              <span className="text-slate-500 dark:text-[#8E92A2] font-medium block mb-1">Produção:</span>
              <span className="text-slate-800 dark:text-white font-mono text-[13px] select-all block">
                {baseUrl}
              </span>
            </div>

            <div>
              <span className="text-slate-500 dark:text-[#8E92A2] font-medium block mb-1">SandBox (Homolog):</span>
              <span className="text-slate-800 dark:text-white font-mono text-[13px] select-all block">
                {sandboxUrl}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 2: Language Box (Tabs com Ícones em Cima e Texto Embaixo)              */}
        {/* ========================================================================= */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121319] shadow-sm">
          {/* Header Bar */}
          <div className="bg-slate-100 dark:bg-[#181922] px-5 py-3 border-b border-slate-200 dark:border-white/10">
            <h3 className="text-[13px] font-bold text-slate-900 dark:text-white tracking-wide">Language Box</h3>
          </div>

          {/* Body: Horizontal Language Selector */}
          <div className="bg-white dark:bg-[#121319] px-4 pt-4 pb-0 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {languages.map((lang) => {
                const isSelected = selectedLang === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setSelectedLang(lang.id)}
                    className="flex flex-col items-center gap-1.5 pb-2.5 px-3 min-w-[62px] relative transition-all group cursor-pointer"
                  >
                    <div className="h-6 flex items-center justify-center transition-transform group-hover:scale-110">
                      {lang.icon}
                    </div>
                    <span
                      className={`text-[12px] font-medium transition-colors ${
                        isSelected ? 'text-blue-600 dark:text-white font-bold' : 'text-slate-500 dark:text-[#9E9E9E] group-hover:text-slate-900 dark:group-hover:text-white'
                      }`}
                    >
                      {lang.name}
                    </span>

                    {/* Active Underline Indicator (Azul exatamente como na imagem) */}
                    {isSelected && (
                      <span className="absolute bottom-0 left-1 right-1 h-[2.5px] bg-[#3b82f6] rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 3: Code Box com Linhas Numeradas e Botão 'Try in API Explorer'         */}
        {/* ========================================================================= */}
        <div className="rounded-2xl overflow-hidden border border-slate-800 dark:border-white/10 bg-slate-950 dark:bg-[#0C0D12] shadow-2xl relative">
          {/* Code Header Inside */}
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-800 dark:border-white/10 bg-slate-900/90 dark:bg-[#161722]/80">
            <div className="flex items-center gap-2.5 font-mono text-[13px]">
              <span className="text-emerald-400 dark:text-[#05c46b] font-bold tracking-wide">
                {selectedEndpoint.method}
              </span>
              <span className="text-white font-medium">{selectedEndpoint.path}</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Language Indicator Dropdown */}
              <div className="flex items-center gap-1 text-[#D4D4D8] font-mono text-xs cursor-pointer hover:text-white transition-colors">
                <span>{languages.find((l) => l.id === selectedLang)?.name || 'cURL'}</span>
                <ChevronDown size={14} className="text-[#8E8E93]" />
              </div>

              {/* Copy Button */}
              <button
                type="button"
                onClick={handleCopy}
                className="text-[#9E9E9E] hover:text-white p-1 transition-colors cursor-pointer"
                title="Copiar código"
              >
                {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-[#9E9E9E] hover:text-white p-1 transition-colors cursor-pointer"
                title={isFullscreen ? 'Restaurar' : 'Expandir'}
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            </div>
          </div>

          {/* Numbered Code Content */}
          <div className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed flex min-h-[220px]">
            {/* Line numbers gutter */}
            <div className="select-none text-slate-500 dark:text-[#555555] pr-4 text-right border-r border-slate-800 dark:border-white/10 mr-4 flex flex-col font-mono text-[12px]">
              {lines.map((_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>

            {/* Code Content */}
            <pre className="text-[#E0E0E0] flex-1 overflow-x-auto font-mono text-[12px]">
              {lines.map((line, idx) => {
                // Syntax highlighting simples simulando o visual do print
                let highlighted = line;
                const isComment = line.trim().startsWith('#') || line.trim().startsWith('//');
                const isKeyword =
                  line.includes('curl --location') ||
                  line.includes('--header') ||
                  line.includes('--data') ||
                  line.includes('import ') ||
                  line.includes('const ') ||
                  line.includes('require ');

                return (
                  <div
                    key={idx}
                    className={
                      isComment
                        ? 'text-slate-500 dark:text-[#666]'
                        : isKeyword
                          ? 'text-sky-400 dark:text-[#00e5ff]'
                          : line.includes(':')
                            ? 'text-[#D4D4D8]'
                            : 'text-[#E0E0E0]'
                    }
                  >
                    {line}
                  </div>
                );
              })}
            </pre>
          </div>

          {/* Bottom Right Floating Button: "Try in API Explorer" */}
          <div className="p-4 pt-1 flex justify-end">
            <button
              type="button"
              onClick={() => setShowExplorer(!showExplorer)}
              className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-[12px] font-bold px-4 py-2 rounded-xl border border-slate-700 dark:bg-[#181922] dark:hover:bg-[#202230] dark:border-white/10 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Try in API Explorer</span>
            </button>
          </div>
        </div>

        {/* EXPANSÃO DO "API EXPLORER" (Quando clica no botão Try in API Explorer) */}
        {showExplorer && (
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121319] p-5 shadow-xl shadow-slate-900/10 dark:shadow-[0_12px_40px_-5px_rgba(0,0,0,0.8)] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  {selectedEndpoint.method}
                </span>
                <span className="text-[13px] font-bold text-slate-900 dark:text-white font-mono">
                  {selectedEndpoint.path}
                </span>
              </div>
              <button
                onClick={() => setShowExplorer(false)}
                className="text-slate-400 hover:text-slate-700 dark:text-[#8E8E93] dark:hover:text-white p-1 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Parameter Input */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <label className="text-[11px] text-slate-600 dark:text-[#A6A6A6] block mb-1 font-medium">
                  ID do Perfil AstroFox:
                </label>
                <input
                  type="text"
                  value={testParamId}
                  onChange={(e) => setTestParamId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0C0D12] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-[12px] font-mono text-slate-900 dark:text-white outline-none focus:border-emerald-500 dark:focus:border-white/60 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/15"
                />
              </div>

              <div className="sm:self-end">
                <button
                  type="button"
                  onClick={handleExecuteInExplorer}
                  disabled={isExecuting}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-gradient-to-r dark:from-[#00FF66] dark:to-[#00D655] dark:text-black font-extrabold text-[12px] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Send size={13} className={isExecuting ? 'animate-spin' : ''} />
                  <span>{isExecuting ? 'Executando...' : 'Enviar Chamada'}</span>
                </button>
              </div>
            </div>

            {/* Live Response Box */}
            {apiResponse && (
              <div className="space-y-1.5 pt-2 animate-fadeIn">
                <div className="flex items-center justify-between text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 size={13} /> Status: 200 OK
                  </span>
                  <span className="text-slate-400 dark:text-[#8E8E93]">18ms</span>
                </div>
                <pre className="bg-slate-900 dark:bg-[#08090C] border border-slate-800 dark:border-white/10 rounded-xl p-3.5 text-[11px] font-mono text-slate-200 dark:text-[#DCDCDC] overflow-x-auto shadow-inner">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiTab;
