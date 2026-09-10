import React from "react";
import { Shield, Bell, Radio, LogOut, User } from "lucide-react";

export default function Navbar({ activePage, setActivePage, user, onLogout, liveCount = 30, alertCount = 3 }) {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-[#1e2a3a] bg-[#111823]/95 backdrop-blur px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <span className="font-mono font-bold tracking-wider text-sm text-white flex items-center gap-2">
            SENTINEL <span className="text-[10px] text-blue-400 font-sans border border-blue-500/30 px-1.5 py-0.2 rounded bg-blue-500/10">CONTROL ROOM</span>
          </span>
          <p className="text-[10px] text-[#7d8da3] uppercase tracking-wider">Gujarat Police Command Grid</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Live status badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1e2a3a] bg-[#0a0e14]">
          <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          <span className="text-xs text-[#7d8da3]">Live Feeds:</span>
          <span className="text-xs font-mono font-bold text-emerald-400">{liveCount}/30 Online</span>
        </div>

        {/* Alert notification bell */}
        <button
          onClick={() => setActivePage("alerts")}
          className="relative p-2 rounded-lg border border-[#1e2a3a] bg-[#0a0e14] text-[#7d8da3] hover:text-white hover:border-blue-500/50 transition-all cursor-pointer"
        >
          <Bell className="h-4 w-4" />
          {alertCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
              {alertCount}
            </span>
          )}
        </button>

        {/* User profile */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10">
          <div className="h-6 w-6 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-400 text-xs font-bold font-mono">
            {user?.roleKey === "admin" ? "DC" : "OP"}
          </div>
          <div className="hidden md:block text-left leading-tight">
            <p className="text-xs font-semibold text-white">{user?.email || "Officer"}</p>
            <p className="text-[10px] text-blue-400">{user?.role || "Admin"}</p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={onLogout}
          title="Sign out of control room"
          className="p-2 rounded-lg border border-[#1e2a3a] bg-[#0a0e14] text-[#7d8da3] hover:text-red-400 hover:border-red-500/40 transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
