import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { toast } from "react-hot-toast";
import { ArrowLeft, Mail, Shield, Upload, Trash2 } from "lucide-react";

/* ============================================================================
 *  Types
 * ========================================================================== */
interface AdminUser {
  id: string;
  email: string;
  fullName?: string;
  role: "USER" | "PREMIUM" | "ADMIN";
  avatar?: string;
  createdAt?: string;
}

/* ============================================================================
 *  Page AdminProfilePage
 * ========================================================================== */
export default function AdminProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AdminUser["role"]>("USER");
  const [avatar, setAvatar] = useState<File | null>(null);

  /* === Charger le profil === */
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await axios.get(`/api/admin/users/${id}`);
        setUser(res.data);
        setRole(res.data.role);
      } catch (err) {
        console.error("❌ Erreur fetch user:", err);
        toast.error("Impossible de charger cet utilisateur.");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchUser();
  }, [id]);

  /* === Changer le rôle === */
  async function handleRoleChange() {
    try {
      await axios.put(`/api/admin/users/${id}/role`, { role });
      toast.success("✅ Rôle mis à jour");
      setUser((prev) => (prev ? { ...prev, role } : prev));
    } catch (err) {
      console.error("❌ Erreur rôle:", err);
      toast.error("Impossible de changer le rôle");
    }
  }

  /* === Changer l’avatar === */
  async function handleAvatarUpload() {
    if (!avatar) return;
    try {
      const formData = new FormData();
      formData.append("avatar", avatar);
      await axios.put(`/api/admin/users/${id}/avatar`, formData);
      toast.success("✅ Avatar mis à jour");
    } catch (err) {
      console.error("❌ Erreur avatar:", err);
      toast.error("Impossible de mettre à jour l’avatar");
    }
  }

  /* === Supprimer l’utilisateur === */
  async function handleDelete() {
    if (!confirm("⚠️ Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;
    try {
      await axios.delete(`/api/admin/users/${id}`);
      toast.success("✅ Utilisateur supprimé");
      navigate("/admin/users");
    } catch (err) {
      console.error("❌ Erreur suppression:", err);
      toast.error("Impossible de supprimer cet utilisateur");
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p className="p-6 text-center text-gray-500">⏳ Chargement...</p>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <p className="p-6 text-center text-red-500">❌ Utilisateur introuvable</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">👤 Profil administrateur</h1>
          <Button variant="outline" onClick={() => navigate("/admin/users")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
        </div>

        {/* Infos utilisateur */}
        <Card>
          <CardContent className="flex items-center gap-6 p-6">
            <div className="flex flex-col items-center">
              <img
                src={
                  avatar
                    ? URL.createObjectURL(avatar)
                    : user.avatar || "https://via.placeholder.com/100"
                }
                alt="Avatar"
                className="w-24 h-24 rounded-full border shadow"
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
              {avatar && (
                <Button
                  size="sm"
                  className="mt-2 bg-blue-600 text-white"
                  onClick={handleAvatarUpload}
                >
                  Mettre à jour
                </Button>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <p className="font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" /> {user.email}
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Shield className="w-4 h-4 text-gray-400" /> Rôle actuel :{" "}
                <span className="font-medium">{user.role}</span>
              </p>
              {user.createdAt && (
                <p className="text-xs text-gray-400">
                  Membre depuis le {new Date(user.createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gestion rôle */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold">Changer le rôle</h2>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AdminUser["role"])}
              className="px-3 py-2 border rounded dark:bg-slate-800 dark:border-slate-700"
            >
              <option value="USER">Utilisateur</option>
              <option value="PREMIUM">Premium</option>
              <option value="ADMIN">Admin</option>
            </select>
            <Button onClick={handleRoleChange} className="bg-blue-600 text-white">
              💾 Mettre à jour le rôle
            </Button>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card>
          <CardContent className="p-6 flex justify-between items-center">
            <p className="text-red-600 font-medium">Supprimer cet utilisateur</p>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Supprimer
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
