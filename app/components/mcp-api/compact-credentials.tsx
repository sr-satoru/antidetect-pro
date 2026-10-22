import React, { useState, useEffect } from 'react';
import { Key, Copy, Check, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { serviceMcp } from '@/services/mcp/service.mcp';
import { Tooltip } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/notification';
import { ConfirmModal } from '@/components/ui/confirm-modal';

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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

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
        toast.success('Chave de acesso rotacionada com sucesso!');
        setIsConfirmOpen(false);
      }
    } catch (err: any) {
      console.error('Falha ao rotacionar token:', err);
      toast.error('Erro ao rotacionar chave: ' + (err?.message || 'Falha na comunicação com o servidor'));
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <div className="flex items-center gap-2 select-none">
      {/* Secret Token Pill integrado perfeitamente ao header */}
      <div className="flex items-center gap-2 bg-white dark:bg-[#1A1B24] border border-slate-200/80 dark:border-white/[0.08] rounded-lg px-3 py-1.5 text-xs font-mono transition-all shadow-xs">
        <Key size={13} className="text-amber-500 dark:text-amber-400 shrink-0" />
        <span
          className={`text-slate-800 dark:text-[#E2E4EC] font-mono transition-all duration-200 ${
            !isTokenVisible ? 'filter blur-[4px] select-none opacity-80' : 'select-all'
          }`}
        >
          {activeToken || 'Carregando chave...'}
        </span>
        <div className="flex items-center gap-1 border-l border-slate-200/80 dark:border-white/[0.08] pl-1.5 ml-0.5">
          <Tooltip content={isTokenVisible ? 'Ocultar token' : 'Revelar token'} position="top">
            <button
              type="button"
              onClick={handleToggle}
              className="text-slate-400 hover:text-slate-700 dark:text-[#90909D] dark:hover:text-white p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              {isTokenVisible ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </Tooltip>

          <Tooltip content={copiedToken ? 'Copiado!' : 'Copiar token de autenticação'} position="top">
            <button
              type="button"
              onClick={handleCopyToken}
              className="text-slate-400 hover:text-[#238636] dark:text-[#90909D] dark:hover:text-[#2ea043] p-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer"
            >
              {copiedToken ? <Check size={13} className="text-[#238636] dark:text-[#2ea043]" /> : <Copy size={13} />}
            </button>
          </Tooltip>

          <Tooltip content="Rotacionar chave (gera novo token)" position="top">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={isRotating}
              className="text-slate-400 hover:text-amber-600 dark:text-[#90909D] dark:hover:text-amber-400 p-1 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={isRotating ? 'animate-spin text-amber-500' : ''} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Modal de Confirmação para Rotacionar Chave */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          if (!isRotating) setIsConfirmOpen(false);
        }}
        onConfirm={handleRotateToken}
        isLoading={isRotating}
        variant="warning"
        icon={<RefreshCw size={20} className={isRotating ? 'animate-spin' : ''} />}
        title="Rotacionar Chave de Acesso"
        confirmText={isRotating ? 'Rotacionando...' : 'Rotacionar Chave'}
        cancelText="Cancelar"
        description={
          <div className="space-y-2.5">
            <p>
              Deseja realmente gerar uma nova chave de acesso para a API e MCP?
            </p>
            <div className="rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 p-3 text-[11.5px] text-amber-800 dark:text-amber-300 leading-relaxed">
              <span className="font-semibold block mb-0.5">⚠️ Impacto da alteração:</span>
              A chave atual será invalidada imediatamente. Qualquer agente de IA (Cursor, Windsurf, Claude Desktop) ou script de automação Playwright conectado deixará de funcionar até que você configure o novo token.
            </div>
          </div>
        }
      />
    </div>
  );
};

export default CompactCredentials;
