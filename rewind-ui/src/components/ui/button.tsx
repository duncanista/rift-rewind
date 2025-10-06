import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-lg text-base font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:pointer-events-none disabled:opacity-50",
          variant === "default" &&
            "bg-gradient-to-r from-[#C89B3C] to-[#0397AB] text-white hover:opacity-90 transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30",
          variant === "outline" &&
            "border-2 border-white/20 bg-transparent text-white hover:bg-white/10",
          variant === "ghost" &&
            "bg-transparent text-white hover:bg-white/5",
          className,
        )}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button };

