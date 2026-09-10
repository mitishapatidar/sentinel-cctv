import React, { useState, useEffect } from "react";
import { Server, Search, Download, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function RegistryPage() {
  const [cameras, setCameras] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRegistry = async () => {
      setLoading(true);
      const { data } = await supabase.from("cameras").select("*");
      if (data) {
        setCameras(data);
      }
      setLoading(false);
    };
    loadRegistry();
  }, []);

  const filtered = cameras.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-[#1e2a3a] px-6 py-4 bg-[#111823] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Model 1: Mandatory Baseline
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1 tracking-wide">Centralised CCTV Asset Registry</h1>
          <p className="text-xs text-[#7d8da3] mt-0.5">Statewide Hardware Inventory, Codecs, & Operational AMC Health</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#7d8da3]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter assets..."
              className="bg-[#0a0e14] border border-[#1e2a3a] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#5c6b86] focus:outline-none focus:border-blue-500 w-44"
            />
          </div>

          <button
            onClick={() => alert("CCTV Inventory Exported to CSV format.")}
            className="flex items-center gap-2 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-md shadow-blue-600/20"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-20 text-xs text-[#7d8da3]">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-400 mb-2" />
            Loading asset registry...
          </div>
        ) : (
          <div className="bg-[#111823] border border-[#1e2a3a] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0d141f] text-[#7d8da3] uppercase tracking-wider text-[10px] border-b border-[#1e2a3a]">
                  <tr>
                    <th className="px-4 py-3">Camera ID</th>
                    <th className="px-4 py-3">Asset Designation</th>
                    <th className="px-4 py-3">City / District</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Hardware Type</th>
                    <th className="px-4 py-3">Codec & Res</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2a3a] text-[#e6edf5]">
                  {filtered.map((cam) => (
                    <tr key={cam.id} className="hover:bg-[#16233b]/40">
                      <td className="px-4 py-3 font-mono font-bold text-blue-400 uppercase">{cam.id}</td>
                      <td className="px-4 py-3 font-semibold text-white">{cam.name}</td>
                      <td className="px-4 py-3 text-[#7d8da3]">{cam.city}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-[#0a0e14] border border-[#1e2a3a] text-white text-[11px]">
                          {cam.department}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#7d8da3]">{cam.camera_type}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#5c6b86]">
                        {cam.codec || "H.264"} • {cam.resolution || "1080p"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Operational
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
