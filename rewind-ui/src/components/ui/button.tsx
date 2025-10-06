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
            "bg-gradient-to-r from-[#F7DC6F] via-[#F4D03F] to-[#D4AF37] text-black hover:from-[#FFE66D] hover:via-[#F7DC6F] hover:to-[#E5C100] transform hover:scale-105 active:scale-95 shadow-lg shadow-yellow-500/50 hover:shadow-yellow-400/70 font-extrabold",
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

