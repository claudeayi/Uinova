// src/pages/admin/EmailTemplatesAdmin.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export default function EmailTemplatesAdmin() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<EmailTemplate>>({
    name: "",
    subject: "",
    body: "",
  });

  async function fetchTemplates() {
    try {
      setLoading(true);
      const res = await axios.get("/api/admin/email-templates");
      setTemplates(res.data || []);
    } catch (err) {
      console.error("❌ fetchTemplates", err);
      toast.error("Impossible de charger les templates email.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      if (editing) {
        await axios.put(`/api/admin/email-templates/${editing.id}`, editing);
        toast.success("✅ Template mis à jour !");
      } else {
        await axios.post("/api/admin/email-templates", newTemplate);
        toast.success("✅ Template créé !");
      }
      setEditing(null);
      setNewTemplate({ name: "", subject: "", body: "" });
      fetchTemplates();
    } catch (err) {
      console.error("❌ handleSave", err);
      toast.error("Erreur lors de l’enregistrement.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Supprimer ce template définitivement ?")) return;
    try {
      await axios.delete(`/api/admin/email-templates/${id}`);
      toast.success("🗑️ Template supprimé.");
      fetchTemplates();
    } catch (err) {
      console.error("❌ handleDelete", err);
      toast.error("Erreur suppression template.");
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">📧 Gestion des templates Email</h1>
          <Button onClick={() => setEditing(null)}>➕ Nouveau</Button>
        </header>

        {loading ? (
          <p className="text-gray-500">⏳ Chargement...</p>
        ) : templates.length === 0 ? (
          <p className="text-gray-500">Aucun template trouvé.</p>
        ) : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-slate-800 text-left">
                    <th className="p-3 border">Nom</th>
                    <th className="p-3 border">Sujet</th>
                    <th className="p-3 border">Dernière maj</th>
                    <th className="p-3 border text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                      <td className="p-3 font-medium">{t.name}</td>
                      <td className="p-3">{t.subject}</td>
                      <td className="p-3">
                        {new Date(t.updatedAt).toLocaleString("fr-FR")}
                      </td>
                      <td className="p-3 text-center flex gap-2 justify-center">
                        <Button size="sm" onClick={() => setEditing(t)}>
                          ✏️ Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(t.id)}
                        >
                          Supprimer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Formulaire de création / édition */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">
              {editing ? "✏️ Modifier un template" : "➕ Nouveau template"}
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nom"
                value={editing ? editing.name : newTemplate.name || ""}
                onChange={(e) =>
                  editing
                    ? setEditing({ ...editing, name: e.target.value })
                    : setNewTemplate({ ...newTemplate, name: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="Sujet"
                value={editing ? editing.subject : newTemplate.subject || ""}
                onChange={(e) =>
                  editing
                    ? setEditing({ ...editing, subject: e.target.value })
                    : setNewTemplate({ ...newTemplate, subject: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
              />
              <textarea
                rows={6}
                placeholder="Corps du mail"
                value={editing ? editing.body : newTemplate.body || ""}
                onChange={(e) =>
                  editing
                    ? setEditing({ ...editing, body: e.target.value })
                    : setNewTemplate({ ...newTemplate, body: e.target.value })
                }
                className="w-full px-3 py-2 border rounded font-mono text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Annuler
              </Button>
              <Button onClick={handleSave}>
                {editing ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
