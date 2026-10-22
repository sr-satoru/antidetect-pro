import React, { useState, useRef } from 'react';

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
    'rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-md border border-slate-200/80 dark:border-white/10 select-none',
  arrowTop: 'border-t-gray-100 dark:border-t-gray-800',
  arrowBottom: 'border-b-gray-100 dark:border-b-gray-800',
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  align = 'center',
  className = '',
  delay = 100,
  maxWidth = 360,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (!content) return <>{children}</>;

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const alignClass =
    align === 'left'
      ? 'left-0'
      : align === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';

  const arrowAlignClass =
    align === 'left'
      ? 'left-5'
      : align === 'right'
      ? 'right-5'
      : 'left-1/2 -translate-x-1/2';

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}

      {isVisible && (
        <div
          role="tooltip"
          className={`absolute z-[9999] pointer-events-none transition-all duration-150 ease-out ${alignClass} ${
            position === 'top'
              ? 'bottom-full mb-2 animate-in fade-in-0 slide-in-from-bottom-1'
              : 'top-full mt-2 animate-in fade-in-0 slide-in-from-top-1'
          }`}
          style={{
            width: 'max-content',
            maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
          }}
        >
          {/* Balão com acabamento oficial terceirizado e padronizado */}
          <div
            className={`${TOOLTIP_THEME.container} text-[11.5px] font-normal leading-[1.4] px-3 py-1.5 text-left`}
          >
            {content}
          </div>

          {/* Triângulo indicador apontando exatamente para o botão/gatilho */}
          <div
            className={`absolute w-0 h-0 border-solid ${arrowAlignClass} ${
              position === 'top'
                ? `top-full ${TOOLTIP_THEME.arrowTop} border-t-[5px] border-x-[5px] border-x-transparent border-b-0`
                : `bottom-full ${TOOLTIP_THEME.arrowBottom} border-b-[5px] border-x-[5px] border-x-transparent border-t-0`
            }`}
          />
        </div>
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

export default Tooltip;
