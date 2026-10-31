import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "confirmed" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading = false, disabled, children, ...props }, ref) => {
    const baseClasses =
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-75 ease-out select-none " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#157E92] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B111A] " +
      "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100";

    const variantClasses = {
      default: "bg-[#10233F] text-white hover:bg-[#0A172A] border border-transparent shadow-sm",
      secondary: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-[#1E2E42]",
      outline: "border border-slate-300 dark:border-[#1E2E42] bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200",
      ghost: "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent",
      confirmed: "bg-[#15805D] text-white hover:bg-[#10664A] border border-transparent shadow-sm",
      destructive: "bg-[#C23C45] text-white hover:bg-[#A02831] border border-transparent shadow-sm",
    }[variant];

    const sizeClasses = {
      default: "min-h-[44px] px-4 py-2",
      sm: "min-h-[36px] px-3 py-1.5 text-xs",
      lg: "min-h-[48px] px-6 py-2.5 text-base",
      icon: "min-h-[44px] min-w-[44px] p-2",
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading ? "true" : undefined}
        className={cn(baseClasses, variantClasses, sizeClasses, className)}
        {...props}
      >
        {isLoading ? (
          <>
            <span
              className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0"
              aria-hidden="true"
            />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
