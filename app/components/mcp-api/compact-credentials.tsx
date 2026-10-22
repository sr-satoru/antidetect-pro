import React, { useState, useEffect } from 'react';
import { Key, Copy, Check, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { serviceMcp } from '@/services/mcp/service.mcp';
import { Tooltip } from '@/components/ui/tooltip';

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
    <div className="flex items-center gap-2.5 select-none">
      {/* Secret Token Pill com fonte e padding confortáveis */}
      <div className="flex items-center gap-3 bg-white dark:bg-[#24252D] border border-slate-200 dark:border-[#353744] rounded-xl px-4 py-2 text-[14px] font-mono transition-all shadow-xs">
        <Key size={16} className="text-amber-500 dark:text-amber-400 shrink-0" />
        <span
          className={`text-slate-800 dark:text-[#E2E4EC] font-mono font-medium transition-all duration-200 ${
            !isTokenVisible ? 'filter blur-[4px] select-none opacity-80' : 'select-all'
          }`}
        >
          {activeToken || 'Carregando chave...'}
        </span>
        <div className="flex items-center gap-2 border-l border-slate-200 dark:border-[#353744] pl-2.5 ml-1">
          <Tooltip content={isTokenVisible ? 'Ocultar token' : 'Revelar token'} position="top">
            <button
              type="button"
              onClick={handleToggle}
              className="text-slate-400 hover:text-slate-700 dark:text-[#90909D] dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              {isTokenVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </Tooltip>

          <Tooltip content={copiedToken ? 'Copiado!' : 'Copiar token de autenticação'} position="top">
            <button
              type="button"
              onClick={handleCopyToken}
              className="text-slate-400 hover:text-[#238636] dark:text-[#90909D] dark:hover:text-[#2ea043] p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer"
            >
              {copiedToken ? <Check size={16} className="text-[#238636] dark:text-[#2ea043]" /> : <Copy size={16} />}
            </button>
          </Tooltip>

          <Tooltip content="Rotacionar chave (gera novo token)" position="top">
            <button
              type="button"
              onClick={handleRotateToken}
              disabled={isRotating}
              className="text-slate-400 hover:text-amber-600 dark:text-[#90909D] dark:hover:text-amber-400 p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={16} className={isRotating ? 'animate-spin text-amber-500' : ''} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default CompactCredentials;
