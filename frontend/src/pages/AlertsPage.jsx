import React, { useState, useEffect } from "react";
import { 
  Bell, 
  AlertTriangle, 
  ShieldAlert, 
  Check, 
  X, 
  Eye, 
  Clock, 
  MapPin, 
  Radio, 
  RefreshCw, 
  Car, 
  Navigation, 
  Trash2, 
  Archive, 
  RotateCcw 
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { alertService } from "../services/alertService";
import { auditService } from "../services/auditService";
import { INITIAL_ALERTS } from "../data/alertsData";

export default function AlertsPage({ setActivePage, onTrackVehicle }) {
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    const { data } = await alertService.getAlerts();
    if (Array.isArray(data)) {
      setAlerts(data);
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

  const extractPlate = (item) => {
    if (item.target) return item.target.toUpperCase();
    if (item.plate_number) return item.plate_number.toUpperCase();
    const text = `${item.title || ""} ${item.message || ""}`;
    const match = text.match(/[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4}/i);
    if (match) return match[0].toUpperCase();
    return "GJ-01-AB-1234";
  };

  const handleTrackAlert = (item) => {
    const plate = extractPlate(item);
    if (onTrackVehicle) {
      onTrackVehicle(plate);
    } else if (setActivePage) {
      try {
        localStorage.setItem("sentinel_search_plate", plate);
      } catch (e) {}
      setActivePage("vehicle-search");
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    // Update local state immediately for responsive UI
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );

    // Update via alertService (syncs to localStorage, backend API proxy, and Supabase)
    await alertService.updateStatus(id, newStatus);
    auditService.log(`ALERT_${String(newStatus).toUpperCase()}`, `Alert #${id}`, "ACTION_COMMITTED");
    window.dispatchEvent(new Event("sentinel-alerts-updated"));
  };

  const handleDeleteAlert = async (id) => {
    // Remove from local state immediately
    setAlerts((prev) => prev.filter((a) => a.id !== id));

    // Delete via alertService (syncs to localStorage, backend API, and Supabase)
    await alertService.deleteAlert(id);
    auditService.log("ALERT_DELETE", `Alert #${id}`, "ACTION_COMMITTED");
    window.dispatchEvent(new Event("sentinel-alerts-updated"));
  };

  const filteredAlerts = alerts.filter((item) => {
    if (filterStatus === "archived") return item.status === "archived";
    if (item.status === "archived") return false;
    if (filterStatus === "all") return true;
    return item.status === filterStatus;
  });

  const pendingCount = alerts.filter((a) => a.status === "pending").length;
  const criticalCount = alerts.filter((a) => a.severity === "critical" && a.status !== "archived").length;
  const archivedCount = alerts.filter((a) => a.status === "archived").length;

  const filterTabs = [
    { id: "all", label: "All Active", count: alerts.filter((a) => a.status !== "archived").length },
    { id: "pending", label: "Pending", count: pendingCount },
    { id: "acknowledged", label: "Acknowledged", count: alerts.filter((a) => a.status === "acknowledged").length },
    { id: "resolved", label: "Resolved", count: alerts.filter((a) => a.status === "resolved").length },
    { id: "archived", label: "Archived (Audit)", count: archivedCount },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Top Banner */}
      <div className="border-b border-[#1e2a3a] px-6 py-4 bg-[#111823] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            <h1 className="text-xl font-bold text-white tracking-wide">Real-time Emergency Alert Feed</h1>
          </div>
          <p className="text-xs text-[#7d8da3] mt-0.5">Automated Event Dispatching • Click any alert to reconstruct vehicle route</p>
        </div>

        {/* Filter tabs with live counts */}
        <div className="flex items-center gap-1.5 bg-[#0a0e14] border border-[#1e2a3a] p-1 rounded-xl text-xs overflow-x-auto max-w-full">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg capitalize font-semibold cursor-pointer transition-all shrink-0 ${
                filterStatus === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-[#7d8da3] hover:text-white hover:bg-[#162130]"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    filterStatus === tab.id
                      ? "bg-white/20 text-white"
                      : tab.id === "pending"
                      ? "bg-red-500/20 text-red-400"
                      : tab.id === "archived"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-[#1e2a3a] text-[#7d8da3]"
                  }`}
                >
                  {tab.count}
                </span>
              )}
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
            const targetPlate = extractPlate(item);

            const isArchived = item.status === "archived";
            const borderClass = isArchived
              ? "border-l-4 border-l-purple-500 opacity-90"
              : borderColors[item.severity] || borderColors.medium;

            return (
              <div
                key={item.id}
                onClick={() => handleTrackAlert(item)}
                className={`bg-[#111823] border border-[#1e2a3a] rounded-2xl p-5 shadow-lg ${borderClass} flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-blue-500/60 hover:bg-[#131d2b] cursor-pointer group`}
                title={`Click to track route of ${targetPlate}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
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
                          : item.status === "archived"
                          ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      Status: {item.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h3>
                    <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity font-semibold flex items-center gap-0.5 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                      <Navigation className="h-2.5 w-2.5" /> Track Route ↗
                    </span>
                  </div>
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
                <div className="flex flex-wrap items-center gap-2 shrink-0 border-t md:border-t-0 border-[#1e2a3a] pt-3 md:pt-0">
                  {/* Dedicated Track Vehicle Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTrackAlert(item);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/40 px-3 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-600/10"
                    title={`Open trajectory reconstruction for ${targetPlate}`}
                  >
                    <Car className="h-3.5 w-3.5" />
                    Track Vehicle ↗
                  </button>

                  {isArchived ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(item.id, "pending");
                        }}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/40 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md"
                        title="Restore alert to active pending queue"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAlert(item.id);
                        }}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-[#0a0e14] hover:bg-red-500/20 border border-[#1e2a3a] hover:border-red-500/40 text-[#7d8da3] hover:text-red-400 px-3 py-2 rounded-xl transition-all cursor-pointer"
                        title="Permanently hard-delete alert from database"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hard Delete
                      </button>
                    </>
                  ) : (
                    <>
                      {item.status === "pending" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(item.id, "acknowledged");
                          }}
                          className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-600/20"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Acknowledge
                        </button>
                      )}
                      {item.status === "acknowledged" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(item.id, "resolved");
                          }}
                          className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Mark Resolved
                        </button>
                      )}
                      {item.status !== "resolved" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(item.id, "dismissed");
                          }}
                          className="flex items-center gap-1.5 text-xs font-semibold bg-[#0a0e14] hover:bg-[#16233b] border border-[#1e2a3a] text-[#7d8da3] hover:text-white px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                          Dismiss
                        </button>
                      )}

                      {/* Soft-Delete: Archive for police audit compliance */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(item.id, "archived");
                        }}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-[#0a0e14] hover:bg-purple-500/15 border border-[#1e2a3a] hover:border-purple-500/40 text-[#7d8da3] hover:text-purple-300 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                        title="Archive alert (Soft-delete: preserves legal audit evidence)"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                      </button>
                    </>
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

