import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#238636]/40 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[#238636] text-white hover:bg-[#2ea043] shadow-xs shadow-[#238636]/20 font-semibold",
        destructive:
          "border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20",
        outline:
          "border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] text-slate-700 dark:text-[#C4C7D5] hover:bg-slate-100 dark:hover:bg-[#2F313E] hover:text-slate-900 dark:hover:text-white shadow-2xs",
        secondary:
          "bg-slate-100 text-slate-800 hover:bg-slate-200/80 dark:bg-[#2B2D38] dark:text-[#C4C7D5] dark:hover:bg-[#363847] dark:hover:text-white",
        ghost:
          "text-slate-600 dark:text-[#8E92A2] hover:bg-slate-100 dark:hover:bg-[#2B2D3A] hover:text-slate-900 dark:hover:text-white",
        link:
          "text-[#238636] dark:text-[#2ea043] underline-offset-4 hover:underline p-0 h-auto",
        accent:
          "border border-[#238636]/40 bg-[#238636]/10 text-[#2ea043] hover:bg-[#238636]/20",
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
