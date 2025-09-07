// src/layouts/AdminLayout.tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { Menu } from "lucide-react";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950">
      {/* Sidebar desktop */}
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      {/* Sidebar mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Panel */}
          <div className="relative flex-1 flex w-64 transform transition ease-in-out duration-300">
            <AdminSidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1">
        {/* Topbar */}
        <div className="lg:hidden border-b bg-white dark:bg-slate-900 dark:border-slate-800 px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200">
            Admin Panel
          </h1>
        </div>
        <AdminTopbar />

        {/* Contenu principal */}
        <main
          role="main"
          className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 bg-gray-50 dark:bg-slate-950"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
