import React, { useState } from "react";
import { Bell, AlertTriangle, ShieldAlert, Check, X, Eye, Clock, MapPin, Radio } from "lucide-react";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([
    {
      id: "ALT-9021",
      title: "Stolen Vehicle Match (FIR #391)",
      identifier: "GJ-05-AB-1234",
      type: "Watchlist Correlation",
      severity: "critical",
      camera: "04 Paldi Circle (CAM04)",
      city: "Ahmedabad",
      timestamp: "10-09-2026 23:42:07",
      status: "pending",
      details: "White Maruti Swift detected traveling eastbound towards SG Highway. Speed: 54 km/h. ANPR Confidence: 98.1%.",
    },
    {
      id: "ALT-9020",
      title: "Blacklisted Vehicle Intercept",
      identifier: "GJ-01-XY-7788",
      type: "Smuggling Watchlist",
      severity: "high",
      camera: "12 Tri Mandir Adalaj Tollnaka (CAM12)",
      city: "Gandhinagar",
      timestamp: "10-09-2026 23:38:51",
      status: "pending",
      details: "Black Scorpio flagged by Narcotics & Smuggling Task Force passed toll lane 3 without paying FASTag toll.",
    },
    {
      id: "ALT-9019",
      title: "Loitering Vehicle Anomaly",
      identifier: "GJ-03-MN-2299",
      type: "AI Behavior Analysis",
      severity: "medium",
      camera: "08 majewadi-gate-junagadh (CAM08)",
      city: "Junagadh",
      timestamp: "10-09-2026 23:31:19",
      status: "acknowledged",
      details: "Repeated perimeter passes detected near restricted police armory over a 20 minute window.",
    },
    {
      id: "ALT-9018",
      title: "Wanted Suspect Sighting",
      identifier: "Suspect #W-412",
      type: "Facial / eGujCop Match",
      severity: "critical",
      camera: "17 Rajkot Bus Port CCTV (CAM17)",
      city: "Rajkot",
      timestamp: "10-09-2026 22:50:11",
      status: "resolved",
      details: "94% match on state wanted absconder database. Local patrol team notified.",
    },
  ]);

  const handleAction = (id, newStatus) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
  };

  const pendingCount = alerts.filter((a) => a.status === "pending").length;
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Top Banner */}
      <div className="border-b border-[#1e2a3a] px-6 py-4 bg-[#111823] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Real-time Emergency Alert Feed</h1>
          <p className="text-xs text-[#7d8da3] mt-0.5">Automated Event Dispatching • WebSocket Telemetry Active</p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-semibold flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            {pendingCount} Pending Operator Review
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 font-semibold">
            {criticalCount} Critical
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4 max-w-5xl">
        {alerts.map((item) => {
          const borderColors = {
            critical: "border-l-4 border-l-red-500",
            high: "border-l-4 border-l-amber-500",
            medium: "border-l-4 border-l-blue-500",
          };

          return (
            <div
              key={item.id}
              className={`bg-[#111823] border border-[#1e2a3a] rounded-2xl p-5 shadow-lg ${borderColors[item.severity]} flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-xs font-bold text-blue-400">{item.id}</span>
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-[#0a0e14] border border-[#1e2a3a] text-white">
                    {item.type}
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
                    {item.severity}
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

                <h3 className="text-sm font-bold text-white">
                  {item.title} — <span className="font-mono text-amber-400">{item.identifier}</span>
                </h3>
                <p className="text-xs text-[#7d8da3] mt-1 leading-relaxed">{item.details}</p>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#7d8da3] mt-3">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-blue-400" />
                    <strong className="text-white">{item.camera}</strong> ({item.city})
                  </span>
                  <span className="flex items-center gap-1.5 font-mono">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    {item.timestamp}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 border-[#1e2a3a] pt-3 md:pt-0">
                {item.status === "pending" && (
                  <button
                    onClick={() => handleAction(item.id, "acknowledged")}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-600/20"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Acknowledge
                  </button>
                )}
                {item.status === "acknowledged" && (
                  <button
                    onClick={() => handleAction(item.id, "resolved")}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Mark Resolved
                  </button>
                )}
                {item.status !== "resolved" && (
                  <button
                    onClick={() => handleAction(item.id, "dismissed")}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-[#0a0e14] hover:bg-[#16233b] border border-[#1e2a3a] text-[#7d8da3] hover:text-white px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
