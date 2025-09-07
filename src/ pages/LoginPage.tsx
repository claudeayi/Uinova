// src/pages/LoginPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import axios from "axios";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const setUser = useAppStore((s) => s.setUser);
  const setRole = useAppStore((s) => s.setRole);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Veuillez entrer un email valide.");
      return false;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return false;
    }
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
      });

      // ✅ Stockage user + role
      setUser(res.data.user);
      setRole(res.data.user.role);

      if (rememberMe) {
        localStorage.setItem("token", res.data.accessToken);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      } else {
        sessionStorage.setItem("token", res.data.accessToken);
        sessionStorage.setItem("user", JSON.stringify(res.data.user));
      }

      // ✅ Configure axios
      axios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${res.data.accessToken}`;

      toast.success("Connexion réussie ✅");
      navigate("/");
    } catch (err: any) {
      console.error("❌ Erreur login:", err.response?.data || err.message);
      setError(
        err.response?.data?.message || "Email ou mot de passe incorrect."
      );
      toast.error("Échec de la connexion ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900 px-4">
      <form
        onSubmit={handleLogin}
        className="bg-white dark:bg-slate-800 p-8 shadow-md rounded-xl w-full max-w-md space-y-5"
      >
        <h2 className="text-2xl font-bold text-center text-blue-600 dark:text-blue-400">
          Connexion à UInova
        </h2>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Adresse email
          </label>
          <input
            id="email"
            type="email"
            className="input border px-3 py-2 rounded w-full dark:bg-slate-900 dark:border-slate-700"
            placeholder="exemple@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* Mot de passe */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPass ? "text" : "password"}
              className="input border px-3 py-2 rounded w-full dark:bg-slate-900 dark:border-slate-700 pr-10"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              onClick={() => setShowPass((s) => !s)}
              aria-label={showPass ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div
            className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-2 rounded"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        {/* Options */}
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-gray-300 dark:border-slate-600"
            />
            <span className="text-gray-600 dark:text-gray-400">
              Se souvenir de moi
            </span>
          </label>
          <span
            onClick={() => navigate("/forgot-password")}
            className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Mot de passe oublié ?
          </span>
        </div>

        {/* Bouton */}
        <button
          type="submit"
          disabled={loading}
          className="btn w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Connexion...
            </span>
          ) : (
            "Se connecter"
          )}
        </button>

        {/* Lien inscription */}
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Pas encore de compte ?{" "}
          <span
            className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            onClick={() => navigate("/register")}
          >
            Inscrivez-vous
          </span>
        </p>
      </form>
    </div>
  );
}
