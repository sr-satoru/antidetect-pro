import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/40 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-xs shadow-[#7C3AED]/20 font-semibold",
        destructive:
          "border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20",
        outline:
          "border border-slate-200 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] text-slate-700 dark:text-[#E2E4EC] hover:bg-slate-100 dark:hover:bg-[#282A33] hover:text-slate-900 dark:hover:text-white shadow-2xs",
        secondary:
          "bg-slate-100 text-slate-800 hover:bg-slate-200/80 dark:bg-[#1F2026] dark:text-[#E2E4EC] dark:hover:bg-[#282A33] dark:hover:text-white",
        ghost:
          "text-slate-600 dark:text-[#9DA2B4] hover:bg-slate-100 dark:hover:bg-[#282A33] hover:text-slate-900 dark:hover:text-white",
        link:
          "text-[#7C3AED] dark:text-[#A78BFA] underline-offset-4 hover:underline p-0 h-auto",
        accent:
          "border border-[#7C3AED]/40 bg-[#7C3AED]/10 text-[#7C3AED] dark:text-[#A78BFA] hover:bg-[#7C3AED]/20",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-lg px-6 text-sm",
        icon: "h-8 w-8 p-0 rounded-lg",
        "icon-sm": "h-7 w-7 p-0 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
