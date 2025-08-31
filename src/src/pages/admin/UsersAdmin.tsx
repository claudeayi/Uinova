import { useEffect, useState } from "react";
import { getUsers, updateUserRole } from "@/services/admin";
import toast from "react-hot-toast";

export default function UsersAdmin() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      toast.success("Rôle mis à jour");
      fetchUsers();
    } catch (err) {
      console.error("❌ Erreur update role:", err);
      toast.error("Erreur mise à jour rôle");
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return <p className="p-4 text-gray-500">Chargement...</p>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">👤 Gestion des utilisateurs</h1>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 dark:bg-slate-800">
            <th className="p-3 border">Email</th>
            <th className="p-3 border">Rôle</th>
            <th className="p-3 border">Créé le</th>
            <th className="p-3 border">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="text-center border-b dark:border-slate-700">
              <td className="p-3">{u.email}</td>
              <td className="p-3">{u.role}</td>
              <td className="p-3">
                {new Date(u.createdAt).toLocaleDateString("fr-FR")}
              </td>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
