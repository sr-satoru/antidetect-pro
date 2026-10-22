import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  align?: 'center' | 'left' | 'right';
  className?: string;
  delay?: number;
  maxWidth?: number | string;
}

/**
 * Padrão oficial de cores e estilização para TODOS os tooltips do sistema (fonte única da verdade):
 * - Modo Claro: Fundo cinza suave (bg-gray-100), texto escuro (text-gray-900)
 * - Modo Escuro: Fundo escuro (dark:bg-gray-800), texto claro (dark:text-gray-100)
 * - Bordas e sombras padronizadas para alto requinte visual.
 */
export const TOOLTIP_THEME = {
  container:
    'rounded-md bg-white dark:bg-[#1A1A21] text-slate-800 dark:text-[#F1F1F4] shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.6)] border border-slate-200 dark:border-[#2E2E38] select-none',
  arrowTop: 'border-t-white dark:border-t-[#1A1A21]',
  arrowBottom: 'border-b-white dark:border-b-[#1A1A21]',
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  align = 'center',
  className = '',
  delay = 80,
  maxWidth = 360,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
    isAbove: boolean;
  } | null>(null);

  const triggerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (!content) return <>{children}</>;

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const triggerCenterX = rect.left + rect.width / 2;

    const el = tooltipRef.current;
    const elWidth = el ? el.offsetWidth : 160;
    const elHeight = el ? el.offsetHeight : 30;
    const padding = 10;

    let left = triggerCenterX - elWidth / 2;
    if (align === 'left') {
      left = rect.left;
    } else if (align === 'right') {
      left = rect.right - elWidth;
    }

    if (left + elWidth > window.innerWidth - padding) {
      left = window.innerWidth - elWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    const arrowLeft = Math.max(10, Math.min(elWidth - 10, triggerCenterX - left));

    const spaceAbove = rect.top;
    const isAbove = position === 'top' ? spaceAbove >= elHeight + 10 : spaceAbove < elHeight + 10;
    const top = isAbove ? rect.top - elHeight - 6 : rect.bottom + 6;

    setCoords({ top, left, arrowLeft, isAbove });
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updatePosition();
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      const onReposition = () => updatePosition();
      window.addEventListener('scroll', onReposition, true);
      window.addEventListener('resize', onReposition);
      return () => {
        window.removeEventListener('scroll', onReposition, true);
        window.removeEventListener('resize', onReposition);
      };
    }
  }, [isVisible]);

  useLayoutEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      updatePosition();
    }
  }, [isVisible, content]);

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex items-center min-w-0 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}

      {isVisible && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 99999,
            maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
            width: 'max-content',
          }}
          className="pointer-events-none transition-opacity duration-150 ease-out animate-in fade-in-0"
        >
          {/* Balão com acabamento oficial terceirizado e padronizado */}
          <div
            className={`${TOOLTIP_THEME.container} text-[11.5px] font-normal leading-[1.4] px-3 py-1.5 text-left whitespace-pre-wrap break-words`}
          >
            {content}
          </div>

          {/* Triângulo indicador apontando exatamente para o botão/gatilho */}
          <div
            style={{ left: `${coords.arrowLeft}px` }}
            className={`absolute -translate-x-1/2 w-0 h-0 border-solid ${
              coords.isAbove
                ? `top-full ${TOOLTIP_THEME.arrowTop} border-t-[5px] border-x-[5px] border-x-transparent border-b-0`
                : `bottom-full ${TOOLTIP_THEME.arrowBottom} border-b-[5px] border-x-[5px] border-x-transparent border-t-0`
            }`}
          />
        </div>,
        document.body
      )}
    </div>
  );
};

export interface InfoBalloonProps {
  content: React.ReactNode;
  position?: 'top' | 'bottom';
  align?: 'center' | 'left' | 'right';
  className?: string;
  maxWidth?: number | string;
}

/**
 * Ícone sutil (?) com balão explicativo ao passar o mouse.
 * Ideal para colocar ao lado de títulos e rótulos de campos.
 */
export const InfoBalloon: React.FC<InfoBalloonProps> = ({
  content,
  position = 'top',
  align = 'center',
  className = '',
  maxWidth = 360,
}) => {
  return (
    <Tooltip content={content} position={position} align={align} maxWidth={maxWidth} className={className}>
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-[#525565] text-slate-500 dark:text-[#8C90A4] hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-[#8C90A4] text-[10px] font-semibold leading-none cursor-help select-none transition-colors ml-1">
        ?
      </span>
    </Tooltip>
  );
};

export interface TooltipFloatingPortalProps {
  isOpen: boolean;
  coords: {
    top: number;
    left: number;
    arrowLeft: number;
    isAbove?: boolean;
  } | null;
  children: React.ReactNode;
  className?: string;
  popoverRef?: React.RefObject<HTMLDivElement | null>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  transform?: string;
}

/**
 * Componente Portal Oficial para Tooltips e Balões Flutuantes (TagsCell, PlatformCell, etc.).
 * Terceiriza 100% da renderização do portal, posicionamento fixo, tema e triângulo indicador.
 */
export const TooltipFloatingPortal: React.FC<TooltipFloatingPortalProps> = ({
  isOpen,
  coords,
  children,
  className = '',
  popoverRef,
  onMouseEnter,
  onMouseLeave,
  transform,
}) => {
  if (!isOpen || !coords || typeof document === 'undefined') return null;

  const isAbove = coords.isAbove !== false;

  return createPortal(
    <div
      ref={popoverRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        transform: transform ?? undefined,
        zIndex: 99999,
      }}
      className={`${TOOLTIP_THEME.container} pointer-events-auto text-left ${className}`}
    >
      {children}

      {/* Seta indicadora (caret) padronizada e centralizada */}
      <div
        style={{ left: `${coords.arrowLeft}px` }}
        className={`absolute -translate-x-1/2 w-0 h-0 border-solid pointer-events-none ${
          isAbove
            ? `top-full ${TOOLTIP_THEME.arrowTop} border-t-[5px] border-x-[5px] border-x-transparent border-b-0`
            : `bottom-full ${TOOLTIP_THEME.arrowBottom} border-b-[5px] border-x-[5px] border-x-transparent border-t-0`
        }`}
      />
    </div>,
    document.body,
  );
};

export default Tooltip;
