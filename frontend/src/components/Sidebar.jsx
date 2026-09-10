import React from "react";
import { LayoutDashboard, Grid3X3, Car, ShieldAlert, Bell, Server, FileText, Settings, ShieldCheck } from "lucide-react";

export default function Sidebar({ activePage, setActivePage }) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "cameras", label: "Camera Grid", icon: Grid3X3 },
    { id: "vehicle-search", label: "Vehicle Tracking", icon: Car },
    { id: "watchlist", label: "Watchlist", icon: ShieldAlert },
    { id: "alerts", label: "Live Alerts", icon: Bell },
    { id: "registry", label: "Camera Registry", icon: Server },
    { id: "audit-logs", label: "Security & Audit", icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 border-r border-[#1e2a3a] bg-[#0d141f] flex flex-col shrink-0">
      <div className="p-4 border-b border-[#1e2a3a]">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#5c6b86]">Operations Menu</span>
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
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-[#1e2a3a] bg-[#0a0e14]">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-semibold text-white">Network Healthy</span>
        </div>
        <p className="text-[10px] text-[#7d8da3]">VMS Relay Gateway: Active</p>
      </div>
    </aside>
  );
}
