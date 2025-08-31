import { useEffect, useState } from "react";
import { getUsers, updateUserRole, updateUserPlan } from "@/services/admin";
import toast from "react-hot-toast";

export default function UsersAdmin() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function fetchUsers() {
    try {
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
      toast.success("Rôle mis à jour ✅");
      fetchUsers();
    } catch (err) {
      console.error("❌ Erreur update role:", err);
      toast.error("Erreur mise à jour rôle");
    }
  }

  async function handlePlanChange(userId: string, plan: string) {
    try {
      await updateUserPlan(userId, plan);
      toast.success("Plan mis à jour ✅");
      fetchUsers();
    } catch (err) {
      console.error("❌ Erreur update plan:", err);
      toast.error("Erreur mise à jour plan");
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) return <p className="p-4 text-gray-500">Chargement...</p>;

  // 🔎 Filtre + pagination
  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name || "").toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">👤 Gestion des utilisateurs</h1>

      {/* 🔎 Recherche */}
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Rechercher par email ou nom..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="border rounded px-3 py-2 w-full md:w-1/3"
        />
        <p className="text-sm text-gray-500 ml-4">
          {filtered.length} utilisateur(s)
        </p>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded shadow">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-slate-800">
              <th className="p-3 border">Email</th>
              <th className="p-3 border">Nom</th>
              <th className="p-3 border">Rôle</th>
              <th className="p-3 border">Plan</th>
              <th className="p-3 border">Créé le</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((u) => (
              <tr
                key={u.id}
                className="text-center border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.name || "—"}</td>
                <td className="p-3">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="border rounded px-2 py-1 dark:bg-slate-700"
                  >
                    <option value="USER">USER</option>
                    <option value="PREMIUM">PREMIUM</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <span
                    className={`ml-2 px-2 py-1 text-xs rounded ${
                      u.role === "ADMIN"
                        ? "bg-red-100 text-red-600"
                        : u.role === "PREMIUM"
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="p-3">
                  <select
                    value={u.subscriptions?.[0]?.plan || "FREE"}
                    onChange={(e) => handlePlanChange(u.id, e.target.value)}
                    className="border rounded px-2 py-1 dark:bg-slate-700"
                  >
                    <option value="FREE">FREE</option>
                    <option value="PRO">PRO</option>
                    <option value="BUSINESS">BUSINESS</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                  <span
                    className={`ml-2 px-2 py-1 text-xs rounded ${
                      u.subscriptions?.[0]?.plan === "ENTERPRISE"
                        ? "bg-purple-100 text-purple-600"
                        : u.subscriptions?.[0]?.plan === "BUSINESS"
                        ? "bg-blue-100 text-blue-600"
                        : u.subscriptions?.[0]?.plan === "PRO"
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {u.subscriptions?.[0]?.plan || "FREE"}
                  </span>
                </td>
                <td className="p-3">
                  {new Date(u.createdAt).toLocaleDateString("fr-FR")}
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
  );
}
