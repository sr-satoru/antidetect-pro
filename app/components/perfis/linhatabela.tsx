import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MenuAcoesPerfil } from './menu-acoes-perfil';
import { OsIcon } from '../ui/os-icon';
import { TagBadge } from '../tags/tag-badge';
import { serviceTags } from '../../services/tags/service.tags';
import { toast } from 'sonner';
import { servicePerfis } from '../../services/perfis/service.perfis';
import {
  ArrowLeftRight,
  Play,
  Square,
  MoreVertical,
  Loader2,
} from 'lucide-react';
export interface LinhaTabelaProps {
  profile: any;
  isSelected: boolean;
  index?: number;
  onSelect: (id: any) => void;
  onToggleRunning: (id: any) => void;
  onEdit: (profile: any) => void;
  onEditTags?: (profile: any) => void;
  onEditNotes?: (profile: any) => void;
  onDelete: (id: any) => void;
  onDuplicate?: (profile: any) => void;
}

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

const EditIcon: React.FC<{ size?: number; className?: string }> = ({ size = 11, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 494.936 494.936"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M389.844,182.85c-6.743,0-12.21,5.467-12.21,12.21v222.968c0,23.562-19.174,42.735-42.736,42.735H67.157 c-23.562,0-42.736-19.174-42.736-42.735V150.285c0-23.562,19.174-42.735,42.736-42.735h267.741c6.743,0,12.21-5.467,12.21-12.21 s-5.467-12.21-12.21-12.21H67.157C30.126,83.13,0,113.255,0,150.285v267.743c0,37.029,30.126,67.155,67.157,67.155h267.741 c37.03,0,67.156-30.126,67.156-67.155V195.061C402.054,188.318,396.587,182.85,389.844,182.85z" />
    <path d="M483.876,20.791c-14.72-14.72-38.669-14.714-53.377,0L221.352,229.944c-0.28,0.28-3.434,3.559-4.251,5.396l-28.963,65.069 c-2.057,4.619-1.056,10.027,2.521,13.6c2.337,2.336,5.461,3.576,8.639,3.576c1.675,0,3.362-0.346,4.96-1.057l65.07-28.963 c1.83-0.815,5.114-3.97,5.396-4.25L483.876,74.169c7.131-7.131,11.06-16.61,11.06-26.692 C494.936,37.396,491.007,27.915,483.876,20.791z M466.61,56.897L257.457,266.05c-0.035,0.036-0.055,0.078-0.089,0.107 l-33.989,15.131L238.51,247.3c0.03-0.036,0.071-0.055,0.107-0.09L447.765,38.058c5.038-5.039,13.819-5.033,18.846,0.005 c2.518,2.51,3.905,5.855,3.905,9.414C470.516,51.036,469.127,54.38,466.61,56.897z" />
  </svg>
);

export const LinhaTabela: React.FC<LinhaTabelaProps> = ({
  profile,
  isSelected,
  index = 0,
  onSelect,
  onToggleRunning,
  onEdit,
  onEditTags,
  onEditNotes,
  onDelete,
  onDuplicate,
}) => {
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLocalSyncing, setIsLocalSyncing] = useState(false);
  const isRunning = profile.status === 'running' || profile.isRunning;
  const isSyncing = Boolean(profile.isSyncing || isLocalSyncing);
  const isBusy = isSyncing;

  const handleRestoreCloud = async () => {
    try {
      setIsLocalSyncing(true);
      toast.loading(`Restaurando perfil ${profile.name}...`, { id: `restore-${profile.id}` });
      await servicePerfis.restoreFromCloud(profile.id);
      toast.success(`Perfil ${profile.name} restaurado da nuvem!`, { id: `restore-${profile.id}` });
    } catch (err: any) {
      toast.error(`Falha ao restaurar: ${err?.message || 'Cápsula não encontrada na nuvem'}`, { id: `restore-${profile.id}` });
    } finally {
      setIsLocalSyncing(false);
    }
  };

  const handleToggleMenu = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    } else {
      if (buttonRef.current) {
        setAnchorRect(buttonRef.current.getBoundingClientRect());
      }
      setIsMenuOpen(true);
    }
  };

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
      <td className="w-[220px] min-w-[220px] px-3.5 py-2.5 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <OsIcon os={osKey} size={14} className="shrink-0 text-[#9EA2AE]" />
          <span className="text-xs font-semibold tracking-wide text-white uppercase">
            {(profile.name || 'Sem nome').toUpperCase()}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(profile);
            }}
            className="ml-auto flex h-[22px] w-[22px] shrink-0 cursor-pointer items-center justify-center rounded-md text-[#DFE104] hover:bg-[#DFE104]/15 hover:scale-110 active:scale-95 transition-all"
            title="Editar nome"
          >
            <EditIcon size={13} />
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
        <div className="flex items-center justify-between gap-1.5 overflow-hidden">
          {tagsList.length > 0 ? (
            <div className="flex items-center gap-1.5 overflow-hidden max-w-[145px]">
              {tagsList.map((t: string) => (
                <TagBadge
                  key={t}
                  name={t}
                  color={serviceTags.getColorByName(t)}
                />
              ))}
            </div>
          ) : (
            <span className="text-[#9EA2AE]">-</span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditTags && onEditTags(profile);
            }}
            className="ml-auto flex h-[22px] w-[22px] shrink-0 cursor-pointer items-center justify-center rounded-md text-[#DFE104] hover:bg-[#DFE104]/15 hover:scale-110 active:scale-95 transition-all"
            title="Editar etiquetas"
          >
            <EditIcon size={13} />
          </button>
        </div>
      </td>

      {/* 9. Observação */}
      <td className="w-[170px] min-w-[170px] px-3.5 py-2.5 whitespace-nowrap">
        <div className="flex items-center justify-between gap-2 overflow-hidden">
          <span className="truncate text-xs text-[#C8CBD4] max-w-[125px]">
            {profile.notes || '-'}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditNotes && onEditNotes(profile);
            }}
            className="ml-auto flex h-[22px] w-[22px] shrink-0 cursor-pointer items-center justify-center rounded-md text-[#DFE104] hover:bg-[#DFE104]/15 hover:scale-110 active:scale-95 transition-all"
            title="Editar observação"
          >
            <EditIcon size={13} />
          </button>
        </div>
      </td>

      {/* 10. Criação */}
      <td className="w-[120px] min-w-[120px] px-3.5 py-2.5 whitespace-nowrap">
        <div className="flex flex-col font-mono leading-tight">
          <span className="text-[11px] text-[#C8CBD4]">{createdAt.date}</span>
          <span className="text-[10px] text-[#9EA2AE]">{createdAt.time}</span>
        </div>
      </td>

      {/* 11. Ação (Iniciar / Parar) - Sticky */}
      <td
        className={`sticky right-[48px] z-10 w-[124px] max-w-[124px] min-w-[124px] px-3 py-2.5 transition-colors ${stickyBg}`}
      >
        <button
          type="button"
          disabled={isBusy}
          onClick={() => !isBusy && onToggleRunning(profile.id)}
          title={isSyncing ? 'Sincronizando perfil com a nuvem...' : undefined}
          className={`inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md px-3.5 text-xs font-bold transition-all active:scale-[0.98] ${
            isBusy
              ? 'cursor-not-allowed opacity-60 border border-zinc-700 bg-zinc-800/50 text-zinc-400'
              : isRunning
                ? 'cursor-pointer border border-[#ff334b]/35 bg-[#ff334b]/12 text-[#ff334b] hover:bg-[#ff334b] hover:text-black'
                : 'cursor-pointer border border-[#DFE104]/35 bg-[#DFE104]/12 text-[#DFE104] hover:bg-[#DFE104] hover:text-black'
          }`}
        >
          {isBusy ? (
            <Loader2 size={11} className="animate-spin text-zinc-400" />
          ) : isRunning ? (
            <Square size={11} fill="currentColor" />
          ) : (
            <Play size={11} fill="currentColor" />
          )}
          <span>
            {isSyncing
              ? 'Sincronizando'
              : isRunning
                ? 'Parar'
                : 'Iniciar'}
          </span>
        </button>
      </td>

      {/* 12. Menu / Mais Opções - Sticky */}
      <td
        className={`sticky right-0 z-10 w-[48px] max-w-[48px] min-w-[48px] px-2 py-2.5 text-center transition-colors ${stickyBg}`}
      >
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggleMenu}
          className={`mx-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-all ${
            isMenuOpen
              ? 'bg-[#383A44] text-white shadow-md'
              : 'text-[#9EA2AE] hover:bg-[#383A44] hover:text-white'
          }`}
          title="Opções do perfil"
        >
          <MoreVertical size={14} />
        </button>

        {/* Mini Modal de Ações Estilo AdsPower */}
        <MenuAcoesPerfil
          isOpen={isMenuOpen}
          anchorRect={anchorRect}
          onClose={() => setIsMenuOpen(false)}
          onEditFull={(tab) =>
            navigate(`/perfis/editar/${profile.id}${tab ? `?tab=${tab}` : ''}`)
          }
          onDuplicate={() => onDuplicate && onDuplicate(profile)}
          onDelete={() => onDelete(profile.id)}
          onRestoreCloud={handleRestoreCloud}
        />
      </td>
    </tr>
  );
};

export default LinhaTabela;

