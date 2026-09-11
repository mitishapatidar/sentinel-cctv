import React from "react";
import { LayoutDashboard, Grid3X3, Car, ShieldAlert, Bell, Server, ShieldCheck, Menu } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export default function Sidebar({ activePage, setActivePage, isOpen = true, onToggle, onClose }) {
  const { t } = useLanguage();

  const menuItems = [
    { id: "dashboard", labelKey: "dashboard", icon: LayoutDashboard },
    { id: "cameras", labelKey: "cameras", icon: Grid3X3 },
    { id: "vehicle-search", labelKey: "vehicleSearch", icon: Car },
    { id: "watchlist", labelKey: "watchlist", icon: ShieldAlert },
    { id: "alerts", labelKey: "alerts", icon: Bell },
    { id: "registry", labelKey: "registry", icon: Server },
    { id: "audit-logs", labelKey: "auditLogs", icon: ShieldCheck },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Floating Re-open Button when Sidebar is Collapsed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed top-[5rem] left-3 z-30 px-3 py-2 rounded-xl bg-[#111823]/95 hover:bg-[#16233b] border border-[#1e2a3a] text-[#7d8da3] hover:text-white cursor-pointer transition-all shadow-xl backdrop-blur flex items-center gap-2 group animate-fade-in"
          title="Open Operations Menu (Ctrl+B)"
          aria-label="Open operations menu"
        >
          <Menu className="h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7d8da3] group-hover:text-white hidden sm:inline">
            {t("operationsMenu")}
          </span>
        </button>
      )}

      {/* Collapsible Operations Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-64 shrink-0 flex flex-col
          bg-[#0d141f] border-r border-[#1e2a3a]
          transition-all duration-300 ease-in-out overflow-hidden
          ${
            isOpen
              ? "translate-x-0 md:ml-0 opacity-100"
              : "-translate-x-full md:-ml-64 md:opacity-0 pointer-events-none md:border-r-0"
          }
        `}
      >
        <div className="w-64 flex flex-col h-full shrink-0">
          {/* Operations Menu Header with 3-line Hamburger in front of text */}
          <div className="p-3.5 border-b border-[#1e2a3a] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                onClick={onToggle}
                className="p-1.5 rounded-lg bg-[#0a0e14] hover:bg-[#16233b] border border-[#1e2a3a] text-[#7d8da3] hover:text-white cursor-pointer transition-all shadow-inner"
                title="Collapse operations menu"
                aria-label="Collapse operations menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#5c6b86]">
                {t("operationsMenu")}
              </span>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold shadow-sm"
                      : "text-[#7d8da3] hover:text-white hover:bg-[#111823]"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-400" : "text-[#7d8da3]"}`} />
                  <span className="truncate">{t(item.labelKey)}</span>
                </button>
              );
            })}
          </nav>

          {/* Footer System Status */}
          <div className="p-4 border-t border-[#1e2a3a] bg-[#0a0e14]">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-semibold text-white">{t("networkHealthy")}</span>
            </div>
            <p className="text-[10px] text-[#7d8da3]">{t("relayGateway")}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
