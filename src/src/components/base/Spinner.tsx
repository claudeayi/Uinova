import React from "react";
import { cn } from "@/utils/cn"; // helper utilitaire tailwind (si tu l’as)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, type = "text", ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            "px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500",
            "text-sm transition",
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 dark:border-gray-600",
            "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100",
            className
          )}
          {...props}
        />
        {helperText && !error && (
          <p className="text-xs text-gray-500">{helperText}</p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
