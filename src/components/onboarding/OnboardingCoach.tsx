import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, CheckCircle } from "lucide-react";

const steps = [
  "👋 Bienvenue sur UInova ! Commence par créer ton premier projet.",
  "🎨 Découvre l’éditeur visuel et dépose des composants.",
  "📱 Teste le mode Preview live sur tous tes devices.",
  "✨ Génère des interfaces avec l’assistant IA !",
];

export default function OnboardingCoach({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const progress = ((i + 1) / steps.length) * 100;

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-white dark:bg-gray-900 shadow-lg rounded-lg p-5 border border-gray-200 dark:border-gray-700 z-50">
      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded mb-4 overflow-hidden">
        <div
          className="h-1 bg-blue-600 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="text-gray-800 dark:text-gray-200 mb-4 text-sm"
          aria-live="polite"
        >
          {steps[i]}
        </motion.p>
      </AnimatePresence>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setI((prev) => Math.max(0, prev - 1))}
          disabled={i === 0}
          className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-sm disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" /> Précédent
        </button>

        {i < steps.length - 1 ? (
          <button
            onClick={() => setI((prev) => prev + 1)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          >
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onDone}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
          >
            <CheckCircle className="w-4 h-4" /> Terminer
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
        Étape {i + 1} / {steps.length}
      </div>
    </div>
  );
}
