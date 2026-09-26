import React from 'react';
import {
  Monitor,
  Apple,
  Bot,
  Smartphone,
  Tablet,
  ArrowLeftRight,
  Pencil,
  Play,
  Square,
  MoreVertical,
  Globe,
} from 'lucide-react';
export interface LinhaTabelaProps {
  profile: any;
  isSelected: boolean;
  index?: number;
  onSelect: (id: any) => void;
  onToggleRunning: (id: any) => void;
  onEdit: (profile: any) => void;
  onDelete: (id: any) => void;
  onOpenManager?: (profile: any) => void;
}

const OS_ICONS: Record<string, React.ReactNode> = {
  macos: <Apple size={14} className="shrink-0 text-[#71717a]" />,
  linux: <Bot size={14} className="shrink-0 text-[#71717a]" />,
  android: <Smartphone size={14} className="shrink-0 text-[#71717a]" />,
  ios: <Tablet size={14} className="shrink-0 text-[#71717a]" />,
  windows: <Monitor size={14} className="shrink-0 text-[#71717a]" />,
};

const renderPlatformBadge = (platformName: string): React.ReactNode => {
  const norm = (platformName || '').toLowerCase();
  switch (norm) {
    case 'google':
      return (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#EA4335] text-[9px] font-bold text-white shadow-xs">
          G
        </span>
      );
    case 'twitter':
    case 'x':
      return (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#444] bg-black text-[9px] font-bold text-white shadow-xs">
          𝕏
        </span>
      );
    case 'facebook':
    case 'meta':
      return (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0081FB] text-[10px] font-bold text-white shadow-xs">
          f
        </span>
      );
    case 'discord':
      return (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#5865F2] text-[9px] font-bold text-white shadow-xs">
          D
        </span>
      );
    case 'amazon':
      return (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#232F3E] text-[10px] font-bold text-white shadow-xs">
          a
        </span>
      );
    case 'instagram':
      return (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-[9px] font-bold text-white shadow-xs">
          ig
        </span>
      );
    case 'tiktok':
      return (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-black text-[9px] font-bold text-white shadow-xs">
          ♪
        </span>
      );
    case 'linkedin':
      return (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0A66C2] text-[9px] font-bold text-white shadow-xs">
          in
        </span>
      );
    default:
      return (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#383A44] text-[9px] font-bold text-[#D2D5DF]">
          {norm ? norm.charAt(0).toUpperCase() : '•'}
        </span>
      );
  }
};

const formatDateDisplay = (
  val?: number | string | null,
): { date: string; time: string } | null => {
  if (!val) return null;
  let d: Date;
  if (typeof val === 'number') {
    d = new Date(val * 1000);
  } else if (typeof val === 'string') {
    if (val.includes(' ')) {
      const parts = val.split(' ');
      return { date: parts[0], time: parts[1] || '' };
    }
    const num = Number(val);
    if (!isNaN(num) && num > 100000000) {
      d = new Date(num * 1000);
    } else {
      d = new Date(val);
    }
  } else {
    return null;
  }
  if (isNaN(d.getTime())) return null;

  return {
    date: d.toLocaleDateString('pt-BR'),
    time: d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
};

export const LinhaTabela: React.FC<LinhaTabelaProps> = ({
  profile,
  isSelected,
  index = 0,
  onSelect,
  onToggleRunning,
  onEdit,
  onDelete,
  onOpenManager,
}) => {
  const isStriped = index % 2 === 1;

  // Cores do Zebrado e Seleção
  const rowBg = isSelected
    ? 'bg-[#DFE104]/16 border-l-2 border-l-[#DFE104]'
    : isStriped
      ? 'bg-[#2C2D33] hover:bg-[#484848]'
      : 'bg-[#383838] hover:bg-[#484848]';

  const stickyBg = isSelected
    ? 'bg-[#171c20]'
    : isStriped
      ? 'bg-[#2C2D33] group-hover:bg-[#484848]'
      : 'bg-[#383838] group-hover:bg-[#484848]';

  const isRunning = profile.status === 'running' || profile.isRunning;
  const osKey = (profile.os || 'linux').toLowerCase();

  const idStr = String(profile.id || '');
  const idDisplay = idStr.length > 8 ? `${idStr.substring(0, 8)}...` : idStr;

  const proxyHost =
    profile.ip ||
    profile.proxy?.host ||
    (profile.proxy?.type && profile.proxy.type !== 'none'
      ? `${(profile.proxy.proxy_type || profile.proxy.type).toUpperCase()} Proxy`
      : 'DIRECT');

  const proxyTypeDesc =
    profile.proxy?.type && profile.proxy.type !== 'none'
      ? profile.proxy.host
        ? `${profile.proxy.type.toUpperCase()}:${profile.proxy.port || ''}`
        : profile.proxy.type.toUpperCase()
      : profile.country
        ? profile.country.toUpperCase()
        : 'NO PROXY';

  const isProxyConnected =
    profile.proxyConnected ||
    (profile.proxy?.type && profile.proxy.type !== 'none');

  const lastOpened = formatDateDisplay(
    profile.last_launch || profile.lastOpened,
  );
  const createdAt = formatDateDisplay(
    profile.created_at || profile.createdAt,
  ) || { date: 'Hoje', time: '' };

  const tagsList: string[] = Array.isArray(profile.tags)
    ? profile.tags
    : typeof profile.tags === 'string' && profile.tags
      ? profile.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];

  return (
    <tr
      className={`group h-[62px] border-b border-[#44444C] transition-colors ${rowBg}`}
    >
      {/* 1. Checkbox */}
      <td className="w-[38px] max-w-[38px] min-w-[38px] px-3.5 py-2.5 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(profile.id)}
          className="h-3.5 w-3.5 cursor-pointer rounded accent-[#DFE104]"
        />
      </td>

      {/* 2. Nº / ID */}
      <td
        className="w-[85px] min-w-[85px] px-3.5 py-2.5 font-mono text-xs font-semibold whitespace-nowrap text-white"
        title={idStr}
      >
        #{idDisplay}
      </td>

      {/* 3. Grupo */}
      <td className="w-[115px] min-w-[115px] px-3.5 py-2.5 text-[11px] font-medium whitespace-nowrap text-[#C8CBD4] uppercase">
        {(profile.group || 'Desagrupado').toUpperCase()}
      </td>

      {/* 4. Nome + OS */}
      <td
        className="w-[220px] min-w-[220px] cursor-pointer px-3.5 py-2.5 whitespace-nowrap"
        onClick={() => onEdit(profile)}
        title="Editar perfil"
      >
        <div className="flex items-center gap-2">
          {OS_ICONS[osKey] || OS_ICONS.windows}
          <span className="text-xs font-semibold tracking-wide text-white uppercase">
            {(profile.name || 'Sem nome').toUpperCase()}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(profile);
            }}
            className="ml-auto flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded text-[#71717a] opacity-0 transition-all group-hover:opacity-100 hover:bg-[#383A44] hover:text-white"
          >
            <Pencil size={11} />
          </button>
        </div>
      </td>

      {/* 5. Proxy / IP */}
      <td className="w-[220px] min-w-[220px] px-3.5 py-2.5 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <ArrowLeftRight size={12} className="shrink-0 text-[#9EA2AE]" />
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              isProxyConnected ? 'bg-[#10b981]' : 'bg-[#52525b]'
            }`}
          />
          <div className="flex flex-col leading-tight">
            <span className="font-mono text-[11px] font-semibold text-white">
              {proxyHost}
            </span>
            <span className="text-[10px] text-[#9EA2AE] uppercase">
              {proxyTypeDesc}
            </span>
          </div>
        </div>
      </td>

      {/* 6. Última Sessão */}
      <td className="w-[120px] min-w-[120px] px-3.5 py-2.5 whitespace-nowrap">
        {lastOpened ? (
          <div className="flex flex-col font-mono leading-tight">
            <span className="text-[11px] text-[#C8CBD4]">{lastOpened.date}</span>
            <span className="text-[10px] text-[#9EA2AE]">{lastOpened.time}</span>
          </div>
        ) : (
          <span className="text-[#9EA2AE]">-</span>
        )}
      </td>

      {/* 7. Plataforma */}
      <td className="w-[210px] min-w-[210px] px-3.5 py-2.5 whitespace-nowrap">
        {profile.platform && typeof profile.platform === 'object' && profile.platform.handle ? (
          <div className="flex items-center gap-2">
            {renderPlatformBadge(profile.platform.name || '')}
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-medium text-white uppercase">
                {String(profile.platform.handle).toUpperCase()}
              </span>
              <span className="text-[10px] text-[#9EA2AE]">
                @{profile.platform.handle}
              </span>
            </div>
          </div>
        ) : typeof profile.platform === 'string' && profile.platform ? (
          <span className="text-[11px] text-white uppercase">{profile.platform}</span>
        ) : (
          <span className="text-[#9EA2AE]">-</span>
        )}
      </td>

      {/* 8. Tags */}
      <td className="w-[190px] min-w-[190px] px-3.5 py-2.5 whitespace-nowrap">
        {tagsList.length > 0 ? (
          <div className="flex items-center gap-1 overflow-hidden">
            {tagsList.map((t: string) => (
              <span
                key={t}
                className="inline-block shrink-0 rounded border border-[#44444C] bg-[#282930] px-1.5 py-0.5 text-[10px] font-medium text-[#C8CBD4] uppercase transition-colors hover:border-[#DFE104] hover:text-[#DFE104]"
              >
                {t.toUpperCase()}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[#9EA2AE]">-</span>
        )}
      </td>

      {/* 9. Observação */}
      <td className="w-[170px] min-w-[170px] truncate px-3.5 py-2.5 text-xs whitespace-nowrap text-[#C8CBD4]">
        {profile.notes || '-'}
      </td>

      {/* 10. Criação */}
      <td className="w-[120px] min-w-[120px] px-3.5 py-2.5 whitespace-nowrap">
        <div className="flex flex-col font-mono leading-tight">
          <span className="text-[11px] text-[#C8CBD4]">{createdAt.date}</span>
          <span className="text-[10px] text-[#9EA2AE]">{createdAt.time}</span>
        </div>
      </td>

      {/* 11. Ação (Iniciar / Parar / Abas & Cookies) - Sticky */}
      <td
        className={`sticky right-[48px] z-10 w-[156px] max-w-[156px] min-w-[156px] px-2 py-2.5 transition-colors ${stickyBg}`}
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleRunning(profile.id)}
            className={`inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-1 rounded-md px-2 text-xs font-bold transition-all active:scale-[0.98] ${
              isRunning
                ? 'border border-[#ff334b]/35 bg-[#ff334b]/12 text-[#ff334b] hover:bg-[#ff334b] hover:text-black'
                : 'border border-[#DFE104]/35 bg-[#DFE104]/12 text-[#DFE104] hover:bg-[#DFE104] hover:text-black'
            }`}
          >
            {isRunning ? (
              <Square size={11} fill="currentColor" />
            ) : (
              <Play size={11} fill="currentColor" />
            )}
            <span>{isRunning ? 'Parar' : 'Iniciar'}</span>
          </button>

          {onOpenManager && (
            <button
              type="button"
              onClick={() => onOpenManager(profile)}
              className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-all ${
                isRunning
                  ? 'border-[#22c55e]/40 bg-[#22c55e]/15 text-[#4ade80] hover:bg-[#22c55e] hover:text-black'
                  : 'border-[#3E404D] bg-[#282930] text-[#9EA2AE] hover:border-[#DFE104] hover:text-[#DFE104]'
              }`}
              title="Inspecionar Abas, URLs ao vivo e Cookies"
            >
              <Globe size={13} className={isRunning ? 'animate-pulse' : ''} />
            </button>
          )}
        </div>
      </td>

      {/* 12. Menu / Mais Opções - Sticky */}
      <td
        className={`sticky right-0 z-10 w-[48px] max-w-[48px] min-w-[48px] px-2 py-2.5 text-center transition-colors ${stickyBg}`}
      >
        <button
          type="button"
          onClick={() => onEdit(profile)}
          className="mx-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[#9EA2AE] transition-all hover:bg-[#383A44] hover:text-white"
          title="Editar perfil"
        >
          <MoreVertical size={14} />
        </button>
      </td>
    </tr>
  );
};

export default LinhaTabela;

