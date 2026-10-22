import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { TagBadge } from '../tags/tag-badge';
import { serviceTags } from '../../services/tags/service.tags';
import { TooltipFloatingPortal } from '../ui/tooltip';

interface TagsCellProps {
  profile: any;
  onEditTags?: (profile: any) => void;
  className?: string;
}

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

export const TagsCell: React.FC<TagsCellProps> = ({ profile, onEditTags, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
    isAbove: boolean;
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [cacheVersion, setCacheVersion] = useState(0);

  // Escuta atualizações do catálogo oficial de tags (/api/tags)
  useEffect(() => {
    serviceTags.list().catch(() => {});
    return serviceTags.subscribe(() => {
      setCacheVersion((v) => v + 1);
    });
  }, []);

  const tagsList: { id?: string | number; name: string; color?: string }[] = useMemo(() => {
    if (!profile) return [];
    const raw: any[] = Array.isArray(profile.tags)
      ? profile.tags
      : typeof profile.tags === 'string' && profile.tags
        ? profile.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : [];

    return raw.map((t: any, idx: number) => {
      const name = typeof t === 'object' && t !== null && t.name ? String(t.name) : String(t);
      const id = typeof t === 'object' && t !== null && t.id ? t.id : `tag-${idx}`;

      // Prioridade: Cor do catálogo oficial (/api/tags) sempre tem precedência
      const catalogColor = serviceTags.getColorByName(name);
      const profileColor = typeof t === 'object' && t !== null && t.color ? t.color : undefined;
      const color = catalogColor || profileColor;

      return {
        id,
        name,
        color,
      };
    });
  }, [profile, cacheVersion]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const triggerCenterX = rect.left + rect.width / 2;

    const popoverWidth = popoverRef.current ? popoverRef.current.offsetWidth : 460;
    const popoverHeight = popoverRef.current ? popoverRef.current.offsetHeight : 68;
    const padding = 12;

    let left = triggerCenterX - popoverWidth / 2;
    if (left + popoverWidth > window.innerWidth - padding) {
      left = window.innerWidth - popoverWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    const arrowLeft = Math.max(14, Math.min(popoverWidth - 14, triggerCenterX - left));

    const isAbove = rect.top - popoverHeight - 8 >= 10;
    const top = isAbove ? rect.top - popoverHeight - 8 : rect.bottom + 8;

    setCoords({ top, left, arrowLeft, isAbove });
  };

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    updatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  // Mede as dimensões reais do popover antes do paint para calcular posição e seta exatas
  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const totalTags = tagsList.length;
  const hasExtra = totalTags > 2;
  const extraCount = totalTags - 2;

  return (
    <>
      <div className={`flex w-full items-center justify-between gap-1.5 overflow-hidden select-none ${className}`}>
        {totalTags === 0 ? (
          <span className="text-slate-400 dark:text-[#9EA2AE] text-xs">-</span>
        ) : totalTags === 1 ? (
          <div className="flex flex-col gap-1 items-start justify-center min-w-0 max-w-[145px]">
            <TagBadge
              name={tagsList[0].name}
              color={tagsList[0].color}
              variant="vivid"
              showDot={false}
              className="max-w-[130px]"
            />
          </div>
        ) : totalTags === 2 ? (
          <div className="flex flex-col gap-1 items-start justify-center min-w-0 max-w-[145px]">
            <TagBadge
              name={tagsList[0].name}
              color={tagsList[0].color}
              variant="vivid"
              showDot={false}
              className="max-w-[130px]"
            />
            <TagBadge
              name={tagsList[1].name}
              color={tagsList[1].color}
              variant="vivid"
              showDot={false}
              className="max-w-[130px]"
            />
          </div>
        ) : (
          /* Quando houver mais de 2 tags: Linha 1 = Tag 1, Linha 2 = Tag 2 + contador (+N) */
          <div className="flex flex-col gap-1 items-start justify-center min-w-0 max-w-[145px]">
            <TagBadge
              name={tagsList[0].name}
              color={tagsList[0].color}
              variant="vivid"
              showDot={false}
              className="max-w-[130px]"
            />
            <div className="flex items-center gap-1.5 min-w-0">
              <TagBadge
                name={tagsList[1].name}
                color={tagsList[1].color}
                variant="vivid"
                showDot={false}
                className="max-w-[85px]"
              />
              <button
                ref={triggerRef}
                type="button"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen((prev) => !prev);
                }}
                className="text-[#238636] hover:text-[#2ea043] dark:text-[#2ea043] dark:hover:text-[#3fb950] underline underline-offset-2 font-medium text-[12px] cursor-pointer select-none transition-colors shrink-0"
                title={`Ver todas as ${totalTags} etiquetas`}
              >
                +{extraCount}
              </button>
            </div>
          </div>
        )}

        {/* Botão de Editar Etiquetas (aparece ao passar o mouse na linha) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditTags && onEditTags(profile);
          }}
          className="opacity-0 group-hover:opacity-100 ml-auto flex h-[22px] w-[22px] shrink-0 cursor-pointer items-center justify-center rounded-md text-[#238636] hover:text-[#2ea043] dark:text-[#2ea043] dark:hover:text-[#3fb950] hover:bg-emerald-500/10 transition-all active:scale-95"
          title="Editar etiquetas"
        >
          <EditIcon size={13} />
        </button>
      </div>

      {/* Tooltip flutuante 100% terceirizado no componente oficial TooltipFloatingPortal */}
      <TooltipFloatingPortal
        isOpen={isOpen}
        coords={coords}
        popoverRef={popoverRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="px-3 py-2 flex items-center gap-1.5 flex-wrap w-max max-w-[485px] animate-in fade-in zoom-in-95 duration-100"
      >
        {tagsList.map((tag, idx) => (
          <TagBadge
            key={tag.id ?? `${tag.name}-${idx}`}
            name={tag.name}
            color={tag.color}
            variant="vivid"
            showDot={false}
            className="text-[11px] leading-tight"
          />
        ))}
      </TooltipFloatingPortal>
    </>
  );
};

export default TagsCell;
