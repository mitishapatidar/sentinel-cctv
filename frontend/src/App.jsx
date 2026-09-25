import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import AlertToastNotification from "./components/AlertToastNotification";
import ToastHost from "./components/ToastHost";
import CommandPalette from "./components/CommandPalette";
import PageSkeleton from "./components/PageSkeleton";
import { alertService } from "./services/alertService";
import { authService } from "./services/authService";
import { auditService } from "./services/auditService";
import { INITIAL_ALERTS } from "./data/alertsData";

// Command-grid pages load on demand so the landing and login screens open fast
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const CameraGridPage = lazy(() => import("./pages/CameraGridPage"));
const VehicleSearchPage = lazy(() => import("./pages/VehicleSearchPage"));
const WatchlistPage = lazy(() => import("./pages/WatchlistPage"));
const AlertsPage = lazy(() => import("./pages/AlertsPage"));
const RegistryPage = lazy(() => import("./pages/RegistryPage"));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage"));

const APP_PAGES = ["dashboard", "cameras", "vehicle-search", "watchlist", "alerts", "registry", "audit-logs"];

// URL <-> view mapping: "/" landing, "/login", "/<page>" and "/vehicle-search?plate=XX"
function parseLocation() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  const plate = new URLSearchParams(window.location.search).get("plate");
  if (path === "login") return { view: "login" };
  if (APP_PAGES.includes(path)) return { view: "app", page: path, plate: plate ? plate.toUpperCase() : null };
  return { view: "landing" };
}

function buildPath(view, page, plate) {
  if (view === "login") return "/login";
  if (view !== "app") return "/";
  if (page === "vehicle-search" && plate) return `/vehicle-search?plate=${encodeURIComponent(plate)}`;
  return `/${page}`;
}

const initialLocation = parseLocation();

export default function App() {
  // Deep links into the grid need a login first; remember where the officer was headed
  const deepLinkRef = useRef(initialLocation.view === "app");
  const [view, setView] = useState(initialLocation.view === "app" ? "login" : initialLocation.view); // "landing" | "login" | "forbidden" | "app"
  const [activePage, setActivePage] = useState(initialLocation.page || "dashboard");
  const [isAuthed, setIsAuthed] = useState(false);
  const isAuthedRef = useRef(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem("sentinel_sidebar_open");
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) {
      return true;
    }
  });

  const [user, setUser] = useState({
    email: "sentialcctv@gmail.com",
    role: "Dy. Commissioner (Admin)",
    roleKey: "admin",
    badgeId: "GP-CID-7809",
    department: "CID Crime Branch (State Grid)",
  });

  const [trackingPlate, setTrackingPlate] = useState(() => {
    if (initialLocation.plate) return initialLocation.plate;
    try {
      return localStorage.getItem("sentinel_search_plate") || "GJ-01-AB-1234";
    } catch (e) {
      return "GJ-01-AB-1234";
    }
  });
  // Plate shown in the URL; follows searches made inside the Vehicle Tracking page
  const [urlPlate, setUrlPlate] = useState(initialLocation.plate);

  useEffect(() => {
    isAuthedRef.current = isAuthed;
  }, [isAuthed]);

  // Keep the address bar in sync so Back/Forward work and pages can be shared as links
  // The first sync and login -> app replace the entry, so Back never returns to the login screen
  const lastSyncedViewRef = useRef(null);
  useEffect(() => {
    if (view === "forbidden") return;
    const target = buildPath(view, activePage, urlPlate);
    const replace = lastSyncedViewRef.current === null || (lastSyncedViewRef.current === "login" && view === "app");
    lastSyncedViewRef.current = view;
    if (window.location.pathname + window.location.search !== target) {
      window.history[replace ? "replaceState" : "pushState"](null, "", target);
    }
  }, [view, activePage, urlPlate]);

  useEffect(() => {
    const onPopState = () => {
      const loc = parseLocation();
      if (loc.view === "app") {
        if (!isAuthedRef.current) {
          deepLinkRef.current = true;
          setActivePage(loc.page);
          setView("login");
          return;
        }
        setActivePage(loc.page);
        if (loc.plate) {
          setTrackingPlate(loc.plate);
          setUrlPlate(loc.plate);
        }
        setView("app");
      } else if (loc.view === "login" && isAuthedRef.current) {
        setView("app");
      } else {
        setView(loc.view);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const [alerts, setAlerts] = useState(INITIAL_ALERTS);

  const fetchAlerts = async () => {
    try {
      const { data } = await alertService.getAlerts();
      if (Array.isArray(data)) {
        setAlerts(data);
      }
    } catch (e) {
      console.warn("Could not fetch alerts:", e);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const handleUpdate = () => fetchAlerts();
    window.addEventListener("sentinel-alerts-updated", handleUpdate);

    const subscription = alertService.subscribeAlerts(() => {
      fetchAlerts();
    });
    return () => {
      window.removeEventListener("sentinel-alerts-updated", handleUpdate);
      if (subscription && typeof subscription.unsubscribe === "function") {
        subscription.unsubscribe();
      }
    };
  }, []);

  const pendingAlerts = alerts.filter((a) => a.status === "pending");
  const pendingCount = pendingAlerts.length;

  const handleAcknowledgeAlert = async (alertId) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: "acknowledged" } : a))
    );
    await alertService.updateStatus(alertId, "acknowledged");
  };

  const handleMarkAllAlertsRead = async () => {
    const pendingIds = alerts.filter((a) => a.status === "pending").map((a) => a.id);
    setAlerts((prev) =>
      prev.map((a) => (a.status === "pending" ? { ...a, status: "acknowledged" } : a))
    );
    for (const id of pendingIds) {
      await alertService.updateStatus(id, "acknowledged");
    }
  };

  const handleTrackVehicle = (target) => {
    let plate = typeof target === "string" ? target : null;
    if (target && typeof target === "object") {
      plate = target.target || target.plate_number;
      if (!plate) {
        const text = `${target.title || ""} ${target.message || ""}`;
        const match = text.match(/[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4}/i);
        if (match) plate = match[0].toUpperCase();
      }
    }
    if (plate) {
      setTrackingPlate(plate);
      setUrlPlate(plate);
      try {
        localStorage.setItem("sentinel_search_plate", plate);
      } catch (e) {}
    }
    setActivePage("vehicle-search");
  };

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

  const focusPlateSearch = () => {
    setActivePage("vehicle-search");
    // The page may still be loading; retry briefly until the input exists
    let tries = 0;
    const tick = () => {
      const input = document.getElementById("plate-search-input");
      if (input) {
        input.focus();
        input.select();
      } else if (tries++ < 20) {
        setTimeout(tick, 50);
      }
    };
    tick();
  };

  // Keyboard shortcuts: Ctrl/Cmd+B sidebar, Ctrl/Cmd+K command palette, "/" plate search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isAuthedRef.current) return;
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === "b") {
        e.preventDefault();
        toggleSidebar();
      } else if ((e.ctrlKey || e.metaKey) && key === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (key === "/" && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable) return;
        e.preventDefault();
        focusPlateSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Restore a persisted Supabase session so signed-in officers skip the login screen on reload
  useEffect(() => {
    let cancelled = false;
    authService.getCurrentProfile().then((profile) => {
      if (!cancelled && profile) {
        setUser(profile);
        auditService.setActor(profile);
        setIsAuthed(true);
        isAuthedRef.current = true;
        const cameFromDeepLink = deepLinkRef.current;
        deepLinkRef.current = false;
        setView((prev) => (prev === "landing" || (prev === "login" && cameFromDeepLink) ? "app" : prev));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    auditService.setActor(userData);
    auditService.log("CONTROL_ROOM_LOGIN", `Session started (${userData.badgeId || "—"}, ${userData.department || "—"})`, "VERIFIED");
    setIsAuthed(true);
    isAuthedRef.current = true;
    setView("app");
    // Return to the page from a deep link, otherwise start at the dashboard
    if (!deepLinkRef.current) setActivePage("dashboard");
    deepLinkRef.current = false;
  };

  const handleLogout = async () => {
    await auditService.log("CONTROL_ROOM_LOGOUT", "Session ended", "VERIFIED");
    auditService.setActor(null);
    await authService.signOut();
    setIsAuthed(false);
    isAuthedRef.current = false;
    setPaletteOpen(false);
    setView("landing");
  };

  if (view === "landing") {
    return <LandingPage onEnterLogin={() => setView(isAuthed ? "app" : "login")} />;
  }

  if (view === "login") {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
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
      <ToastHost />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={(page) => setActivePage(page)}
        onTrackPlate={handleTrackVehicle}
      />

      {/* Realtime Floating Toast for Incoming Alerts */}
      <AlertToastNotification onInspectAlert={handleTrackVehicle} onNewAlert={fetchAlerts} />

      {/* Navbar with Always-Visible Hamburger Toggle */}
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        user={user}
        onUserChange={setUser}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
        liveCount={30}
        alertCount={pendingCount}
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
          <Suspense fallback={<PageSkeleton />}>
          {activePage === "dashboard" && <DashboardPage setActivePage={setActivePage} />}
          {activePage === "cameras" && <CameraGridPage />}
          {activePage === "vehicle-search" && <VehicleSearchPage initialPlate={trackingPlate} onPlateSearched={setUrlPlate} />}
          {activePage === "watchlist" && <WatchlistPage />}
          {activePage === "alerts" && <AlertsPage setActivePage={setActivePage} onTrackVehicle={handleTrackVehicle} />}
          {activePage === "registry" && <RegistryPage setActivePage={setActivePage} />}
          {activePage === "audit-logs" && <AuditLogsPage />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
