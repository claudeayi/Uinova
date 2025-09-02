import { useEffect, useState } from "react";
import { getOrganizations, createOrganization, inviteMember } from "@/services/organizations";
import { Button } from "@/components/base/Button";
import { Card } from "@/components/advanced/Card";
import { Modal } from "@/components/advanced/Modal";
import { useToast } from "@/hooks/useToast";

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: "", description: "" });
  const toast = useToast();

  useEffect(() => {
    loadOrgs();
  }, []);

  async function loadOrgs() {
    setLoading(true);
    try {
      const data = await getOrganizations();
      setOrgs(data);
    } catch (e: any) {
      toast.error("Impossible de charger les organisations");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      await createOrganization(newOrg);
      toast.success("Organisation créée !");
      setShowModal(false);
      setNewOrg({ name: "", description: "" });
      loadOrgs();
    } catch (e: any) {
      toast.error(e.message || "Erreur création organisation");
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Mes Organisations</h1>
        <Button onClick={() => setShowModal(true)}>+ Nouvelle</Button>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {orgs.map((org) => (
            <Card key={org.id} title={org.name}>
              <p>{org.description}</p>
              <p className="text-sm text-gray-500">
                {org.members.length} membres
              </p>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Créer organisation">
        <div className="space-y-2">
          <input
            className="w-full border p-2 rounded"
            placeholder="Nom"
            value={newOrg.name}
            onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
          />
          <textarea
            className="w-full border p-2 rounded"
            placeholder="Description"
            value={newOrg.description}
            onChange={(e) => setNewOrg({ ...newOrg, description: e.target.value })}
          />
          <Button onClick={handleCreate}>Créer</Button>
        </div>
      </Modal>
    </div>
  );
}
