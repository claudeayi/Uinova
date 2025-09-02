import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { getUsers, updateUserRole, AdminUser } from "@/services/admin";

export default function UsersAdmin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  async function fetchUsers() {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      toast.error("❌ Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleChangeRole(userId: string, role: "USER" | "PREMIUM" | "ADMIN") {
    try {
      await updateUserRole(userId, role);
      toast.success("✅ Rôle mis à jour !");
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error("❌ Erreur lors de la mise à jour du rôle.");
    }
  }

  // Filtrage
  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);
  const totalPages = Math.ceil(filtered.length / limit);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-indigo-500">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        <span className="ml-3">Chargement des utilisateurs...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">👥 Gestion des utilisateurs</h1>

      {/* Recherche */}
      <div className="flex justify-between items-center">
        <input
          type="text"
          placeholder="🔍 Rechercher par email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 flex-1 max-w-md"
        />
      </div>

      {/* Liste des utilisateurs */}
      <Card className="shadow-md rounded-2xl hover:shadow-lg transition">
        <CardContent className="p-6">
          {paginated.length === 0 ? (
            <p className="text-gray-500 text-center py-10">
              Aucun utilisateur trouvé.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-3">Email</th>
                    <th className="p-3">Rôle</th>
                    <th className="p-3">Créé le</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs">{u.email}</td>
                      <td className="p-3">
                        <select
                          value={u.role}
                          onChange={(e) =>
                            handleChangeRole(
                              u.id,
                              e.target.value as "USER" | "PREMIUM" | "ADMIN"
                            )
                          }
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="USER">USER</option>
                          <option value="PREMIUM">PREMIUM</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td className="p-3 text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        {/* Bouton suppression éventuel si API dispo */}
                        {/* <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteUser(u.id)}
                        >
                          Supprimer
                        </Button> */}
                        <span className="text-gray-400 italic">—</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
        </CardContent>
      </Card>
    </div>
  );
}
