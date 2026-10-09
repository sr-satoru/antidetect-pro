import React, { useState, useEffect } from 'react';
import { Key, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { serviceMcp } from '@/services/mcp/service.mcp';

interface CompactCredentialsProps {
  apiPort?: number;
  token?: string;
  showToken?: boolean;
  onToggleShowToken?: () => void;
  onTokenChange?: (newToken: string) => void;
}

export const CompactCredentials: React.FC<CompactCredentialsProps> = ({
  token: initialToken,
  showToken: propShowToken,
  onToggleShowToken,
  onTokenChange,
}) => {
  const [token, setToken] = useState(initialToken || serviceMcp.getCachedToken());
  const [internalShowToken, setInternalShowToken] = useState(false);
  const isTokenVisible = propShowToken !== undefined ? propShowToken : internalShowToken;

  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    if (!initialToken) {
      serviceMcp.getInfo()
        .then((res) => {
          if (res?.token) {
            setToken(res.token);
            onTokenChange?.(res.token);
          }
        })
        .catch(() => {});
    }
  }, [initialToken, onTokenChange]);

  const activeToken = token || initialToken || serviceMcp.getCachedToken();

  const handleToggle = () => {
    if (onToggleShowToken) {
      onToggleShowToken();
    } else {
      setInternalShowToken((prev) => !prev);
    }
  };

  const handleCopyToken = () => {
    // Se a chave estiver com blur ativo (oculta), a chave vai no estado de vazia
    const textToCopy = isTokenVisible ? activeToken : '';
    navigator.clipboard.writeText(textToCopy);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="flex items-center">
      {/* Secret Token Pill */}
      <div className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 dark:bg-[#13141B] dark:hover:bg-[#181922] dark:border-white/10 rounded-xl px-3 py-1.5 text-[12px] font-mono transition-all shadow-xs dark:shadow-none">
        <Key size={13} className="text-amber-500 dark:text-amber-400 shrink-0" />
        <span
          className={`text-slate-800 dark:text-[#D4D4D8] font-mono transition-all duration-200 ${
            !isTokenVisible ? 'filter blur-[4px] select-none opacity-80' : 'select-all'
          }`}
          title={!isTokenVisible ? 'Chave oculta por segurança. Clique no ícone de olho para revelar.' : undefined}
        >
          {activeToken || 'Carregando chave...'}
        </span>
        <div className="flex items-center gap-1 border-l border-slate-200 dark:border-white/[0.08] pl-1.5 ml-0.5">
          <button
            type="button"
            onClick={handleToggle}
            className="text-slate-400 hover:text-slate-700 dark:text-[#8E92A2] dark:hover:text-white p-0.5 transition-colors cursor-pointer"
            title={isTokenVisible ? 'Ocultar' : 'Visualizar'}
          >
            {isTokenVisible ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          <button
            type="button"
            onClick={handleCopyToken}
            className="text-slate-400 hover:text-emerald-600 dark:text-[#8E8E93] dark:hover:text-[#00FF66] p-0.5 transition-colors cursor-pointer"
            title={isTokenVisible ? 'Copiar Token' : 'Copiar Token (Vazio enquanto oculto)'}
          >
            {copiedToken ? <Check size={13} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompactCredentials;
