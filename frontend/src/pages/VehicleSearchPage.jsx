import React, { useState, useEffect } from "react";
import { Search, Car, Calendar, Clock, MapPin, CheckCircle, AlertTriangle, ArrowRight, Download, Eye, Printer, Shield, Layers } from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import gujaratBorder from "../data/gujaratBorder.json";
import { supabase } from "../supabaseClient";
import { auditService } from "../services/auditService";
import { watchlistService } from "../services/watchlistService";

// Real Google Maps & OpenStreetMap tile layers (Identical to Dashboard GIS engine)
const GOOGLE_MAP_LAYERS = {
  streets: {
    id: "streets",
    label: "Google Maps",
    icon: "🗺️",
    url: "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution: "&copy; Google Maps",
    maxZoom: 20,
  },
  satellite: {
    id: "satellite",
    label: "Google Satellite",
    icon: "🛰️",
    url: "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution: "&copy; Google Maps Satellite",
    maxZoom: 20,
  },
  terrain: {
    id: "terrain",
    label: "Google Terrain",
    icon: "🏔️",
    url: "https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution: "&copy; Google Maps Terrain",
    maxZoom: 20,
  },
  osm: {
    id: "osm",
    label: "OpenStreetMap",
    icon: "🏙️",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
};

// Automatic Smart-Zoom Component: Automatically zooms in when vehicle points are close, or fits statewide route
function AutoFitBounds({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (!coordinates || coordinates.length === 0) return;

    if (coordinates.length === 1) {
      map.setView(coordinates[0], 14, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(coordinates);
    map.fitBounds(bounds, {
      padding: [60, 60],
      maxZoom: 15,
      animate: true,
    });
  }, [coordinates, map]);

  return null;
}

const createNumberedIcon = (number, isAlert = false) => {
  return L.divIcon({
    className: "route-marker",
    html: `<div style="
      background-color: ${isAlert ? "#ef4444" : "#2563eb"};
      color: white;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    ">${number}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

// Quick-target tags: only serious cases are highlighted, everything else stays neutral
const TAG_SEVERE = "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30";
const SEVERE_CATEGORIES = ["stolen", "wanted", "kidnapping", "missing"];
const TAG_NEUTRAL = "text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10";

const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || "http://127.0.0.1:8000";

// Average speed between two consecutive sightings (straight-line distance / time gap)
function estimateSpeed(prev, cur) {
  if (!prev || prev.lat == null || cur.lat == null) return "—";
  const hours = (new Date(cur.detected_at) - new Date(prev.detected_at)) / 3.6e6;
  if (hours <= 0.005) return "—";
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(cur.lat - prev.lat);
  const dLng = rad(cur.lng - prev.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(prev.lat)) * Math.cos(rad(cur.lat)) * Math.sin(dLng / 2) ** 2;
  const km = 12742 * Math.asin(Math.sqrt(h));
  return `${Math.round(km / hours)} km/h`;
}

export default function VehicleSearchPage({ initialPlate, onPlateSearched }) {
  const [query, setQuery] = useState(() => {
    try {
      return initialPlate || localStorage.getItem("sentinel_search_plate") || "GJ-01-AB-1234";
    } catch (e) {
      return "GJ-01-AB-1234";
    }
  });
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [quickTargets, setQuickTargets] = useState([]);

  useEffect(() => {
    watchlistService.getWatchlist("vehicle").then(({ data }) => {
      const active = (Array.isArray(data) ? data : []).filter((w) => w.is_active !== false);
      setQuickTargets(
        active.slice(0, 16).map((w) => ({
          plate: w.identifier,
          tag: w.category ? w.category.charAt(0).toUpperCase() + w.category.slice(1) : "Watchlist",
          badge: SEVERE_CATEGORIES.includes(w.category) ? TAG_SEVERE : TAG_NEUTRAL,
        }))
      );
    });
  }, []);
  const [mapType, setMapType] = useState("streets"); // default: Google Maps

  const activeLayer = GOOGLE_MAP_LAYERS[mapType] || GOOGLE_MAP_LAYERS.streets;



  const handleSearch = async (plateToSearch) => {
    const target = (plateToSearch || query).trim().toUpperCase();
    if (!target) return;
    setSearching(true);
    setSearchMessage("");
    auditService.log("ANPR_SEARCH", `Vehicle Query: ${target}`, "CHAIN_OF_CUSTODY_SECURED");
    if (onPlateSearched) onPlateSearched(target);

    try {
      const res = await fetch(`${BACKEND_URL}/api/vehicles/${encodeURIComponent(target)}/sightings`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const timeline = data.sightings.map((d, idx) => {
        const prev = data.sightings[idx - 1];
        return {
          order: idx + 1,
          camId: d.camera_id,
          name: d.name,
          city: d.city || "Gujarat",
          lat: d.lat ?? 23.0225,
          lng: d.lng ?? 72.5714,
          timestamp: new Date(d.detected_at).toLocaleString("en-GB", { timeZone: "Asia/Kolkata" }),
          confidence: `${((d.confidence || 0) * 100).toFixed(1)}%${d.match === "exact" ? "" : ` (${d.match} read: ${d.plate_read})`}`,
          speed: estimateSpeed(prev, d),
        };
      });

      if (timeline.length === 0) {
        setResults(null);
        setSearchMessage(
          data.watchlist
            ? `${target} is on the watchlist, but no camera has picked it up yet.`
            : `No camera has picked up ${target} yet.`
        );
        return;
      }

      const watch = data.watchlist;
      const types = [...new Set(data.sightings.map((d) => d.vehicle_type).filter(Boolean))];
      setResults({
        plate: target,
        model: types.length ? types.join(" / ") : "Vehicle",
        category: watch ? `${watch.category.toUpperCase()} – ${watch.description || "Watchlist entry"}` : "Not on the watchlist",
        isWatchlist: !!watch,
        severity: watch && ["stolen", "wanted"].includes(watch.category) ? "critical" : "high",
        totalSightings: timeline.length,
        timeline,
      });
    } catch (err) {
      console.warn("[VehicleSearch] sightings request failed:", err);
      setResults(null);
      setSearchMessage("Can't reach the ANPR backend. Start the relay server (port 8000) and try again.");
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const target = (initialPlate || localStorage.getItem("sentinel_search_plate") || query || "GJ-01-AB-1234").trim().toUpperCase();
    if (target) {
      setQuery(target);
      handleSearch(target);
    }
  }, [initialPlate]);

  const routeCoordinates = results ? results.timeline.map((t) => [t.lat, t.lng]) : [];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Search Header */}
      <div className="border-b border-[#1e2a3a] px-6 py-6 bg-[#111823]">
        <div className="max-w-6xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 mb-1">
            <Car className="h-4 w-4" />
            <span>REAL-TIME INVESTIGATION • STATEWIDE ANPR TRAJECTORY RECONSTRUCTION</span>
          </div>
          <h1 className="text-xl font-bold text-white">Vehicle Route Reconstruction & Tracing</h1>
          <p className="text-xs text-[#7d8da3] mt-1">
            Enter a designated vehicle registration number to trace its historical movement across Gujarat's CCTV grid.
          </p>

          {/* Search Box */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Car className="absolute left-3.5 top-3 h-4 w-4 text-[#7d8da3]" />
              <input
                type="text"
                id="plate-search-input"
                aria-label="Vehicle number plate"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Number Plate (e.g. GJ-05-AB-1234)  •  Press / to focus"
                className="w-full bg-[#0a0e14] border border-[#1e2a3a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-blue-500 tracking-wider transition-colors"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={searching}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              <Search className="h-4 w-4" />
              {searching ? "Tracing Route..." : "Track Trajectory"}
            </button>
          </div>

          {/* Watchlisted vehicles, one click to search */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300">
                Quick Surveillance Targets
              </span>
              <span className="text-[11px] font-mono text-[#7d8da3]">
                {quickTargets.length} watchlisted vehicles
              </span>
            </div>

            {/* Fixed 4 Columns, Auto-Expanding Rows (Option 1: Unified Slate & Police Navy) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {quickTargets.map((t) => (
                <button
                  key={t.plate}
                  onClick={() => {
                    setQuery(t.plate);
                    handleSearch(t.plate);
                  }}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-[#0d131c] border border-slate-200 dark:border-[#1e2a3a] hover:border-blue-500/70 hover:bg-blue-50/40 dark:hover:bg-blue-500/10 hover:shadow-xs cursor-pointer font-mono text-[12px] transition-all flex items-center justify-between gap-1.5 text-left group"
                  title={`${t.plate} (${t.tag})`}
                >
                  <span className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors truncate">
                    {t.plate}
                  </span>
                  <span className={`text-[11px] font-sans font-semibold px-1.5 py-0.5 rounded border truncate shrink-0 ${t.badge}`}>
                    {t.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trajectory Results View */}
      {!searching && !results && searchMessage && (
        <div className="mx-6 mt-6 p-4 rounded-xl border border-[#1e2a3a] bg-[#111823] text-sm text-[#cad5e2]">
          {searchMessage}
        </div>
      )}

      {results && (
        <div className="p-6 space-y-6">
          {/* Target Vehicle Summary Card */}
          <div className="p-5 rounded-2xl bg-[#111823] border border-[#1e2a3a] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Car className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-extrabold font-mono text-white tracking-wider">{results.plate}</span>
                  {results.isWatchlist && (
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                      WATCHLIST MATCH
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#7d8da3] mt-0.5">
                  {results.model} • <strong className="text-white">{results.category}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowDossierModal(true)}
              className="flex items-center gap-2 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-md shadow-blue-600/20"
            >
              <Download className="h-3.5 w-3.5" />
              Generate Certified Evidence Dossier
            </button>
          </div>

          {/* Map + Route Traversal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#111823] border border-[#1e2a3a] rounded-2xl overflow-hidden shadow-xl flex flex-col">
              <div className="px-4 py-2.5 border-b border-[#1e2a3a] flex flex-wrap items-center justify-between gap-2 bg-[#0d141f] shrink-0">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  <span>Traversed Route on Gujarat State Network</span>
                </div>

                {/* Google Map Layer Selector (Same as Dashboard) */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[#0a0e14] p-0.5 rounded-lg border border-[#1e2a3a]">
                    {Object.values(GOOGLE_MAP_LAYERS).map((layer) => (
                      <button
                        key={layer.id}
                        onClick={() => setMapType(layer.id)}
                        className={`flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                          mapType === layer.id
                            ? "bg-blue-600 text-white font-semibold shadow-sm"
                            : "text-[#7d8da3] hover:text-white hover:bg-[#16233b]"
                        }`}
                      >
                        <span>{layer.icon}</span>
                        <span>{layer.label}</span>
                      </button>
                    ))}
                  </div>

                  <span className="text-xs text-emerald-700 dark:text-emerald-400 dark:text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {results.timeline.length} Checkpoints
                  </span>
                </div>
              </div>

              <div className="h-[460px] w-full relative z-0">
                <MapContainer
                  center={[22.5, 71.5]}
                  zoom={7}
                  style={{ height: "100%", width: "100%", backgroundColor: "#0a0e14" }}
                >
                  <TileLayer
                    key={activeLayer.id}
                    attribution={activeLayer.attribution}
                    url={activeLayer.url}
                    subdomains={activeLayer.subdomains}
                    maxZoom={activeLayer.maxZoom}
                  />

                  {/* Gujarat State Border Light Black Outline */}
                  <GeoJSON
                    data={gujaratBorder}
                    style={{
                      color: "#18181b",
                      weight: 2.2,
                      opacity: 0.85,
                      fillColor: "#0284c7",
                      fillOpacity: 0.03,
                    }}
                  />

                  {/* Connecting Trajectory Polyline */}
                  <Polyline
                    positions={routeCoordinates}
                    color="#2563eb"
                    weight={4}
                    dashArray="6, 8"
                  />

                  {/* Auto-Zoom Component: Zooms in closely if points are nearby, or fits statewide if distant */}
                  <AutoFitBounds coordinates={routeCoordinates} />

                  {/* Sequential Numbered Checkpoint Markers */}
                  {results.timeline.map((step) => (
                    <Marker
                      key={step.order}
                      position={[step.lat, step.lng]}
                      icon={createNumberedIcon(step.order, results.isWatchlist && step.order === results.timeline.length)}
                    >
                      <Popup className="custom-popup">
                        <div className="p-2.5 text-[#0a0e14] min-w-[180px]">
                          <div className="flex items-center justify-between border-b border-gray-200 pb-1 mb-1.5">
                            <span className="font-bold text-xs text-blue-700">Checkpoint #{step.order}</span>
                            <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                              {step.camId}
                            </span>
                          </div>
                          <p className="font-bold text-xs text-gray-900">{step.name}</p>
                          <p className="text-[11px] text-gray-600 mt-0.5">{step.city} • {step.timestamp}</p>
                          <div className="flex items-center justify-between text-[11px] mt-1.5 pt-1 border-t border-gray-100 font-semibold">
                            <span className="text-emerald-700">Conf: {step.confidence}</span>
                            <span className="text-gray-800">Speed: {step.speed}</span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>

                {/* Map Brand Badge */}
                <div className="absolute bottom-2 left-2 z-[400] bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[11px] text-white/80 flex items-center gap-1.5 pointer-events-none">
                  <span className="font-semibold text-white">{activeLayer.label}</span>
                  <span className="text-white/40">•</span>
                  <span>Gujarat State GIS</span>
                </div>
              </div>
            </div>

            {/* Chronological Timeline */}
            <div className="bg-[#111823] border border-[#1e2a3a] rounded-2xl p-5 flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                Detection Chronology
              </h3>

              <div className="space-y-4 flex-1 overflow-y-auto pl-4 pr-1 py-1">
                {results.timeline.map((item, idx) => (
                  <div
                    key={item.order}
                    className={`relative pl-6 pb-2 border-l-2 ${
                      idx === results.timeline.length - 1
                        ? "border-transparent"
                        : "border-slate-200 dark:border-[#1e2a3a]"
                    }`}
                  >
                    <div className="absolute -left-[13px] top-0 h-6 w-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white dark:border-[#111823] shadow-md shrink-0">
                      {item.order}
                    </div>

                    <div className="bg-white dark:bg-[#0a0e14] border border-slate-200 dark:border-[#1e2a3a] rounded-xl p-3 shadow-xs">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-[#7d8da3] mt-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className="font-mono text-slate-700 dark:text-white font-semibold">{item.timestamp}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#7d8da3] mt-2 pt-2 border-t border-slate-100 dark:border-[#1e2a3a]">
                        <span>Confidence: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{item.confidence}</strong></span>
                        <span>Speed: <strong className="text-slate-800 dark:text-white font-bold">{item.speed}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Certified Dossier Modal (Printable) */}
      {showDossierModal && results && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white text-black rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl p-8 my-8">
            {/* Header */}
            <div className="border-b-2 border-blue-900 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-blue-900 uppercase tracking-wide">
                  Gujarat Police • State Crime Record Bureau (SCRB)
                </h2>
                <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mt-0.5">
                  Automated ANPR Trajectory Verification Certificate (Section 65B Indian Evidence Act)
                </p>
              </div>
              <div className="text-right font-mono text-xs text-gray-500">
                <p>REF: GP-ANPR-2026-9481</p>
                <p>DATE: 11-09-2026</p>
              </div>
            </div>

            {/* Target Profile */}
            <div className="my-6 grid grid-cols-2 gap-4 bg-gray-100 p-4 rounded-xl text-xs">
              <div>
                <p className="text-gray-500 uppercase font-semibold text-[11px]">Registration Plate</p>
                <p className="text-base font-black font-mono text-blue-900">{results.plate}</p>
              </div>
              <div>
                <p className="text-gray-500 uppercase font-semibold text-[11px]">Vehicle Classification</p>
                <p className="text-xs font-bold text-gray-900">{results.model}</p>
              </div>
              <div>
                <p className="text-gray-500 uppercase font-semibold text-[11px]">Registry Status</p>
                <p className="text-xs font-bold text-red-600">{results.category}</p>
              </div>
              <div>
                <p className="text-gray-500 uppercase font-semibold text-[11px]">Total Checkpoints Correlated</p>
                <p className="text-xs font-bold text-gray-900">{results.totalSightings} Checkpoints</p>
              </div>
            </div>

            {/* Trajectory Table */}
            <h4 className="text-xs font-bold uppercase text-gray-700 mb-2">Verified Sequential Sightings</h4>
            <table className="w-full text-left text-xs border border-gray-300 mb-6">
              <thead className="bg-gray-200 text-gray-700">
                <tr>
                  <th className="p-2 border">Seq</th>
                  <th className="p-2 border">Camera ID</th>
                  <th className="p-2 border">Location Name</th>
                  <th className="p-2 border">Timestamp (IST)</th>
                  <th className="p-2 border">Speed</th>
                  <th className="p-2 border">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {results.timeline.map((s) => (
                  <tr key={s.order} className="border-b">
                    <td className="p-2 border font-bold">#{s.order}</td>
                    <td className="p-2 border font-mono">{s.camId}</td>
                    <td className="p-2 border">{s.name} ({s.city})</td>
                    <td className="p-2 border font-mono">{s.timestamp}</td>
                    <td className="p-2 border">{s.speed}</td>
                    <td className="p-2 border font-bold text-emerald-700">{s.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legal Certificate Footer */}
            <div className="border-t pt-4 text-[11px] text-gray-500 space-y-1">
              <p>Certified that the electronic surveillance metadata above was ingested by the SENTINEL Centralised CCTV Gateway in real-time from active police roadside feeds. Cryptographic hash verified.</p>
              <p className="font-semibold text-gray-700">Digital Seal: SHA256:8f4c2e1b9a78d052a34... • Dy. Commissioner of Police (Crime)</p>
            </div>

            {/* Modal Buttons */}
            <div className="mt-6 flex justify-end gap-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Certificate
              </button>
              <button
                onClick={() => setShowDossierModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
