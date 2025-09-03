import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { Moon, Sun, Bell, Shield } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

/* ============================================================================
 *  SettingsPage – Gestion des préférences utilisateur
 *  🔹 Connecté au store Zustand (persistant)
 *  🔹 UX améliorée avec feedback instantané
 *  🔹 Design cohérent avec tout le dashboard
 * ========================================================================== */
export default function SettingsPage() {
  const {
    preferences,
    setTheme,
    setLanguage,
    toggleNotification,
    toggleTwoFA,
  } = useAppStore();

  function handleSave() {
    toast.success("✅ Paramètres sauvegardés et appliqués !");
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">⚙️ Paramètres</h1>

        {/* Thème */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              {preferences.theme === "dark" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
              Thème
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
            </div>
          </CardContent>
        </Card>

        {/* Langue */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold">🌍 Langue</h2>
            <select
              value={preferences.language}
              onChange={(e) => setLanguage(e.target.value as "fr" | "en")}
              className="px-3 py-2 border rounded dark:bg-slate-800 dark:border-slate-700"
            >
              <option value="fr">🇫🇷 Français</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notifications
            </h2>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={preferences.notifications.email}
                onChange={(e) => toggleNotification("email", e.target.checked)}
              />
              Emails
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={preferences.notifications.push}
                onChange={(e) => toggleNotification("push", e.target.checked)}
              />
              Notifications push
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
          </CardContent>
        </Card>

        {/* Bouton Sauvegarde */}
        <div className="text-right">
          <Button
            onClick={handleSave}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            💾 Sauvegarder
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
