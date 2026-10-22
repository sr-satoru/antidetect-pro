import React, { useState } from 'react';
import {
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  Layers,
} from 'lucide-react';
import { Checkbox } from '../ui/checkbox';

export interface LinhaTabelaProxiesProps {
  proxy: any;
  isSelected: boolean;
  index?: number;
  onSelect: (id: string | number) => void;
  onTest?: (id: string | number) => void;
  onEdit: (proxy: any) => void;
  onDelete: (id: string | number) => void;
}

const renderProtocolBadge = (type: string) => {
  const t = (type || 'socks5').toLowerCase();
  switch (t) {
    case 'mobile':
    case 'movel':
      return (
        <span className="inline-flex items-center rounded border border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:border-[#00FF66]/30 dark:bg-[#00FF66]/10 px-2 py-0.5 text-[10.5px] font-bold tracking-wide dark:text-[#00FF66] uppercase">
          MÓVEL 4G
        </span>
      );
    case 'socks5':
      return (
        <span className="inline-flex items-center rounded border border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-slate-800 dark:text-white uppercase">
          SOCKS5
        </span>
      );
    case 'https':
      return (
        <span className="inline-flex items-center rounded border border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-bold tracking-wide dark:text-emerald-400 uppercase">
          HTTPS
        </span>
      );
    case 'http':
    default:
      return (
        <span className="inline-flex items-center rounded border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-slate-600 dark:text-[#C8CBD4] uppercase">
          HTTP
        </span>
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
  const isStriped = index % 2 === 1;

  // Cores do Zebrado e Seleção Adaptativas
  const rowBg = isSelected
    ? 'bg-emerald-50/60 dark:bg-emerald-950/25 border-l-[3px] border-l-[#238636] dark:border-l-[#2ea043]'
    : isStriped
      ? 'bg-slate-50/70 dark:bg-[#1F2027] hover:bg-slate-100/80 dark:hover:bg-white/[0.04]'
      : 'bg-white dark:bg-[#181920] hover:bg-slate-100/80 dark:hover:bg-white/[0.04]';

  const stickyBg = isSelected
    ? 'bg-slate-100 dark:bg-[#262832]'
    : isStriped
      ? 'bg-slate-50/70 dark:bg-[#1F2027] group-hover:bg-slate-100 dark:group-hover:bg-[#262832]'
      : 'bg-white dark:bg-[#181920] group-hover:bg-slate-100 dark:group-hover:bg-[#262832]';

  const isOnline = proxy.status === 'active';

  return (
    <tr
      className={`group h-[60px] border-b border-slate-100 dark:border-white/[0.07] transition-colors ${rowBg}`}
    >
      {/* 1. Checkbox */}
      <td
        className="w-[44px] min-w-[44px] max-w-[44px] px-2 py-2.5 text-center"
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
      <td className="w-[70px] min-w-[70px] px-3.5 py-2.5 font-mono text-xs font-semibold whitespace-nowrap text-slate-900 dark:text-white">
        #{String((index ?? 0) + 1).padStart(2, '0')}
      </td>

      {/* 3. Nome do Proxy */}
      <td
        className="w-[200px] min-w-[200px] cursor-pointer px-3.5 py-2.5 whitespace-nowrap"
        onClick={() => onEdit(proxy)}
        title="Editar proxy"
      >
        <div className="flex items-center gap-2">
          <Globe size={14} className="shrink-0 text-slate-400 dark:text-[#9EA2AE]" />
          <span className="max-w-[150px] truncate text-xs font-semibold tracking-wide text-slate-900 dark:text-white">
            {proxy.name}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(proxy);
            }}
            className="ml-auto flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded text-slate-400 dark:text-[#8E92A2] opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white"
          >
            <Pencil size={11} />
          </button>
        </div>
      </td>

      {/* 4. Protocolo */}
      <td className="w-[100px] min-w-[100px] px-3.5 py-2.5 whitespace-nowrap">
        {renderProtocolBadge(proxy.type)}
      </td>

      {/* 5. Host & Porta */}
      <td className="w-[210px] min-w-[210px] px-3.5 py-2.5 whitespace-nowrap">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-[12px] font-semibold text-slate-900 dark:text-white">
            {proxy.host}
          </span>
          <span className="text-slate-400 dark:text-[#8E92A2]">:</span>
          <span className="text-[12px] text-slate-600 dark:text-[#C8CBD4]">{proxy.port}</span>
        </div>
      </td>

      {/* 6. Credenciais (Usuário / Senha) */}
      <td className="w-[180px] min-w-[180px] px-3.5 py-2.5 whitespace-nowrap">
        {proxy.user ? (
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span
              className="max-w-[70px] truncate text-slate-700 dark:text-[#C8CBD4]"
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
                className="cursor-pointer text-slate-400 dark:text-[#6C6F7E] transition-colors hover:text-slate-700 dark:hover:text-white"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
            </div>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400 dark:text-[#717482] italic">
            Sem autenticação
          </span>
        )}
      </td>

      {/* 7. Localização / IP */}
      <td className="w-[180px] min-w-[180px] px-3.5 py-2.5 whitespace-nowrap">
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
      <td className="w-[130px] min-w-[130px] px-3.5 py-2.5 whitespace-nowrap">
        {isOnline ? (
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
            <span className="text-[11.5px] font-medium text-[#10b981]">
              {proxy.ping ? `${proxy.ping}ms` : 'Ativo'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
            <span className="text-[11.5px] font-medium text-[#ef4444]">
              Falha
            </span>
          </div>
        )}
      </td>

      {/* 9. Perfis Vinculados */}
      <td className="w-[120px] min-w-[120px] px-3.5 py-2.5 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#C8CBD4]">
          <Layers size={13} className="text-slate-400 dark:text-[#8E92A2]" />
          <span>{proxy.usageCount || 0} perfis</span>
        </div>
      </td>

      {/* 10. Última Checagem */}
      <td className="w-[130px] min-w-[130px] px-3.5 py-2.5 whitespace-nowrap">
        <span className="font-mono text-[11px] text-slate-500 dark:text-[#9EA2AE]">
          {proxy.lastChecked || '-'}
        </span>
      </td>

      {/* 11. Ações (Editar, Excluir) - Sticky */}
      <td
        className={`sticky right-0 z-10 w-[120px] max-w-[120px] min-w-[120px] px-3 py-2.5 transition-colors ${stickyBg}`}
      >
        <div className="flex items-center justify-center gap-1.5">
          {/* Botão Editar */}
          <button
            type="button"
            onClick={() => onEdit(proxy)}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-slate-400 dark:text-[#9EA2AE] transition-all hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white"
            title="Editar Proxy"
          >
            <Pencil size={13} />
          </button>

          {/* Botão Excluir */}
          <button
            type="button"
            onClick={() => onDelete(proxy.id)}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-slate-400 dark:text-[#9EA2AE] transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-[#ef4444]/15 dark:hover:text-[#ef4444]"
            title="Excluir Proxy"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default LinhaTabelaProxies;

