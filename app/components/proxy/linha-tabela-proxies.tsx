import React, { useState } from 'react';
import {
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  Layers,
  RotateCw,
  Copy,
  Check,
  Smartphone,
  Shield,
  Lock,
  Loader2,
} from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../ui/tooltip';
import { toast } from '../ui/notification';

export interface LinhaTabelaProxiesProps {
  proxy: any;
  isSelected: boolean;
  index?: number;
  onSelect: (id: string | number) => void;
  onTest?: (id: string | number) => void | Promise<void>;
  onEdit: (proxy: any) => void;
  onDelete: (id: string | number) => void;
}

const renderProtocolBadge = (type: string) => {
  const t = (type || 'socks5').toLowerCase();
  switch (t) {
    case 'mobile':
    case 'movel':
      return (
        <Badge variant="success" className="gap-1 font-mono text-[10px] tracking-wide uppercase font-bold">
          <Smartphone size={11} />
          MÓVEL 4G
        </Badge>
      );
    case 'socks5':
      return (
        <Badge variant="secondary" className="gap-1 font-mono text-[10px] tracking-wide uppercase font-bold text-slate-800 dark:text-white">
          <Shield size={11} />
          SOCKS5
        </Badge>
      );
    case 'https':
      return (
        <Badge variant="info" className="gap-1 font-mono text-[10px] tracking-wide uppercase font-bold">
          <Lock size={11} />
          HTTPS
        </Badge>
      );
    case 'http':
    default:
      return (
        <Badge variant="outline" className="gap-1 font-mono text-[10px] tracking-wide uppercase font-bold text-slate-600 dark:text-[#C8CBD4]">
          <Globe size={11} />
          HTTP
        </Badge>
      );
  }
};

export const LinhaTabelaProxies: React.FC<LinhaTabelaProxiesProps> = ({
  proxy,
  isSelected,
  index = 0,
  onSelect,
  onTest,
  onEdit,
  onDelete,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTestingRow, setIsTestingRow] = useState(false);

  const isStriped = index % 2 === 1;

  // Background adaptativo para linhas
  const rowBg = isSelected
    ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-l-[3px] border-l-[#238636] dark:border-l-[#2ea043]'
    : isStriped
      ? 'bg-slate-50/60 dark:bg-[#1A1B23] hover:bg-slate-100/80 dark:hover:bg-white/[0.04]'
      : 'bg-white dark:bg-[#181920] hover:bg-slate-100/80 dark:hover:bg-white/[0.04]';

  const stickyBg = isSelected
    ? 'bg-slate-100 dark:bg-[#222430]'
    : isStriped
      ? 'bg-slate-50/60 dark:bg-[#1A1B23] group-hover:bg-slate-100 dark:group-hover:bg-[#222430]'
      : 'bg-white dark:bg-[#181920] group-hover:bg-slate-100 dark:group-hover:bg-[#222430]';

  const isOnline = proxy.status === 'active';
  const isChecking = proxy.status === 'checking' || isTestingRow;

  const handleCopyProxy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    let text = `${proxy.host}:${proxy.port}`;
    if (proxy.user && proxy.pass) {
      text = `${proxy.user}:${proxy.pass}@${proxy.host}:${proxy.port}`;
    }
    const fullUrl = `${(proxy.type || 'socks5').toLowerCase()}://${text}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('Proxy copiado para a área de transferência');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar o proxy');
    }
  };

  const handleRowTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onTest || isTestingRow) return;
    setIsTestingRow(true);
    try {
      await onTest(proxy.id);
    } finally {
      setIsTestingRow(false);
    }
  };

  return (
    <tr
      className={`group h-[56px] border-b border-slate-100 dark:border-white/[0.06] transition-colors ${rowBg}`}
    >
      {/* 1. Checkbox */}
      <td
        className="w-[44px] min-w-[44px] max-w-[44px] px-2 py-2 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center">
          <Checkbox
            checked={isSelected}
            onChange={() => onSelect(proxy.id)}
            aria-label={`Selecionar proxy ${proxy.name || proxy.id}`}
          />
        </div>
      </td>

      {/* 2. Nº / ID */}
      <td className="w-[70px] min-w-[70px] px-3.5 py-2 font-mono text-xs font-semibold whitespace-nowrap text-slate-800 dark:text-white">
        #{String((index ?? 0) + 1).padStart(2, '0')}
      </td>

      {/* 3. Nome do Proxy */}
      <td
        className="w-[210px] min-w-[210px] cursor-pointer px-3.5 py-2 whitespace-nowrap"
        onClick={() => onEdit(proxy)}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-[#9EA2AE]">
            <Globe size={13} />
          </div>
          <span
            className="max-w-[140px] truncate text-xs font-semibold tracking-wide text-slate-900 dark:text-white hover:text-[#238636] dark:hover:text-[#2ea043] transition-colors"
            title={proxy.name || `Proxy ${proxy.host}`}
          >
            {proxy.name || `Proxy ${proxy.host}`}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(proxy);
            }}
            className="ml-auto flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-slate-400 dark:text-[#8E92A2] opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-200/80 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white"
            title="Editar proxy"
          >
            <Pencil size={11} />
          </button>
        </div>
      </td>

      {/* 4. Protocolo */}
      <td className="w-[110px] min-w-[110px] px-3.5 py-2 whitespace-nowrap">
        {renderProtocolBadge(proxy.type)}
      </td>

      {/* 5. Host & Porta com Botão Rápido de Copiar */}
      <td className="w-[210px] min-w-[210px] px-3.5 py-2 whitespace-nowrap">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-[12px] font-semibold text-slate-900 dark:text-white">
            {proxy.host}
          </span>
          <span className="text-slate-400 dark:text-[#8E92A2]">:</span>
          <span className="text-[12px] text-slate-600 dark:text-[#C8CBD4]">
            {proxy.port}
          </span>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={handleCopyProxy}
                  className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:text-[#7A7E90] dark:hover:text-white transition-colors cursor-pointer opacity-0 group-hover:opacity-100 ml-1"
                >
                  {copied ? (
                    <Check size={11} className="text-emerald-500" />
                  ) : (
                    <Copy size={11} />
                  )}
                </button>
              }
            />
            <TooltipContent side="top">
              {copied ? 'Copiado!' : 'Copiar URL completa'}
            </TooltipContent>
          </Tooltip>
        </div>
      </td>

      {/* 6. Credenciais (Usuário / Senha) */}
      <td className="w-[180px] min-w-[180px] px-3.5 py-2 whitespace-nowrap">
        {proxy.user ? (
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span
              className="max-w-[70px] truncate font-medium text-slate-700 dark:text-[#C8CBD4]"
              title={proxy.user}
            >
              {proxy.user}
            </span>
            <span className="text-slate-400 dark:text-[#6C6F7E]">:</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 dark:text-[#9EA2AE]">
                {showPassword ? proxy.pass : '••••••'}
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="cursor-pointer text-slate-400 dark:text-[#6C6F7E] transition-colors hover:text-slate-700 dark:hover:text-white p-0.5 rounded"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
            </div>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400 dark:text-[#6C7082] italic">
            Sem autenticação
          </span>
        )}
      </td>

      {/* 7. Localização / IP */}
      <td className="w-[180px] min-w-[180px] px-3.5 py-2 whitespace-nowrap">
        <div className="flex flex-col leading-tight">
          <span className="text-[11.5px] font-medium text-slate-900 dark:text-white">
            {proxy.country || 'Desconhecido'}
          </span>
          <span className="font-mono text-[10px] text-slate-500 dark:text-[#9EA2AE]">
            {proxy.city ? `${proxy.city} • ` : ''}
            {proxy.ip || proxy.host}
          </span>
        </div>
      </td>

      {/* 8. Status & Latência */}
      <td className="w-[130px] min-w-[130px] px-3.5 py-2 whitespace-nowrap">
        {isChecking ? (
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-[#A6ABB9]">
            <Loader2 size={12} className="animate-spin text-[#238636] dark:text-[#2ea043]" />
            <span className="text-[11px] font-medium">Testando...</span>
          </div>
        ) : isOnline ? (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10b981]" />
            </span>
            <span className="text-[11.5px] font-semibold text-[#10b981]">
              {proxy.ping ? `${proxy.ping}ms` : 'Ativo'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
            <span className="text-[11.5px] font-semibold text-[#ef4444]">
              Falha
            </span>
          </div>
        )}
      </td>

      {/* 9. Perfis Vinculados */}
      <td className="w-[120px] min-w-[120px] px-3.5 py-2 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#C8CBD4]">
          <Layers size={13} className="text-slate-400 dark:text-[#8E92A2]" />
          <span>{proxy.usageCount || 0} {proxy.usageCount === 1 ? 'perfil' : 'perfis'}</span>
        </div>
      </td>

      {/* 10. Última Checagem */}
      <td className="w-[130px] min-w-[130px] px-3.5 py-2 whitespace-nowrap">
        <span className="font-mono text-[11px] text-slate-500 dark:text-[#9EA2AE]">
          {proxy.lastChecked || '-'}
        </span>
      </td>

      {/* 11. Ações (Testar, Editar, Excluir) - Sticky */}
      <td
        className={`sticky right-0 z-10 w-[120px] max-w-[120px] min-w-[120px] px-3 py-2 transition-colors ${stickyBg}`}
      >
        <div className="flex items-center justify-center gap-1">
          {/* Botão Testar Conexão Direto */}
          <Tooltip content="Testar conexão deste proxy">
            <button
              type="button"
              onClick={handleRowTest}
              disabled={isChecking}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-500 dark:text-[#A6ABB9] transition-all hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/15 dark:hover:text-[#2ea043] disabled:opacity-50"
              aria-label="Testar Proxy"
            >
              {isChecking ? (
                <Loader2 size={13} className="animate-spin text-emerald-500" />
              ) : (
                <RotateCw size={13} />
              )}
            </button>
          </Tooltip>

          {/* Botão Editar */}
          <Tooltip content="Editar configurações">
            <button
              type="button"
              onClick={() => onEdit(proxy)}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-500 dark:text-[#A6ABB9] transition-all hover:bg-slate-200/80 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
              aria-label="Editar Proxy"
            >
              <Pencil size={13} />
            </button>
          </Tooltip>

          {/* Botão Excluir */}
          <Tooltip content="Excluir proxy">
            <button
              type="button"
              onClick={() => onDelete(proxy.id)}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-500 dark:text-[#A6ABB9] transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-[#ef4444]/15 dark:hover:text-[#ef4444]"
              aria-label="Excluir Proxy"
            >
              <Trash2 size={13} />
            </button>
          </Tooltip>
        </div>
      </td>
    </tr>
  );
};

export default LinhaTabelaProxies;
