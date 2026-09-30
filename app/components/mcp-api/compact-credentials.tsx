import React, { useState, useEffect } from 'react';
import { Key, Copy, Check, Eye, EyeOff, ShieldCheck, Globe, Bot } from 'lucide-react';
import { toast } from '@/components/ui/notification';
import { http, BACKEND_PORT } from '@/services/http';

interface CompactCredentialsProps {
  apiPort?: number;
  token?: string;
}

export const CompactCredentials: React.FC<CompactCredentialsProps> = ({
  apiPort = BACKEND_PORT,
  token: initialToken,
}) => {
  const [token, setToken] = useState(initialToken || '');
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedMcpUrl, setCopiedMcpUrl] = useState(false);

  useEffect(() => {
    if (!initialToken) {
      http.get<{ token: string; server_url: string }>('/mcp/info')
        .then((res) => {
          if (res?.token) {
            setToken(res.token);
            localStorage.setItem('star_mcp_token', res.token);
          }
        })
        .catch(() => {});
    }
  }, [initialToken]);

  const activeToken = token || initialToken || 'star_sec_loading';
  const baseUrl = `http://127.0.0.1:${apiPort}`;
  const mcpSseUrl = `http://127.0.0.1:${apiPort}/mcp/${activeToken}/sse`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(baseUrl);
    setCopiedUrl(true);
    toast.success('URL base copiada!');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(activeToken);
    setCopiedToken(true);
    toast.success('Token copiado!');
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCopyMcpUrl = () => {
    navigator.clipboard.writeText(mcpSseUrl);
    setCopiedMcpUrl(true);
    toast.success('URL MCP (SSE) copiada para a IDE!');
    setTimeout(() => setCopiedMcpUrl(false), 2000);
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* MCP SSE Direct URL Pill */}
      <button
        type="button"
        onClick={handleCopyMcpUrl}
        className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 dark:bg-[#122A1E] dark:hover:bg-[#183627] dark:border-[#00FF66]/30 rounded-xl px-3 py-1.5 text-[12px] font-mono transition-all shadow-xs cursor-pointer text-emerald-700 dark:text-[#00FF66]"
        title="Clique para copiar a URL direta do MCP (Server-Sent Events) para Claude Desktop, Cursor ou Antigravity"
      >
        <Bot size={13} className="text-emerald-600 dark:text-[#00FF66] shrink-0" />
        <span className="font-semibold text-[11px]">URL MCP Nativa</span>
        {copiedMcpUrl ? <Check size={13} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={13} />}
      </button>

      {/* Base URL Pill */}
      <div className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 dark:bg-[#13141B] dark:hover:bg-[#181922] dark:border-white/10 rounded-xl px-3 py-1.5 text-[12px] font-mono transition-all shadow-xs">
        <Globe size={13} className="text-emerald-600 dark:text-[#00FF66] shrink-0" />
        <span className="text-slate-800 dark:text-[#D4D4D8] select-all">{baseUrl}</span>
        <button
          type="button"
          onClick={handleCopyUrl}
          className="text-slate-400 hover:text-emerald-600 dark:text-[#8E8E93] dark:hover:text-[#00FF66] p-0.5 transition-colors cursor-pointer"
          title="Copiar URL Base"
        >
          {copiedUrl ? <Check size={13} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={13} />}
        </button>
      </div>

      {/* Secret Token Pill */}
      <div className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 dark:bg-[#13141B] dark:hover:bg-[#181922] dark:border-white/10 rounded-xl px-3 py-1.5 text-[12px] font-mono transition-all shadow-xs">
        <Key size={13} className="text-amber-500 dark:text-amber-400 shrink-0" />
        <span className="text-slate-800 dark:text-[#D4D4D8] select-all">
          {showToken ? activeToken : `${activeToken.substring(0, 14)}••••••••••`}
        </span>
        <div className="flex items-center gap-1 border-l border-slate-200 dark:border-white/[0.08] pl-1.5 ml-0.5">
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="text-slate-400 hover:text-slate-700 dark:text-[#8E92A2] dark:hover:text-white p-0.5 transition-colors cursor-pointer"
            title={showToken ? 'Ocultar' : 'Visualizar'}
          >
            {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          <button
            type="button"
            onClick={handleCopyToken}
            className="text-slate-400 hover:text-emerald-600 dark:text-[#8E8E93] dark:hover:text-[#00FF66] p-0.5 transition-colors cursor-pointer"
            title="Copiar Token"
          >
            {copiedToken ? <Check size={13} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* Security Tag */}
      <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium select-none">
        <ShieldCheck size={13} />
        <span>AES-GCM 0600</span>
      </div>
    </div>
  );
};

export default CompactCredentials;
