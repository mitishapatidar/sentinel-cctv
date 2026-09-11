import React, { useState } from "react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState({
    email: "patidarmitisha@gmail.com",
    role: "Dy. Commissioner (Admin)",
    roleKey: "admin",
  });

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

      {/* Navbar */}
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        user={user}
        onLogout={handleLogout}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        liveCount={30}
        alertCount={3}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar
          activePage={activePage}
          setActivePage={(page) => {
            setActivePage(page);
            setMobileMenuOpen(false);
          }}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Page Content View */}
        <main className="flex-1 flex flex-col overflow-hidden">
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
