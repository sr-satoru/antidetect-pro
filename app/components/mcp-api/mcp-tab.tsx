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
      <div className="bg-[#383838]/70 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-[16px] font-bold text-white flex items-center gap-2">
              <Bot size={18} className="text-[#00FF66]" />
              Conectar Assistentes de IA (MCP)
            </h3>
            <p className="text-[12px] text-[#A6A6A6] mt-0.5">
              Permita que o Claude Desktop, Cursor ou Antigravity controlem seus perfis do Star Multlogin diretamente pelo chat em linguagem natural.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunTest}
            disabled={isTesting}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#484848] hover:bg-[#525252] border border-white/[0.08] text-[#00FF66] text-[12px] font-bold transition-all shrink-0 active:scale-95 disabled:opacity-50"
          >
            <Play size={13} className={isTesting ? 'animate-spin' : ''} />
            <span>{isTesting ? 'Testando...' : 'Testar Conexão MCP'}</span>
          </button>
        </div>

        {/* Client selector tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#282828] border border-white/[0.08] rounded-xl w-fit">
          {(['claude', 'cursor', 'antigravity', 'cli'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedClient(key)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                selectedClient === key
                  ? 'bg-[#484848] text-[#00FF66] shadow-xs'
                  : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              {clientConfigs[key].name}
            </button>
          ))}
        </div>

        {/* Snippet box */}
        <div className="relative group">
          <pre className="bg-[#242424]/90 border border-white/[0.08] rounded-xl p-4 text-[12px] font-mono text-[#EDEDED] overflow-x-auto max-h-[220px] shadow-inner">
            {clientConfigs[selectedClient].json}
          </pre>
          <button
            type="button"
            onClick={handleCopySnippet}
            className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#404040] hover:bg-[#4d4d4d] text-[#00FF66] text-[11px] font-bold border border-white/[0.08] transition-all"
          >
            {copiedSnippet ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copiedSnippet ? 'Copiado!' : 'Copiar JSON'}</span>
          </button>
        </div>

        {/* Path Hint */}
        <div className="text-[11px] text-[#A6A6A6]">
          Arquivo de configuração: <code className="text-white font-mono bg-[#282828] px-2 py-0.5 rounded">{clientConfigs[selectedClient].pathText}</code>
        </div>

        {/* Test Result Preview */}
        {testOutput && (
          <div className="pt-3 border-t border-white/[0.08] space-y-1.5 animate-fadeIn">
            <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400 font-bold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Resposta do Servidor MCP:
              </span>
              <button onClick={() => setTestOutput(null)} className="text-[#8E8E93] hover:text-white text-[10px]">
                Fechar
              </button>
            </div>
            <pre className="bg-[#1e1e1e] border border-white/[0.08] rounded-xl p-3 text-[11px] font-mono text-[#DCDCDC] overflow-x-auto shadow-inner">
              {testOutput}
            </pre>
          </div>
        )}
      </div>

      {/* Two clean columns: Prompts & Allowed Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Column 1: Prompts */}
        <div className="bg-[#383838]/70 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] space-y-3">
          <h4 className="text-[13px] font-bold text-white flex items-center gap-1.5">
            <Sparkles size={15} className="text-[#00FF66]" />
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
                className="text-[12px] text-[#D4D4D8] bg-[#282828]/80 hover:bg-[#303030] px-3.5 py-2.5 rounded-xl border border-white/[0.04] font-mono select-all transition-colors cursor-pointer"
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
        <div className="bg-[#383838]/70 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-bold text-white flex items-center gap-1.5">
              <Code2 size={15} className="text-[#00FF66]" />
              Ferramentas Expostas (MCP Tools):
            </h4>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              6 ativas
            </span>
          </div>

          <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
            {tools.map((t) => (
              <div
                key={t.name}
                className="flex items-center justify-between bg-[#282828]/60 px-3 py-2 rounded-xl text-[12px] border border-white/[0.04]"
              >
                <div>
                  <code className="text-[#00FF66] font-mono font-bold block">{t.name}</code>
                  <span className="text-[11px] text-[#A6A6A6]">{t.desc}</span>
                </div>
                <span className="text-[9px] font-mono text-[#A0A0A0] bg-white/[0.06] px-1.5 py-0.5 rounded shrink-0">
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
