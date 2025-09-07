// src/pages/ProfilePage.tsx
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import axios from "axios";
import {
  LogOut,
  Upload,
  Mail,
  Shield,
  Trash2,
  Download,
  KeyRound,
  QrCode,
  UserX,
} from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center text-gray-500">
          ❌ Vous devez être connecté pour voir votre profil.
        </div>
      </DashboardLayout>
    );
  }

  async function handleSave() {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("fullName", fullName);
      formData.append("email", email);
      if (password) formData.append("password", password);
      if (avatar) formData.append("avatar", avatar);

      await axios.put("/api/users/me", formData, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });

      toast.success("✅ Profil mis à jour");
      setPassword("");
    } catch (err) {
      console.error("❌ Update error:", err);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  }

  async function handleExportData() {
    try {
      const res = await axios.get("/api/users/me/export", {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `uinova-profile-${Date.now()}.json`;
      a.click();
      toast.success("📂 Données exportées");
    } catch {
      toast.error("Impossible d’exporter vos données");
    }
  }

  async function handleDeleteAccount() {
    if (
      !window.confirm(
        "⚠️ Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible."
      )
    )
      return;
    try {
      await axios.delete("/api/users/me", {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      toast.success("🗑️ Compte supprimé");
      logout();
    } catch {
      toast.error("Erreur lors de la suppression du compte");
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <h1 className="text-2xl font-bold">👤 Mon Profil</h1>

        {/* Infos principales */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <img
                  src={
                    avatar
                      ? URL.createObjectURL(avatar)
                      : user.avatar || "https://via.placeholder.com/100"
                  }
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border shadow"
                />
                <label className="block mt-3 text-sm cursor-pointer text-indigo-600 hover:underline">
                  <Upload className="inline w-4 h-4 mr-1" /> Changer avatar
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setAvatar(e.target.files?.[0] || null)}
                  />
                </label>
                {user.avatar && (
                  <button
                    className="text-xs text-red-500 mt-2 hover:underline"
                    onClick={() => setAvatar(null)}
                  >
                    Supprimer avatar
                  </button>
                )}
              </div>

              {/* Infos utilisateur */}
              <div className="flex-1">
                <p className="font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" /> {user.email}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Shield className="w-4 h-4 text-gray-400" />
                  Rôle : {user.role}
                </p>
                {user.createdAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    Membre depuis le{" "}
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulaire de mise à jour */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <label className="text-sm font-medium">Nom complet</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border rounded dark:bg-slate-800 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded dark:bg-slate-800 dark:border-slate-700"
              />
              <p className="text-xs text-gray-400 mt-1">
                Une vérification par email sera nécessaire.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Nouveau mot de passe</label>
              <input
                type="password"
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded dark:bg-slate-800 dark:border-slate-700"
              />
              <p className="text-xs text-gray-400 mt-1">
                Laissez vide si vous ne souhaitez pas changer de mot de passe.
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              {loading ? "⏳ Sauvegarde..." : "💾 Enregistrer"}
            </Button>
          </CardContent>
        </Card>

        {/* Sécurité */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <KeyRound className="w-4 h-4" /> Sécurité
            </h2>
            <div className="flex justify-between items-center">
              <span>🔒 Authentification à deux facteurs (2FA)</span>
              <Button
                variant={twoFAEnabled ? "secondary" : "default"}
                onClick={() => {
                  setTwoFAEnabled(!twoFAEnabled);
                  toast.success(
                    twoFAEnabled
                      ? "2FA désactivée"
                      : "2FA activée — Scannez le QR Code"
                  );
                }}
              >
                {twoFAEnabled ? "Désactiver" : "Activer"}
              </Button>
            </div>
            {twoFAEnabled && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded">
                <QrCode className="w-16 h-16 mx-auto text-indigo-600" />
                <p className="text-xs text-center mt-2 text-gray-500">
                  Scannez ce QR Code avec votre app d’authentification
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export & Danger zone */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <p className="font-medium">📦 Exporter mes données</p>
              <Button onClick={handleExportData} className="flex items-center gap-2">
                <Download className="w-4 h-4" /> Export JSON
              </Button>
            </div>

            <div className="flex justify-between items-center text-red-600 font-medium">
              <p>🗑️ Supprimer définitivement mon compte</p>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                className="flex items-center gap-2"
              >
                <UserX className="w-4 h-4" /> Supprimer
              </Button>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-red-600 font-medium">Déconnexion</p>
              <Button
                variant="destructive"
                onClick={logout}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Déconnexion
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
