// src/routes/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "react-hot-toast";

interface Props {
  children: ReactNode;
  roles?: string[]; // ex: ["ADMIN", "PREMIUM"]
  fallback?: ReactNode; // Composant personnalisé si accès refusé
}

/**
 * 🔒 Route protégée
 * - Vérifie si l’utilisateur est connecté
 * - Vérifie si son rôle est autorisé
 * - Gère le redir après login + feedback utilisateur
 */
export default function ProtectedRoute({ children, roles, fallback }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // État de chargement
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-indigo-600">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
        <span className="ml-3">Vérification des accès...</span>
      </div>
    );
  }

  // Non authentifié → redirection login
  if (!user) {
    toast.error("⚠️ Vous devez être connecté.");
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }} // redir après login
      />
    );
  }

  // Rôle non autorisé → 403 ou redir dashboard
  if (roles && !roles.includes(user.role)) {
    toast.error("⛔ Accès refusé : permissions insuffisantes.");
    return fallback ? (
      <>{fallback}</>
    ) : (
      <Navigate to="/403" replace /> // Page 403 dédiée si dispo
    );
  }

  return <>{children}</>;
}
