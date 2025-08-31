// src/App.tsx
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Suspense, lazy } from "react";

import Navbar from "./layouts/Navbar";
import ProtectedRoute from "./routes/ProtectedRoute";

// 🌀 Spinner de fallback pro
function Loader() {
  return (
    <div className="flex justify-center items-center py-20 text-indigo-500">
      <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      <span className="ml-3">Chargement...</span>
    </div>
  );
}

/* ============================================================================
 *  PAGES – Lazy Loading pour perf
 * ========================================================================== */

// 🌍 Public & User
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const EditorPage = lazy(() => import("./pages/EditorPage"));
const PreviewPage = lazy(() => import("./pages/PreviewPage"));
const ARPreviewPage = lazy(() => import("./pages/ARPreviewPage"));
const DeployPage = lazy(() => import("./pages/DeployPage"));
const ReplayPage = lazy(() => import("./pages/ReplayPage"));
const MonitoringPage = lazy(() => import("./pages/MonitoringPage"));
const AIAssistantPage = lazy(() => import("./pages/AIAssistantPage"));

const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));

const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
const TemplatePage = lazy(() => import("./pages/TemplatePage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));

const NotFound = lazy(() => import("./pages/NotFound"));

// 🔐 Admin
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const MarketplaceManager = lazy(() => import("./pages/MarketplaceManager"));
const UsersAdmin = lazy(() => import("./pages/admin/UsersAdmin"));
const ProjectsAdmin = lazy(() => import("./pages/admin/ProjectsAdmin"));
const LogsAdmin = lazy(() => import("./pages/admin/LogsAdmin"));
const ReplaysAdmin = lazy(() => import("./pages/admin/ReplaysAdmin"));

/* ============================================================================
 *  APP ROOT
 * ========================================================================== */
export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Barre de navigation */}
      <Navbar />

      {/* Contenu des pages */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <Suspense fallback={<Loader />}>
          <Routes>
            {/* 🌍 Public */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/editor/:id" element={<EditorPage />} />
            <Route path="/preview/:projectId/:pageId" element={<PreviewPage />} />
            <Route path="/ar/:projectId" element={<ARPreviewPage />} />
            <Route path="/deploy/:projectId" element={<DeployPage />} />
            <Route path="/replay/:projectId" element={<ReplayPage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/ai" element={<AIAssistantPage />} />

            {/* Auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Marketplace & Paiements */}
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/marketplace/:id" element={<TemplatePage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/payment" element={<PaymentPage />} />

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
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </div>
  );
}
