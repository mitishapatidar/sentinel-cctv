import React, { useState, useEffect, useRef } from "react";
import { Search, Filter, Radio, Maximize2, Shield, Eye, RefreshCw, Play, Tv } from "lucide-react";
import HlsPlayer from "../components/HlsPlayer";
import { auditService } from "../services/auditService";
import { useCameras } from "../hooks/useCameras";
import { cameraService } from "../services/cameraService";

// Tiles per page: keeps DOM size, image requests and concurrent streams bounded for any registry size
const PAGE_SIZE = 24;

export default function CameraGridPage() {
  const { cameras } = useCameras();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  // Hover-to-play by default: streaming all 30 feeds at once saturates bandwidth
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("sentinel_grid_mode") || "hover";
    } catch (e) {
      return "hover";
    }
  }); // "all" | "hover"
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

  // Backend grabs a fresh preview frame per camera; poll when each was last updated
  const [snapshotMeta, setSnapshotMeta] = useState({});
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!isLocal) return;
    let lastSig = "";
    const poll = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/cameras/snapshots/meta");
        const meta = await res.json();
        const sig = JSON.stringify(meta);
        if (sig !== lastSig) {
          lastSig = sig;
          setSnapshotMeta(meta);
          // Each image URL carries its own camera's update time, so only refreshed cameras reload
        }
      } catch (e) {
        // Backend offline: archived previews stay in place
      }
      setNow(Date.now());
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  const previewAge = (camId) => {
    const updated = snapshotMeta[camId];
    if (!updated) return null;
    const mins = Math.max(0, Math.round((now - updated * 1000) / 60000));
    return mins === 0 ? "just now" : `${mins}m ago`;
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

  const filteredCameras = cameras.filter((c) => {
    const matchesSearch =
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.id || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.city || "").toLowerCase().includes(search.toLowerCase());
    const matchesDept = selectedDept === "all" || c.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const pageCount = Math.max(1, Math.ceil(filteredCameras.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pagedCameras = filteredCameras.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

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
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search camera or city..."
              className="bg-[#0a0e14] border border-[#1e2a3a] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#5c6b86] focus:outline-none focus:border-blue-500 w-44 transition-colors"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setPage(0);
            }}
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
                try {
                  localStorage.setItem("sentinel_grid_mode", e.target.value);
                } catch (err) {}
              }}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer font-medium pr-1"
              title="Select Grid Streaming Mode"
            >
              <option value="all" className="bg-[#111823] text-white">
                All live feeds (high bandwidth)
              </option>
              <option value="hover" className="bg-[#111823] text-white">
                Hover to play (Recommended)
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="p-6 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {pagedCameras.map((cam) => {
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
                      <span className="text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 uppercase tracking-wider">
                        LIVE
                      </span>
                    )}
                    <span className="text-[11px] text-blue-400 font-medium px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                      {cam.city}
                    </span>
                  </div>
                </div>

                {/* Video Stream or Static Snapshot Container */}
                <div className="relative aspect-video w-full bg-black overflow-hidden border-y border-black/20 dark:border-transparent">
                  {isLive ? (
                    <HlsPlayer
                      streamUrl={cameraService.getStreamUrl(cam)}
                      cameraName={cam.name}
                      cameraId={cam.id}
                      hoverStartTime={hoverStartTimeRef.current}
                      snapshotUrl={getSnapshotUrl(cam.id, snapshotMeta[cam.id] || snapshotTimestamp)}
                    />
                  ) : (
                    <div className="relative w-full h-full bg-[#0a0e14] flex items-center justify-center">
                      <span className="absolute text-[12px] text-[#7d8da3]">No preview yet</span>
                      <img
                        src={getSnapshotUrl(cam.id, snapshotMeta[cam.id] || snapshotTimestamp)}
                        alt={cam.name}
                        loading="lazy"
                        decoding="async"
                        className="relative w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onLoad={(e) => {
                          e.target.style.visibility = "visible";
                        }}
                        onError={(e) => {
                          const now = new Date();
                          const istHour = (now.getUTCHours() + 5.5) % 24;
                          const isDaytime = istHour >= 6 && istHour < 18;
                          const dayPrefix = isDaytime ? "day_" : "";
                          if (!e.target.dataset.triedFallback) {
                            e.target.dataset.triedFallback = "true";
                            e.target.src = `/snapshots/${dayPrefix}${cam.id}.jpg`;
                          } else {
                            // No image for this camera (e.g. newly registered): show the placeholder
                            e.target.style.visibility = "hidden";
                          }
                        }}
                      />
                      {/* Snapshot Indicator Badge */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs border border-white/10 text-[11px] text-[#94a3b8] font-mono">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                        <span>{previewAge(cam.id) ? `PREVIEW • ${previewAge(cam.id)}` : "ARCHIVED PREVIEW"}</span>
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
                    onClick={() => {
                      setActiveCamModal(cam);
                      auditService.log("STREAM_VIEW", `${cam.id} (${cam.name || "HLS Stream"})`);
                    }}
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
                  <div className="flex items-center justify-between text-[11px] text-[#7d8da3] mt-1">
                    <span>{cam.department}</span>
                    <span className="font-mono text-[#5c6b86]">
                      {isLive ? "1080p • H.264" : previewAge(cam.id) ? `Updated ${previewAge(cam.id)}` : "Hover to play"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredCameras.length === 0 && (
          <p className="text-center text-sm text-[#7d8da3] py-16">No cameras match your search.</p>
        )}

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between gap-3 mt-6 text-xs text-[#7d8da3]">
            <span>
              Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filteredCameras.length)} of{" "}
              {filteredCameras.length} cameras
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="px-3 py-1.5 rounded-lg border border-[#1e2a3a] bg-[#111823] text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="font-mono">
                {currentPage + 1} / {pageCount}
              </span>
              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= pageCount - 1}
                className="px-3 py-1.5 rounded-lg border border-[#1e2a3a] bg-[#111823] text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
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
                streamUrl={cameraService.getStreamUrl(activeCamModal)}
                cameraName={activeCamModal.name}
                cameraId={activeCamModal.id}
                snapshotUrl={getSnapshotUrl(activeCamModal.id, snapshotMeta[activeCamModal.id] || snapshotTimestamp)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
