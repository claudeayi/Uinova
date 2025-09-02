import { useEffect, useState } from "react";
import { getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate } from "@/services/admin";
import { Button } from "@/components/base/Button";
import { Card } from "@/components/advanced/Card";
import { Modal } from "@/components/advanced/Modal";
import { useToast } from "@/hooks/useToast";

export default function EmailTemplatesAdmin() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const data = await getEmailTemplates();
      setTemplates(data);
    } catch (e: any) {
      toast.error("Erreur chargement templates");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(tpl: any) {
    try {
      if (tpl.id) {
        await updateEmailTemplate(tpl.id, tpl);
        toast.success("Template mis à jour");
      } else {
        await createEmailTemplate(tpl);
        toast.success("Template créé");
      }
      setEditing(null);
      loadTemplates();
    } catch (e: any) {
      toast.error(e.message || "Erreur sauvegarde");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce template ?")) return;
    await deleteEmailTemplate(id);
    toast.success("Template supprimé");
    loadTemplates();
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Templates Email</h1>
        <Button onClick={() => setEditing({ code: "", name: "", subject: "", bodyHtml: "" })}>+ Nouveau</Button>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((tpl) => (
            <Card key={tpl.id} title={tpl.name}>
              <p className="font-mono text-sm">{tpl.code}</p>
              <p>{tpl.subject}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => setEditing(tpl)}>Modifier</Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(tpl.id)}>Supprimer</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Éditer Template">
        {editing && (
          <div className="space-y-2">
            <input
              className="w-full border p-2 rounded"
              placeholder="Code"
              value={editing.code}
              onChange={(e) => setEditing({ ...editing, code: e.target.value })}
            />
            <input
              className="w-full border p-2 rounded"
              placeholder="Nom"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
            <input
              className="w-full border p-2 rounded"
              placeholder="Sujet"
              value={editing.subject}
              onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
            />
            <textarea
              className="w-full border p-2 rounded"
              placeholder="HTML"
              value={editing.bodyHtml}
              onChange={(e) => setEditing({ ...editing, bodyHtml: e.target.value })}
            />
            <Button onClick={() => handleSave(editing)}>Sauvegarder</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
