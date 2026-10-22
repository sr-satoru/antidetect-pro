"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

/**
 * Padrão oficial de cores e estilização para tooltips do sistema (Design System oficial):
 * - Modo Claro: Fundo branco/95, borda slate-200/80, texto slate-800
 * - Modo Escuro: Fundo #1A1B24/95, borda white/[0.08], texto #F1F1F4, backdrop-blur-md
 */
export const TOOLTIP_THEME = {
  container:
    "rounded-md bg-white/95 dark:bg-[#161B22]/95 text-slate-800 dark:text-[#E6EDF3] shadow-xl border border-slate-200/80 dark:border-[#30363D] backdrop-blur-md select-none",
  arrowTop: "border-t-white dark:border-t-[#161B22]",
  arrowBottom: "border-b-white dark:border-b-[#161B22]",
};

function TooltipProvider({
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  );
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  side = "top",
  placement,
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  > & {
    placement?: "top" | "bottom" | "left" | "right";
  }) {
  const resolvedSide = side || placement || "top";

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={resolvedSide}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1.5 rounded-md border border-slate-200/80 dark:border-[#30363D] bg-white/95 dark:bg-[#161B22]/95 backdrop-blur-md px-3 py-1.5 text-xs text-slate-800 dark:text-[#E6EDF3] shadow-xl select-none",
            "has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] bg-white dark:bg-[#161B22] border-r border-b border-slate-200/80 dark:border-[#30363D] data-[side=bottom]:top-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-right-1 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export interface LegacyTooltipProps
  extends Omit<TooltipPrimitive.Root.Props, 'children'> {
  children?: React.ReactNode;
  content?: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  side?: "top" | "bottom" | "left" | "right";
  placement?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  maxWidth?: number | string;
  className?: string;
}

/**
 * Componente oficial Tooltip Shadcn UI (Base UI).
 * Suporta a sintaxe oficial Shadcn:
 *   <Tooltip><TooltipTrigger render={<Button ...>} /><TooltipContent>...</TooltipContent></Tooltip>
 * E mantém compatibilidade automática se receber a prop content:
 *   <Tooltip content="Dica">...</Tooltip>
 */
function Tooltip({
  content,
  position,
  side,
  placement,
  align = "center",
  maxWidth,
  className,
  children,
  ...props
}: LegacyTooltipProps) {
  if (content !== undefined && content !== null && content !== false) {
    const resolvedSide =
      side ||
      placement ||
      (position === "bottom"
        ? "bottom"
        : position === "left"
          ? "left"
          : position === "right"
            ? "right"
            : "top");

    return (
      <TooltipPrimitive.Root data-slot="tooltip" {...props}>
        <TooltipPrimitive.Trigger
          data-slot="tooltip-trigger"
          render={
            React.isValidElement(children) ? (
              children
            ) : (
              <span className="inline-flex cursor-pointer">{children}</span>
            )
          }
        />
        <TooltipContent
          side={resolvedSide}
          align={align}
          className={className}
          style={maxWidth ? { maxWidth } : undefined}
        >
          {content}
        </TooltipContent>
      </TooltipPrimitive.Root>
    );
  }

  return <TooltipPrimitive.Root data-slot="tooltip" {...props}>{children}</TooltipPrimitive.Root>;
}

export interface InfoBalloonProps {
  content: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  className?: string;
  maxWidth?: number | string;
}

export const InfoBalloon: React.FC<InfoBalloonProps> = ({
  content,
  position = "top",
  side,
  align = "center",
  className = "",
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
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-[#30363D] text-slate-500 dark:text-[#848D97] hover:text-slate-900 dark:hover:text-[#E6EDF3] hover:border-slate-400 dark:hover:border-[#848D97] text-[10px] font-semibold leading-none cursor-help select-none transition-colors ml-1">
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

export const TooltipFloatingPortal: React.FC<TooltipFloatingPortalProps> = ({
  isOpen,
  coords,
  children,
  className = "",
  popoverRef,
  onMouseEnter,
  onMouseLeave,
  transform,
}) => {
  if (!isOpen || !coords || typeof document === "undefined") return null;

  const isAbove = coords.isAbove !== false;

  return createPortal(
    <div
      ref={popoverRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
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
    document.body
  );
};

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
export default Tooltip;
