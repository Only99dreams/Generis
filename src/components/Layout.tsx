import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Menu, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useMobile } from "../hooks/useMobile";
import Sidebar from "./Sidebar";

export default function Layout() {
  const { user, loading } = useAuth();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-brand-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-yellow to-amber-500 flex items-center justify-center shadow-lg shadow-brand-yellow/20 animate-pulse">
            <div className="w-6 h-6 border-2 border-brand-black border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {isMobile && (
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-yellow to-amber-500 flex items-center justify-center shadow-sm">
              <Wallet className="w-4 h-4 text-brand-black" />
            </div>
            <span className="font-bold text-gray-900">Generis</span>
          </header>
        )}

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
