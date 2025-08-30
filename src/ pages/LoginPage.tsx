import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import axios from "axios";

export default function LoginPage() {
  const setUser = useAppStore((s) => s.setUser);
  const setRole = useAppStore((s) => s.setRole);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
      });

      // ✅ Stockage user + role
      setUser(res.data.user);
      setRole(res.data.user.role);
      localStorage.setItem("token", res.data.accessToken);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // ✅ Configure axios pour les futures requêtes
      axios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${res.data.accessToken}`;

      // ✅ Redirection
      navigate("/");
    } catch (err: any) {
      console.error("❌ Erreur login:", err.response?.data || err.message);
      setError(
        err.response?.data?.message || "Email ou mot de passe incorrect."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900">
      <form
        onSubmit={handleLogin}
        className="bg-white dark:bg-slate-800 p-8 shadow-md rounded w-96 space-y-4"
      >
        <h2 className="text-2xl font-bold text-center text-blue-600 dark:text-blue-400">
          Connexion à UInova
        </h2>

        <input
          type="email"
          className="border p-2 w-full rounded dark:bg-slate-900 dark:border-slate-700"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          className="border p-2 w-full rounded dark:bg-slate-900 dark:border-slate-700"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-2 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded w-full transition"
        >
          {loading ? "Connexion..." : "Se connecter"}
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
