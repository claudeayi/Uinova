// src/components/ui/Input.tsx
import React, { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils/cn"; // utilitaire pour fusionner les classes tailwind

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, required, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={props.id}
            className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}

        <input
          ref={ref}
          {...props}
          className={cn(
            "block w-full rounded-lg border px-3 py-2 text-sm shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500",
            "disabled:bg-gray-100 disabled:cursor-not-allowed",
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 dark:border-gray-600",
            "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
            className
          )}
        />

        {error ? (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
