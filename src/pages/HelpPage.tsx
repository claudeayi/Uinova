// src/pages/HelpPage.tsx
import { useState, useMemo } from "react";
import {
  Mail,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronUp,
  LifeBuoy,
  Search,
  CreditCard,
  Share2,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";

// Simule une API IA (à remplacer par ton backend Copilot)
async function askAI(query: string): Promise<string> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve(
          `🤖 Résultat IA : "${query}" → Voici une réponse générée par Copilot.`
        ),
      1500
    )
  );
}

export default function HelpPage() {
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  const faqs = [
    {
      q: "Comment créer un projet ?",
      a: "Clique sur « Nouveau projet » depuis le Dashboard, puis laisse-toi guider par le coach interactif.",
      category: "Projets",
    },
    {
      q: "Comment exporter mon site ?",
      a: "Va dans « Exporter » dans la barre d’outils de l’éditeur, choisis ton format (HTML, Flutter, React, Vue...) et télécharge directement.",
      category: "Export",
    },
    {
      q: "Comment utiliser l’assistant IA ?",
      a: "Active Copilot depuis l’éditeur. Décris ton interface en langage naturel, l’IA génère la structure automatiquement.",
      category: "IA",
    },
    {
      q: "Puis-je partager mon projet ?",
      a: "Oui ! Utilise le bouton « Partager » dans l’éditeur pour obtenir un lien public sécurisé.",
      category: "Partage",
    },
    {
      q: "Quels moyens de paiement sont acceptés ?",
      a: "UInova prend en charge Stripe, PayPal, Visa, Mastercard et Mobile Money (CinetPay).",
      category: "Paiements",
    },
  ];

  // Filtrage FAQ en fonction de la recherche
  const filteredFaqs = useMemo(() => {
    if (!query.trim()) return faqs;
    return faqs.filter(
      (item) =>
        item.q.toLowerCase().includes(query.toLowerCase()) ||
        item.a.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, faqs]);

  async function handleAIQuery() {
    if (!query.trim()) return toast.error("❌ Entrez une question !");
    setAiLoading(true);
    setAiAnswer(null);
    try {
      const res = await askAI(query);
      setAiAnswer(res);
    } catch (err) {
      toast.error("⚠️ Erreur IA, réessayez plus tard.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">
      {/* Header */}
      <header className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
          📖 Centre d’Aide & FAQ – UInova
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Trouvez toutes les réponses sur UInova ou demandez directement à
          l’assistant IA.
        </p>

        {/* Barre de recherche */}
        <div className="mt-4 flex items-center justify-center">
          <div className="relative w-full max-w-xl flex">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une question ou demander à l’IA..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 pl-10 pr-4 py-2 border rounded-l-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleAIQuery}
              disabled={aiLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-r-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              {aiLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Bot className="w-4 h-4" />}
              Demander à l’IA
            </button>
          </div>
        </div>

        {/* Réponse IA */}
        {aiAnswer && (
          <div className="mt-4 p-4 bg-indigo-50 dark:bg-slate-800 rounded-lg text-left shadow">
            <p className="text-sm text-gray-700 dark:text-gray-300">{aiAnswer}</p>
          </div>
        )}
      </header>

      {/* FAQ */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-500" /> FAQ
        </h2>
        {filteredFaqs.length === 0 ? (
          <p className="text-gray-500 text-center">
            ❌ Aucune réponse trouvée pour « {query} »
          </p>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((item, idx) => (
              <div
                key={idx}
                className="border rounded-lg dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm"
              >
                <button
                  className="flex justify-between items-center w-full px-4 py-3 text-left font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => setOpen(open === item.q ? null : item.q)}
                >
                  <span>
                    <span className="text-indigo-500 text-xs mr-2">
                      #{item.category}
                    </span>
                    {item.q}
                  </span>
                  {open === item.q ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {open === item.q && (
                  <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Documentation rapide */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <LifeBuoy className="w-5 h-5 text-indigo-500" /> Documentation rapide
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <DocCard
            icon={<BookOpen className="w-5 h-5" />}
            title="Créer un projet"
            text="Apprenez à démarrer et gérer vos projets multi-pages."
          />
          <DocCard
            icon={<Share2 className="w-5 h-5" />}
            title="Partager un projet"
            text="Activez un lien public sécurisé et collaborez facilement."
          />
          <DocCard
            icon={<Bot className="w-5 h-5" />}
            title="Assistant IA"
            text="Utilisez Copilot pour générer des interfaces avec vos mots."
          />
          <DocCard
            icon={<CreditCard className="w-5 h-5" />}
            title="Paiements & Abonnements"
            text="Gérez vos abonnements et moyens de paiement en toute sécurité."
          />
        </div>
      </section>

      {/* Contact */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-indigo-500" /> Support & Contact
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Vous avez encore des questions ? Notre équipe est là pour vous aider.
        </p>
        <div className="flex gap-3 flex-wrap">
          <a
            href="mailto:support@uinova.com"
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
          >
            📩 Contacter le support
          </a>
          <a
            href="/docs"
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded hover:bg-slate-300 dark:hover:bg-slate-600 text-sm"
          >
            📘 Documentation complète
          </a>
          <a
            href="/community"
            className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 text-sm"
          >
            🤝 Rejoindre la communauté
          </a>
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
 *  DocCard – Carte de documentation rapide
 * ========================================================================== */
function DocCard({
  icon,
  title,
  text,
}: {
  icon: JSX.Element;
  title: string;
  text: string;
}) {
  return (
    <div className="p-4 border rounded-lg bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition">
      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold mb-2">
        {icon} {title}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
    </div>
  );
}
