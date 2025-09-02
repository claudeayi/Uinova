import { useEffect, useState } from "react";
import {
  listEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  sendTestEmail,
  EmailTemplate,
} from "@/services/emailTemplates";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

export default function EmailTemplatesAdmin() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    subject: "",
    body: "",
  });
  const [testEmail, setTestEmail] = useState("");

  async function fetchTemplates() {
    try {
      setLoading(true);
      const data = await listEmailTemplates();
      setTemplates(data);
    } catch (err) {
      console.error(err);
      toast.error("❌ Impossible de charger les templates.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function handleCreate() {
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.body) {
      toast.error("⚠️ Veuillez remplir tous les champs.");
      return;
    }
    try {
      await createEmailTemplate(newTemplate);
      toast.success("✅ Template créé !");
      setNewTemplate({ name: "", subject: "", body: "" });
      fetchTemplates();
    } catch (err) {
      console.error(err);
      toast.error("❌ Erreur lors de la création.");
    }
  }

  async function handleUpdate() {
    if (!editing) return;
    try {
      await updateEmailTemplate(editing.id, editing);
      toast.success("✏️ Template mis à jour !");
      setEditing(null);
      fetchTemplates();
    } catch (err) {
      console.error(err);
      toast.error("❌ Erreur lors de la mise à jour.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Supprimer ce template ?")) return;
    try {
      await deleteEmailTemplate(id);
      toast.success("🗑️ Template supprimé.");
      fetchTemplates();
    } catch (err) {
      console.error(err);
      toast.error("❌ Impossible de supprimer.");
    }
  }

  async function handleSendTest(id: string) {
    if (!testEmail.trim()) {
      toast.error("⚠️ Entrez une adresse email pour le test.");
      return;
    }
    try {
      await sendTestEmail(id, testEmail);
      toast.success("📨 Email de test envoyé !");
    } catch (err) {
      console.error(err);
      toast.error("❌ Échec de l’envoi du test.");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-indigo-500">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        <span className="ml-3">Chargement des templates...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">📧 Templates Email</h1>

      {/* Formulaire création */}
      <Card className="shadow-md rounded-2xl hover:shadow-lg transition">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">➕ Nouveau template</h2>
          <input
            type="text"
            placeholder="Nom"
            value={newTemplate.name}
            onChange={(e) =>
              setNewTemplate((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full border rounded-lg px-3 py-2"
          />
          <input
            type="text"
            placeholder="Sujet"
            value={newTemplate.subject}
            onChange={(e) =>
              setNewTemplate((prev) => ({ ...prev, subject: e.target.value }))
            }
            className="w-full border rounded-lg px-3 py-2"
          />
          <textarea
            placeholder="HTML de l’email"
            value={newTemplate.body}
            onChange={(e) =>
              setNewTemplate((prev) => ({ ...prev, body: e.target.value }))
            }
            className="w-full h-40 border rounded-lg px-3 py-2 font-mono text-sm"
          />
          <Button onClick={handleCreate}>Créer</Button>
        </CardContent>
      </Card>

      {/* Liste des templates */}
      {templates.length === 0 ? (
        <p className="text-gray-500">Aucun template enregistré.</p>
      ) : (
        templates.map((tpl) => (
          <Card key={tpl.id} className="shadow-md rounded-2xl hover:shadow-lg transition">
            <CardContent className="p-6 space-y-4">
              {editing?.id === tpl.id ? (
                <>
                  <h2 className="text-lg font-semibold">✏️ Modifier Template</h2>
                  <input
                    type="text"
                    value={editing.name}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev ? { ...prev, name: e.target.value } : null
                      )
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  <input
                    type="text"
                    value={editing.subject}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev ? { ...prev, subject: e.target.value } : null
                      )
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  <textarea
                    value={editing.body}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev ? { ...prev, body: e.target.value } : null
                      )
                    }
                    className="w-full h-40 border rounded-lg px-3 py-2 font-mono text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdate}>
                      💾 Sauvegarder
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(null)}
                    >
                      Annuler
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">{tpl.name}</h2>
                    <span className="text-gray-500 text-sm">
                      {tpl.updatedAt
                        ? new Date(tpl.updatedAt).toLocaleString()
                        : ""}
                    </span>
                  </div>
                  <p className="font-medium">{tpl.subject}</p>
                  <div className="border p-3 rounded bg-gray-50 text-sm overflow-x-auto">
                    <div dangerouslySetInnerHTML={{ __html: tpl.body }} />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setEditing(tpl)}>
                      ✏️ Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendTest(tpl.id)}
                    >
                      🧪 Envoyer test
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(tpl.id)}
                    >
                      Supprimer
                    </Button>
                  </div>

                  {/* Champ email test */}
                  <div className="mt-2">
                    <input
                      type="email"
                      placeholder="Email pour test"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
