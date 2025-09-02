import { useEffect, useState } from "react";
import {
  listWebhooks,
  createWebhook,
  testWebhook,
  deleteWebhook,
  Webhook,
} from "@/services/webhooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);

  async function fetchWebhooks() {
    try {
      setLoading(true);
      const data = await listWebhooks();
      setWebhooks(data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les webhooks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWebhooks();
  }, []);

  async function handleCreateWebhook() {
    if (!url.trim() || events.length === 0) {
      toast.error("Veuillez renseigner une URL et au moins un event.");
      return;
    }
    try {
      await createWebhook(url, events);
      toast.success("Webhook créé !");
      setUrl("");
      setEvents([]);
      fetchWebhooks();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la création.");
    }
  }

  async function handleTestWebhook(id: string) {
    try {
      await testWebhook(id);
      toast.success("Webhook testé avec succès !");
    } catch (err) {
      console.error(err);
      toast.error("Échec du test webhook.");
    }
  }

  async function handleDeleteWebhook(id: string) {
    try {
      await deleteWebhook(id);
      toast.success("Webhook supprimé.");
      fetchWebhooks();
    } catch (err) {
      console.error(err);
      toast.error("Impossible de supprimer le webhook.");
    }
  }

  function toggleEvent(event: string) {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  const availableEvents = [
    "project.created",
    "project.updated",
    "project.deleted",
    "payment.succeeded",
    "payment.failed",
    "user.invited",
    "user.removed",
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-indigo-500">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        <span className="ml-3">Chargement des webhooks...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">🔗 Webhooks</h1>

      {/* Création webhook */}
      <Card className="shadow-md rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Créer un webhook</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              className="flex-1 border rounded-lg px-3 py-2"
            />
            <Button onClick={handleCreateWebhook}>Créer</Button>
          </div>

          <div className="space-y-2">
            <p className="text-gray-600 text-sm">Événements :</p>
            <div className="flex flex-wrap gap-2">
              {availableEvents.map((ev) => (
                <button
                  key={ev}
                  onClick={() => toggleEvent(ev)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    events.includes(ev)
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {ev}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste webhooks */}
      {webhooks.length === 0 ? (
        <p className="text-gray-500">Aucun webhook enregistré.</p>
      ) : (
        webhooks.map((wh) => (
          <Card key={wh.id} className="shadow-md rounded-2xl">
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">{wh.url}</h2>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    wh.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {wh.active ? "Actif" : "Inactif"}
                </span>
              </div>

              <p className="text-sm text-gray-500">
                Événements : {wh.events.join(", ")}
              </p>

              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleTestWebhook(wh.id)}>
                  Tester
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteWebhook(wh.id)}
                >
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
