import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6C7284] transition-colors focus-visible:outline-none focus-visible:border-[#7C3AED] dark:focus-visible:border-[#A78BFA] focus-visible:ring-1 focus-visible:ring-[#7C3AED]/30 disabled:cursor-not-allowed disabled:opacity-50 shadow-2xs custom-scrollbar resize-y",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
