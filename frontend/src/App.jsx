import React, { useState, useEffect } from "react";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import CameraGridPage from "./pages/CameraGridPage";
import VehicleSearchPage from "./pages/VehicleSearchPage";
import WatchlistPage from "./pages/WatchlistPage";
import AlertsPage from "./pages/AlertsPage";
import RegistryPage from "./pages/RegistryPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import AlertToastNotification from "./components/AlertToastNotification";

export default function App() {
  const [view, setView] = useState("landing"); // "landing" | "login" | "forbidden" | "app"
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem("sentinel_sidebar_open");
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) {
      return true;
    }
  });

  const [user, setUser] = useState({
    email: "patidarmitisha@gmail.com",
    role: "Dy. Commissioner (Admin)",
    roleKey: "admin",
  });

  // Toggle sidebar collapse / expand with persistence
  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sentinel_sidebar_open", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Recalibrate Leaflet maps on sidebar resize transition
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 320);
    return () => clearTimeout(timer);
  }, [sidebarOpen]);

  // Optional keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setView("app");
    setActivePage("dashboard");
  };

  const handleLogout = () => {
    setView("landing");
  };

  if (view === "landing") {
    return <LandingPage onEnterLogin={() => setView("login")} />;
  }

  if (view === "login") {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onTriggerForbidden={() => setView("forbidden")}
        onBackHome={() => setView("landing")}
      />
    );
  }

  if (view === "forbidden") {
    return <ForbiddenPage onBackToLogin={() => setView("login")} />;
  }

  // Authenticated Command Grid
  return (
    <div className="h-screen w-screen bg-[#0a0e14] text-[#e6edf5] flex flex-col overflow-hidden relative">
      {/* Realtime Floating Toast for Incoming Alerts */}
      <AlertToastNotification onInspectAlert={() => setActivePage("alerts")} />

      {/* Navbar with Always-Visible Hamburger Toggle */}
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        user={user}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
        liveCount={30}
        alertCount={3}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Collapsible Sidebar */}
        <Sidebar
          activePage={activePage}
          setActivePage={(page) => {
            setActivePage(page);
            if (window.innerWidth < 768) {
              setSidebarOpen(false);
            }
          }}
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Page Content View - Dynamically expands when sidebar collapses */}
        <main className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
          {activePage === "dashboard" && <DashboardPage setActivePage={setActivePage} />}
          {activePage === "cameras" && <CameraGridPage />}
          {activePage === "vehicle-search" && <VehicleSearchPage />}
          {activePage === "watchlist" && <WatchlistPage />}
          {activePage === "alerts" && <AlertsPage />}
          {activePage === "registry" && <RegistryPage setActivePage={setActivePage} />}
          {activePage === "audit-logs" && <AuditLogsPage />}
        </main>
      </div>
    </div>
  );
}
