import React, { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, X, Eye, Bell } from "lucide-react";
import { supabase } from "../supabaseClient";
import { playAlertChime } from "../utils/audioAlert";

export default function AlertToastNotification({ onInspectAlert }) {
  const [activeToast, setActiveToast] = useState(null);

  useEffect(() => {
    // Listen to real-time database inserts on the alerts table
    const channel = supabase
      .channel("realtime-emergency-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        (payload) => {
          console.log("Realtime Alert Triggered:", payload.new);
          playAlertChime(payload.new?.severity || "critical");
          setActiveToast(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!activeToast) return null;

  return (
    <div className="fixed top-20 right-6 z-50 max-w-sm w-full bg-[#111823] border-2 border-red-500 rounded-2xl p-4 shadow-2xl shadow-red-900/40 animate-bounce">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
            <Bell className="h-5 w-5 animate-pulse text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500 text-white">
                CRITICAL MATCH
              </span>
              <span className="text-xs font-mono text-gray-400">{activeToast.alert_code || "ALT-ALERT"}</span>
            </div>
            <h4 className="text-xs font-bold text-white mt-1">{activeToast.title}</h4>
            <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{activeToast.message}</p>
          </div>
        </div>

        <button
          onClick={() => setActiveToast(null)}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 pt-2 border-t border-[#1e2a3a] flex items-center justify-between">
        <span className="text-[10px] text-emerald-400 font-semibold">Live Intercept Dispatched</span>
        <button
          onClick={() => {
            if (onInspectAlert) onInspectAlert(activeToast);
            setActiveToast(null);
          }}
          className="flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
        >
          Inspect Feed <Eye className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
