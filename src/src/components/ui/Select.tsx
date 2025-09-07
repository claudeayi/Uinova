// src/components/ui/Select.tsx
import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/utils/cn";

export interface Option {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
}

interface SelectProps {
  label?: string;
  options: Option[];
  value?: string | number;
  onChange?: (value: string | number) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function Select({
  label,
  options,
  value,
  onChange,
  placeholder = "Sélectionner...",
  error,
  helperText,
  required,
  disabled,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // Fermer quand on clique en dehors
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="w-full">
      {label && (
        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          ref={buttonRef}
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm shadow-sm",
            "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500",
            "disabled:bg-gray-100 disabled:cursor-not-allowed",
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 dark:border-gray-600",
            className
          )}
        >
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.icon && (
                <span className="w-4 h-4">{selectedOption.icon}</span>
              )}
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
          <svg
            className="w-4 h-4 ml-2 text-gray-500"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <ul
            ref={listRef}
            className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white dark:bg-gray-800 shadow-lg"
            role="listbox"
          >
            {options.map((opt) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm flex items-center gap-2",
                  opt.value === value
                    ? "bg-indigo-600 text-white"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                {opt.icon && <span className="w-4 h-4">{opt.icon}</span>}
                {opt.label}
              </li>
            ))}
          </ul>
        )}
      </div>

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
