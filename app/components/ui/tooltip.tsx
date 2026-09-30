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
          {/* Balão com alto contraste e acabamento de luxo */}
          <div className="bg-slate-900 text-slate-100 dark:bg-[#1E2028] dark:text-[#E1E4EE] border border-slate-800 dark:border-white/15 text-[11.5px] font-normal leading-[1.4] px-3.5 py-2 rounded-lg shadow-xl shadow-slate-900/20 dark:shadow-[0_8px_24px_rgba(0,0,0,0.6)] select-none text-left">
            {content}
          </div>

          {/* Triângulo indicador apontando exatamente para o botão/gatilho */}
          <div
            className={`absolute w-0 h-0 border-solid ${arrowAlignClass} ${
              position === 'top'
                ? 'top-full border-t-slate-900 dark:border-t-[#1E2028] border-t-[6px] border-x-[6px] border-x-transparent border-b-0'
                : 'bottom-full border-b-slate-900 dark:border-b-[#1E2028] border-b-[6px] border-x-[6px] border-x-transparent border-t-0'
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
