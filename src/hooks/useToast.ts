// src/hooks/useToast.ts
import { toast, ToastOptions } from "react-hot-toast";

/* ============================================================================
 * Hook personnalisé useToast – Gestion centralisée des notifications
 * ========================================================================= */
export default function useToast() {
  // ✅ Options globales par défaut
  const baseOptions: ToastOptions = {
    duration: 4000,
    position: "top-right",
    style: {
      borderRadius: "0.5rem",
      fontSize: "0.875rem",
      padding: "0.5rem 1rem",
    },
  };

  return {
    /** ✅ Succès */
    success: (msg: string, options?: ToastOptions) =>
      toast.success(msg, {
        ...baseOptions,
        icon: "✅",
        style: { ...baseOptions.style, background: "#16a34a", color: "#fff" },
        ...options,
      }),

    /** ❌ Erreur */
    error: (msg: string, options?: ToastOptions) =>
      toast.error(msg, {
        ...baseOptions,
        icon: "❌",
        style: { ...baseOptions.style, background: "#dc2626", color: "#fff" },
        ...options,
      }),

    /** ⚠️ Avertissement */
    warning: (msg: string, options?: ToastOptions) =>
      toast(msg, {
        ...baseOptions,
        icon: "⚠️",
        style: { ...baseOptions.style, background: "#f59e0b", color: "#fff" },
        ...options,
      }),

    /** ℹ️ Information */
    info: (msg: string, options?: ToastOptions) =>
      toast(msg, {
        ...baseOptions,
        icon: "ℹ️",
        style: { ...baseOptions.style, background: "#3b82f6", color: "#fff" },
        ...options,
      }),

    /** ⏳ Chargement */
    loading: (msg: string, options?: ToastOptions) =>
      toast.loading(msg, {
        ...baseOptions,
        icon: "⏳",
        style: { ...baseOptions.style, background: "#6b7280", color: "#fff" },
        ...options,
      }),
  };
}
