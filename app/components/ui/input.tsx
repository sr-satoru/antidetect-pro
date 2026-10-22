import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, rightIcon, ...props }, ref) => {
    if (icon || rightIcon) {
      return (
        <div className="relative flex w-full items-center">
          {icon && (
            <div className="pointer-events-none absolute left-3 flex items-center justify-center text-slate-400 dark:text-[#7A7E90]">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-9 w-full rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6C7284] transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium focus-visible:outline-none focus-visible:border-[#7C3AED] dark:focus-visible:border-[#A78BFA] focus-visible:ring-1 focus-visible:ring-[#7C3AED]/30 disabled:cursor-not-allowed disabled:opacity-50 shadow-2xs",
              icon && "pl-9",
              rightIcon && "pr-9",
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center justify-center text-slate-400 dark:text-[#7A7E90]">
              {rightIcon}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
          className={cn(
            "flex h-9 w-full rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6C7284] transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium focus-visible:outline-none focus-visible:border-[#7C3AED] dark:focus-visible:border-[#A78BFA] focus-visible:ring-1 focus-visible:ring-[#7C3AED]/30 disabled:cursor-not-allowed disabled:opacity-50 shadow-2xs",
            className
          )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
