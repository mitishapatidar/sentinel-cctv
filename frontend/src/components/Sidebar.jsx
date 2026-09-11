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

      {/* Collapsible Operations Sidebar (Full width w-64 when open, Icon-only Rail w-16 when collapsed) */}
      <aside
        className={`
          shrink-0 flex flex-col h-full
          bg-[#0d141f] border-r border-[#1e2a3a]
          transition-all duration-300 ease-in-out
          ${isOpen ? "w-64" : "w-16"}
        `}
      >
        {/* Operations Menu Header: Full with title when open, Centered Hamburger when collapsed */}
        <div className={`p-3.5 border-b border-[#1e2a3a] flex items-center ${isOpen ? "justify-between" : "justify-center"}`}>
          {isOpen ? (
            <div className="flex items-center gap-2.5">
              <button
                onClick={onToggle}
                className="p-1.5 rounded-lg bg-[#0a0e14] hover:bg-[#16233b] border border-[#1e2a3a] text-[#7d8da3] hover:text-white cursor-pointer transition-all shadow-inner"
                title="Collapse operations menu (Ctrl+B)"
                aria-label="Collapse operations menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#5c6b86] truncate">
                {t("operationsMenu")}
              </span>
            </div>
          ) : (
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg bg-[#0a0e14] hover:bg-[#16233b] border border-[#1e2a3a] text-[#7d8da3] hover:text-white cursor-pointer transition-all shadow-inner"
              title="Expand operations menu (Ctrl+B)"
              aria-label="Expand operations menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Nav Items: Icon + Text when open, Centered Icon Rectangles when collapsed */}
        <nav className={`flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden ${isOpen ? "p-3" : "p-2"}`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                title={t(item.labelKey)}
                className={`
                  w-full flex items-center rounded-xl text-xs font-medium transition-all cursor-pointer
                  ${isOpen ? "gap-3 px-3.5 py-2.5" : "justify-center h-10 w-10 mx-auto"}
                  ${
                    isActive
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold shadow-sm"
                      : "text-[#7d8da3] hover:text-white hover:bg-[#111823] border border-transparent"
                  }
                `}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-400" : "text-[#7d8da3]"}`} />
                {isOpen && <span className="truncate">{t(item.labelKey)}</span>}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
