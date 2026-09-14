import React, { useState, useEffect, useRef } from "react";
import { Search, Filter, Radio, Maximize2, Shield, Eye, RefreshCw, Play, Tv } from "lucide-react";
import { supabase } from "../supabaseClient";
import HlsPlayer from "../components/HlsPlayer";
import { INITIAL_CAMERAS } from "../data/camerasData";

export default function CameraGridPage() {
  const [cameras, setCameras] = useState(INITIAL_CAMERAS);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [viewMode, setViewMode] = useState("all"); // "all" | "hover"
  const [hoveredCamId, setHoveredCamId] = useState(null);
  const [snapshotTimestamp, setSnapshotTimestamp] = useState(Date.now());
  const [activeCamModal, setActiveCamModal] = useState(null);
  const hoverTimerRef = useRef(null);
  const hoverStartTimeRef = useRef(null);

  const getSnapshotUrl = (camId, timestamp) => {
    const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    if (isLocal) {
      return `http://127.0.0.1:8000/api/cameras/${camId}/snapshot?t=${timestamp}`;
    }
    const now = new Date();
    const istHour = (now.getUTCHours() + 5.5) % 24;
    const isDaytime = istHour >= 6 && istHour < 18;
    return isDaytime ? `/snapshots/day_${camId}.jpg` : `/snapshots/${camId}.jpg`;
  };

  // Auto-refresh snapshot images every 3 minutes (180 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setSnapshotTimestamp(Date.now());
    }, 180000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseEnter = (camId) => {
    if (viewMode !== "hover") return;
    const enterTime = performance.now();
    hoverStartTimeRef.current = enterTime;
    console.log(`[HOVER] Mouseenter on ${camId} at ${enterTime.toFixed(1)}ms`);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    // Debounce hover activation by 120ms for super snappy responsiveness
    hoverTimerRef.current = setTimeout(() => {
      setHoveredCamId(camId);
    }, 120);
  };

  const handleMouseLeave = (camId) => {
    if (viewMode !== "hover") return;
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    hoverStartTimeRef.current = null;
    setHoveredCamId((prev) => (prev === camId ? null : prev));
  };

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
          <p className="text-xs text-[#7d8da3] mt-0.5">
            Model 2: Unified Video Viewing Gateway •{" "}
            <span className={viewMode === "all" ? "text-emerald-400 font-medium" : "text-blue-400 font-medium"}>
              {viewMode === "all" ? "All 30 Feeds Live Streaming" : "Hover-to-Play Active"}
            </span>
          </p>
        </div>

        {/* Search, Filters, and Stream Mode Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#7d8da3]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search camera or city..."
              className="bg-[#0a0e14] border border-[#1e2a3a] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#5c6b86] focus:outline-none focus:border-blue-500 w-44 transition-colors"
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

          {/* Mode Dropdown: All live vs Hover to play */}
          <div className="flex items-center gap-1.5 bg-[#0a0e14] border border-[#1e2a3a] rounded-xl px-2.5 py-1">
            <Tv className="h-3.5 w-3.5 text-emerald-400" />
            <select
              value={viewMode}
              onChange={(e) => {
                setViewMode(e.target.value);
                setHoveredCamId(null);
              }}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer font-medium pr-1"
              title="Select Grid Streaming Mode"
            >
              <option value="all" className="bg-[#111823] text-white">
                All live feeds (Default)
              </option>
              <option value="hover" className="bg-[#111823] text-white">
                Hover to play
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="p-6 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCameras.map((cam) => {
            const isLive = viewMode === "all" || hoveredCamId === cam.id;
            return (
              <div
                key={cam.id}
                onMouseEnter={() => handleMouseEnter(cam.id)}
                onMouseLeave={() => handleMouseLeave(cam.id)}
                className="bg-[#111823] border border-black/35 dark:border-zinc-800 hover:border-blue-500/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg flex flex-col transition-all group"
              >
                {/* Tile Header */}
                <div className="px-3.5 py-2.5 bg-[#0d141f] border-b border-black/20 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isLive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                      }`}
                    ></span>
                    <span className="font-mono text-xs font-bold text-white uppercase">{cam.id}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isLive && (
                      <span className="text-[9px] text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 uppercase tracking-wider">
                        LIVE
                      </span>
                    )}
                    <span className="text-[10px] text-blue-400 font-medium px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                      {cam.city}
                    </span>
                  </div>
                </div>

                {/* Video Stream or Static Snapshot Container */}
                <div className="relative aspect-video w-full bg-black overflow-hidden border-y border-black/20 dark:border-transparent">
                  {isLive ? (
                    <HlsPlayer
                      streamUrl={cam.hls_url}
                      cameraName={cam.name}
                      cameraId={cam.id}
                      hoverStartTime={hoverStartTimeRef.current}
                      snapshotUrl={getSnapshotUrl(cam.id, snapshotTimestamp)}
                    />
                  ) : (
                    <div className="relative w-full h-full bg-[#0a0e14] flex items-center justify-center">
                      <img
                        src={getSnapshotUrl(cam.id, snapshotTimestamp)}
                        alt={cam.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          const now = new Date();
                          const istHour = (now.getUTCHours() + 5.5) % 24;
                          const isDaytime = istHour >= 6 && istHour < 18;
                          const dayPrefix = isDaytime ? "day_" : "";
                          if (!e.target.dataset.triedFallback) {
                            e.target.dataset.triedFallback = "true";
                            e.target.src = `/snapshots/${dayPrefix}${cam.id}.jpg`;
                          } else {
                            e.target.src = isDaytime ? "/snapshots/day_cam01.jpg" : "/snapshots/cam01.jpg";
                          }
                        }}
                      />
                      {/* Snapshot Indicator Badge */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs border border-white/10 text-[10px] text-[#94a3b8] font-mono">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                        <span>SNAPSHOT (3m)</span>
                      </div>

                      {/* Hover Hint Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 pointer-events-none">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/90 text-white text-xs font-semibold shadow-lg backdrop-blur-xs">
                          <Play className="h-3.5 w-3.5 fill-white" />
                          <span>Hover to Stream Live</span>
                        </div>
                      </div>
                    </div>
                  )}

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
                    <span className="font-mono text-[#5c6b86]">
                      {isLive ? "1080p • H.264" : "Cached 3m"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fullscreen Video Modal */}
      {activeCamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111823] border border-black/35 dark:border-zinc-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-black/20 dark:border-zinc-800 flex items-center justify-between">
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
                snapshotUrl={getSnapshotUrl(activeCamModal.id, snapshotTimestamp)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
