// src/routes/adminRoutes.tsx
import { RouteObject } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import AdminPanel from "@/pages/admin/AdminPanel";
import UsersAdmin from "@/pages/admin/UsersAdmin";
import ProjectsAdmin from "@/pages/admin/ProjectsAdmin";
import ReplaysAdmin from "@/pages/admin/ReplaysAdmin";
import LogsAdmin from "@/pages/admin/LogsAdmin";
import PaymentsAdmin from "@/pages/admin/PaymentsAdmin";
import WebhooksPage from "@/pages/WebhooksPage";
import EmailTemplatesAdmin from "@/pages/admin/EmailTemplatesAdmin";
import OrganizationsPage from "@/pages/OrganizationsPage";
import UsagePage from "@/pages/UsagePage";
import ProtectedRoute from "@/routes/ProtectedRoute";
import ForbiddenPage from "@/pages/ForbiddenPage"; // ⚠️ à créer

/* ============================================================================
 * Routes Admin – protégées par ProtectedRoute
 * ========================================================================== */
export const adminRoutes: RouteObject[] = [
  {
    path: "/admin",
    element: (
      <ProtectedRoute roles={["ADMIN"]} fallback={<ForbiddenPage />}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminPanel /> },
      { path: "users", element: <UsersAdmin /> },
      { path: "projects", element: <ProjectsAdmin /> },
      { path: "replays", element: <ReplaysAdmin /> },
      { path: "logs", element: <LogsAdmin /> },
      { path: "payments", element: <PaymentsAdmin /> },
      { path: "webhooks", element: <WebhooksPage /> },
      { path: "email-templates", element: <EmailTemplatesAdmin /> },
      { path: "organizations", element: <OrganizationsPage /> },
      { path: "usage", element: <UsagePage /> },
      // Catch-all → redirige vers /admin
      { path: "*", element: <AdminPanel /> },
    ],
  },
];
