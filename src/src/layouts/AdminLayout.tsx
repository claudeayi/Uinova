import { Outlet } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout() {
  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950">
        <Outlet />
      </main>
    </div>
  );
}
