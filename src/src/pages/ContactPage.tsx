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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Merci de remplir tous les champs obligatoires.");
      return;
    }
    try {
      setLoading(true);
      // 🔗 Endpoint backend à créer si besoin : POST /api/contact
      await axios.post("/api/contact", form);
      toast.success("✅ Message envoyé avec succès !");
      setForm({ name: "", email: "", company: "", message: "" });
    } catch (err) {
      console.error("❌ Erreur contact:", err);
      toast.error("Impossible d’envoyer le message. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold mb-6 text-center">
        📩 Contactez l’équipe UInova
      </h1>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-10">
        Une question, un besoin spécifique ou une demande <strong>Enterprise</strong> ? 
        Envoyez-nous un message, nous vous répondrons rapidement.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow space-y-4"
      >
        <div>
          <label className="block text-sm font-semibold mb-1">Nom *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded px-3 py-2 dark:bg-slate-900 dark:border-slate-700"
            placeholder="Votre nom"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border rounded px-3 py-2 dark:bg-slate-900 dark:border-slate-700"
            placeholder="vous@exemple.com"
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
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Message *</label>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full border rounded px-3 py-2 dark:bg-slate-900 dark:border-slate-700 h-32"
            placeholder="Décrivez votre besoin..."
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
