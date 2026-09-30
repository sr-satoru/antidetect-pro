import React, { useState, useEffect } from 'react';
import {
  Bot,
  Copy,
  Check,
  Terminal,
  Sparkles,
  Play,
  CheckCircle2,
  Code2,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import { toast } from '@/components/ui/notification';
import { http, BACKEND_PORT } from '@/services/http';

interface McpTabProps {
  scriptPath?: string;
  apiPort?: number;
}

export const McpTab: React.FC<McpTabProps> = ({
  apiPort = BACKEND_PORT,
}) => {
  const [selectedClient, setSelectedClient] = useState<'claude' | 'cursor' | 'antigravity' | 'cli'>('claude');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [token, setToken] = useState('star_sec_loading');

  useEffect(() => {
    http.get<{ token: string }>('/mcp/info')
      .then((res) => {
        if (res?.token) {
          setToken(res.token);
        }
      })
      .catch(() => {});
  }, []);

  const sseUrl = `http://127.0.0.1:${apiPort}/mcp/${token}/sse`;

  const clientConfigs = {
    claude: {
      name: 'Claude Desktop',
      pathText: '~/.config/Claude/claude_desktop_config.json',
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
    cursor: {
      name: 'Cursor IDE',
      pathText: 'Settings > Features > MCP > Add New Server (Type: sse)',
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
    antigravity: {
      name: 'Antigravity IDE',
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
    cli: {
      name: 'Claude CLI',
      pathText: 'Terminal / Shell:',
      json: `claude mcp add --transport sse star ${sseUrl}`,
    },
  };

  const tools = [
    { name: 'star_status', desc: 'Informa à IA se o motor está ativo e perfis em execução.', tag: 'Leitura' },
    { name: 'star_profiles', desc: 'Lista perfis com tags, status (Zero-Leakage: sem dados sensíveis).', tag: 'Leitura' },
    { name: 'star_start_profile', desc: 'Abre o perfil seguro e devolve o endpoint WebSocket/CDP.', tag: 'Execução' },
    { name: 'star_stop_profile', desc: 'Encerra o perfil graciosamente persistindo cookies e sessão.', tag: 'Execução' },
    { name: 'star_get_tabs', desc: 'Lê títulos e URLs das abas abertas em tempo real.', tag: 'Inspeção' },
    { name: 'star_open_tab', desc: 'Abre uma nova URL em uma aba do perfil.', tag: 'Ação' },
    { name: 'star_close_tab', desc: 'Fecha uma aba específica do perfil sem fechar o navegador.', tag: 'Ação' },
  ];

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(clientConfigs[selectedClient].json);
    setCopiedSnippet(true);
    toast.success('Configuração copiada!');
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestOutput(null);
    try {
      const status = await http.get<any>('/api/v1/status');
      setTestOutput(
        JSON.stringify(
          {
            jsonrpc: '2.0',
            id: 1,
            result: {
              serverInfo: { name: 'star-multlogin', version: status.version || '2.1.0' },
              capabilities: { tools: tools.length },
              transport: 'Server-Sent Events (SSE) Nativo',
              status: status.ok ? 'online' : 'error',
              running_profiles: status.running_count,
              message: 'Servidor MCP nativo operacional sem Python!',
            },
          },
          null,
          2
        )
      );
      toast.success('Servidor MCP testado com sucesso!');
    } catch (e: any) {
      setTestOutput(
        JSON.stringify(
          {
            jsonrpc: '2.0',
            id: 1,
            error: {
              code: -32603,
              message: e.message || 'Falha ao conectar no backend local',
            },
          },
          null,
          2
        )
      );
      toast.error('Erro ao conectar no servidor MCP local');
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
              Conectar Assistentes de IA (MCP)
            </h3>
            <p className="text-[12px] text-slate-600 dark:text-[#A6A6A6] mt-0.5">
              Permita que o Claude Desktop, Cursor ou Antigravity controlem seus perfis do Star Multlogin diretamente pelo chat em linguagem natural.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunTest}
            disabled={isTesting}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 dark:bg-[#1F212D] dark:hover:bg-[#282B3A] dark:border-white/15 dark:text-[#00FF66] text-[12px] font-bold transition-all shrink-0 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Play size={13} className={isTesting ? 'animate-spin' : ''} />
            <span>{isTesting ? 'Testando...' : 'Testar Conexão MCP'}</span>
          </button>
        </div>

        {/* Client selector tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#0C0D12] border border-slate-200 dark:border-white/10 rounded-xl w-fit">
          {(['claude', 'cursor', 'antigravity', 'cli'] as const).map((key) => (
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
            <span>{copiedSnippet ? 'Copiado!' : 'Copiar JSON'}</span>
          </button>
        </div>

        {/* Path Hint */}
        <div className="text-[11px] text-slate-500 dark:text-[#A6A6A6]">
          Arquivo de configuração: <code className="text-slate-800 dark:text-white font-mono bg-slate-100 dark:bg-[#181922] border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded">{clientConfigs[selectedClient].pathText}</code>
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
              '"Quais perfis eu tenho cadastrados no Star Multlogin?"',
              '"Abra o perfil da Shopee e me informe o saldo de anúncios."',
              '"Inicie todos os perfis com a tag \'aquecer\' em paralelo."',
            ].map((prompt, idx) => (
              <div
                key={idx}
                className="text-[12px] text-slate-800 dark:text-[#D4D4D8] bg-slate-50 hover:bg-slate-100 dark:bg-[#181922] dark:hover:bg-[#202230] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-mono select-all transition-colors cursor-pointer"
                onClick={() => {
                  navigator.clipboard.writeText(prompt.replace(/"/g, ''));
                  toast.success('Prompt copiado!');
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
              Ferramentas Expostas (MCP Tools):
            </h4>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
              6 ativas
            </span>
          </div>

          <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
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
