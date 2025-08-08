import { useState, useEffect } from "react";

export function useAuth() {
  const [user, setUser] = useState<{id: string, email: string}|null>(null);

  useEffect(() => {
    // Ici, tu peux vérifier le token localStorage/cookie
    const token = localStorage.getItem("uinova_token");
    if (token) {
      // Simuler une récupération utilisateur
      setUser({id: "user_demo", email: "demo@uinova.com"});
    }
  }, []);

  function login(email: string, password: string) {
    // Appel à ton backend ici
    localStorage.setItem("uinova_token", "demo-token");
    setUser({id: "user_demo", email});
  }
  function logout() {
    localStorage.removeItem("uinova_token");
    setUser(null);
  }

  return { user, login, logout };
}
