import React, { useState, useEffect } from "react";
import { Bell, AlertTriangle, ShieldAlert, Check, X, Eye, Clock, MapPin, Radio, RefreshCw } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("alerts")
      .select("*, cameras(name, city)")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      setAlerts(data);
    } else {
      // Fallback initial demo alerts if DB has none
      setAlerts([
        {
          id: "1",
          alert_code: "ALT-9021",
          title: "STOLEN Vehicle Detected: GJ-05-AB-1234",
          alert_type: "Watchlist Match",
          severity: "critical",
          message: "Identified at 04 Paldi Circle. Match confidence 98%. Automated law enforcement intercept notified.",
          status: "pending",
          created_at: new Date().toISOString(),
          cameras: { name: "04 Paldi Circle", city: "Ahmedabad" },
        },
        {
          id: "2",
          alert_code: "ALT-9020",
          title: "BLACKLISTED Vehicle Detected: GJ-01-XY-7788",
          alert_type: "Smuggling Watchlist",
          severity: "high",
          message: "Identified at 12 Tri Mandir Adalaj Tollnaka. FASTag toll evasion flagged.",
          status: "pending",
          created_at: new Date(Date.now() - 600000).toISOString(),
          cameras: { name: "12 Tri Mandir Adalaj Tollnaka", city: "Gandhinagar" },
        },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();

    // Subscribe to realtime alert changes
    const channel = supabase
      .channel("alerts-page-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        (payload) => {
          console.log("Realtime Alert Update:", payload);
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    // Update local state immediately for responsive UI
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );

    // Update in Supabase
    try {
      await supabase.from("alerts").update({ status: newStatus }).eq("id", id);
    } catch (e) {
      console.log("Error updating alert status:", e);
    }
  };

  const filteredAlerts = alerts.filter((item) => {
    if (filterStatus === "all") return true;
    return item.status === filterStatus;
  });

  const pendingCount = alerts.filter((a) => a.status === "pending").length;
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Top Banner */}
      <div className="border-b border-[#1e2a3a] px-6 py-4 bg-[#111823] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            <h1 className="text-xl font-bold text-white tracking-wide">Real-time Emergency Alert Feed</h1>
          </div>
          <p className="text-xs text-[#7d8da3] mt-0.5">Automated Event Dispatching • Supabase Realtime Telemetry Connected</p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 bg-[#0a0e14] border border-[#1e2a3a] p-1 rounded-xl text-xs">
          {["all", "pending", "acknowledged", "resolved"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg capitalize font-semibold cursor-pointer transition-all ${
                filterStatus === st ? "bg-blue-600 text-white shadow-sm" : "text-[#7d8da3] hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-4 max-w-5xl">
        {loading ? (
          <div className="text-center py-20 text-xs text-[#7d8da3]">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-400 mb-2" />
            Synchronizing alerts with central dispatch...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-20 bg-[#111823] border border-[#1e2a3a] rounded-2xl text-xs text-[#7d8da3]">
            No alerts found under <strong className="text-white capitalize">{filterStatus}</strong> filter.
          </div>
        ) : (
          filteredAlerts.map((item) => {
            const borderColors = {
              critical: "border-l-4 border-l-red-500",
              high: "border-l-4 border-l-amber-500",
              medium: "border-l-4 border-l-blue-500",
            };

            const camName = item.cameras?.name || "State Highway Checkpoint";
            const camCity = item.cameras?.city || "Gujarat Network";

            return (
              <div
                key={item.id}
                className={`bg-[#111823] border border-[#1e2a3a] rounded-2xl p-5 shadow-lg ${
                  borderColors[item.severity] || borderColors.medium
                } flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-blue-400">
                      {item.alert_code || `ALT-${item.id.toString().slice(0, 5)}`}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-[#0a0e14] border border-[#1e2a3a] text-white">
                      {item.alert_type || "Surveillance Match"}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                        item.severity === "critical"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : item.severity === "high"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {item.severity || "high"}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-semibold ml-auto md:ml-0 px-2 py-0.5 rounded ${
                        item.status === "pending"
                          ? "bg-amber-500/10 text-amber-400"
                          : item.status === "acknowledged"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      Status: {item.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-[#7d8da3] mt-1 leading-relaxed">{item.message}</p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#7d8da3] mt-3">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-blue-400" />
                      <strong className="text-white">{camName}</strong> ({camCity})
                    </span>
                    <span className="flex items-center gap-1.5 font-mono">
                      <Clock className="h-3.5 w-3.5 text-blue-400" />
                      {new Date(item.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 border-[#1e2a3a] pt-3 md:pt-0">
                  {item.status === "pending" && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, "acknowledged")}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-600/20"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Acknowledge
                    </button>
                  )}
                  {item.status === "acknowledged" && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, "resolved")}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Mark Resolved
                    </button>
                  )}
                  {item.status !== "resolved" && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, "dismissed")}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-[#0a0e14] hover:bg-[#16233b] border border-[#1e2a3a] text-[#7d8da3] hover:text-white px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
