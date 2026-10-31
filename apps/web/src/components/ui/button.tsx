import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "burntOrange" | "secondary" | "outline" | "ghost" | "confirmed" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading = false, disabled, children, ...props }, ref) => {
    const baseClasses =
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-[transform,box-shadow,background-color,color,border-color] duration-200 ease-out select-none " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2410C] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0C0A09] " +
      "disabled:pointer-events-none disabled:opacity-50";

    const variantClasses = {
      default: "bg-[#1C1917] text-[#FAF8F5] hover:bg-[#292524] dark:bg-[#FAF8F5] dark:text-[#1C1917] dark:hover:bg-[#E7E5E4] border border-transparent shadow-sm",
      primary: "bg-[#C2410C] text-white hover:bg-[#9A3412] dark:bg-[#EA580C] dark:hover:bg-[#C2410C] border border-transparent shadow-sm",
      burntOrange: "bg-[#C2410C] text-white hover:bg-[#9A3412] dark:bg-[#EA580C] dark:hover:bg-[#C2410C] border border-transparent shadow-sm",
      secondary: "bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700",
      outline: "border border-stone-300 dark:border-stone-700 bg-transparent hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200",
      ghost: "hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border border-transparent",
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
