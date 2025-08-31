import { useEffect, useState } from "react";
import http from "@/services/http";

export default function UsersAdmin() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await http.get("/admin/users");
        setUsers(res.data);
      } catch (err) {
        console.error("❌ Erreur chargement users:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  if (loading) return <p className="text-gray-500">Chargement...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">👤 Utilisateurs</h1>
      <table className="w-full border border-slate-300 dark:border-slate-700">
        <thead className="bg-slate-200 dark:bg-slate-800">
          <tr>
            <th className="p-2 text-left">ID</th>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Rôle</th>
            <th className="p-2 text-left">Créé le</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t dark:border-slate-700">
              <td className="p-2">{u.id}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.role}</td>
              <td className="p-2">{new Date(u.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
