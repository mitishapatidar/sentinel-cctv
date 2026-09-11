import React from "react";
import { LayoutDashboard, Grid3X3, Car, ShieldAlert, Bell, Server, ShieldCheck } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export default function Sidebar({ activePage, setActivePage, mobileOpen, onCloseMobile }) {
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
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 border-r border-[#1e2a3a] bg-[#0d141f] flex flex-col shrink-0 transition-transform duration-200 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-4 border-b border-[#1e2a3a]">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#5c6b86]">
            {t("operationsMenu")}
          </span>
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
      </aside>
    </>
  );
}
