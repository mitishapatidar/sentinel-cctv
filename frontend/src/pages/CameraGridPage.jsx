import React, { useState, useEffect } from "react";
import { Search, Filter, Radio, Maximize2, Shield, Eye, RefreshCw } from "lucide-react";
import { supabase } from "../supabaseClient";
import HlsPlayer from "../components/HlsPlayer";
import { INITIAL_CAMERAS } from "../data/camerasData";

export default function CameraGridPage() {
  const [cameras, setCameras] = useState(INITIAL_CAMERAS);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [activeCamModal, setActiveCamModal] = useState(null);

  useEffect(() => {
    // Try refreshing with real-time Supabase state if available
    const fetchCameras = async () => {
      try {
        const { data } = await supabase.from("cameras").select("*");
        if (data && data.length > 0) {
          setCameras(data);
        }
      } catch (e) {
        console.log("Using cached camera catalog:", e);
      }
    };
    fetchCameras();
  }, []);

  const filteredCameras = cameras.filter((c) => {
    const matchesSearch =
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.id || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.city || "").toLowerCase().includes(search.toLowerCase());
    const matchesDept = selectedDept === "all" || c.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const departments = [
    "all",
    "City Police",
    "Traffic Police",
    "Highway Patrol",
    "Coastal Security",
    "Panchayat Security",
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Top Header */}
      <div className="border-b border-[#1e2a3a] px-6 py-4 bg-[#111823] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Multi-Camera Live Video Grid</h1>
          <p className="text-xs text-[#7d8da3] mt-0.5">Model 2: Unified Video Viewing Gateway • 30 Feeds Streaming</p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#7d8da3]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search camera or city..."
              className="bg-[#0a0e14] border border-[#1e2a3a] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#5c6b86] focus:outline-none focus:border-blue-500 w-48 transition-colors"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-[#0a0e14] border border-[#1e2a3a] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept === "all" ? "All Departments" : dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Content */}
      <div className="p-6 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCameras.map((cam) => (
            <div
              key={cam.id}
              className="bg-[#111823] border border-[#1e2a3a] hover:border-blue-500/50 rounded-2xl overflow-hidden shadow-lg flex flex-col transition-all group"
            >
              {/* Tile Header */}
              <div className="px-3.5 py-2.5 bg-[#0d141f] border-b border-[#1e2a3a] flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-mono text-xs font-bold text-white uppercase">{cam.id}</span>
                </div>
                <span className="text-[10px] text-blue-400 font-medium px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                  {cam.city}
                </span>
              </div>

              {/* Video Stream Container */}
              <div className="relative aspect-video w-full bg-black">
                <HlsPlayer
                  streamUrl={cam.hls_url}
                  cameraName={cam.name}
                  cameraId={cam.id}
                />

                <button
                  onClick={() => setActiveCamModal(cam)}
                  className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white/80 hover:text-white hover:bg-black/90 backdrop-blur-xs transition-all cursor-pointer opacity-0 group-hover:opacity-100 z-30"
                  title="Maximize Stream"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Tile Footer */}
              <div className="p-3 bg-[#111823] mt-auto">
                <p className="text-xs font-semibold text-white truncate" title={cam.name}>
                  {cam.name}
                </p>
                <div className="flex items-center justify-between text-[10px] text-[#7d8da3] mt-1">
                  <span>{cam.department}</span>
                  <span className="font-mono text-[#5c6b86]">1080p • H.264</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fullscreen Video Modal */}
      {activeCamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111823] border border-[#1e2a3a] rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#1e2a3a] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {activeCamModal.name}
                </h3>
                <p className="text-xs text-[#7d8da3] mt-0.5">
                  ID: {activeCamModal.id} • {activeCamModal.city} • {activeCamModal.department}
                </p>
              </div>
              <button
                onClick={() => setActiveCamModal(null)}
                className="text-xs bg-[#0a0e14] text-[#7d8da3] hover:text-white px-3 py-1.5 rounded-lg border border-[#1e2a3a] cursor-pointer"
              >
                Close View
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <HlsPlayer
                streamUrl={activeCamModal.hls_url}
                cameraName={activeCamModal.name}
                cameraId={activeCamModal.id}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
