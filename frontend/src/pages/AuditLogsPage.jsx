import React, { useState, useEffect } from "react";
import { Download, AlertCircle, Clock, RefreshCw } from "lucide-react";
import { auditService, AUDIT_LOGGING_ENABLED } from "../services/auditService";
import { toast } from "../utils/toast";

const formatIST = (iso) => {
  try {
    return new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", hour12: false }).replace(",", "");
  } catch (e) {
    return iso;
  }
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await auditService.getAuditLogs();
    if (error) {
      setLoadError("Audit log table is not available in Supabase yet. Run the audit_logs SQL setup, then refresh.");
      setLogs([]);
    } else {
      setLoadError("");
      setLogs(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const actionTypes = [...new Set(logs.map((l) => l.action))].sort();
  const needle = search.trim().toLowerCase();
  const filteredLogs = logs.filter((l) => {
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    if (!needle) return true;
    return [l.operator, l.role, l.action, l.target, l.status].some((v) => String(v || "").toLowerCase().includes(needle));
  });

  const exportCsv = () => {
    if (filteredLogs.length === 0) {
      toast("No audit entries to export.", "error");
      return;
    }
    const cols = ["id", "timestamp", "operator", "role", "action", "target", "status"];
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...filteredLogs.map((l) => cols.map((c) => escape(l[c])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `sentinel-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    auditService.log("AUDIT_EXPORT", `Exported ${filteredLogs.length} audit entries (CSV)`, "RECORDED");
    toast(`Exported ${filteredLogs.length} audit entries.`, "success");
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-[#1e2a3a] px-6 py-4 bg-[#111823] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white mt-1 tracking-wide">Surveillance Audit & Chain of Custody Trail</h1>
          <p className="text-xs text-[#7d8da3] mt-0.5">Immutable audit logging for court evidence admissibility and unauthorized breach prevention</p>
        </div>

        <button
          onClick={exportCsv}
          className="flex items-center gap-2 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-md shadow-blue-600/20"
        >
          <Download className="h-3.5 w-3.5" />
          Export Audit Log (CSV)
        </button>
      </div>

      {/* Security Architecture Box */}
      <div className="p-6 space-y-6">

        {/* Audit Log Table */}
        <div className="bg-[#111823] border border-[#1e2a3a] rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-3.5 border-b border-[#1e2a3a] flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Real-time Operator & System Activity Logs
            </h3>
            <button
              onClick={fetchLogs}
              className="flex items-center gap-1.5 text-[12px] text-[#7d8da3] hover:text-white cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <div className="px-5 py-3 border-b border-[#1e2a3a] flex flex-col sm:flex-row gap-2.5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search officer, action, plate or details..."
              aria-label="Search audit logs"
              className="flex-1 bg-[#0a0e14] border border-[#1e2a3a] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              aria-label="Filter by action type"
              className="bg-[#0a0e14] border border-[#1e2a3a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All actions ({logs.length})</option>
              {actionTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {!AUDIT_LOGGING_ENABLED && (
            <div className="m-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-400 flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Audit logging is paused. New actions are not being recorded; existing entries are shown below.</span>
            </div>
          )}
          {loadError && (
            <div className="m-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{loadError}</span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0d141f] text-[#7d8da3] uppercase tracking-wider text-[11px] border-b border-[#1e2a3a]">
                <tr>
                  <th className="px-4 py-3">Log Event ID</th>
                  <th className="px-4 py-3">Timestamp (IST)</th>
                  <th className="px-4 py-3">Officer / Actor</th>
                  <th className="px-4 py-3">Action Type</th>
                  <th className="px-4 py-3">Inspection Target / Details</th>
                  <th className="px-4 py-3">Integrity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2a3a] text-[#e6edf5]">
                {loading && logs.length === 0 &&
                  [0, 1, 2].map((i) => (
                    <tr key={`sk-${i}`} className="animate-pulse">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="h-5 rounded bg-[#1e2a3a]" />
                      </td>
                    </tr>
                  ))}
                {filteredLogs.map((row) => (
                  <tr key={row.id} className="hover:bg-[#16233b]/40">
                    <td className="px-4 py-3 font-mono font-bold text-blue-400">LOG-{row.id}</td>
                    <td className="px-4 py-3 font-mono text-[#7d8da3]">{formatIST(row.timestamp)}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{row.operator}</p>
                      <p className="text-[11px] text-[#7d8da3]">{row.role}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] px-2 py-0.5 rounded bg-[#0a0e14] border border-[#1e2a3a] text-white">
                        {row.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#7d8da3]">{row.target}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[11px] font-bold">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && !loadError && filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#7d8da3]">
                      <Clock className="h-4 w-4 inline mr-1.5" />
                      {logs.length === 0 ? "No activity recorded yet." : "No entries match your filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
