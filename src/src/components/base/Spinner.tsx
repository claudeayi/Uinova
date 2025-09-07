import React, { useState } from "react";
import { cn } from "@/utils/cn";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      className,
      type = "text",
      iconLeft,
      iconRight,
      loading = false,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";

    const inputType = isPassword && showPassword ? "text" : type;
    const inputId = props.id || `input-${label?.toLowerCase().replace(/\s+/g, "-")}`;
    const describedBy = error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined;

    return (
      <div className="w-full flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {/* Icone gauche */}
          {iconLeft && (
            <span className="absolute left-3 text-gray-400">{iconLeft}</span>
          )}

          <input
            ref={ref}
            id={inputId}
            type={inputType}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              "w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2",
              "text-sm transition pr-10", // espace pour icônes
              error
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 dark:border-gray-600 focus:ring-indigo-500",
              "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100",
              iconLeft ? "pl-10" : "",
              className
            )}
            disabled={loading || props.disabled}
            {...props}
          />

          {/* Loading spinner */}
          {loading && (
            <Loader2 className="absolute right-3 w-4 h-4 animate-spin text-gray-400" />
          )}

          {/* Icône droite (custom ou toggle password) */}
          {!loading && (
            <>
              {isPassword ? (
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              ) : (
                iconRight && (
                  <span className="absolute right-3 text-gray-400">
                    {iconRight}
                  </span>
                )
              )}
            </>
          )}
        </div>

        {/* Helper / Erreur */}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-xs text-gray-500">
            {helperText}
          </p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
