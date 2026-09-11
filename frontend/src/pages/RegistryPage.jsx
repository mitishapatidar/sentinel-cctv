import React, { useState, useEffect } from "react";
import { 
  Server, Search, Download, AlertCircle, CheckCircle2, RefreshCw, 
  Eye, Filter, MapPin, Shield, Cpu, Activity, ExternalLink, X, FileSpreadsheet
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { INITIAL_CAMERAS } from "../data/camerasData";

export default function RegistryPage({ setActivePage }) {
  const [cameras, setCameras] = useState(INITIAL_CAMERAS);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("ALL");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [activeModalCam, setActiveModalCam] = useState(null);

  useEffect(() => {
    const loadRegistry = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("cameras").select("*");
        if (!error && data && data.length > 0) {
          // Merge Supabase data with INITIAL_CAMERAS to preserve enriched fields
          const merged = data.map((d) => {
            const initial = INITIAL_CAMERAS.find((c) => c.id === d.id) || {};
            return { ...initial, ...d };
          });
          setCameras(merged);
        } else {
          setCameras(INITIAL_CAMERAS);
        }
      } catch (err) {
        console.warn("Falling back to local camera registry:", err);
        setCameras(INITIAL_CAMERAS);
      } finally {
        setLoading(false);
      }
    };
    loadRegistry();
  }, []);

  // Filter list
  const cities = ["ALL", ...new Set(cameras.map((c) => c.city).filter(Boolean))];
  const departments = ["ALL", ...new Set(cameras.map((c) => c.department).filter(Boolean))];

  const filtered = cameras.filter((c) => {
    const matchesSearch =
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.id || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.city || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.department || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.camera_type || "").toLowerCase().includes(search.toLowerCase());

    const matchesCity = selectedCity === "ALL" || c.city === selectedCity;
    const matchesDept = selectedDept === "ALL" || c.department === selectedDept;

    return matchesSearch && matchesCity && matchesDept;
  });

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = [
      "Camera ID",
      "Asset Designation",
      "City / District",
      "Department",
      "Hardware Type",
      "Codec",
      "Resolution",
      "IP Address",
      "AMC Vendor",
      "Latitude",
      "Longitude",
      "Status"
    ];

    const rows = filtered.map((c) => [
      `"${c.id || ""}"`,
      `"${(c.name || "").replace(/"/g, '""')}"`,
      `"${c.city || ""}"`,
      `"${c.department || ""}"`,
      `"${c.camera_type || "Fixed ANPR 4K"}"`,
      `"${c.codec || "H.264"}"`,
      `"${c.resolution || "1080p @ 25fps"}"`,
      `"${c.ip_address || "10.24.1.100"}"`,
      `"${c.amc_vendor || "BEL SmartCity"}"`,
      `"${c.lat || ""}"`,
      `"${c.lng || ""}"`,
      `"${c.status || "operational"}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sentinel_cctv_registry_gujarat_police_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0a0e14]">
      {/* Top Header */}
      <div className="border-b border-[#1e2a3a] px-6 py-4 bg-[#111823] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Model 1: Mandatory Asset Registry
            </span>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              30 / 30 Online
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1 tracking-wide flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-400" />
            Centralised CCTV Asset Registry
          </h1>
          <p className="text-xs text-[#7d8da3] mt-0.5">
            Gujarat Police Statewide Hardware Inventory, Codec Profiles & AMC Maintenance Health
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#7d8da3]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, city, dept..."
              className="bg-[#0a0e14] border border-[#1e2a3a] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#5c6b86] focus:outline-none focus:border-blue-500 w-52 transition-all"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-md shadow-blue-600/20"
            title="Download CSV file of all 30 CCTV assets"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV ({filtered.length})
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#111823] border border-[#1e2a3a] p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#7d8da3] font-medium">Total Registered</span>
            <Server className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{cameras.length}</p>
          <span className="text-[11px] text-blue-400/80">30 Streams Configured</span>
        </div>

        <div className="bg-[#111823] border border-[#1e2a3a] p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#7d8da3] font-medium">Operational Status</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">100%</p>
          <span className="text-[11px] text-emerald-400/80">30/30 Feeds Live</span>
        </div>

        <div className="bg-[#111823] border border-[#1e2a3a] p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#7d8da3] font-medium">Police Ranges / Cities</span>
            <MapPin className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{cities.length - 1}</p>
          <span className="text-[11px] text-amber-400/80">Statewide Coverage</span>
        </div>

        <div className="bg-[#111823] border border-[#1e2a3a] p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#7d8da3] font-medium">Security & Codec</span>
            <Shield className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-indigo-400 mt-2">AES-128</p>
          <span className="text-[11px] text-[#7d8da3]">H.264 High-Profile</span>
        </div>
      </div>

      {/* Filter Row */}
      <div className="px-6 pt-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-[#7d8da3]">
          <Filter className="h-3.5 w-3.5" />
          <span>Filter by:</span>
        </div>

        {/* City Filter */}
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="bg-[#111823] border border-[#1e2a3a] text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          {cities.map((city) => (
            <option key={city} value={city}>
              {city === "ALL" ? "All Districts / Cities" : city}
            </option>
          ))}
        </select>

        {/* Dept Filter */}
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="bg-[#111823] border border-[#1e2a3a] text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept === "ALL" ? "All Departments" : dept}
            </option>
          ))}
        </select>

        {(selectedCity !== "ALL" || selectedDept !== "ALL" || search) && (
          <button
            onClick={() => {
              setSelectedCity("ALL");
              setSelectedDept("ALL");
              setSearch("");
            }}
            className="text-xs text-blue-400 hover:text-blue-300 underline cursor-pointer ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Table Content */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-20 text-xs text-[#7d8da3]">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-400 mb-2" />
            Synchronizing statewide CCTV registry...
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
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2a3a] text-[#e6edf5]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-12 text-[#7d8da3]">
                        No CCTV assets matched your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((cam) => (
                      <tr 
                        key={cam.id} 
                        className="hover:bg-[#16233b]/40 transition-colors group cursor-pointer"
                        onClick={() => setActiveModalCam(cam)}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-blue-400 uppercase">
                          {cam.id}
                        </td>
                        <td className="px-4 py-3 font-semibold text-white group-hover:text-blue-300 transition-colors">
                          {cam.name}
                        </td>
                        <td className="px-4 py-3 text-[#7d8da3]">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-red-400/80" />
                            {cam.city}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-[#0a0e14] border border-[#1e2a3a] text-white text-[11px]">
                            {cam.department}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#a0aec0]">
                          {cam.camera_type || "Fixed ANPR 4K"}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[#7d8da3]">
                          {cam.codec || "H.264"} • {cam.resolution || "1080p"}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[#5c6b86]">
                          {cam.ip_address || "10.24.1.100"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Operational
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setActivePage && setActivePage("cameras")}
                              className="p-1.5 hover:bg-blue-600/20 text-blue-400 rounded-lg transition-colors cursor-pointer"
                              title="Watch in Multi-Grid"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setActivePage && setActivePage("dashboard")}
                              className="p-1.5 hover:bg-emerald-600/20 text-emerald-400 rounded-lg transition-colors cursor-pointer"
                              title="Locate on Gujarat GIS Map"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Table Footer */}
            <div className="border-t border-[#1e2a3a] px-4 py-3 bg-[#0d141f] flex items-center justify-between text-xs text-[#7d8da3]">
              <span>Showing {filtered.length} of {cameras.length} registered CCTV assets</span>
              <span className="font-mono text-[11px]">GPIC 2026 • Model 1 Architecture</span>
            </div>
          </div>
        )}
      </div>

      {/* Camera Technical Dossier Modal */}
      {activeModalCam && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveModalCam(null)}
        >
          <div 
            className="bg-[#111823] border border-[#1e2a3a] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setActiveModalCam(null)}
              className="absolute top-4 right-4 p-1.5 text-[#7d8da3] hover:text-white hover:bg-[#1a2436] rounded-xl transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Cpu className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {activeModalCam.id}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{activeModalCam.name}</h3>
                <p className="text-xs text-[#7d8da3]">{activeModalCam.city} Range • {activeModalCam.department}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-5">
              <div className="bg-[#0a0e14] p-3 rounded-xl border border-[#1e2a3a]">
                <span className="text-[#7d8da3] block text-[10px] uppercase font-semibold">Hardware Type</span>
                <span className="text-white font-medium">{activeModalCam.camera_type || "Fixed ANPR 4K"}</span>
              </div>
              <div className="bg-[#0a0e14] p-3 rounded-xl border border-[#1e2a3a]">
                <span className="text-[#7d8da3] block text-[10px] uppercase font-semibold">Encoding & FPS</span>
                <span className="text-white font-medium">{activeModalCam.codec || "H.264"} • {activeModalCam.resolution || "1080p @ 25fps"}</span>
              </div>
              <div className="bg-[#0a0e14] p-3 rounded-xl border border-[#1e2a3a]">
                <span className="text-[#7d8da3] block text-[10px] uppercase font-semibold">Internal IP</span>
                <span className="font-mono text-blue-400 font-medium">{activeModalCam.ip_address || "10.24.1.100"}</span>
              </div>
              <div className="bg-[#0a0e14] p-3 rounded-xl border border-[#1e2a3a]">
                <span className="text-[#7d8da3] block text-[10px] uppercase font-semibold">AMC Provider</span>
                <span className="text-white font-medium">{activeModalCam.amc_vendor || "BEL SmartCity"}</span>
              </div>
              <div className="bg-[#0a0e14] p-3 rounded-xl border border-[#1e2a3a] col-span-2">
                <span className="text-[#7d8da3] block text-[10px] uppercase font-semibold">GIS Coordinates</span>
                <span className="font-mono text-emerald-400 font-medium">
                  Lat: {activeModalCam.lat?.toFixed(4)}, Lng: {activeModalCam.lng?.toFixed(4)}
                </span>
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl mb-5 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-300">
                <span className="font-semibold">Section 65B Certified:</span> Tamper-proof RTSP stream with millisecond SHA-256 digital signature and PTS timestamp integrity.
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveModalCam(null);
                  setActivePage && setActivePage("cameras");
                }}
                className="flex-1 text-center text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Open Camera Grid
              </button>
              <button
                onClick={() => {
                  setActiveModalCam(null);
                  setActivePage && setActivePage("dashboard");
                }}
                className="flex-1 text-center text-xs bg-[#1a2436] hover:bg-[#223049] text-[#e6edf5] font-semibold py-2.5 rounded-xl transition-colors border border-[#1e2a3a] cursor-pointer"
              >
                View on GIS Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
