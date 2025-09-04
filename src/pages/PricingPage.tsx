// src/pages/PricingPage.tsx
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { motion } from "framer-motion";

export default function PricingPage() {
  const navigate = useNavigate();

  const plans = [
    {
      id: "FREE",
      name: "Freemium",
      price: "0€",
      desc: "Accès de base aux fonctionnalités de l’éditeur.",
      features: [
        "Créez jusqu’à 3 projets",
        "Export HTML basique",
        "Stockage limité",
      ],
      action: () => navigate("/payment?plan=FREE"),
      highlight: false,
      cta: "Commencer gratuitement",
    },
    {
      id: "PRO",
      name: "Premium",
      price: "9,99€/mois",
      desc: "Accès complet + IA + exports avancés.",
      features: [
        "Projets illimités",
        "Assistant IA intégré",
        "Export HTML, React & Flutter",
        "Accès complet Marketplace",
        "Support prioritaire",
      ],
      action: () => navigate("/payment?plan=PRO"),
      highlight: true,
      cta: "Passer au PRO",
    },
    {
      id: "BUSINESS",
      name: "Business",
      price: "29,99€/mois",
      desc: "Pour les équipes et agences.",
      features: [
        "Tout Premium",
        "Collaboration en temps réel",
        "Déploiements automatiques",
        "Monitoring & Analytics",
        "Branding personnalisé",
      ],
      action: () => navigate("/payment?plan=BUSINESS"),
      highlight: false,
      cta: "Choisir BUSINESS",
    },
    {
      id: "ENTERPRISE",
      name: "Enterprise",
      price: "Sur devis",
      desc: "Solution complète pour grandes entreprises.",
      features: [
        "Tout Business",
        "Déploiement sur infrastructure dédiée",
        "SLA & support 24/7",
        "Formation & onboarding équipe",
        "Intégrations sur mesure",
      ],
      action: () => navigate("/payment?plan=ENTERPRISE"),
      highlight: false,
      cta: "Contacter l’équipe",
    },
  ];

  return (
    <DashboardLayout>
      <div className="py-12 px-6 max-w-7xl mx-auto space-y-12">
        {/* ==== Hero ==== */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl p-10 shadow-lg"
        >
          <h1 className="text-4xl font-extrabold mb-4">
            💎 Choisissez le plan qui vous convient
          </h1>
          <p className="opacity-90 max-w-2xl mx-auto leading-relaxed">
            UInova vous offre la flexibilité de créer, déployer et collaborer.
            Que vous soyez étudiant, freelance, agence ou grande entreprise —
            trouvez le plan qui correspond à vos besoins.
          </p>
        </motion.div>

        {/* ==== Cards ==== */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              viewport={{ once: true }}
              className={`relative border rounded-xl p-6 flex flex-col shadow-md transition hover:shadow-lg ${
                plan.highlight
                  ? "border-blue-600 bg-blue-50 dark:bg-slate-800"
                  : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700"
              }`}
            >
              {/* Badge */}
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs rounded-full bg-blue-600 text-white font-semibold shadow">
                  ⭐ Populaire
                </span>
              )}

              <h2 className="text-2xl font-bold mb-2 text-center">
                {plan.name}
              </h2>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
                {plan.desc}
              </p>
              <p className="text-3xl font-extrabold text-center mb-6">
                {plan.price}
              </p>
              <ul className="space-y-2 flex-1 text-sm text-gray-700 dark:text-gray-300">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    ✅ {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={plan.action}
                aria-label={`Choisir le plan ${plan.name}`}
                className={`mt-6 px-4 py-2 rounded font-semibold transition ${
                  plan.highlight
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 dark:bg-slate-700 dark:text-white hover:bg-gray-300"
                }`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>

        {/* ==== Comparatif ==== */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="overflow-x-auto"
        >
          <table className="w-full border-collapse border text-sm mt-8 shadow-sm rounded-md overflow-hidden">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                <th className="p-3 border text-left">Fonctionnalité</th>
                {plans.map((p) => (
                  <th key={p.name} className="p-3 border text-center">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                "Projets illimités",
                "Assistant IA",
                "Exports avancés (React, Flutter)",
                "Collaboration temps réel",
                "Monitoring & Analytics",
                "Support prioritaire",
              ].map((feature) => (
                <tr
                  key={feature}
                  className="text-center odd:bg-white even:bg-slate-50 dark:odd:bg-slate-900 dark:even:bg-slate-800"
                >
                  <td className="p-3 border text-left font-medium">
                    {feature}
                  </td>
                  {plans.map((plan) => (
                    <td key={plan.name} className="p-3 border">
                      {plan.features.some((f) =>
                        f.toLowerCase().includes(feature.toLowerCase())
                      )
                        ? "✅"
                        : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
