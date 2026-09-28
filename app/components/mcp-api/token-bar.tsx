import React, { useState } from 'react';
import { Key, Copy, Check, Eye, EyeOff, RefreshCw, ShieldCheck, Lock, Globe } from 'lucide-react';
import { toast } from '@/components/ui/notification';

interface TokenBarProps {
  apiPort?: number;
  token?: string;
  onRefreshToken?: () => void;
}

export const TokenBar: React.FC<TokenBarProps> = ({
  apiPort = 18922,
  token = 'star_sec_8f92a10b48c34791a82f091c7823e4590d1e345f8a213904',
  onRefreshToken,
}) => {
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const baseUrl = `http://127.0.0.1:${apiPort}`;

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    toast.success('Token de automação copiado!');
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(baseUrl);
    setCopiedUrl(true);
    toast.success('Endereço base da API copiado!');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="bg-[#383838]/75 backdrop-blur-xl border border-[#525252]/60 rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] space-y-4 transition-all">
      {/* Top row: Title and Security Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#4d4d4d]/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#DFE104]/15 border border-[#DFE104]/30 flex items-center justify-center text-[#DFE104] shadow-[0_0_16px_rgba(223,225,4,0.18)]">
            <Lock size={17} />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-white flex items-center gap-2">
              Autenticação Local & Credenciais
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 backdrop-blur-sm">
                <ShieldCheck size={12} />
                Proteção Ativa
              </span>
            </h2>
            <p className="text-[12px] text-[#B0B0B0]">
              Credenciais exclusivas para IA (Claude Desktop, Cursor) e scripts Playwright.
            </p>
          </div>
        </div>

        {/* Security tags */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium bg-[#454545]/70 text-[#E0E0E0] border border-[#5a5a5a]/70 backdrop-blur-sm shadow-xs">
            <Globe size={12} className="text-[#DFE104]" />
            Loopback 127.0.0.1
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium bg-[#454545]/70 text-[#E0E0E0] border border-[#5a5a5a]/70 backdrop-blur-sm shadow-xs">
            <ShieldCheck size={12} className="text-emerald-400" />
            Permissão 0600
          </span>
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* API Base URL */}
        <div className="lg:col-span-4 space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[#B5B5B5] flex items-center justify-between">
            <span>Endereço Base da API</span>
            <span className="text-emerald-400 font-medium lowercase">porta: {apiPort}</span>
          </label>
          <div className="flex items-center bg-[#2c2c2c]/90 backdrop-blur-md border border-[#4d4d4d]/80 hover:border-[#606060] focus-within:border-[#DFE104]/70 rounded-xl px-3.5 py-2.5 text-[13px] text-white font-mono transition-colors shadow-inner">
            <span className="flex-1 truncate select-all">{baseUrl}</span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="ml-2 p-1.5 text-[#B0B0B0] hover:text-[#DFE104] hover:bg-[#454545] rounded-lg transition-all"
              title="Copiar URL"
            >
              {copiedUrl ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
            </button>
          </div>
        </div>

        {/* Bearer Token */}
        <div className="lg:col-span-8 space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[#B5B5B5] flex items-center justify-between">
            <span>Bearer Token Secreto</span>
            <span className="text-[#DFE104] font-medium lowercase">anti-CSRF blindado</span>
          </label>
          <div className="flex items-center bg-[#2c2c2c]/90 backdrop-blur-md border border-[#4d4d4d]/80 hover:border-[#606060] focus-within:border-[#DFE104]/70 rounded-xl px-3.5 py-2 text-[13px] text-white font-mono gap-2 transition-colors shadow-inner">
            <Key size={15} className="text-[#DFE104] shrink-0" />
            <input
              type={showToken ? 'text' : 'password'}
              readOnly
              value={token}
              className="bg-transparent flex-1 outline-none text-[13px] text-[#EDEDED] font-mono select-all truncate"
            />
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="p-1.5 text-[#B0B0B0] hover:text-white hover:bg-[#454545] rounded-lg transition-all"
                title={showToken ? 'Ocultar token' : 'Revelar token'}
              >
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                type="button"
                onClick={handleCopyToken}
                className="p-1.5 text-[#B0B0B0] hover:text-[#DFE104] hover:bg-[#454545] rounded-lg transition-all"
                title="Copiar token"
              >
                {copiedToken ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              </button>
              {onRefreshToken && (
                <button
                  type="button"
                  onClick={onRefreshToken}
                  className="p-1.5 text-[#B0B0B0] hover:text-amber-400 hover:bg-[#454545] rounded-lg transition-all ml-1 border-l border-[#4d4d4d] pl-2"
                  title="Gerar novo token"
                >
                  <RefreshCw size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
