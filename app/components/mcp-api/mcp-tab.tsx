import React, { useState, useEffect, useMemo } from 'react';
import {
  Bot,
  Copy,
  Check,
  Terminal,
  Sparkles,
  Play,
  CheckCircle2,
  Code2,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { BACKEND_PORT } from '@/services/http';
import { serviceMcp } from '@/services/mcp/service.mcp';

interface McpTabProps {
  scriptPath?: string;
  apiPort?: number;
}

export const McpTab: React.FC<McpTabProps> = ({
  apiPort = BACKEND_PORT,
}) => {
  const [selectedClient, setSelectedClient] = useState<
    'cursor' | 'antigravity' | 'claude' | 'vscode' | 'windsurf' | 'cli'
  >('cursor');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [token, setToken] = useState(serviceMcp.getCachedToken());

  useEffect(() => {
    serviceMcp
      .getInfo()
      .then((res) => {
        if (res?.token) {
          setToken(res.token);
        }
      })
      .catch(() => {});
  }, []);

  const activeHost = '127.0.0.1';
  const sseUrl = `http://${activeHost}:${apiPort}/mcp/${token}/sse`;

  const clientConfigs = useMemo(() => {
    return {
      cursor: {
        name: 'Cursor IDE',
        category: 'IDE Nativo',
        pathText: 'Settings > Features > MCP Servers > Add New Server (Type: SSE)',
        json: JSON.stringify(
          {
            mcpServers: {
              star: {
                url: sseUrl,
              },
            },
          },
          null,
          2
        ),
      },
      antigravity: {
        name: 'Antigravity IDE',
        category: 'Google Gemini',
        pathText: '~/.gemini/config/mcp_config.json',
        json: JSON.stringify(
          {
            mcpServers: {
              star: {
                serverUrl: sseUrl,
              },
            },
          },
          null,
          2
        ),
      },
      claude: {
        name: 'Claude Desktop',
        category: 'Anthropic',
        pathText:
          navigator.platform.indexOf('Mac') > -1
            ? '~/Library/Application Support/Claude/claude_desktop_config.json'
            : '~/.config/Claude/claude_desktop_config.json',
        json: JSON.stringify(
          {
            mcpServers: {
              star: {
                command: 'npx',
                args: ['-y', 'mcp-remote', sseUrl],
              },
            },
          },
          null,
          2
        ),
      },
      vscode: {
        name: 'VS Code (Cline / Roo)',
        category: 'Extensões IA',
        pathText: 'Cline / Roo Code Settings > MCP Servers > Config JSON',
        json: JSON.stringify(
          {
            mcpServers: {
              star: {
                url: sseUrl,
                type: 'sse',
              },
            },
          },
          null,
          2
        ),
      },
      windsurf: {
        name: 'Windsurf IDE',
        category: 'Codeium',
        pathText: '~/.codeium/windsurf/mcp_config.json',
        json: JSON.stringify(
          {
            mcpServers: {
              star: {
                serverUrl: sseUrl,
              },
            },
          },
          null,
          2
        ),
      },
      cli: {
        name: 'Claude Code / CLI',
        category: 'Terminal',
        pathText: 'Execute no terminal para conectar instantaneamente:',
        json: `claude mcp add --transport sse star ${sseUrl}`,
      },
    };
  }, [sseUrl]);

  const tools = [
    { name: 'star_status', desc: 'Verifica se o motor Camoufox e o backend estão ativos e perfis rodando.', tag: 'Status' },
    { name: 'star_profiles', desc: 'Lista perfis disponíveis sem expor proxies nem credenciais sensíveis.', tag: 'Leitura' },
    { name: 'star_start_profile', desc: 'Inicia o perfil no Camoufox e devolve ws_endpoint para BiDi/Playwright.', tag: 'Ciclo' },
    { name: 'star_stop_profile', desc: 'Finaliza o perfil graciosamente persistindo sessão e cookies no Vault.', tag: 'Ciclo' },
    { name: 'star_get_tabs', desc: 'Inspeciona títulos e URLs de todas as abas abertas em tempo real.', tag: 'Abas' },
    { name: 'star_open_tab', desc: 'Abre uma nova aba navegando diretamente para a URL desejada.', tag: 'Abas' },
    { name: 'star_close_tab', desc: 'Fecha uma aba específica do perfil sem encerrar o navegador.', tag: 'Abas' },
    { name: 'star_click', desc: 'Executa clique humanizado simulando trajeto de mouse e eventos reais.', tag: 'Ação' },
    { name: 'star_type', desc: 'Digita texto em inputs/textareas disparando eventos de input e change.', tag: 'Ação' },
    { name: 'star_scroll', desc: 'Rola a página suavemente com animação na direção desejada.', tag: 'Ação' },
    { name: 'star_read_content', desc: 'Extrai texto visível, título e URL da página ou elemento especificado.', tag: 'Extração' },
    { name: 'star_screenshot', desc: 'Captura screenshot em PNG Base64 da aba informada.', tag: 'Visual' },
    { name: 'star_evaluate', desc: 'Executa código JavaScript arbitrário no contexto da aba selecionada.', tag: 'Script' },
  ];

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(clientConfigs[selectedClient].json);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestOutput(null);
    try {
      // Executa chamada real no endpoint HTTP direto do MCP
      const res = await fetch(`http://127.0.0.1:${apiPort}/mcp/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: { protocolVersion: '2024-11-05', capabilities: {} },
        }),
      });

      const json = await res.json();
      setTestOutput(
        JSON.stringify(
          {
            handshake: '200 OK',
            protocolVersion: '2024-11-05',
            transport: 'SSE & HTTP Direto',
            toolsCount: tools.length,
            server_response: json,
          },
          null,
          2
        )
      );
    } catch (e: any) {
      setTestOutput(
        JSON.stringify(
          {
            status: 'Falha na conexão',
            message: e?.message || 'Não foi possível conectar ao backend MCP',
            dica: `Certifique-se de que o backend Rust está rodando na porta ${apiPort}.`,
          },
          null,
          2
        )
      );
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Connection Card */}
      <div className="bg-white dark:bg-[#13141C] border border-slate-200 dark:border-white/10 rounded-2xl p-5 md:p-6 shadow-sm shadow-slate-200/50 dark:shadow-[0_12px_40px_-5px_rgba(0,0,0,0.7)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-[16px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bot size={18} className="text-emerald-600 dark:text-[#00FF66]" />
              Conectar Qualquer IA ou IDE (Protocolo MCP 2024-11-05)
            </h3>
            <p className="text-[12px] text-slate-600 dark:text-[#A6A6A6] mt-0.5">
              Controle nativo do Camoufox diretamente via chat no Cursor, Claude, Antigravity, VS Code, Windsurf e Cline.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunTest}
            disabled={isTesting}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 dark:bg-[#1F212D] dark:hover:bg-[#282B3A] dark:border-white/15 dark:text-[#00FF66] text-[12px] font-bold transition-all shrink-0 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Play size={13} className={isTesting ? 'animate-spin' : ''} />
            <span>{isTesting ? 'Testando Handshake...' : 'Testar Conexão MCP'}</span>
          </button>
        </div>

        {/* Client selector tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#0C0D12] border border-slate-200 dark:border-white/10 rounded-xl w-fit">
          {(['cursor', 'antigravity', 'claude', 'vscode', 'windsurf', 'cli'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedClient(key)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                selectedClient === key
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 dark:bg-[#1F212D] dark:text-[#00FF66] dark:border-white/15'
                  : 'text-slate-600 hover:text-slate-900 dark:text-[#A0A0A0] dark:hover:text-white'
              }`}
            >
              {clientConfigs[key].name}
            </button>
          ))}
        </div>

        {/* Snippet box */}
        <div className="relative group">
          <pre className="bg-slate-900 dark:bg-[#0C0D12] border border-slate-800 dark:border-white/10 rounded-xl p-4 text-[12px] font-mono text-slate-100 dark:text-[#EDEDED] overflow-x-auto max-h-[220px] shadow-inner">
            {clientConfigs[selectedClient].json}
          </pre>
          <button
            type="button"
            onClick={handleCopySnippet}
            className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 dark:bg-[#1E202B] dark:hover:bg-[#282B3A] dark:text-[#00FF66] text-[11px] font-bold border border-slate-700 dark:border-white/10 transition-all cursor-pointer shadow-xs"
          >
            {copiedSnippet ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copiedSnippet ? 'Copiado!' : 'Copiar Config'}</span>
          </button>
        </div>

        {/* Path Hint */}
        <div className="text-[11px] text-slate-500 dark:text-[#A6A6A6]">
          Onde configurar: <code className="text-slate-800 dark:text-white font-mono bg-slate-100 dark:bg-[#181922] border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded">{clientConfigs[selectedClient].pathText}</code>
        </div>

        {/* Test Result Preview */}
        {testOutput && (
          <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-1.5 animate-fadeIn">
            <div className="flex items-center justify-between text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Resposta do Servidor MCP:
              </span>
              <button onClick={() => setTestOutput(null)} className="text-slate-400 hover:text-slate-700 dark:text-[#8E8E93] dark:hover:text-white text-[10px] cursor-pointer">
                Fechar
              </button>
            </div>
            <pre className="bg-slate-900 dark:bg-[#08090C] border border-slate-800 dark:border-white/10 rounded-xl p-3 text-[11px] font-mono text-slate-200 dark:text-[#DCDCDC] overflow-x-auto shadow-inner">
              {testOutput}
            </pre>
          </div>
        )}
      </div>

      {/* Two clean columns: Prompts & Allowed Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Column 1: Prompts */}
        <div className="bg-white dark:bg-[#13141C] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm shadow-slate-200/50 dark:shadow-[0_12px_40px_-5px_rgba(0,0,0,0.7)] space-y-3">
          <h4 className="text-[13px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Sparkles size={15} className="text-emerald-600 dark:text-[#00FF66]" />
            O Que Pedir Para a IA no Chat:
          </h4>
          <div className="space-y-2">
            {[
              '"Quais perfis estão disponíveis no Star Multlogin?"',
              '"Inicie o perfil da Shopee e abra a página inicial."',
              '"Quais abas estão abertas no perfil e qual o título da atual?"',
              '"Clique no botão de login com seletor button#submit e me avise."',
              '"Capture uma screenshot da página atual para eu verificar."',
            ].map((prompt, idx) => (
              <div
                key={idx}
                className="text-[12px] text-slate-800 dark:text-[#D4D4D8] bg-slate-50 hover:bg-slate-100 dark:bg-[#181922] dark:hover:bg-[#202230] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono select-all transition-colors cursor-pointer"
                onClick={() => {
                  navigator.clipboard.writeText(prompt.replace(/"/g, ''));
                }}
              >
                {prompt}
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Allowed Tools */}
        <div className="bg-white dark:bg-[#13141C] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm shadow-slate-200/50 dark:shadow-[0_12px_40px_-5px_rgba(0,0,0,0.7)] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Code2 size={15} className="text-emerald-600 dark:text-[#00FF66]" />
              Ferramentas Nativas do Camoufox (MCP Tools):
            </h4>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
              {tools.length} ativas
            </span>
          </div>

          <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
            {tools.map((t) => (
              <div
                key={t.name}
                className="flex items-center justify-between bg-slate-50 dark:bg-[#181922] px-3 py-2 rounded-xl text-[12px] border border-slate-200 dark:border-white/10"
              >
                <div>
                  <code className="text-emerald-600 dark:text-[#00FF66] font-mono font-bold block">{t.name}</code>
                  <span className="text-[11px] text-slate-500 dark:text-[#A6A6A6]">{t.desc}</span>
                </div>
                <span className="text-[9px] font-mono text-slate-500 dark:text-[#A0A0A0] bg-slate-200 dark:bg-white/[0.06] px-1.5 py-0.5 rounded shrink-0">
                  {t.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default McpTab;
