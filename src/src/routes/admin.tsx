import { RouteObject } from "react-router-dom";

// ✅ Import des pages Admin
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

// ✅ Toutes les routes Admin centralisées
export const adminRoutes: RouteObject[] = [
  {
    path: "/admin",
    element: <AdminPanel />,
  },
  {
    path: "/admin/users",
    element: <UsersAdmin />,
  },
  {
    path: "/admin/projects",
    element: <ProjectsAdmin />,
  },
  {
    path: "/admin/replays",
    element: <ReplaysAdmin />,
  },
  {
    path: "/admin/logs",
    element: <LogsAdmin />,
  },
  {
    path: "/admin/payments",
    element: <PaymentsAdmin />,
  },
  {
    path: "/admin/webhooks",
    element: <WebhooksPage />,
  },
  {
    path: "/admin/email-templates",
    element: <EmailTemplatesAdmin />,
  },
  {
    path: "/admin/organizations",
    element: <OrganizationsPage />,
  },
  {
    path: "/admin/usage",
    element: <UsagePage />,
  },
];
