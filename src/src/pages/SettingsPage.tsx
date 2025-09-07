// src/pages/SettingsPage.tsx
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import {
  Moon,
  Sun,
  Bell,
  Shield,
  Globe,
  Cpu,
  Smartphone,
  Monitor,
  Save,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

/* ============================================================================
 *  SettingsPage – Préférences avancées
 *  ✅ Thème + Langue
 *  ✅ Notifications (email, push, SMS, Slack)
 *  ✅ IA preferences
 *  ✅ Éditeur (auto-save, snap, animations)
 *  ✅ Sécurité (2FA + sessions actives)
 * ========================================================================== */
export default function SettingsPage() {
  const {
    preferences,
    setTheme,
    setLanguage,
    toggleNotification,
    toggleTwoFA,
    toggleEditorOption,
    setIAPreferences,
  } = useAppStore();

  function handleSave() {
    toast.success("✅ Paramètres sauvegardés et appliqués !");
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <h1 className="text-2xl font-bold">⚙️ Paramètres</h1>

        {/* Thème */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              {preferences.theme === "dark" ? <Moon /> : <Sun />} Thème
            </h2>
            <div className="flex gap-3">
              <Button
                onClick={() => setTheme("light")}
                variant={preferences.theme === "light" ? "default" : "outline"}
              >
                ☀️ Clair
              </Button>
              <Button
                onClick={() => setTheme("dark")}
                variant={preferences.theme === "dark" ? "default" : "outline"}
              >
                🌙 Sombre
              </Button>
              <Button
                onClick={() => setTheme("system")}
                variant={preferences.theme === "system" ? "default" : "outline"}
              >
                💻 Système
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Langue */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4" /> Langue
            </h2>
            <select
              value={preferences.language}
              onChange={(e) =>
                setLanguage(e.target.value as "fr" | "en" | "es" | "de")
              }
              className="px-3 py-2 border rounded dark:bg-slate-800 dark:border-slate-700"
            >
              <option value="fr">🇫🇷 Français</option>
              <option value="en">🇬🇧 English</option>
              <option value="es">🇪🇸 Español</option>
              <option value="de">🇩🇪 Deutsch</option>
            </select>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notifications
            </h2>
            {["email", "push", "sms", "slack"].map((type) => (
              <label key={type} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={preferences.notifications[type]}
                  onChange={(e) =>
                    toggleNotification(type as any, e.target.checked)
                  }
                />
                {type === "email" && "📧 Emails"}
                {type === "push" && "📱 Push"}
                {type === "sms" && "📲 SMS"}
                {type === "slack" && "💬 Slack"}
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Préférences IA */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Cpu className="w-4 h-4" /> Assistant IA
            </h2>
            <div>
              <label className="block text-sm">Moteur IA par défaut</label>
              <select
                value={preferences.ai.engine}
                onChange={(e) =>
                  setIAPreferences({ engine: e.target.value as "gpt-4" | "gpt-3.5" })
                }
                className="px-3 py-2 border rounded w-full dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="gpt-4">🚀 GPT-4</option>
                <option value="gpt-3.5">⚡ GPT-3.5</option>
              </select>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={preferences.ai.suggestions}
                onChange={(e) =>
                  setIAPreferences({ suggestions: e.target.checked })
                }
              />
              Activer suggestions automatiques
            </label>
            <p className="text-xs text-gray-500">
              Quota restant : <strong>{preferences.ai.credits}</strong> requêtes/mois
            </p>
          </CardContent>
        </Card>

        {/* Préférences éditeur */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Monitor className="w-4 h-4" /> Éditeur
            </h2>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={preferences.editor.autoSave}
                onChange={(e) =>
                  toggleEditorOption("autoSave", e.target.checked)
                }
              />
              💾 Sauvegarde automatique
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={preferences.editor.snapToGrid}
                onChange={(e) =>
                  toggleEditorOption("snapToGrid", e.target.checked)
                }
              />
              📐 Alignement à la grille
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={preferences.editor.animations}
                onChange={(e) =>
                  toggleEditorOption("animations", e.target.checked)
                }
              />
              ✨ Animations
            </label>
          </CardContent>
        </Card>

        {/* Sécurité */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" /> Sécurité
            </h2>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={preferences.twoFA}
                onChange={(e) => toggleTwoFA(e.target.checked)}
              />
              Activer la double authentification (2FA)
            </label>

            {/* Sessions actives (mock) */}
            <div className="mt-4">
              <h3 className="font-semibold text-sm mb-2">Sessions actives</h3>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>📱 iPhone 13 – Dernière activité il y a 2h</li>
                <li>💻 Macbook Pro – Actif</li>
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => toast.success("Toutes les sessions ont été déconnectées")}
              >
                🔒 Déconnecter toutes les sessions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bouton Sauvegarde */}
        <div className="text-right">
          <Button
            onClick={handleSave}
            className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Sauvegarder
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
