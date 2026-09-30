import React, { useState } from 'react';
import {
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  Layers,
} from 'lucide-react';

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
        <span className="inline-flex items-center rounded border border-[#00FF66]/40 bg-[#00FF66]/10 px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-[#00FF66] uppercase">
          MÓVEL 4G
        </span>
      );
    case 'socks5':
      return (
        <span className="inline-flex items-center rounded border border-[#4cc9f0]/30 bg-[#1d3557]/60 px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-[#4cc9f0] uppercase">
          SOCKS5
        </span>
      );
    case 'https':
      return (
        <span className="inline-flex items-center rounded border border-[#c77dff]/30 bg-[#3c096c]/60 px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-[#c77dff] uppercase">
          HTTPS
        </span>
      );
    case 'http':
    default:
      return (
        <span className="inline-flex items-center rounded border border-[#9ef01a]/30 bg-[#143601]/60 px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-[#9ef01a] uppercase">
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

  const rowBg = isSelected
    ? 'bg-[#00FF66]/16 border-l-2 border-l-[#00FF66]'
    : isStriped
      ? 'bg-[#2C2D33] hover:bg-[#484848]'
      : 'bg-[#383838] hover:bg-[#484848]';

  const stickyBg = isSelected
    ? 'bg-[#171c20]'
    : isStriped
      ? 'bg-[#2C2D33] group-hover:bg-[#484848]'
      : 'bg-[#383838] group-hover:bg-[#484848]';

  const isOnline = proxy.status === 'active';

  return (
    <tr
      className={`group h-[60px] border-b border-[#44444C] transition-colors ${rowBg}`}
    >
      {/* 1. Checkbox */}
      <td className="w-[38px] max-w-[38px] min-w-[38px] px-3.5 py-2.5 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(proxy.id)}
          className="h-3.5 w-3.5 cursor-pointer rounded accent-[#00FF66]"
        />
      </td>

      {/* 2. Nº / ID */}
      <td className="w-[70px] min-w-[70px] px-3.5 py-2.5 font-mono text-xs font-semibold whitespace-nowrap text-white">
        #{String((index ?? 0) + 1).padStart(2, '0')}
      </td>

      {/* 3. Nome do Proxy */}
      <td
        className="w-[200px] min-w-[200px] cursor-pointer px-3.5 py-2.5 whitespace-nowrap"
        onClick={() => onEdit(proxy)}
        title="Editar proxy"
      >
        <div className="flex items-center gap-2">
          <Globe size={14} className="shrink-0 text-[#9EA2AE]" />
          <span className="max-w-[150px] truncate text-xs font-semibold tracking-wide text-white">
            {proxy.name}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(proxy);
            }}
            className="ml-auto flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded text-[#71717a] opacity-0 transition-all group-hover:opacity-100 hover:bg-[#383A44] hover:text-white"
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
          <span className="text-[12px] font-semibold text-white">
            {proxy.host}
          </span>
          <span className="text-[#8E92A2]">:</span>
          <span className="text-[12px] text-[#C8CBD4]">{proxy.port}</span>
        </div>
      </td>

      {/* 6. Credenciais (Usuário / Senha) */}
      <td className="w-[180px] min-w-[180px] px-3.5 py-2.5 whitespace-nowrap">
        {proxy.user ? (
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span
              className="max-w-[70px] truncate text-[#C8CBD4]"
              title={proxy.user}
            >
              {proxy.user}
            </span>
            <span className="text-[#6C6F7E]">:</span>
            <div className="flex items-center gap-1">
              <span className="text-[#9EA2AE]">
                {showPassword ? proxy.pass : '••••••'}
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="cursor-pointer text-[#6C6F7E] transition-colors hover:text-white"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
            </div>
          </div>
        ) : (
          <span className="text-[11px] text-[#717482] italic">
            Sem autenticação
          </span>
        )}
      </td>

      {/* 7. Localização / IP */}
      <td className="w-[180px] min-w-[180px] px-3.5 py-2.5 whitespace-nowrap">
        <div className="flex flex-col leading-tight">
          <span className="text-[11.5px] font-medium text-white">
            {proxy.country || 'Desconhecido'}
          </span>
          <span className="font-mono text-[10px] text-[#9EA2AE]">
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
        <div className="flex items-center gap-1.5 text-xs text-[#C8CBD4]">
          <Layers size={13} className="text-[#8E92A2]" />
          <span>{proxy.usageCount || 0} perfis</span>
        </div>
      </td>

      {/* 10. Última Checagem */}
      <td className="w-[130px] min-w-[130px] px-3.5 py-2.5 whitespace-nowrap">
        <span className="font-mono text-[11px] text-[#9EA2AE]">
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
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-[#9EA2AE] transition-all hover:bg-[#383A44] hover:text-white"
            title="Editar Proxy"
          >
            <Pencil size={13} />
          </button>

          {/* Botão Excluir */}
          <button
            type="button"
            onClick={() => onDelete(proxy.id)}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-[#9EA2AE] transition-all hover:bg-[#ef4444]/15 hover:text-[#ef4444]"
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

