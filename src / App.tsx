import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Navbar from "./layouts/Navbar";

// Pages existantes
import Dashboard from "./pages/Dashboard";
import EditorPage from "./pages/EditorPage";
import PreviewPage from "./pages/PreviewPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MarketplacePage from "./pages/MarketplacePage";
import TemplatePage from "./pages/TemplatePage";
import PricingPage from "./pages/PricingPage";
import PaymentPage from "./pages/PaymentPage";
import NotFound from "./pages/NotFound";

// ⚡ Nouvelles pages Phase 3
import ProjectsPage from "./pages/ProjectsPage";
import DeployPage from "./pages/DeployPage";
import ReplayPage from "./pages/ReplayPage";
import ARPreviewPage from "./pages/ARPreviewPage";
import MonitoringPage from "./pages/MonitoringPage";
import AIAssistantPage from "./pages/AIAssistantPage";

// ⚡ Pages admin
import AdminPanel from "./pages/AdminPanel";
import MarketplaceManager from "./pages/MarketplaceManager";
import UsersAdmin from "./pages/admin/UsersAdmin";
import ProjectsAdmin from "./pages/admin/ProjectsAdmin";
import LogsAdmin from "./pages/admin/LogsAdmin";
import ReplaysAdmin from "./pages/admin/ReplaysAdmin";

// Routes protégées
import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Barre de navigation */}
      <Navbar />

      {/* Contenu des pages */}
      <main className="container py-4">
        <Routes>
          {/* Accueil / Dashboard */}
          <Route path="/" element={<Dashboard />} />

          {/* Projets */}
          <Route path="/projects" element={<ProjectsPage />} />

          {/* Éditeur */}
          <Route path="/editor/:id" element={<EditorPage />} />

          {/* Preview live */}
          <Route path="/preview/:projectId/:pageId" element={<PreviewPage />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Marketplace */}
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/marketplace/:id" element={<TemplatePage />} />
          <Route
            path="/marketplace/manage"
            element={
              <ProtectedRoute role="admin">
                <MarketplaceManager />
              </ProtectedRoute>
            }
          />

          {/* ⚡ Admin Hub */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute role="admin">
                <UsersAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/projects"
            element={
              <ProtectedRoute role="admin">
                <ProjectsAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute role="admin">
                <LogsAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/replays"
            element={
              <ProtectedRoute role="admin">
                <ReplaysAdmin />
              </ProtectedRoute>
            }
          />

          {/* Tarifs & Paiement */}
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/payment" element={<PaymentPage />} />

          {/* ⚡ Déploiement cloud */}
          <Route path="/deploy/:projectId" element={<DeployPage />} />

          {/* ⚡ Replay vidéo collaboratif */}
          <Route path="/replay/:projectId" element={<ReplayPage />} />

          {/* ⚡ Preview AR/VR */}
          <Route path="/ar/:projectId" element={<ARPreviewPage />} />

          {/* ⚡ Monitoring avancé */}
          <Route path="/monitoring" element={<MonitoringPage />} />

          {/* ⚡ Assistant IA */}
          <Route path="/ai" element={<AIAssistantPage />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Toaster global (notifications) */}
      <Toaster position="top-right" />
    </div>
  );
}
