import React, { useState, useEffect, useMemo } from 'react';
import {
  Bot,
  Copy,
  Check,
  Terminal,
  Sparkles,
  Code2,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { BACKEND_PORT } from '@/services/http';
import { serviceMcp } from '@/services/mcp/service.mcp';
import { renderCodeWithKeyBlur, sanitizeCodeForCopy } from './code-blur-helper';

interface McpTabProps {
  scriptPath?: string;
  apiPort?: number;
  token?: string;
  showToken?: boolean;
  onRevealKey?: () => void;
}

export const McpTab: React.FC<McpTabProps> = ({
  apiPort = BACKEND_PORT,
  token: propToken,
  showToken = false,
  onRevealKey,
}) => {
  const [selectedClient, setSelectedClient] = useState<
    'cursor' | 'antigravity' | 'claude' | 'vscode' | 'windsurf' | 'cli'
  >('cursor');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [internalToken, setInternalToken] = useState(propToken || serviceMcp.getCachedToken());

  useEffect(() => {
    if (propToken) {
      setInternalToken(propToken);
    } else {
      serviceMcp
        .getInfo()
        .then((res) => {
          if (res?.token) {
            setInternalToken(res.token);
          }
        })
        .catch(() => {});
    }
  }, [propToken]);

  const activeToken = propToken || internalToken;
  const activeHost = '127.0.0.1';
  const sseUrl = `http://${activeHost}:${apiPort}/mcp/${activeToken}/sse`;

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
    {
      name: 'star_profiles',
      desc: 'Lista os perfis cadastrados com ID, Nome e Tags para agentes de IA (com filtro opcional por tag).',
      tag: 'Leitura / Busca',
    },
    {
      name: 'star_get_profile',
      desc: 'Consulta detalhes operacionais de um perfil específico pelo ID (status, versão, kernel, tags).',
      tag: 'Leitura / Detalhes',
    },
    {
      name: 'star_launch_profile',
      desc: 'Inicia o perfil no motor configurado (AstroFox ou AstroBrowser) e retorna PID, porta de depuração e ws_endpoint (CDP/WebSocket).',
      tag: 'Execução / Start',
    },
    {
      name: 'star_stop_profile',
      desc: 'Finaliza o perfil graciosamente, fechando o processo do navegador e persistindo a sessão e cookies no Star Vault.',
      tag: 'Ciclo / Stop',
    },
  ];

  const handleCopySnippet = () => {
    const rawJson = clientConfigs[selectedClient].json;
    navigator.clipboard.writeText(rawJson);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Top Connection Card */}
      <div className="bg-white dark:bg-[#13141C] border border-slate-200 dark:border-white/10 rounded-2xl p-5 md:p-6 shadow-sm dark:shadow-none space-y-4">
        <div>
          <h3 className="text-[16px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bot size={18} className="text-emerald-600 dark:text-[#00FF66]" />
            Conectar Qualquer IA ou IDE (Protocolo MCP 2024-11-05)
          </h3>
          <p className="text-[12px] text-slate-600 dark:text-[#A6A6A6] mt-0.5">
            Controle nativo do Star Multlogin (AstroFox & AstroBrowser) diretamente via chat no Cursor, Claude, Antigravity, VS Code, Windsurf e Cline.
          </p>
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
            {renderCodeWithKeyBlur(clientConfigs[selectedClient].json, activeToken, showToken, onRevealKey)}
          </pre>
          <button
            type="button"
            onClick={handleCopySnippet}
            className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 dark:bg-[#1E202B] dark:hover:bg-[#282B3A] dark:text-[#00FF66] text-[11px] font-bold border border-slate-700 dark:border-white/10 transition-all cursor-pointer shadow-xs"
            title={showToken ? "Copiar Config" : "Copiar Config (Chave vazia enquanto oculta)"}
          >
            {copiedSnippet ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copiedSnippet ? 'Copiado!' : 'Copiar Config'}</span>
          </button>
        </div>

        {/* Path Hint */}
        <div className="text-[11px] text-slate-500 dark:text-[#A6A6A6]">
          Onde configurar: <code className="text-slate-800 dark:text-white font-mono bg-slate-100 dark:bg-[#181922] border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded">{clientConfigs[selectedClient].pathText}</code>
        </div>
      </div>

      {/* Two clean columns: Prompts & Allowed Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Column 1: Prompts */}
        <div className="bg-white dark:bg-[#13141C] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-none space-y-3">
          <h4 className="text-[13px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Sparkles size={15} className="text-emerald-600 dark:text-[#00FF66]" />
            O Que Pedir Para a IA no Chat:
          </h4>
          <div className="space-y-2">
            {[
              '"Quais perfis estão disponíveis no Star Multlogin?"',
              '"Inicie o perfil de ID prf_shopee_01 pelo Star Driver."',
              '"Finalize o perfil prf_shopee_01 e salve a sessão no Vault."',
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
        <div className="bg-white dark:bg-[#13141C] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-none space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Code2 size={15} className="text-emerald-600 dark:text-[#00FF66]" />
              Ferramentas Star Driver (MCP Tools):
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
