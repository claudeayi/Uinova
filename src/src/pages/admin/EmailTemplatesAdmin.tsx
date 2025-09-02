import { useEffect, useState } from "react";
import {
  listEmailTemplates,
  updateEmailTemplate,
  createEmailTemplate,
  EmailTemplate,
} from "@/services/emailTemplates";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

export default function EmailTemplatesAdmin() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");

  async function fetchTemplates() {
    try {
      setLoading(true);
      const data = await listEmailTemplates();
      setTemplates(data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les templates.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function handleSave(id: string, subject: string, body: string) {
    try {
      await updateEmailTemplate(id, { subject, body });
      toast.success("Template mis à jour !");
      fetchTemplates();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la sauvegarde.");
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !newSubject.trim() || !newBody.trim()) {
      toast.error("Tous les champs sont requis.");
      return;
    }
    try {
      await createEmailTemplate({
        name: newName,
        subject: newSubject,
        body: newBody,
      });
      toast.success("Nouveau template créé !");
      setNewName("");
      setNewSubject("");
      setNewBody("");
      fetchTemplates();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la création.");
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
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">📧 Templates d’e-mails</h1>

      {/* Création d’un nouveau template */}
      <Card className="shadow-md rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Créer un template</h2>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom interne"
            className="w-full border rounded-lg px-3 py-2"
          />
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Sujet de l’email"
            className="w-full border rounded-lg px-3 py-2"
          />
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Contenu HTML / texte de l’email"
            className="w-full border rounded-lg px-3 py-2 h-32 font-mono text-sm"
          />
          <Button onClick={handleCreate}>Créer</Button>
        </CardContent>
      </Card>

      {/* Liste des templates existants */}
      {templates.length === 0 ? (
        <p className="text-gray-500">Aucun template disponible.</p>
      ) : (
        templates.map((tpl) => (
          <Card key={tpl.id} className="shadow-md rounded-2xl">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">{tpl.name}</h2>
              <input
                type="text"
                defaultValue={tpl.subject}
                onBlur={(e) => handleSave(tpl.id, e.target.value, tpl.body)}
                className="w-full border rounded-lg px-3 py-2"
              />
              <textarea
                defaultValue={tpl.body}
                onBlur={(e) => handleSave(tpl.id, tpl.subject, e.target.value)}
                className="w-full border rounded-lg px-3 py-2 h-32 font-mono text-sm"
              />
              <div className="text-sm text-gray-500">
                ID : <span className="font-mono">{tpl.id}</span>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
