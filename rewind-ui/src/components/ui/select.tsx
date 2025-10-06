import * as React from "react";

import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative flex-shrink-0">
        <select
          className={cn(
            "flex h-12 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 pr-8 text-base text-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all appearance-none cursor-pointer backdrop-blur-sm",
            className,
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        {/* Chevron Icon */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <svg 
            className="h-3 w-3 text-white/60" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
      </div>
    );
  },
);
Select.displayName = "Select";

export { Select };

