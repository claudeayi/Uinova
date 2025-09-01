// src/pages/ContactPage.tsx
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Merci de remplir tous les champs obligatoires.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Email invalide.");
      return;
    }
    try {
      setLoading(true);
      await axios.post("/api/contact", form); // 🔗 Backend : POST /api/contact
      toast.success("✅ Message envoyé avec succès !");
      setSent(true);
      setForm({ name: "", email: "", company: "", message: "" });
    } catch (err) {
      console.error("❌ Erreur contact:", err);
      toast.error("Impossible d’envoyer le message. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="max-w-xl mx-auto py-20 px-6 text-center">
        <h1 className="text-3xl font-bold mb-4">🎉 Merci pour votre message !</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Notre équipe vous répondra dans les plus brefs délais.
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-6 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
        >
          ✉️ Envoyer un autre message
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold mb-6 text-center">
        📩 Contactez l’équipe UInova
      </h1>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-10">
        Une question, un besoin spécifique ou une demande{" "}
        <strong>Enterprise</strong> ? Envoyez-nous un message, nous vous répondrons rapidement.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow space-y-4"
      >
        <div>
          <label className="block text-sm font-semibold mb-1">
            Nom <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded px-3 py-2 dark:bg-slate-900 dark:border-slate-700"
            placeholder="Votre nom"
            aria-label="Nom"
            aria-required="true"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border rounded px-3 py-2 dark:bg-slate-900 dark:border-slate-700"
            placeholder="vous@exemple.com"
            aria-label="Email"
            aria-required="true"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Entreprise</label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="w-full border rounded px-3 py-2 dark:bg-slate-900 dark:border-slate-700"
            placeholder="Nom de votre entreprise (optionnel)"
            aria-label="Entreprise"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full border rounded px-3 py-2 dark:bg-slate-900 dark:border-slate-700 h-32"
            placeholder="Décrivez votre besoin..."
            aria-label="Message"
            aria-required="true"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "⏳ Envoi..." : "Envoyer le message"}
        </button>
      </form>
    </div>
  );
}
