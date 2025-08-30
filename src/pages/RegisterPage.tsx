import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import axios from "axios";

export default function RegisterPage() {
  const navigate = useNavigate();
  const setUser = useAppStore((s) => s.setUser);
  const setRole = useAppStore((s) => s.setRole);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/api/auth/register", {
        email,
        password,
        displayName: name, // 👈 cohérence backend
      });

      // ✅ Si le backend retourne déjà token + user après inscription
      if (res.data.accessToken && res.data.user) {
        setUser(res.data.user);
        setRole(res.data.user.role);

        localStorage.setItem("token", res.data.accessToken);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${res.data.accessToken}`;

        navigate("/");
      } else {
        // ✅ Si le backend ne renvoie pas token, redirection vers login
        navigate("/login");
      }
    } catch (err: any) {
      console.error("❌ Erreur inscription:", err.response?.data || err.message);
      setError(
        err.response?.data?.message ||
          "Erreur lors de la création du compte. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900">
      <form
        onSubmit={handleRegister}
        className="bg-white dark:bg-slate-800 p-8 shadow-md rounded w-96 space-y-4"
      >
        <h2 className="text-2xl font-bold text-center text-blue-600 dark:text-blue-400">
          Créer un compte
        </h2>

        <input
          type="text"
          className="border p-2 w-full rounded dark:bg-slate-900 dark:border-slate-700"
          placeholder="Nom complet"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

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
          {loading ? "Création en cours..." : "Créer un compte"}
        </button>

        {/* Lien connexion */}
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Déjà un compte ?{" "}
          <span
            className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            onClick={() => navigate("/login")}
          >
            Connectez-vous
          </span>
        </p>
      </form>
    </div>
  );
}
