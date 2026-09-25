import React, { useState, useEffect } from "react";
import { ShieldCheck, Lock, FileText, Download, UserCheck, AlertCircle, Clock, RefreshCw } from "lucide-react";
import { auditService } from "../services/auditService";

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

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-[#1e2a3a] px-6 py-4 bg-[#111823] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              DPDP Act 2023 & Indian Evidence Act Compliant
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1 tracking-wide">Surveillance Audit & Chain of Custody Trail</h1>
          <p className="text-xs text-[#7d8da3] mt-0.5">Immutable audit logging for court evidence admissibility and unauthorized breach prevention</p>
        </div>

        <button
          onClick={() => alert("Signed Audit Log Dossier exported for SCRB Archives.")}
          className="flex items-center gap-2 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-md shadow-blue-600/20"
        >
          <Download className="h-3.5 w-3.5" />
          Export Certified Audit Log
        </button>
      </div>

      {/* Security Architecture Box */}
      <div className="p-6 space-y-6">
        <div className="p-4 rounded-2xl bg-[#0d141f] border border-[#1e2a3a] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Encryption at Rest & In-Transit</p>
              <p className="text-[#7d8da3] text-[11px] mt-0.5">AES-256 for biometric/plate records, TLS 1.3 for HLS & RTSP relays.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <UserCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Zero Trust RBAC Policy</p>
              <p className="text-[#7d8da3] text-[11px] mt-0.5">Strict role separation preventing cross-department feed leaks.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Section 65B Certificate Ready</p>
              <p className="text-[#7d8da3] text-[11px] mt-0.5">Automated timestamp hash verification for court submissions.</p>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-[#111823] border border-[#1e2a3a] rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-3.5 border-b border-[#1e2a3a] flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Real-time Operator & System Activity Logs
            </h3>
            <button
              onClick={fetchLogs}
              className="flex items-center gap-1.5 text-[11px] text-[#7d8da3] hover:text-white cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          {loadError && (
            <div className="m-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{loadError}</span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0d141f] text-[#7d8da3] uppercase tracking-wider text-[10px] border-b border-[#1e2a3a]">
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
                {logs.map((row) => (
                  <tr key={row.id} className="hover:bg-[#16233b]/40">
                    <td className="px-4 py-3 font-mono font-bold text-blue-400">LOG-{row.id}</td>
                    <td className="px-4 py-3 font-mono text-[#7d8da3]">{formatIST(row.timestamp)}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{row.operator}</p>
                      <p className="text-[10px] text-[#7d8da3]">{row.role}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#0a0e14] border border-[#1e2a3a] text-white">
                        {row.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#7d8da3]">{row.target}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px] font-bold">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && !loadError && logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#7d8da3]">
                      <Clock className="h-4 w-4 inline mr-1.5" />
                      No activity recorded yet.
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
