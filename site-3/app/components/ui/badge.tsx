import * as React from "react";
import clsx from "clsx";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "star" | "amber" | "emerald";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide transition-colors",
        {
          "bg-white/10 text-zinc-300 border border-white/10":
            variant === "default",
          "border border-[#232530] text-zinc-400": variant === "outline",
          "bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30 shadow-[0_0_12px_rgba(0,255,102,0.15)]":
            variant === "star" || variant === "amber" || variant === "emerald",
        },
        className
      )}
      {...props}
    />
  );
}
