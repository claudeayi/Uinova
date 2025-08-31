import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Suspense, lazy } from "react";

import Navbar from "./layouts/Navbar";

// ⏳ Lazy loading des pages pour optimiser les perfs
const Dashboard = lazy(() => import("./pages/Dashboard"));
const EditorPage = lazy(() => import("./pages/EditorPage"));
const PreviewPage = lazy(() => import("./pages/PreviewPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
const TemplatePage = lazy(() => import("./pages/TemplatePage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// ⚡ Pages Phase 3
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const DeployPage = lazy(() => import("./pages/DeployPage"));
const ReplayPage = lazy(() => import("./pages/ReplayPage"));
const ARPreviewPage = lazy(() => import("./pages/ARPreviewPage"));
const MonitoringPage = lazy(() => import("./pages/MonitoringPage"));
const AIAssistantPage = lazy(() => import("./pages/AIAssistantPage"));

// ⚡ Pages admin
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const MarketplaceManager = lazy(() => import("./pages/MarketplaceManager"));
const UsersAdmin = lazy(() => import("./pages/admin/UsersAdmin"));
const ProjectsAdmin = lazy(() => import("./pages/admin/ProjectsAdmin"));
const LogsAdmin = lazy(() => import("./pages/admin/LogsAdmin"));
const ReplaysAdmin = lazy(() => import("./pages/admin/ReplaysAdmin"));

// Routes protégées
import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Barre de navigation */}
      <Navbar />

      {/* Contenu des pages avec Suspense */}
      <main className="container py-4">
        <Suspense fallback={<p className="text-center text-gray-500">⏳ Chargement...</p>}>
          <Routes>
            {/* 🌍 Public */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/editor/:id" element={<EditorPage />} />
            <Route path="/preview/:projectId/:pageId" element={<PreviewPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/marketplace/:id" element={<TemplatePage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/deploy/:projectId" element={<DeployPage />} />
            <Route path="/replay/:projectId" element={<ReplayPage />} />
            <Route path="/ar/:projectId" element={<ARPreviewPage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/ai" element={<AIAssistantPage />} />

            {/* 🔐 Admin */}
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
            <Route
              path="/marketplace/manage"
              element={
                <ProtectedRoute role="admin">
                  <MarketplaceManager />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      {/* Notifications globales */}
      <Toaster position="top-right" />
    </div>
  );
}
