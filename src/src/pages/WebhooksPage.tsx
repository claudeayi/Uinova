import { useEffect, useState } from "react";
import {
  listWebhooks,
  createWebhook,
  testWebhook,
  deleteWebhook,
  updateWebhook,
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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 5;

  const availableEvents = [
    "project.created",
    "project.updated",
    "project.deleted",
    "payment.succeeded",
    "payment.failed",
    "user.invited",
    "user.removed",
  ];

  async function fetchWebhooks() {
    try {
      setLoading(true);
      const data = await listWebhooks();
      setWebhooks(data);
    } catch (err) {
      console.error(err);
      toast.error("❌ Impossible de charger les webhooks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWebhooks();
  }, []);

  async function handleCreateWebhook() {
    if (!url.trim() || events.length === 0) {
      toast.error("⚠️ Veuillez renseigner une URL et au moins un event.");
      return;
    }
    try {
      await createWebhook(url, events);
      toast.success("✅ Webhook créé avec succès !");
      setUrl("");
      setEvents([]);
      fetchWebhooks();
    } catch (err) {
      console.error(err);
      toast.error("❌ Erreur lors de la création.");
    }
  }

  async function handleUpdateWebhook(wh: Webhook) {
    try {
      await updateWebhook(wh.id, { url: wh.url, events: wh.events });
      toast.success("✏️ Webhook mis à jour !");
      fetchWebhooks();
    } catch (err) {
      console.error(err);
      toast.error("❌ Erreur lors de la mise à jour.");
    }
  }

  async function handleTestWebhook(id: string) {
    try {
      await testWebhook(id);
      toast.success("🧪 Webhook testé avec succès !");
    } catch (err) {
      console.error(err);
      toast.error("❌ Échec du test webhook.");
    }
  }

  async function handleDeleteWebhook(id: string) {
    if (!window.confirm("Voulez-vous vraiment supprimer ce webhook ?")) return;
    try {
      await deleteWebhook(id);
      toast.success("🗑️ Webhook supprimé.");
      fetchWebhooks();
    } catch (err) {
      console.error(err);
      toast.error("❌ Impossible de supprimer le webhook.");
    }
  }

  function toggleEvent(event: string) {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  // Filtrage
  const filteredWebhooks = webhooks.filter(
    (wh) =>
      wh.url.toLowerCase().includes(search.toLowerCase()) ||
      wh.events.some((ev) =>
        ev.toLowerCase().includes(search.toLowerCase())
      )
  );

  // Pagination
  const start = (page - 1) * limit;
  const paginated = filteredWebhooks.slice(start, start + limit);
  const totalPages = Math.ceil(filteredWebhooks.length / limit);

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
      <Card className="shadow-md rounded-2xl hover:shadow-lg transition">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Créer un webhook</h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className={`px-3 py-1 rounded-full text-sm border transition ${
                    events.includes(ev)
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {ev}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Barre recherche */}
      <div className="flex justify-between items-center">
        <input
          type="text"
          placeholder="🔍 Rechercher par URL ou événement..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 flex-1 max-w-md"
        />
      </div>

      {/* Liste webhooks */}
      <Card className="shadow-md rounded-2xl hover:shadow-lg transition">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">📋 Webhooks enregistrés</h2>
          {paginated.length === 0 ? (
            <p className="text-gray-500 text-center py-10">
              Aucun webhook correspondant.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-3">URL</th>
                    <th className="p-3">Événements</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3">Créé le</th>
                    <th className="p-3">Dernier test</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((wh) => (
                    <tr key={wh.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs">{wh.url}</td>
                      <td className="p-3">{wh.events.join(", ")}</td>
                      <td className="p-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs ${
                            wh.active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {wh.active ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500">
                        {wh.createdAt
                          ? new Date(wh.createdAt).toLocaleString()
                          : "-"}
                      </td>
                      <td className="p-3">
                        {wh.lastTestResult ? (
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              wh.lastTestResult === "success"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {wh.lastTestResult}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestWebhook(wh.id)}
                        >
                          🧪 Tester
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateWebhook(wh)}
                        >
                          ✏️ Éditer
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteWebhook(wh.id)}
                        >
                          Supprimer
                        </Button>
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
