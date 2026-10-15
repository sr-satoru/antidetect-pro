import React, { useState, useEffect } from 'react';
import { Key, Copy, Check, Eye, EyeOff, RefreshCw } from 'lucide-react';
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
  const [isRotating, setIsRotating] = useState(false);

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
    if (!activeToken) return;
    navigator.clipboard.writeText(activeToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleRotateToken = async () => {
    if (isRotating) return;
    setIsRotating(true);
    try {
      const res = await serviceMcp.rotateToken();
      if (res?.token) {
        setToken(res.token);
        onTokenChange?.(res.token);
      }
    } catch (err) {
      console.error('Falha ao rotacionar token:', err);
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Secret Token Pill */}
      <div className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 dark:bg-[#13141B] dark:hover:bg-[#181922] dark:border-white/10 rounded-xl px-3 py-1.5 text-[12px] font-mono transition-all shadow-xs dark:shadow-none">
        <Key size={13} className="text-amber-500 dark:text-amber-400 shrink-0" />
        <span
          className={`text-slate-800 dark:text-[#D4D4D8] font-mono transition-all duration-200 ${
            !isTokenVisible ? 'filter blur-[4px] select-none opacity-80' : 'select-all'
          }`}
          title={!isTokenVisible ? 'Chave oculta na tela por segurança. O botão copiar copia o token completo normalmente.' : undefined}
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
            title="Copiar Token de Autenticação"
          >
            {copiedToken ? <Check size={13} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={13} />}
          </button>
          <button
            type="button"
            onClick={handleRotateToken}
            disabled={isRotating}
            className="text-slate-400 hover:text-amber-600 dark:text-[#8E8E93] dark:hover:text-amber-400 p-0.5 transition-colors cursor-pointer"
            title="Rotacionar Chave Secreta (Gera um novo token)"
          >
            <RefreshCw size={13} className={isRotating ? 'animate-spin text-amber-500' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompactCredentials;
