import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Suspense, lazy } from "react";

import Navbar from "./layouts/Navbar";
import Sidebar from "./layouts/Sidebar";
import ProtectedRoute from "./routes/ProtectedRoute";

/* ============================================================================
 *  Spinner de fallback pro & accessible
 * ========================================================================== */
function Loader() {
  return (
    <div
      className="flex justify-center items-center py-20 text-indigo-500"
      role="status"
      aria-live="polite"
    >
      <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      <span className="ml-3">Chargement...</span>
    </div>
  );
}

/* ============================================================================
 *  PAGES – Lazy Loading pour perf et scalabilité
 * ========================================================================== */
// 🌍 Public & User
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const EditorPage = lazy(() => import("./pages/EditorPage"));
const PreviewPage = lazy(() => import("./pages/PreviewPage"));
const ARPreviewPage = lazy(() => import("./pages/ARPreviewPage"));
const DeployPage = lazy(() => import("./pages/DeployPage"));
const ReplayPage = lazy(() => import("./pages/ReplayPage"));
const MonitoringPage = lazy(() => import("./pages/MonitoringPage"));
const AIAssistantPage = lazy(() => import("./pages/AIAssistantPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const BadgesPage = lazy(() => import("./pages/BadgesPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

// 🔑 Auth
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));

// 🛒 Marketplace & Paiements
const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
const TemplatePage = lazy(() => import("./pages/TemplatePage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage"));
const PaymentCancelPage = lazy(() => import("./pages/PaymentCancelPage"));

// ✉️ Divers
const ContactPage = lazy(() => import("./pages/ContactPage"));

// 🔐 Admin
const AdminPanel = lazy(() => import("./pages/admin/AdminPanel"));
const UsersAdmin = lazy(() => import("./pages/admin/UsersAdmin"));
const AdminProfilePage = lazy(() => import("./pages/admin/AdminProfilePage"));
const ProjectsAdmin = lazy(() => import("./pages/admin/ProjectsAdmin"));
const ReplaysAdmin = lazy(() => import("./pages/admin/ReplaysAdmin"));
const PaymentsAdmin = lazy(() => import("./pages/admin/PaymentsAdmin"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling"));
const AdminStatsPage = lazy(() => import("./pages/admin/AdminStats"));
const LogsAdmin = lazy(() => import("./pages/admin/LogsAdmin"));

/* ============================================================================
 *  APP ROOT
 * ========================================================================== */
export default function App() {
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* ✅ Sidebar persistante */}
      <Sidebar />

      {/* ✅ Zone principale */}
      <div className="flex flex-col flex-1">
        {/* ✅ Header global */}
        <Navbar />

        {/* ✅ Contenu central */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Suspense fallback={<Loader />}>
            <Routes>
              {/* 🌍 Public */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/editor/:id" element={<EditorPage />} />
              <Route path="/preview/:projectId/:pageId" element={<PreviewPage />} />
              <Route path="/ar/:projectId" element={<ARPreviewPage />} />
              <Route path="/deploy/:projectId" element={<DeployPage />} />
              <Route path="/replay/:projectId" element={<ReplayPage />} />
              <Route path="/monitoring" element={<MonitoringPage />} />
              <Route path="/ai" element={<AIAssistantPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/badges" element={<BadgesPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* 🔑 Auth */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* 🛒 Marketplace & Paiements */}
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/marketplace/:id" element={<TemplatePage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/payment" element={<PaymentPage />} />
              <Route path="/payment/success" element={<PaymentSuccessPage />} />
              <Route path="/payment/cancel" element={<PaymentCancelPage />} />

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
                path="/admin/users/:id"
                element={
                  <ProtectedRoute role="admin">
                    <AdminProfilePage />
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
                path="/admin/replays"
                element={
                  <ProtectedRoute role="admin">
                    <ReplaysAdmin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/payments"
                element={
                  <ProtectedRoute role="admin">
                    <PaymentsAdmin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/billing"
                element={
                  <ProtectedRoute role="admin">
                    <AdminBilling />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/stats"
                element={
                  <ProtectedRoute role="admin">
                    <AdminStatsPage />
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

              {/* ❌ 404 */}
              <Route
                path="*"
                element={
                  <div className="text-center py-20">
                    <h1 className="text-4xl font-bold mb-4">404</h1>
                    <p className="text-gray-500">Page introuvable 🚧</p>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </main>

        {/* ✅ Notifications globales */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: "#1e293b", color: "#fff" },
            success: { style: { background: "#16a34a" } },
            error: { style: { background: "#dc2626" } },
            warning: { style: { background: "#f59e0b" } },
            info: { style: { background: "#3b82f6" } },
          }}
        />
      </div>
    </div>
  );
}
