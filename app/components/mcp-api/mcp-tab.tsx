import React, { useState, useEffect, useMemo } from 'react';
import {
  Bot,
  Copy,
  Check,
  Terminal,
  Sparkles,
  Code2,
  Layers,
  FileCode,
  Laptop,
} from 'lucide-react';
import { BACKEND_PORT } from '@/services/http';
import { serviceMcp } from '@/services/mcp/service.mcp';
import { Tooltip } from '@/components/ui/tooltip';
import { renderCodeWithKeyBlur } from './code-blur-helper';

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
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedSseUrl, setCopiedSseUrl] = useState(false);
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);
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
    const isMac = typeof navigator !== 'undefined' && navigator.platform?.indexOf('Mac') > -1;
    const isWindows = typeof navigator !== 'undefined' && navigator.platform?.indexOf('Win') > -1;

    const claudePath = isMac
      ? '~/Library/Application Support/Claude/claude_desktop_config.json'
      : isWindows
      ? '%APPDATA%\\Claude\\claude_desktop_config.json'
      : '~/.config/Claude/claude_desktop_config.json';

    return {
      cursor: {
        id: 'cursor' as const,
        name: 'Cursor IDE',
        icon: Bot,
        fileName: 'mcp.json (Configuração SSE)',
        pathText: 'Settings > Features > MCP Servers > Add New Server (Type: SSE)',
        isPathCopyable: false,
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
        id: 'antigravity' as const,
        name: 'Antigravity IDE',
        icon: Sparkles,
        fileName: 'mcp_config.json',
        pathText: '~/.gemini/config/mcp_config.json',
        isPathCopyable: true,
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
        id: 'claude' as const,
        name: 'Claude Desktop',
        icon: Layers,
        fileName: 'claude_desktop_config.json',
        pathText: claudePath,
        isPathCopyable: true,
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
        id: 'vscode' as const,
        name: 'VS Code (Cline)',
        icon: Code2,
        fileName: 'cline_mcp_settings.json',
        pathText: 'Cline / Roo Code Settings > MCP Servers > Config JSON',
        isPathCopyable: false,
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
        id: 'windsurf' as const,
        name: 'Windsurf IDE',
        icon: Laptop,
        fileName: 'mcp_config.json',
        pathText: '~/.codeium/windsurf/mcp_config.json',
        isPathCopyable: true,
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
        id: 'cli' as const,
        name: 'Claude Code CLI',
        icon: Terminal,
        fileName: 'terminal (bash / zsh)',
        pathText: 'Execute no terminal para conectar instantaneamente:',
        isPathCopyable: false,
        json: `claude mcp add --transport sse star ${sseUrl}`,
      },
    };
  }, [sseUrl]);

  const tools = [
    {
      name: 'star_profiles',
      badge: 'READ',
      desc: 'Lista os perfis cadastrados com ID, Nome e Tags para agentes de IA (com filtro opcional por tag).',
      params: 'tag?: string',
    },
    {
      name: 'star_get_profile',
      badge: 'GET',
      desc: 'Consulta detalhes operacionais de um perfil específico pelo ID (status, versão, kernel, tags).',
      params: 'profile_id: string',
    },
    {
      name: 'star_launch_profile',
      badge: 'EXEC',
      desc: 'Inicia o perfil no motor configurado (AstroFox / AstroBrowser) e retorna PID, porta de depuração e ws_endpoint (CDP).',
      params: 'profile_id: string, headless?: boolean',
    },
    {
      name: 'star_stop_profile',
      badge: 'STOP',
      desc: 'Finaliza o perfil graciosamente, fechando o processo do navegador e persistindo a sessão e cookies no Star Vault.',
      params: 'profile_id: string',
    },
  ];

  const prompts = [
    {
      category: 'Diagnóstico & Listagem',
      text: 'Quais perfis estão disponíveis no Star Multilogin?',
    },
    {
      category: 'Inicialização & CDP',
      text: 'Inicie o perfil de ID prf_shopee_01 pelo Star Driver e retorne o ws_endpoint de depuração.',
    },
    {
      category: 'Inspeção de Perfil',
      text: 'Consulte os detalhes operacionais e status do perfil prf_amazon_us.',
    },
    {
      category: 'Encerramento Seguro',
      text: 'Finalize o perfil prf_shopee_01 graciosamente e salve a sessão no Star Vault.',
    },
  ];

  const handleCopySnippet = () => {
    const rawJson = clientConfigs[selectedClient].json;
    navigator.clipboard.writeText(rawJson);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleCopyPath = () => {
    const path = clientConfigs[selectedClient].pathText;
    navigator.clipboard.writeText(path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleCopySseUrl = () => {
    navigator.clipboard.writeText(sseUrl);
    setCopiedSseUrl(true);
    setTimeout(() => setCopiedSseUrl(false), 2000);
  };

  const handleCopyPrompt = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptIndex(index);
    setTimeout(() => setCopiedPromptIndex(null), 2000);
  };

  const activeClientData = clientConfigs[selectedClient];

  return (
    <div className="space-y-4">
      {/* 1. Cartão Principal: Conexão MCP & Seleção de IDE */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] p-6 space-y-4 shadow-xs">
        {/* Cabeçalho do Cartão */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Bot size={15} className="text-[#7C3AED] dark:text-[#A78BFA]" />
                Conectar Agentes de IA & IDEs (MCP)
              </h4>
              <span className="rounded-full bg-[#7C3AED]/10 text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/30 px-2.5 py-0.5 text-[10px] font-semibold">
                Ativo
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#9DA2B4] mt-1 leading-relaxed">
              Integração nativa via protocolo MCP (Model Context Protocol) sobre transporte SSE em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Status indicator com estilo oficial Configuration */}
            <div className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-xs shadow-emerald-500/50" />
              <span className="text-[11px] font-medium text-slate-700 dark:text-[#E2E4EC]">
                SSE Ativo · Porta {apiPort}
              </span>
            </div>

            {/* Botão copiar SSE direto */}
            <Tooltip content={copiedSseUrl ? 'URL SSE copiada!' : 'Copiar endpoint SSE direto'} position="top">
              <button
                type="button"
                onClick={handleCopySseUrl}
                className="flex h-[38px] items-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-3.5 text-[13px] font-medium text-slate-700 dark:text-[#E2E4EC] hover:bg-slate-50 dark:hover:bg-[#282A33] transition-all cursor-pointer shadow-xs"
              >
                {copiedSseUrl ? (
                  <Check size={14} className="text-[#7C3AED] dark:text-[#A78BFA]" />
                ) : (
                  <Copy size={14} className="text-slate-400 dark:text-[#9DA2B4]" />
                )}
                <span>{copiedSseUrl ? 'Copiado' : 'Copiar URL SSE'}</span>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* 2. Seletor de IDEs no mesmo estilo do seletor de SOs da página de Configuration */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {Object.values(clientConfigs).map((c) => {
            const isSelected = selectedClient === c.id;
            const Icon = c.icon;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedClient(c.id)}
                className={`relative flex items-center justify-center gap-2 p-3 rounded-xl border text-center transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'border-[#7C3AED] dark:border-[#A78BFA] bg-[#7C3AED]/10 dark:bg-[#7C3AED]/15 ring-2 ring-[#7C3AED]/20 shadow-xs'
                    : 'border-slate-200/80 dark:border-[#2D3039] bg-slate-50/50 dark:bg-[#1F2026] hover:border-slate-300 dark:hover:border-[#4B5063]'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#7C3AED] text-white">
                    <Check size={8} strokeWidth={3} />
                  </span>
                )}
                <Icon
                  size={14}
                  className={isSelected ? 'text-[#7C3AED] dark:text-[#A78BFA]' : 'text-slate-400 dark:text-[#9DA2B4]'}
                />
                <span className="font-semibold text-xs text-slate-900 dark:text-white">
                  {c.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* 3. Bloco de Código com Header estilo Janela de Configuração */}
        <div className="rounded-xl overflow-hidden border border-slate-200/80 dark:border-[#2D3039] bg-slate-900 dark:bg-[#202126]">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 dark:bg-[#1F2026] border-b border-slate-800 dark:border-[#2D3039]">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#EC6A5E]" />
                <span className="h-2 w-2 rounded-full bg-[#F4BF4F]" />
                <span className="h-2 w-2 rounded-full bg-[#61C554]" />
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 dark:text-[#C4C7D5] ml-1">
                <FileCode size={13} className="text-slate-400" />
                <span>{activeClientData.fileName}</span>
              </div>
            </div>

            <Tooltip
              content={copiedSnippet ? 'Configuração copiada!' : 'Copiar bloco de configuração'}
              position="top"
            >
              <button
                type="button"
                onClick={handleCopySnippet}
                className="flex h-7 items-center gap-1.5 rounded-lg border border-slate-700 dark:border-[#2D3039] bg-slate-800 dark:bg-[#18191E] px-2.5 text-xs font-medium text-slate-200 dark:text-[#EDEDED] hover:bg-slate-700 dark:hover:bg-[#282A33] transition-all cursor-pointer shadow-xs"
              >
                {copiedSnippet ? (
                  <Check size={12} className="text-[#7C3AED] dark:text-[#A78BFA]" />
                ) : (
                  <Copy size={12} className="text-slate-400" />
                )}
                <span>{copiedSnippet ? 'Copiado!' : 'Copiar Config'}</span>
              </button>
            </Tooltip>
          </div>

          <pre className="p-4 text-xs font-mono leading-relaxed text-slate-100 dark:text-[#EDEDED] overflow-x-auto max-h-[220px]">
            {renderCodeWithKeyBlur(activeClientData.json, activeToken, showToken, onRevealKey)}
          </pre>
        </div>

        {/* 4. Local de Configuração */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039]">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-[#9DA2B4] font-medium">Onde configurar:</span>
            <code className="font-mono text-slate-800 dark:text-white bg-white dark:bg-[#18191E] border border-slate-200/80 dark:border-[#2D3039] px-2 py-0.5 rounded">
              {activeClientData.pathText}
            </code>
          </div>

          {activeClientData.isPathCopyable && (
            <Tooltip content={copiedPath ? 'Caminho copiado!' : 'Copiar caminho do arquivo'} position="top">
              <button
                type="button"
                onClick={handleCopyPath}
                className="flex h-7 items-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] px-2.5 text-xs font-medium text-slate-700 dark:text-[#E2E4EC] hover:bg-slate-50 dark:hover:bg-[#282A33] transition-all cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
              >
                {copiedPath ? (
                  <Check size={12} className="text-[#7C3AED] dark:text-[#A78BFA]" />
                ) : (
                  <Copy size={12} className="text-slate-400" />
                )}
                <span>{copiedPath ? 'Copiado' : 'Copiar caminho'}</span>
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* 5. Grid Inferior (Prompts & Ferramentas) padronizado com os cartões da Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Coluna 1: Prompts Prontos para IA */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] p-6 space-y-4 shadow-xs">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles size={15} className="text-[#7C3AED] dark:text-[#A78BFA]" />
              Prompts Prontos para IA
            </h4>
            <p className="text-xs text-slate-500 dark:text-[#9DA2B4] mt-0.5">
              Clique em qualquer prompt para copiar e colar diretamente no chat do seu assistente:
            </p>
          </div>

          <div className="space-y-2">
            {prompts.map((p, idx) => {
              const isCopied = copiedPromptIndex === idx;

              return (
                <Tooltip
                  key={idx}
                  content={isCopied ? 'Copiado para o clipboard!' : 'Clique para copiar este prompt'}
                  position="top"
                >
                  <div
                    onClick={() => handleCopyPrompt(p.text, idx)}
                    className="group flex items-start justify-between gap-3 p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] hover:border-slate-300 dark:hover:border-[#4B5063] transition-all cursor-pointer w-full"
                  >
                    <div className="min-w-0">
                      <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#9DA2B4] mb-1">
                        {p.category}
                      </span>
                      <p className="text-xs font-mono text-slate-800 dark:text-[#E2E4EC] leading-relaxed">
                        "{p.text}"
                      </p>
                    </div>

                    <div className="shrink-0 pt-0.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-colors">
                      {isCopied ? (
                        <Check size={14} className="text-[#7C3AED] dark:text-[#A78BFA]" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </div>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Coluna 2: Ferramentas Star Driver (MCP Tools) */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Code2 size={15} className="text-[#7C3AED] dark:text-[#A78BFA]" />
                Ferramentas Star Driver (MCP)
              </h4>
              <p className="text-xs text-slate-500 dark:text-[#9DA2B4] mt-0.5">
                Capacidades expostas nativamente pelo backend via Model Context Protocol:
              </p>
            </div>
            <span className="rounded-full bg-[#7C3AED]/10 text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/30 px-2.5 py-0.5 text-[10px] font-semibold">
              {tools.length} ativas
            </span>
          </div>

          <div className="space-y-2">
            {tools.map((t) => (
              <div
                key={t.name}
                className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Terminal size={13} className="text-slate-400 dark:text-[#9DA2B4] shrink-0" />
                    <span className="text-xs font-mono font-semibold text-slate-900 dark:text-white">
                      {t.name}
                    </span>
                  </div>
                  <span className="rounded-full bg-slate-100 dark:bg-[#18191E] text-slate-700 dark:text-[#E2E4EC] border border-slate-200/80 dark:border-[#2D3039] px-2 py-0.5 text-[10px] font-semibold">
                    {t.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-[#9DA2B4] leading-relaxed">
                  {t.desc}
                </p>
                <div className="text-[11px] font-mono text-slate-500 dark:text-[#9DA2B4]">
                  params: <span className="text-slate-700 dark:text-[#E2E4EC]">{t.params}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default McpTab;
