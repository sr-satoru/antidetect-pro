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
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { BACKEND_PORT } from '@/services/http';
import { serviceMcp } from '@/services/mcp/service.mcp';
import { Tooltip } from '@/components/ui/tooltip';
import { renderCodeWithKeyBlur, sanitizeCodeForCopy } from './code-blur-helper';

interface ApiTabProps {
  apiPort?: number;
  token?: string;
  showToken?: boolean;
  onRevealKey?: () => void;
}

type SupportedLang = 'curl' | 'ruby' | 'python' | 'php' | 'java' | 'node' | 'go' | 'dotnet';

interface EndpointItem {
  id: string;
  name: string;
  method: 'GET' | 'POST';
  path: string;
  desc: string;
  sampleBody?: Record<string, any>;
  mockResponse: Record<string, any> | Array<any>;
}

export const ApiTab: React.FC<ApiTabProps> = ({
  apiPort = BACKEND_PORT,
  token: initialToken,
  showToken = false,
  onRevealKey,
}) => {
  const [token, setToken] = useState(initialToken || serviceMcp.getCachedToken());

  React.useEffect(() => {
    if (!initialToken) {
      serviceMcp.getInfo()
        .then((res) => {
          if (res?.token) {
            setToken(res.token);
          }
        })
        .catch(() => {});
    } else {
      setToken(initialToken);
    }
  }, [initialToken]);

  const baseUrl = `http://127.0.0.1:${apiPort}`;
  const sandboxUrl = `http://127.0.0.1:${apiPort}/api-sandbox`;

  const endpoints: EndpointItem[] = [
    {
      id: 'get_public_profiles',
      name: '1. Puxar Perfil Público (Agentes)',
      method: 'GET',
      path: '/api/profiles/public',
      desc: 'Consulta minimalista de perfis por ?tag=, ?name= ou ?id=. Retorna estritamente { id, name, tags } sem expor credenciais, senhas de proxy ou cofre.',
      sampleBody: {
        tag: 'shopee',
      },
      mockResponse: [
        {
          id: 'prf_shopee_01',
          name: 'Shopee Ads',
          tags: ['shopee', 'aquecimento'],
        },
      ],
    },
    {
      id: 'post_public_profiles',
      name: '2. Busca Avançada de Perfil Público',
      method: 'POST',
      path: '/api/profiles/public',
      desc: 'Busca pública de perfis via payload JSON estrito { "tag": "...", "name": "...", "id": "..." } com retorno seguro.',
      sampleBody: {
        tag: 'shopee',
      },
      mockResponse: [
        {
          id: 'prf_shopee_01',
          name: 'Shopee Ads',
          tags: ['shopee', 'aquecimento'],
        },
      ],
    },
    {
      id: 'list_mcp_profiles',
      name: '3. Listar Perfis Operacionais (MCP)',
      method: 'GET',
      path: '/mcp/profiles',
      desc: 'Lista operacional completa para automações com status em tempo real (running / ready), kernel (AstroFox / AstroBrowser), tags e datas, com credenciais confidenciais ocultas.',
      mockResponse: [
        {
          id: 'prf_shopee_01',
          name: 'Shopee Ads',
          kernel: 'AstroFox',
          browser_version: '135',
          os: 'windows',
          group: 'E-commerce',
          tags: ['shopee'],
          status: 'ready',
          running: false,
          created_at: 1729000000,
          updated_at: 1729000000,
        },
      ],
    },
    {
      id: 'get_playwright_options',
      name: '4. Opções Nativas Playwright (Zero BiDi)',
      method: 'GET',
      path: '/api/profiles/{id}/playwright',
      desc: 'Retorna o manifesto de execução nativa com user_data_dir, executable_path, configs de hardware e prefs para execução direta sem conflitos de driver.',
      mockResponse: {
        profile_id: 'prf_shopee_01',
        name: 'Shopee Ads',
        os: 'windows',
        user_data_dir: '/dados/profiles/prf_shopee_01/profile',
        executable_path: '/binarios/astrofox/astrofox',
        config: {
          'navigator:oscpu': 'Windows NT 10.0; Win64; x64',
          fonts: ['Arial', 'Calibri'],
        },
        firefox_user_prefs: {
          'network.dns.disableIPv6': true,
        },
      },
    },
    {
      id: 'launch_profile',
      name: '5. Iniciar Perfil (Star Driver)',
      method: 'POST',
      path: '/mcp/profiles/{id}/launch',
      desc: 'Inicia o perfil no banco local expondo a porta de depuração CDP/WebSocket e camuflagem de hardware ativa.',
      sampleBody: {
        cdp: true,
        url: 'https://bot.sannysoft.com',
      },
      mockResponse: {
        status: 'launched',
        profile_id: 'prf_shopee_01',
        name: 'Shopee Ads',
        kernel: 'AstroFox',
        pid: 15820,
        debug_port: 18922,
        ws_endpoint: 'ws://127.0.0.1:18922/session',
        message: "Navegador 'Shopee Ads' (AstroFox) iniciado com sucesso no PID 15820.",
      },
    },
    {
      id: 'stop_profile',
      name: '6. Encerrar Perfil & Salvar Cookies',
      method: 'POST',
      path: '/mcp/profiles/{id}/stop',
      desc: 'Finaliza o processo do navegador e força a gravação e sincronização dos cookies e dados da sessão no cofre local.',
      sampleBody: {},
      mockResponse: {
        status: 'stopped',
        profile_id: 'prf_shopee_01',
        name: 'Shopee Ads',
        message: "Perfil 'Shopee Ads' finalizado com sucesso.",
      },
    },
    {
      id: 'get_status',
      name: '7. Verificar Saúde do Motor',
      method: 'GET',
      path: '/api/v1/status',
      desc: 'Healthcheck do serviço local, confirmando se o motor AstroFox / AstroBrowser está pronto e quantos perfis estão em execução.',
      mockResponse: {
        ok: true,
        status: 'ready',
        engine: 'AstroFox / AstroBrowser',
        version: '2.1.0',
        running_count: 0,
        loopback_only: true,
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
  const [executionStatus, setExecutionStatus] = useState<number | null>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);

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
      id: 'ruby',
      name: 'Ruby',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#E0115F">
          <path d="M12 2L3 9l9 13 9-13-9-7zm0 2.8L18.4 9H5.6L12 4.8zM5.1 10.5h4.6l-3 7.8-1.6-7.8zm6.1 0h1.6l-0.8 8.6-0.8-8.6zm3.1 0h4.6l-1.6 7.8-3-7.8z" />
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
    const payloadJson = JSON.stringify(ep.sampleBody || { id: testParamId }, null, 2);

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
        `--header 'Authorization: Bearer ${token}' \\`,
        `--header 'Accept: application/json' \\`,
        `--header 'Content-Type: application/json' \\`,
        `--data '${JSON.stringify(ep.sampleBody || { id: testParamId })}'`,
      ];
    }

    if (selectedLang === 'python') {
      if (ep.method === 'GET') {
        return [
          `import requests`,
          ``,
          `url = '${fullUrl}'`,
          `headers = {`,
          `    'Authorization': 'Bearer ${token}',`,
          `    'Accept': 'application/json'`,
          `}`,
          `response = requests.get(url, headers=headers)`,
          `print(response.json())`,
        ];
      }
      return [
        `import requests`,
        ``,
        `url = '${fullUrl}'`,
        `headers = {`,
        `    'Authorization': 'Bearer ${token}',`,
        `    'Content-Type': 'application/json'`,
        `}`,
        `payload = ${payloadJson.replace(/"/g, "'").replace(/true/g, 'True').replace(/false/g, 'False')}`,
        `response = requests.post(url, json=payload, headers=headers)`,
        `print(response.json())`,
      ];
    }

    if (selectedLang === 'node') {
      if (ep.method === 'GET') {
        return [
          `const res = await fetch('${fullUrl}', {`,
          `  headers: {`,
          `    'Authorization': 'Bearer ${token}',`,
          `    'Accept': 'application/json'`,
          `  }`,
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
        `  body: JSON.stringify(${payloadJson})`,
        `});`,
        `console.log(await res.json());`,
      ];
    }

    if (selectedLang === 'go') {
      if (ep.method === 'GET') {
        return [
          `package main`,
          `import ("fmt"; "net/http"; "io")`,
          `func main() {`,
          `  req, _ := http.NewRequest("GET", "${fullUrl}", nil)`,
          `  req.Header.Set("Authorization", "Bearer ${token}")`,
          `  req.Header.Set("Accept", "application/json")`,
          `  resp, _ := http.DefaultClient.Do(req)`,
          `  defer resp.Body.Close()`,
          `  body, _ := io.ReadAll(resp.Body)`,
          `  fmt.Println(string(body))`,
          `}`,
        ];
      }
      return [
        `package main`,
        `import ("fmt"; "net/http"; "strings"; "io")`,
        `func main() {`,
        `  payload := strings.NewReader(\`${payloadJson}\`)`,
        `  req, _ := http.NewRequest("POST", "${fullUrl}", payload)`,
        `  req.Header.Set("Authorization", "Bearer ${token}")`,
        `  req.Header.Set("Content-Type", "application/json")`,
        `  resp, _ := http.DefaultClient.Do(req)`,
        `  defer resp.Body.Close()`,
        `  body, _ := io.ReadAll(resp.Body)`,
        `  fmt.Println(string(body))`,
        `}`,
      ];
    }

    if (selectedLang === 'ruby') {
      return [
        `require 'net/http'`,
        `require 'uri'`,
        `require 'json'`,
        ``,
        `uri = URI.parse('${fullUrl}')`,
        `request = Net::HTTP::${ep.method === 'GET' ? 'Get' : 'Post'}.new(uri)`,
        `request['Authorization'] = 'Bearer ${token}'`,
        `request['Accept'] = 'application/json'`,
        ...(ep.method === 'POST' ? [
          `request['Content-Type'] = 'application/json'`,
          `request.body = JSON.dump(${payloadJson})`,
        ] : []),
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
        `  CURLOPT_HTTPHEADER => array(`,
        `    'Authorization: Bearer ${token}',`,
        `    'Accept: application/json',`,
        ...(ep.method === 'POST' ? [`    'Content-Type: application/json',`] : []),
        `  ),`,
        ...(ep.method === 'POST' ? [`  CURLOPT_POSTFIELDS => '${JSON.stringify(ep.sampleBody || { id: testParamId })}',`] : []),
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
        `    .header("Accept", "application/json")`,
        ...(ep.method === 'POST' ? [
          `    .header("Content-Type", "application/json")`,
          `    .method("POST", HttpRequest.BodyPublishers.ofString("${payloadJson.replace(/"/g, '\\"')}"))`,
        ] : [
          `    .method("GET", HttpRequest.BodyPublishers.noBody())`,
        ]),
        `    .build();`,
        `HttpResponse<String> response = HttpClient.newHttpClient()`,
        `    .send(request, HttpResponse.BodyHandlers.ofString());`,
        `System.out.println(response.body());`,
      ];
    }

    if (selectedLang === 'dotnet') {
      return [
        `using var client = new HttpClient();`,
        `client.DefaultRequestHeaders.Add("Authorization", "Bearer ${token}");`,
        `client.DefaultRequestHeaders.Add("Accept", "application/json");`,
        ep.method === 'GET'
          ? `var res = await client.GetAsync("${fullUrl}");`
          : `var content = new StringContent(@"${payloadJson.replace(/"/g, '""')}", System.Text.Encoding.UTF8, "application/json");\nvar res = await client.PostAsync("${fullUrl}", content);`,
        `Console.WriteLine(await res.Content.ReadAsStringAsync());`,
      ];
    }

    return [];
  };

  const lines = getSnippetLines();
  const rawCode = lines.join('\n');

  const handleCopy = () => {
    const textToCopy = sanitizeCodeForCopy(rawCode, token, showToken);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteInExplorer = async () => {
    setIsExecuting(true);
    setApiResponse(null);
    setExecutionStatus(null);
    setExecutionTimeMs(null);

    const ep = selectedEndpoint;
    const resolvedPath = ep.path.replace('{id}', testParamId);
    const fullUrl = `${baseUrl}${resolvedPath}`;
    const startTime = performance.now();

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (ep.method === 'POST') {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(fullUrl, {
        method: ep.method,
        headers,
        body: ep.method === 'POST' ? JSON.stringify(ep.sampleBody || { id: testParamId }) : undefined,
      });

      const elapsed = Math.round(performance.now() - startTime);
      setExecutionTimeMs(elapsed);
      setExecutionStatus(res.status);

      const json = await res.json().catch(() => ({ status: res.statusText }));
      setApiResponse(json);
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime);
      setExecutionTimeMs(elapsed);
      setExecutionStatus(0);
      setApiResponse({
        error: 'Falha na conexão',
        message: err.message || `Não foi possível conectar ao backend local em ${fullUrl}`,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-[#353744] bg-slate-50/70 dark:bg-[#1C1D24] overflow-hidden flex flex-col md:flex-row min-h-[580px]">
      {/* PAINEL ESQUERDO: Lista de Endpoints para Navegação */}
      <div className="w-full md:w-[260px] bg-slate-100/60 dark:bg-[#16171E] border-b md:border-b-0 md:border-r border-slate-200 dark:border-[#353744] p-3.5 flex flex-col shrink-0 space-y-3">
        <div className="px-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white block">
            Catálogo de Rotas
          </span>
        </div>

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
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-white text-slate-900 dark:bg-[#24252D] dark:text-white font-semibold shadow-xs border border-slate-200 dark:border-[#383A48]'
                    : 'text-slate-600 dark:text-[#A7AAB9] hover:bg-white/60 dark:hover:bg-[#24252D]/60 hover:text-slate-900 dark:hover:text-white'
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
                {isSelected && <ChevronRight size={13} className="text-[#238636] dark:text-[#2ea043] shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* PAINEL DIREITO: 3 Cards no padrão /configuration */}
      <div className="flex-1 p-5 md:p-6 flex flex-col space-y-4 overflow-y-auto bg-slate-50/40 dark:bg-[#1C1D24]">
        {/* ========================================================================= */}
        {/* CARD 1: Base URL                                                          */}
        {/* ========================================================================= */}
        <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D]">
          {/* Header Bar */}
          <div className="bg-slate-50 dark:bg-[#1E1F28] px-4 py-2.5 border-b border-slate-200 dark:border-[#353744]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">Base URL</h4>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3 text-xs bg-white dark:bg-[#24252D]">
            <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-slate-50 dark:bg-[#1C1D24] border border-slate-200/80 dark:border-[#353744]">
              <div>
                <span className="text-slate-500 dark:text-[#8E92A2] text-[11px] font-medium block">Produção:</span>
                <span className="text-slate-800 dark:text-white font-mono text-xs select-all block">
                  {baseUrl}
                </span>
              </div>
              <Tooltip content="Copiar URL de Produção" position="top">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(baseUrl)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <Copy size={13} />
                </button>
              </Tooltip>
            </div>

            <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-slate-50 dark:bg-[#1C1D24] border border-slate-200/80 dark:border-[#353744]">
              <div>
                <span className="text-slate-500 dark:text-[#8E92A2] text-[11px] font-medium block">SandBox (Homolog):</span>
                <span className="text-slate-800 dark:text-white font-mono text-xs select-all block">
                  {sandboxUrl}
                </span>
              </div>
              <Tooltip content="Copiar URL SandBox" position="top">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(sandboxUrl)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <Copy size={13} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 2: Language Box (Tabs horizontais)                                    */}
        {/* ========================================================================= */}
        <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D]">
          {/* Header Bar */}
          <div className="bg-slate-50 dark:bg-[#1E1F28] px-4 py-2.5 border-b border-slate-200 dark:border-[#353744]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">Linguagens & Snippets</h4>
          </div>

          {/* Body: Horizontal Language Selector */}
          <div className="bg-white dark:bg-[#24252D] px-4 pt-3 pb-0 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {languages.map((lang) => {
                const isSelected = selectedLang === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setSelectedLang(lang.id)}
                    className="flex flex-col items-center gap-1.5 pb-2.5 px-3 min-w-[58px] relative transition-all group cursor-pointer"
                  >
                    <div className="h-5 flex items-center justify-center transition-transform group-hover:scale-110">
                      {lang.icon}
                    </div>
                    <span
                      className={`text-xs font-medium transition-colors ${
                        isSelected
                          ? 'text-slate-900 dark:text-white font-bold'
                          : 'text-slate-500 dark:text-[#9E9E9E] group-hover:text-slate-900 dark:group-hover:text-white'
                      }`}
                    >
                      {lang.name}
                    </span>

                    {/* Active Underline Indicator */}
                    {isSelected && (
                      <span className="absolute bottom-0 left-1 right-1 h-[2.5px] bg-[#238636] dark:bg-[#2ea043] rounded-full" />
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
        <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-[#353744] bg-slate-900 dark:bg-[#14151B] relative">
          {/* Code Header Inside */}
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800 dark:border-[#2C2E38] bg-slate-800/80 dark:bg-[#1C1D24]">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-emerald-400 dark:text-[#2ea043] font-bold tracking-wide">
                {selectedEndpoint.method}
              </span>
              <span className="text-white font-medium">{selectedEndpoint.path}</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Language Indicator Dropdown */}
              <div className="flex items-center gap-1 text-[#D4D4D8] font-mono text-xs">
                <span>{languages.find((l) => l.id === selectedLang)?.name || 'cURL'}</span>
                <ChevronDown size={13} className="text-[#8E8E93]" />
              </div>

              {/* Copy Button */}
              <Tooltip content={copied ? 'Copiado!' : 'Copiar código'} position="top">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-[#9E9E9E] hover:text-white p-1 transition-colors cursor-pointer"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </Tooltip>

              {/* Fullscreen Button */}
              <Tooltip content={isFullscreen ? 'Restaurar' : 'Expandir'} position="top">
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="text-[#9E9E9E] hover:text-white p-1 transition-colors cursor-pointer"
                >
                  {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Numbered Code Content */}
          <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed flex min-h-[220px]">
            {/* Line numbers gutter */}
            <div className="select-none text-slate-500 dark:text-[#555555] pr-3 text-right border-r border-slate-800 dark:border-[#2C2E38] mr-3 flex flex-col font-mono text-xs">
              {lines.map((_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>

            {/* Code Content */}
            <pre className="text-[#E0E0E0] flex-1 overflow-x-auto font-mono text-xs">
              {lines.map((line, idx) => {
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
                          ? 'text-sky-400 dark:text-[#38bdf8]'
                          : line.includes(':')
                            ? 'text-[#D4D4D8]'
                            : 'text-[#E0E0E0]'
                    }
                  >
                    {renderCodeWithKeyBlur(line, token, showToken, onRevealKey)}
                  </div>
                );
              })}
            </pre>
          </div>

          {/* Bottom Right Floating Button: "Try in API Explorer" */}
          <div className="p-3 pt-0 flex justify-end">
            <button
              type="button"
              onClick={() => setShowExplorer(!showExplorer)}
              className="flex h-7.5 items-center gap-1.5 rounded-md border border-slate-700 dark:border-[#353744] bg-slate-800 dark:bg-[#24252D] px-3 text-xs font-medium text-slate-200 hover:bg-slate-700 dark:hover:bg-[#2C2E38] transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <span>Try in API Explorer</span>
            </button>
          </div>
        </div>

        {/* EXPANSÃO DO "API EXPLORER" */}
        {showExplorer && (
          <div className="rounded-lg border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] p-4 shadow-sm space-y-3.5 animate-fadeIn">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-[#353744]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                  {selectedEndpoint.method}
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                  {selectedEndpoint.path}
                </span>
              </div>
              <button
                onClick={() => setShowExplorer(false)}
                className="text-slate-400 hover:text-slate-700 dark:text-[#8E8E93] dark:hover:text-white p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Parameter Input */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-600 dark:text-[#8E92A2] block mb-1 font-medium">
                  ID do Perfil Star Multlogin:
                </label>
                <input
                  type="text"
                  value={testParamId}
                  onChange={(e) => setTestParamId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#1C1D24] border border-slate-200 dark:border-[#353744] rounded-md px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-[#238636] dark:focus:border-[#2ea043]"
                />
              </div>

              <div className="sm:self-end">
                <button
                  type="button"
                  onClick={handleExecuteInExplorer}
                  disabled={isExecuting}
                  className="flex h-8.5 items-center gap-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white px-3.5 text-xs font-medium shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  <Send size={13} className={isExecuting ? 'animate-spin' : ''} />
                  <span>{isExecuting ? 'Executando...' : 'Enviar Chamada'}</span>
                </button>
              </div>
            </div>

            {/* Live Response Box Real */}
            {apiResponse !== null && (
              <div className="space-y-1.5 pt-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span
                    className={`flex items-center gap-1.5 font-bold ${
                      executionStatus && executionStatus >= 200 && executionStatus < 300
                        ? 'text-emerald-600 dark:text-[#2ea043]'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {executionStatus && executionStatus >= 200 && executionStatus < 300 ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <AlertCircle size={13} />
                    )}
                    Status: {executionStatus ? `${executionStatus} ${executionStatus === 200 ? 'OK' : executionStatus === 401 ? 'Unauthorized' : ''}` : 'Erro de Conexão'}
                  </span>
                  {executionTimeMs !== null && (
                    <span className="text-slate-400 dark:text-[#8E8E93]">{executionTimeMs}ms</span>
                  )}
                </div>
                <pre className="bg-slate-900 dark:bg-[#14151B] border border-slate-800 dark:border-[#2C2E38] rounded-md p-3 text-xs font-mono text-slate-200 dark:text-[#DCDCDC] overflow-x-auto shadow-inner max-h-[280px]">
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
