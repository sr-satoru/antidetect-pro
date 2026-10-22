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
        name: 'VS Code (Cline / Roo)',
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
        name: 'Claude Code / CLI',
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
    <div className="space-y-7">
      {/* Hero Connection Card com visual nobre e dimensões ampliadas */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-[#353744] bg-slate-50/70 dark:bg-[#16171E] p-6 lg:p-8 space-y-7 shadow-xs">
        {/* Card Header com Título grande e Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-[#24252D] border border-slate-200 dark:border-[#353744] shadow-xs">
              <Bot size={28} className="text-[#238636] dark:text-[#2ea043]" />
            </div>
            <div>
              <h3 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">
                Conectar Agentes de IA & IDEs
              </h3>
              <p className="text-[15px] text-slate-600 dark:text-[#9EA2B6] mt-1">
                Integração nativa via protocolo MCP (Model Context Protocol) sobre transporte SSE em tempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
            {/* Status indicator com tamanho confortável */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white dark:bg-[#24252D] border border-slate-200 dark:border-[#353744] shadow-2xs">
              <span className="h-3 w-3 rounded-full bg-[#238636] dark:bg-[#2ea043] animate-pulse" />
              <span className="text-[14px] font-semibold text-slate-800 dark:text-[#D1D5DB]">
                SSE Ativo · Porta {apiPort}
              </span>
            </div>

            {/* Quick SSE URL copy */}
            <Tooltip content={copiedSseUrl ? 'URL SSE copiada!' : 'Copiar endpoint SSE direto'} position="top">
              <button
                type="button"
                onClick={handleCopySseUrl}
                className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] hover:bg-slate-50 dark:hover:bg-[#2B2D38] text-[14px] font-semibold text-slate-800 dark:text-[#EDEDED] transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
              >
                {copiedSseUrl ? (
                  <Check size={16} className="text-[#238636] dark:text-[#2ea043]" />
                ) : (
                  <Copy size={16} className="text-slate-400" />
                )}
                <span>{copiedSseUrl ? 'Copiado!' : 'Copiar URL SSE'}</span>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Client selector tabs com botões maiores */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-200/60 dark:bg-[#101117] border border-slate-200 dark:border-[#2E303D] rounded-2xl w-fit">
          {(['cursor', 'antigravity', 'claude', 'vscode', 'windsurf', 'cli'] as const).map((key) => {
            const client = clientConfigs[key];
            const Icon = client.icon;
            const isSelected = selectedClient === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedClient(key)}
                className={`flex items-center gap-2.5 px-4.5 py-2.5 rounded-xl text-[14.5px] font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'text-slate-900 dark:text-white bg-white dark:bg-[#2B2D38] border border-slate-200 dark:border-[#404354] shadow-xs'
                    : 'text-slate-600 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-[#F1F1F4] hover:bg-white/40 dark:hover:bg-[#1E1F27]'
                }`}
              >
                <Icon
                  size={17}
                  className={isSelected ? 'text-[#238636] dark:text-[#2ea043]' : 'text-slate-400 dark:text-[#7E8294]'}
                />
                <span>{client.name}</span>
              </button>
            );
          })}
        </div>

        {/* Code Snippet Window com fonte 15px e scroll generoso */}
        <div className="rounded-2xl overflow-hidden border border-slate-300 dark:border-[#2C2E3B] bg-[#0A0B0F] dark:bg-[#0D0E13] shadow-md">
          {/* Window Header */}
          <div className="flex items-center justify-between px-6 py-3.5 bg-slate-100 dark:bg-[#181922] border-b border-slate-200 dark:border-[#262833]">
            <div className="flex items-center gap-3">
              {/* Window dots */}
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-[#EC6A5E]/90" />
                <span className="h-3.5 w-3.5 rounded-full bg-[#F4BF4F]/90" />
                <span className="h-3.5 w-3.5 rounded-full bg-[#61C554]/90" />
              </div>
              <div className="flex items-center gap-2 text-[14px] font-mono text-slate-700 dark:text-[#C4C7D5] font-medium ml-2">
                <FileCode size={16} className="text-slate-400" />
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
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] hover:bg-slate-50 dark:hover:bg-[#2B2D38] text-[14px] font-semibold text-slate-800 dark:text-[#EDEDED] transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
              >
                {copiedSnippet ? (
                  <Check size={16} className="text-[#238636] dark:text-[#2ea043]" />
                ) : (
                  <Copy size={16} className="text-slate-400" />
                )}
                <span>{copiedSnippet ? 'Copiado!' : 'Copiar Configuração'}</span>
              </button>
            </Tooltip>
          </div>

          {/* Code Viewer em tamanho legível sem necessidade de zoom */}
          <pre className="p-6 lg:p-7 text-[15px] font-mono leading-relaxed text-slate-100 dark:text-[#F1F1F4] overflow-x-auto max-h-[300px]">
            {renderCodeWithKeyBlur(activeClientData.json, activeToken, showToken, onRevealKey)}
          </pre>
        </div>

        {/* Location Hint / Path Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 rounded-xl bg-white dark:bg-[#20212B] border border-slate-200 dark:border-[#353744]">
          <div className="flex flex-wrap items-center gap-2.5 text-[14.5px]">
            <span className="text-slate-600 dark:text-[#9EA2B6] font-medium">Onde configurar:</span>
            <code className="font-mono text-slate-900 dark:text-white bg-slate-100 dark:bg-[#15151C] border border-slate-200 dark:border-[#353744] px-3.5 py-1.5 rounded-lg font-medium">
              {activeClientData.pathText}
            </code>
          </div>

          {activeClientData.isPathCopyable && (
            <Tooltip content={copiedPath ? 'Caminho copiado!' : 'Copiar caminho do arquivo'} position="top">
              <button
                type="button"
                onClick={handleCopyPath}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#353744] bg-slate-50 dark:bg-[#24252D] hover:bg-slate-100 dark:hover:bg-[#2B2D38] text-[14px] font-semibold text-slate-700 dark:text-[#C4C7D5] transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
              >
                {copiedPath ? (
                  <Check size={15} className="text-[#238636] dark:text-[#2ea043]" />
                ) : (
                  <Copy size={15} className="text-slate-400" />
                )}
                <span>{copiedPath ? 'Copiado' : 'Copiar caminho'}</span>
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Two Lower Columns: Prompts & Tools em containers espaçosos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
        {/* Column 1: Prompts */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#353744] bg-slate-50/70 dark:bg-[#16171E] p-6 lg:p-8 space-y-5 shadow-xs">
          <div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Sparkles size={22} className="text-[#238636] dark:text-[#2ea043]" />
              Prompts Prontos para IA
            </h4>
            <p className="text-[14.5px] text-slate-600 dark:text-[#9EA2B6] mt-1">
              Clique em qualquer prompt para copiar e colar diretamente no chat do seu assistente:
            </p>
          </div>

          <div className="space-y-3">
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
                    className="group flex items-start justify-between gap-4 p-5 rounded-xl bg-white dark:bg-[#20212B] border border-slate-200/90 dark:border-[#2E303D] hover:border-slate-300 dark:hover:border-[#404354] hover:shadow-xs transition-all cursor-pointer w-full"
                  >
                    <div className="min-w-0">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8E92A2] mb-1.5">
                        {p.category}
                      </span>
                      <p className="text-[15px] font-mono text-slate-900 dark:text-[#EDEDED] leading-relaxed">
                        "{p.text}"
                      </p>
                    </div>

                    <div className="shrink-0 pt-0.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-colors">
                      {isCopied ? (
                        <Check size={18} className="text-[#238636] dark:text-[#2ea043]" />
                      ) : (
                        <Copy size={18} />
                      )}
                    </div>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Column 2: Ferramentas Star Driver (MCP Tools) */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#353744] bg-slate-50/70 dark:bg-[#16171E] p-6 lg:p-8 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Code2 size={22} className="text-[#238636] dark:text-[#2ea043]" />
                Ferramentas Star Driver (MCP)
              </h4>
              <p className="text-[14.5px] text-slate-600 dark:text-[#9EA2B6] mt-1">
                Capacidades expostas nativamente pelo backend via Model Context Protocol:
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-[#C4C7D5] bg-white dark:bg-[#24252D] px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#353744] shrink-0 shadow-2xs">
              {tools.length} ativas
            </span>
          </div>

          <div className="space-y-3">
            {tools.map((t) => (
              <div
                key={t.name}
                className="p-5 rounded-xl bg-white dark:bg-[#20212B] border border-slate-200/90 dark:border-[#2E303D] space-y-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Terminal size={17} className="text-slate-400 dark:text-[#7E8294] shrink-0" />
                    <span className="text-base font-mono font-bold text-slate-900 dark:text-white">
                      {t.name}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-100 dark:bg-[#16171E] text-slate-700 dark:text-[#A7AAB9] border border-slate-200 dark:border-[#353744]">
                    {t.badge}
                  </span>
                </div>
                <p className="text-[14.5px] text-slate-600 dark:text-[#9EA2B6] leading-relaxed">
                  {t.desc}
                </p>
                <div className="text-[13.5px] font-mono text-slate-500 dark:text-[#7E8294]">
                  params: <span className="text-slate-800 dark:text-[#D1D5DB] font-medium">{t.params}</span>
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
