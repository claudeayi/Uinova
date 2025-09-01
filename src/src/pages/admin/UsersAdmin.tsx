// src/pages/admin/UsersAdmin.tsx
import { useEffect, useState } from "react";
import { getUsers, updateUserRole, updateUserPlan, deleteUser } from "@/services/admin";
import toast from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";

export default function UsersAdmin() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await getUsers();
      setUsers(res || []);
    } catch (err) {
      console.error("❌ Erreur chargement utilisateurs:", err);
      toast.error("Impossible de charger les utilisateurs");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId: string, role: string) {
    try {
      await updateUserRole(userId, role);
      toast.success("✅ Rôle mis à jour");
      fetchUsers();
    } catch {
      toast.error("Erreur mise à jour rôle");
    }
  }

  async function handlePlanChange(userId: string, plan: string) {
    try {
      await updateUserPlan(userId, plan);
      toast.success("✅ Plan mis à jour");
      fetchUsers();
    } catch {
      toast.error("Erreur mise à jour plan");
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) return;
    try {
      await deleteUser(userId);
      toast.success("🗑️ Utilisateur supprimé");
      fetchUsers();
    } catch {
      toast.error("Erreur suppression utilisateur");
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center text-gray-500">⏳ Chargement des utilisateurs...</div>
      </DashboardLayout>
    );
  }

  // 🔎 Filtrage + pagination
  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name || "").toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      USER: "bg-gray-100 text-gray-700",
      PREMIUM: "bg-purple-100 text-purple-700",
      ADMIN: "bg-red-100 text-red-700",
    };
    return <span className={`px-2 py-1 text-xs rounded ${map[role] || ""}`}>{role}</span>;
  };

  const planBadge = (plan: string) => {
    const map: Record<string, string> = {
      FREE: "bg-gray-200 text-gray-700",
      PRO: "bg-blue-100 text-blue-700",
      BUSINESS: "bg-green-100 text-green-700",
      ENTERPRISE: "bg-yellow-100 text-yellow-700",
    };
    return <span className={`px-2 py-1 text-xs rounded ${map[plan] || ""}`}>{plan}</span>;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold">👤 Gestion des utilisateurs</h1>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Rechercher par email ou nom..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="border rounded px-3 py-2 w-full md:w-72 dark:bg-slate-900 dark:border-slate-700"
            />
            <button
              onClick={fetchUsers}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              🔄 Rafraîchir
            </button>
          </div>
        </header>

        <p className="text-sm text-gray-500">{filtered.length} utilisateur(s)</p>

        {/* Tableau utilisateurs */}
        <div className="overflow-x-auto rounded shadow">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-slate-800 text-left">
                <th className="p-3 border">Email</th>
                <th className="p-3 border">Nom</th>
                <th className="p-3 border">Rôle</th>
                <th className="p-3 border">Plan</th>
                <th className="p-3 border">Créé le</th>
                <th className="p-3 border text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((u) => (
                <tr
                  key={u.id}
                  className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.name || "—"}</td>
                  <td className="p-3">
                    {roleBadge(u.role)}
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="ml-2 border rounded px-2 py-1 text-xs dark:bg-slate-700"
                    >
                      <option value="USER">USER</option>
                      <option value="PREMIUM">PREMIUM</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="p-3">
                    {planBadge(u.subscriptions?.[0]?.plan || "FREE")}
                    <select
                      value={u.subscriptions?.[0]?.plan || "FREE"}
                      onChange={(e) => handlePlanChange(u.id, e.target.value)}
                      className="ml-2 border rounded px-2 py-1 text-xs dark:bg-slate-700"
                    >
                      <option value="FREE">FREE</option>
                      <option value="PRO">PRO</option>
                      <option value="BUSINESS">BUSINESS</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </td>
                  <td className="p-3">
                    {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                    >
                      🗑️ Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-4 space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              ← Précédent
            </button>
            <span className="px-3 py-1">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
