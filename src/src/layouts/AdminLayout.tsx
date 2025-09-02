import { Outlet } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";

export default function AdminLayout() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main content */}
      <div className="flex flex-col flex-1">
        {/* Topbar */}
        <AdminTopbar />

        {/* Contenu */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
