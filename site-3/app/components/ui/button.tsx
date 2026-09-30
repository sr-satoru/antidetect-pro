import * as React from "react";
import clsx from "clsx";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "amber" | "star";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "star", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
          {
            "bg-gradient-to-r from-[#00FF66] to-[#00D655] text-black font-bold hover:brightness-110 shadow-[0_0_20px_rgba(0,255,102,0.25)] border border-[#00FF66]/30":
              variant === "star" || variant === "amber",
            "bg-white text-black hover:bg-neutral-200 shadow-sm font-semibold":
              variant === "primary",
            "bg-[#15161C] text-zinc-100 hover:bg-[#1E2028] border border-white/10 hover:border-white/20":
              variant === "secondary",
            "border border-[#232530] text-zinc-300 hover:text-white hover:bg-white/5 hover:border-white/20":
              variant === "outline",
            "text-zinc-400 hover:text-white hover:bg-white/5":
              variant === "ghost",
          },
          {
            "text-xs px-3 py-1.5 h-8 gap-1.5": size === "sm",
            "text-sm px-4 py-2 h-10 gap-2": size === "md",
            "text-base px-6 py-2.5 h-12 gap-2.5": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
