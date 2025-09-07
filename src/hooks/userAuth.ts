// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import useToast from "./useToast";

export interface User {
  id: string;
  email: string;
  role?: "USER" | "PREMIUM" | "ADMIN";
  name?: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  /* ============================================================================
   * Vérification du token au montage
   * ========================================================================== */
  useEffect(() => {
    const token = localStorage.getItem("uinova_token");
    if (token) {
      axios
        .get<User>("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem("uinova_token");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  /* ============================================================================
   * Login
   * ========================================================================== */
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);
        const res = await axios.post<AuthResponse>("/api/auth/login", {
          email,
          password,
        });
        localStorage.setItem("uinova_token", res.data.token);
        setUser(res.data.user);
        toast.success("✅ Connexion réussie !");
        navigate("/dashboard");
      } catch (err: any) {
        toast.error("❌ Email ou mot de passe incorrect");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [toast, navigate]
  );

  /* ============================================================================
   * Logout
   * ========================================================================== */
  const logout = useCallback(() => {
    localStorage.removeItem("uinova_token");
    setUser(null);
    toast.info("👋 Déconnecté");
    navigate("/login");
  }, [toast, navigate]);

  return { user, loading, login, logout, isAuthenticated: !!user };
}
