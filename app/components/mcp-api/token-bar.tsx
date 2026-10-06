import React, { useState } from 'react';
import { Key, Copy, Check, Eye, EyeOff, RefreshCw, ShieldCheck, Lock, Globe } from 'lucide-react';

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
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(baseUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-[#13141C] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm shadow-slate-200/50 dark:shadow-[0_12px_40px_-5px_rgba(0,0,0,0.7)] space-y-4 transition-all">
      {/* Top row: Title and Security Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-[#00FF66]/15 border border-emerald-200 dark:border-[#00FF66]/30 flex items-center justify-center text-emerald-600 dark:text-[#00FF66] shadow-xs">
            <Lock size={17} />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Autenticação Local & Credenciais
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                <ShieldCheck size={12} />
                Proteção Ativa
              </span>
            </h2>
            <p className="text-[12px] text-slate-600 dark:text-[#B0B0B0]">
              Credenciais exclusivas para IA (Claude Desktop, Cursor) e scripts Playwright.
            </p>
          </div>
        </div>

        {/* Security tags */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium bg-slate-50 dark:bg-[#181922] text-slate-700 dark:text-[#E0E0E0] border border-slate-200 dark:border-white/10 shadow-xs">
            <Globe size={12} className="text-emerald-600 dark:text-[#00FF66]" />
            Loopback 127.0.0.1
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium bg-slate-50 dark:bg-[#181922] text-slate-700 dark:text-[#E0E0E0] border border-slate-200 dark:border-white/10 shadow-xs">
            <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400" />
            Permissão 0600
          </span>
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* API Base URL */}
        <div className="lg:col-span-4 space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-[#B5B5B5] flex items-center justify-between">
            <span>Endereço Base da API</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium lowercase">porta: {apiPort}</span>
          </label>
          <div className="flex items-center bg-slate-50 dark:bg-[#0C0D12] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus-within:border-emerald-500 dark:focus-within:border-white/60 focus-within:ring-1 focus-within:ring-emerald-500/20 dark:focus-within:ring-white/15 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white font-mono transition-colors shadow-xs">
            <span className="flex-1 truncate select-all">{baseUrl}</span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="ml-2 p-1.5 text-slate-400 hover:text-emerald-600 dark:text-[#B0B0B0] dark:hover:text-[#00FF66] hover:bg-slate-200/60 dark:hover:bg-[#1E202B] rounded-lg transition-all cursor-pointer"
              title="Copiar URL"
            >
              {copiedUrl ? <Check size={15} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={15} />}
            </button>
          </div>
        </div>

        {/* Bearer Token */}
        <div className="lg:col-span-8 space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-[#B5B5B5] flex items-center justify-between">
            <span>Bearer Token Secreto</span>
            <span className="text-emerald-600 dark:text-[#00FF66] font-medium lowercase">anti-CSRF blindado</span>
          </label>
          <div className="flex items-center bg-slate-50 dark:bg-[#0C0D12] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus-within:border-emerald-500 dark:focus-within:border-white/60 focus-within:ring-1 focus-within:ring-emerald-500/20 dark:focus-within:ring-white/15 rounded-xl px-3.5 py-2 text-[13px] text-slate-900 dark:text-white font-mono gap-2 transition-colors shadow-xs">
            <Key size={15} className="text-amber-500 dark:text-[#00FF66] shrink-0" />
            <input
              type={showToken ? 'text' : 'password'}
              readOnly
              value={token}
              className="bg-transparent flex-1 outline-none text-[13px] text-slate-800 dark:text-[#EDEDED] font-mono select-all truncate"
            />
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:text-[#B0B0B0] dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#1E202B] rounded-lg transition-all cursor-pointer"
                title={showToken ? 'Ocultar token' : 'Revelar token'}
              >
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                type="button"
                onClick={handleCopyToken}
                className="p-1.5 text-slate-400 hover:text-emerald-600 dark:text-[#B0B0B0] dark:hover:text-[#00FF66] hover:bg-slate-200/60 dark:hover:bg-[#1E202B] rounded-lg transition-all cursor-pointer"
                title="Copiar token"
              >
                {copiedToken ? <Check size={15} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={15} />}
              </button>
              {onRefreshToken && (
                <button
                  type="button"
                  onClick={onRefreshToken}
                  className="p-1.5 text-slate-400 hover:text-amber-600 dark:text-[#B0B0B0] dark:hover:text-amber-400 hover:bg-slate-200/60 dark:hover:bg-[#1E202B] rounded-lg transition-all ml-1 border-l border-slate-200 dark:border-white/10 pl-2 cursor-pointer"
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
