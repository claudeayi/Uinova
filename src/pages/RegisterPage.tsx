// src/pages/RegisterPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, User } from "lucide-react";

export default function RegisterPage() {
  const navigate = useNavigate();
  const setUser = useAppStore((s) => s.setUser);
  const setRole = useAppStore((s) => s.setRole);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRoleChoice] = useState("USER");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // ✅ Validation côté client
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name
      )}&background=random`;

      const res = await axios.post("http://localhost:5000/api/auth/register", {
        email,
        password,
        displayName: name,
        role,
        avatar: avatarUrl,
      });

      if (res.data.accessToken && res.data.user) {
        setUser(res.data.user);
        setRole(res.data.user.role);

        localStorage.setItem("token", res.data.accessToken);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${res.data.accessToken}`;

        toast.success("🎉 Compte créé avec succès !");
        navigate("/");
      } else {
        toast("✅ Compte créé, connectez-vous !");
        navigate("/login");
      }
    } catch (err: any) {
      console.error("❌ Erreur inscription:", err.response?.data || err.message);
      setError(
        err.response?.data?.message ||
          "Erreur lors de la création du compte. Veuillez réessayer."
      );
      toast.error("❌ Échec de l’inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900 px-4">
      <form
        onSubmit={handleRegister}
        className="bg-white dark:bg-slate-800 p-8 shadow-lg rounded w-full max-w-md space-y-4"
      >
        <h2 className="text-2xl font-bold text-center text-blue-600 dark:text-blue-400">
          Créer un compte
        </h2>

        {/* Nom complet */}
        <div>
          <label className="block text-sm font-medium mb-1">Nom complet</label>
          <input
            type="text"
            className="border p-2 w-full rounded dark:bg-slate-900 dark:border-slate-700"
            placeholder="Votre nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            className="border p-2 w-full rounded dark:bg-slate-900 dark:border-slate-700"
            placeholder="exemple@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* Mot de passe */}
        <div>
          <label className="block text-sm font-medium mb-1">Mot de passe</label>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              className="border p-2 w-full rounded dark:bg-slate-900 dark:border-slate-700"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-2 top-2 text-gray-500"
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Confirmation mot de passe */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Confirmez le mot de passe
          </label>
          <input
            type="password"
            className="border p-2 w-full rounded dark:bg-slate-900 dark:border-slate-700"
            placeholder="Confirmez"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        {/* Sélecteur rôle */}
        <div>
          <label className="block text-sm font-medium mb-1">Rôle</label>
          <select
            value={role}
            onChange={(e) => setRoleChoice(e.target.value)}
            className="border p-2 w-full rounded dark:bg-slate-900 dark:border-slate-700"
          >
            <option value="USER">Utilisateur</option>
            <option value="ADMIN">Administrateur</option>
          </select>
        </div>

        {/* Erreur */}
        {error && (
          <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-2 rounded">
            {error}
          </div>
        )}

        {/* Bouton submit */}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded w-full transition flex items-center justify-center gap-2"
        >
          {loading && <User size={18} className="animate-spin" />}
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
