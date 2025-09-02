import { useEffect, useState } from "react";
import {
  listOrganizations,
  createOrganization,
  inviteMember,
  removeMember,
  Organization,
} from "@/services/organizations";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";

function RoleBadge({ role }: { role: string }) {
  const base = "px-2 py-1 text-xs rounded-full font-medium";
  switch (role) {
    case "OWNER":
      return <span className={`${base} bg-purple-100 text-purple-700`}>Propriétaire</span>;
    case "ADMIN":
      return <span className={`${base} bg-blue-100 text-blue-700`}>Admin</span>;
    default:
      return <span className={`${base} bg-gray-100 text-gray-700`}>Membre</span>;
  }
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrgName, setNewOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  async function fetchOrgs() {
    try {
      setLoading(true);
      const data = await listOrganizations();
      setOrganizations(data);
    } catch (err) {
      console.error(err);
      toast.error("❌ Impossible de charger les organisations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrgs();
  }, []);

  async function handleCreateOrg() {
    if (!newOrgName.trim()) return toast.error("Le nom est requis !");
    try {
      await createOrganization(newOrgName);
      toast.success("✅ Organisation créée !");
      setNewOrgName("");
      fetchOrgs();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la création de l’organisation.");
    }
  }

  async function handleInvite(orgId: string) {
    if (!inviteEmail.trim()) return toast.error("Email requis !");
    try {
      await inviteMember(orgId, inviteEmail, inviteRole);
      toast.success("✉️ Invitation envoyée !");
      setInviteEmail("");
      setInviteRole("MEMBER");
      fetchOrgs();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l’invitation.");
    }
  }

  async function handleRemove(orgId: string, memberId: string) {
    if (!window.confirm("Supprimer ce membre ?")) return;
    try {
      await removeMember(orgId, memberId);
      toast.success("👤 Membre supprimé.");
      fetchOrgs();
    } catch (err) {
      console.error(err);
      toast.error("Impossible de supprimer le membre.");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-indigo-500">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        <span className="ml-3">Chargement des organisations...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">🏢 Organisations</h1>

      {/* Formulaire création */}
      <Card className="shadow-md rounded-2xl hover:shadow-lg transition">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Créer une organisation</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Nom de l’organisation"
              className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button onClick={handleCreateOrg}>Créer</Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste organisations */}
      {organizations.length === 0 ? (
        <p className="text-gray-500 text-center py-10">
          Aucune organisation créée pour l’instant.
        </p>
      ) : (
        organizations.map((org) => (
          <Card key={org.id} className="shadow-md rounded-2xl hover:shadow-lg transition">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">{org.name}</h2>
                <Button
                  variant="outline"
                  onClick={() => setSelectedOrg(selectedOrg === org.id ? null : org.id)}
                >
                  {selectedOrg === org.id ? "Fermer" : "Gérer"}
                </Button>
              </div>

              {/* Membres */}
              {selectedOrg === org.id && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Membres</h3>
                  {org.members.length === 0 ? (
                    <p className="text-gray-500">Aucun membre dans cette organisation.</p>
                  ) : (
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100 text-left">
                          <th className="p-2">Email</th>
                          <th className="p-2">Rôle</th>
                          <th className="p-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {org.members.map((m) => (
                          <tr key={m.id} className="border-b hover:bg-gray-50">
                            <td className="p-2">{m.email}</td>
                            <td className="p-2"><RoleBadge role={m.role} /></td>
                            <td className="p-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemove(org.id, m.id)}
                              >
                                Supprimer
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Invitation */}
                  <div className="space-y-2">
                    <h3 className="font-semibold">Inviter un membre</h3>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Email du membre"
                        className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="MEMBER">Membre</option>
                        <option value="ADMIN">Admin</option>
                        <option value="OWNER">Owner</option>
                      </select>
                      <Button onClick={() => handleInvite(org.id)}>Inviter</Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
