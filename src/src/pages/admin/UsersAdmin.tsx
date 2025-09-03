import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { getUsers, updateUserRole, AdminUser } from "@/services/admin";
import DashboardLayout from "@/layouts/DashboardLayout";

export default function UsersAdmin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [updating, setUpdating] = useState<string | null>(null);
  const limit = 10;

  async function fetchUsers() {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error("❌ Erreur fetch users:", err);
      toast.error("Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleChangeRole(
    userId: string,
    role: "USER" | "PREMIUM" | "ADMIN"
  ) {
    try {
      setUpdating(userId);
      await updateUserRole(userId, role);
      toast.success("✅ Rôle mis à jour !");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
    } catch (err) {
      console.error("❌ Erreur update role:", err);
      toast.error("Erreur lors de la mise à jour du rôle.");
    } finally {
      setUpdating(null);
    }
  }

  // 🔎 Filtrage
  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // 📄 Pagination
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);
  const totalPages = Math.ceil(filtered.length / limit);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-20 text-indigo-500">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
          <span className="ml-3">Chargement des utilisateurs...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold">👥 Gestion des utilisateurs</h1>
          <input
            type="text"
            placeholder="🔍 Rechercher par email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full md:w-72 dark:bg-slate-900 dark:border-slate-700"
          />
        </header>

        <p className="text-sm text-gray-500">
          {filtered.length} utilisateur(s) trouvé(s)
        </p>

        {/* Liste */}
        <Card className="shadow-md rounded-2xl">
          <CardContent className="overflow-x-auto p-0">
            {paginated.length === 0 ? (
              <p className="text-center text-gray-500 py-10">
                Aucun utilisateur trouvé.
              </p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-slate-800 text-left">
                    <th className="p-3 border">Email</th>
                    <th className="p-3 border">Rôle</th>
                    <th className="p-3 border">Créé le</th>
                    <th className="p-3 border text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                    >
                      <td className="p-3 font-mono text-xs">{u.email}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold mr-2 ${
                            u.role === "ADMIN"
                              ? "bg-red-100 text-red-700"
                              : u.role === "PREMIUM"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="p-3 text-center">
                        <select
                          value={u.role}
                          disabled={updating === u.id}
                          onChange={(e) =>
                            handleChangeRole(
                              u.id,
                              e.target.value as "USER" | "PREMIUM" | "ADMIN"
                            )
                          }
                          className="border rounded px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-700"
                        >
                          <option value="USER">USER</option>
                          <option value="PREMIUM">PREMIUM</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-4">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ◀️ Précédent
            </Button>
            <span className="text-sm">
              Page {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant ▶️
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
