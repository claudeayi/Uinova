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

/* ============================================================================
 *  WebhooksPage – Ultra Pro Management
 * ========================================================================== */
export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
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

  /* === API fetch === */
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

  /* === Create === */
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
    } catch {
      toast.error("❌ Erreur lors de la création.");
    }
  }

  /* === Update === */
  async function handleUpdateWebhook(wh: Webhook) {
    try {
      await updateWebhook(wh.id, { url: wh.url, events: wh.events });
      toast.success("✏️ Webhook mis à jour !");
      setEditing(null);
      fetchWebhooks();
    } catch {
      toast.error("❌ Erreur lors de la mise à jour.");
    }
  }

  /* === Toggle Active === */
  async function handleToggleActive(wh: Webhook) {
    try {
      await updateWebhook(wh.id, { active: !wh.active });
      toast.success(wh.active ? "🔴 Désactivé" : "🟢 Activé");
      fetchWebhooks();
    } catch {
      toast.error("Impossible de mettre à jour l’état.");
    }
  }

  /* === Test === */
  async function handleTestWebhook(id: string) {
    try {
      const res = await testWebhook(id);
      toast.success("🧪 Test effectué !");
      setSelectedLog(JSON.stringify(res, null, 2));
    } catch {
      toast.error("❌ Test échoué.");
    }
  }

  /* === Delete === */
  async function handleDeleteWebhook(id: string) {
    if (!window.confirm("Supprimer ce webhook ?")) return;
    try {
      await deleteWebhook(id);
      toast.success("🗑️ Supprimé.");
      fetchWebhooks();
    } catch {
      toast.error("❌ Impossible de supprimer.");
    }
  }

  function toggleEventForWebhook(wh: Webhook, event: string) {
    wh.events = wh.events.includes(event)
      ? wh.events.filter((e) => e !== event)
      : [...wh.events, event];
    setWebhooks([...webhooks]);
  }

  /* === Filtrage + Pagination === */
  const filteredWebhooks = webhooks.filter(
    (wh) =>
      wh.url.toLowerCase().includes(search.toLowerCase()) ||
      wh.events.some((ev) => ev.toLowerCase().includes(search.toLowerCase())) ||
      (wh.active ? "actif" : "inactif").includes(search.toLowerCase())
  );

  const start = (page - 1) * limit;
  const paginated = filteredWebhooks.slice(start, start + limit);
  const totalPages = Math.ceil(filteredWebhooks.length / limit);

  const activeCount = webhooks.filter((w) => w.active).length;
  const avgEvents =
    webhooks.length > 0
      ? (
          webhooks.reduce((sum, w) => sum + w.events.length, 0) / webhooks.length
        ).toFixed(1)
      : 0;

  /* === Render === */
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-indigo-500">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        <span className="ml-3">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🔗 Webhooks</h1>
      <p className="text-sm text-gray-500">
        {activeCount} actifs / {webhooks.length} total • {avgEvents} events/webhook
      </p>

      {/* Création */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Créer un webhook</h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="url"
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
                  onClick={() =>
                    setEvents((prev) =>
                      prev.includes(ev)
                        ? prev.filter((e) => e !== ev)
                        : [...prev, ev]
                    )
                  }
                  className={`px-3 py-1 rounded-full text-sm border ${
                    events.includes(ev)
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {ev}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recherche */}
      <input
        type="text"
        placeholder="🔍 Rechercher URL / event / statut..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded-lg px-3 py-2 w-full max-w-md"
      />

      {/* Liste */}
      <Card>
        <CardContent className="p-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
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
                  <td className="p-3">
                    {editing === wh.id ? (
                      <input
                        value={wh.url}
                        onChange={(e) => {
                          wh.url = e.target.value;
                          setWebhooks([...webhooks]);
                        }}
                        className="border px-2 py-1 rounded w-full"
                      />
                    ) : (
                      <span className="font-mono text-xs">{wh.url}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {editing === wh.id ? (
                      <div className="flex flex-wrap gap-1">
                        {availableEvents.map((ev) => (
                          <label key={ev} className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={wh.events.includes(ev)}
                              onChange={() => toggleEventForWebhook(wh, ev)}
                            />
                            <span className="text-xs">{ev}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <span>{wh.events.join(", ")}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleToggleActive(wh)}
                      className={`px-3 py-1 rounded-full text-xs ${
                        wh.active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {wh.active ? "Actif" : "Inactif"}
                    </button>
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
                  <td className="p-3 flex gap-2 flex-wrap">
                    {editing === wh.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateWebhook(wh)}
                        >
                          💾 Sauver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(null)}
                        >
                          ❌ Annuler
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestWebhook(wh.id)}
                        >
                          🧪 Tester
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setEditing(wh.id)}
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
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-3 mt-4">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ◀️
              </Button>
              <span className="text-sm">
                Page {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                ▶️
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal logs */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 p-6 rounded shadow-lg max-w-2xl w-full">
            <h3 className="text-lg font-semibold mb-3">📜 Résultat test</h3>
            <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">
              {selectedLog}
            </pre>
            <div className="flex justify-between mt-4">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(selectedLog);
                  toast.success("📋 Copié !");
                }}
              >
                Copier
              </Button>
              <Button onClick={() => setSelectedLog(null)}>Fermer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
