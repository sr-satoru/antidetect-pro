import * as React from 'react';
import { createPortal } from 'react-dom';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { cn } from '@/lib/utils';

/**
 * Padrão oficial de cores e estilização para tooltips do sistema (Design System oficial):
 * - Modo Claro: Fundo branco, borda slate-200, texto slate-800
 * - Modo Escuro: Fundo #1A1A21, borda #2E2E38, texto #F1F1F4
 */
export const TOOLTIP_THEME = {
  container:
    'rounded-md bg-white dark:bg-[#1A1A21] text-slate-800 dark:text-[#F1F1F4] shadow-md border border-slate-200 dark:border-[#2E2E38] select-none',
  arrowTop: 'border-t-white dark:border-t-[#1A1A21]',
  arrowBottom: 'border-b-white dark:border-b-[#1A1A21]',
};

export function TooltipProvider({
  delay = 150,
  ...props
}: React.ComponentProps<typeof BaseTooltip.Provider>) {
  return <BaseTooltip.Provider delay={delay} closeDelay={100} {...props} />;
}

export interface TooltipTriggerProps
  extends React.ComponentProps<typeof BaseTooltip.Trigger> {
  asChild?: boolean;
}

export const TooltipTrigger = React.forwardRef<
  HTMLElement,
  TooltipTriggerProps
>(({ asChild, children, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseTooltip.Trigger
        ref={ref as any}
        render={children}
        {...props}
      />
    );
  }
  return (
    <BaseTooltip.Trigger ref={ref as any} {...props}>
      {children}
    </BaseTooltip.Trigger>
  );
});
TooltipTrigger.displayName = 'TooltipTrigger';

export interface TooltipContentProps
  extends React.ComponentProps<typeof BaseTooltip.Popup> {
  sideOffset?: number;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  showArrow?: boolean;
}

export const TooltipContent = React.forwardRef<
  HTMLDivElement,
  TooltipContentProps
>(
  (
    {
      className,
      side = 'top',
      align = 'center',
      sideOffset = 6,
      showArrow = true,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
        >
          <BaseTooltip.Popup
            ref={ref}
            className={cn(
              'z-50 overflow-hidden rounded-md border border-slate-200 dark:border-[#2E2E38] bg-white dark:bg-[#1A1A21] px-2.5 py-1 text-xs text-slate-800 dark:text-[#F1F1F4] shadow-md select-none transition-all',
              'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              'data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1',
              className,
            )}
            {...props}
          >
            {children}
            {showArrow && (
              <BaseTooltip.Arrow className="fill-white dark:fill-[#1A1A21] stroke-slate-200 dark:stroke-[#2E2E38]" />
            )}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    );
  },
);
TooltipContent.displayName = 'TooltipContent';

export interface TooltipProps
  extends React.ComponentProps<typeof BaseTooltip.Root> {
  content?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  maxWidth?: number | string;
  className?: string;
  delay?: number;
  showArrow?: boolean;
}

/**
 * Componente Tooltip Shadcn UI (Base UI).
 * Suporta tanto o padrão declarativo Shadcn:
 *   <Tooltip><TooltipTrigger asChild>...</TooltipTrigger><TooltipContent>...</TooltipContent></Tooltip>
 * Quanto o padrão de conveniência:
 *   <Tooltip content="Meu texto" side="top">...</Tooltip>
 */
export function Tooltip({
  content,
  position,
  side,
  align = 'center',
  maxWidth,
  className,
  delay,
  showArrow = true,
  children,
  ...props
}: TooltipProps) {
  // Se content for fornecido, opera no modo adaptador automático sem quebrar chamadas legadas
  if (content !== undefined && content !== null && content !== false) {
    const resolvedSide =
      side ||
      (position === 'bottom'
        ? 'bottom'
        : position === 'left'
          ? 'left'
          : position === 'right'
            ? 'right'
            : 'top');

    return (
      <BaseTooltip.Root {...props}>
        <TooltipTrigger asChild>
          {React.isValidElement(children) ? (
            children
          ) : (
            <span className="inline-flex">{children}</span>
          )}
        </TooltipTrigger>
        <TooltipContent
          side={resolvedSide}
          align={align}
          showArrow={showArrow}
          className={className}
          style={maxWidth ? { maxWidth } : undefined}
        >
          {content}
        </TooltipContent>
      </BaseTooltip.Root>
    );
  }

  // Modo padrão Shadcn UI
  return <BaseTooltip.Root {...props}>{children}</BaseTooltip.Root>;
}

export interface InfoBalloonProps {
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  className?: string;
  maxWidth?: number | string;
}

/**
 * Ícone sutil (?) com balão explicativo ao passar o mouse.
 */
export const InfoBalloon: React.FC<InfoBalloonProps> = ({
  content,
  position = 'top',
  side,
  align = 'center',
  className = '',
  maxWidth = 360,
}) => {
  return (
    <Tooltip
      content={content}
      side={side || position}
      align={align}
      maxWidth={maxWidth}
      className={className}
    >
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
 * Helper Portal para balões de dados complexos que exigem posicionamento manual
 * preservado para compatibilidade de células especiais (PlatformCell, TagsCell).
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
