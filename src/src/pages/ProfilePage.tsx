// src/pages/ProfilePage.tsx
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import axios from "axios";
import { LogOut, Upload } from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">👤 Mon Profil</h1>

        {/* Infos principales */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div>
                <img
                  src={
                    avatar
                      ? URL.createObjectURL(avatar)
                      : user.avatar || "https://via.placeholder.com/100"
                  }
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover border"
                />
                <label className="block mt-2 text-sm cursor-pointer text-indigo-600 hover:underline">
                  <Upload className="inline w-4 h-4 mr-1" /> Changer avatar
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setAvatar(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {/* Infos utilisateur */}
              <div>
                <p className="font-semibold">{user.email}</p>
                <p className="text-xs text-gray-500">Rôle : {user.role}</p>
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
              <label className="text-sm font-medium">Nouveau mot de passe</label>
              <input
                type="password"
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded dark:bg-slate-800 dark:border-slate-700"
              />
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

        {/* Danger zone */}
        <Card>
          <CardContent className="p-6 flex justify-between items-center">
            <p className="text-red-600 font-medium">Déconnexion de ce compte</p>
            <Button
              variant="destructive"
              onClick={logout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Déconnexion
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
