import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import L from "leaflet";
import { Radio, Car, Bell, Shield, Video, Layers, AlertTriangle, Eye, CheckCircle2, Map as MapIcon, Globe } from "lucide-react";
import { supabase } from "../supabaseClient";
import HlsPlayer from "../components/HlsPlayer";
import { INITIAL_CAMERAS } from "../data/camerasData";
import gujaratBorder from "../data/gujaratBorder.json";
import { useLanguage } from "../context/LanguageContext";

// Custom pin icons with glowing pulse
const createCustomIcon = (color) => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background-color: ${color}; opacity: 0.45; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="background-color: ${color}; width: 13px; height: 13px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 0 10px ${color}, 0 2px 4px rgba(0,0,0,0.6); position: relative; z-index: 2;"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

const greenIcon = createCustomIcon("#10b981");
const amberIcon = createCustomIcon("#f59e0b");
const redIcon = createCustomIcon("#ef4444");

// Real Google Maps & OpenStreetMap tile layers (No API key watermark, full HD Gujarat coverage)
const GOOGLE_MAP_LAYERS = {
  satellite: {
    id: "satellite",
    label: "Google Satellite",
    icon: "🛰️",
    url: "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution: "&copy; Google Maps Satellite",
    maxZoom: 20,
  },
  osm: {
    id: "osm",
    label: "OpenStreetMap",
    icon: "🏙️",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  streets: {
    id: "streets",
    label: "Google Roads",
    icon: "🗺️",
    url: "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution: "&copy; Google Maps",
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
};

export default function DashboardPage({ setActivePage }) {
  const { t } = useLanguage();
  const [cameras, setCameras] = useState(INITIAL_CAMERAS);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [mapType, setMapType] = useState("satellite"); // default: Google Satellite Hybrid
  const [stats, setStats] = useState({
    total: 30,
    live: 30,
    alertsToday: 5,
    vehiclesTracked: 148,
  });

  useEffect(() => {
    // Fetch real cameras from Supabase
    const loadCameras = async () => {
      try {
        const { data, error } = await supabase.from("cameras").select("*");
        if (!error && data && data.length > 0) {
          setCameras(data);
          setStats((prev) => ({ ...prev, total: data.length, live: data.length }));
        } else {
          setCameras(INITIAL_CAMERAS);
        }
      } catch (err) {
        setCameras(INITIAL_CAMERAS);
      }
    };
    loadCameras();
  }, []);

  const activeLayer = GOOGLE_MAP_LAYERS[mapType];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0a0e14]">
      {/* Top Banner */}
      <div className="border-b border-[#1e2a3a] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111823]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Live GIS Command
            </span>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
              <Globe className="h-3 w-3" /> Real Google Maps Engine
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">{t("commandDashboard")}</h1>
          <p className="text-xs text-[#7d8da3] mt-0.5">{t("statewideSurveillance")}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#1e2a3a] bg-[#0a0e14] shadow-inner">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span className="text-xs text-[#7d8da3]">{t("liveFeeds")}</span>
            <span className="text-xs font-mono font-bold text-emerald-400">30/30 {t("online")}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Map (Left) + Stats & Feeds (Right) */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GIS Map Section */}
        <div className="lg:col-span-2 flex flex-col bg-[#111823] border border-[#1e2a3a] rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-3 border-b border-[#1e2a3a] flex flex-wrap items-center justify-between gap-3 bg-[#0d141f]">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Layers className="h-4 w-4 text-blue-400" />
              <span>{t("deploymentMap")}</span>
            </div>

            {/* Google Map Layer Selector */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#0a0e14] p-0.5 rounded-lg border border-[#1e2a3a]">
                {Object.values(GOOGLE_MAP_LAYERS).map((layer) => (
                  <button
                    key={layer.id}
                    onClick={() => setMapType(layer.id)}
                    className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md transition-all cursor-pointer ${
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

              <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#7d8da3] pl-2 border-l border-[#1e2a3a]">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span> {t("liveFeedsCount")}
                </span>
              </div>
            </div>
          </div>

          <div className="h-[520px] w-full relative z-0">
            <MapContainer
              center={[22.4, 71.8]}
              zoom={7}
              minZoom={6}
              maxZoom={20}
              style={{ height: "100%", width: "100%", backgroundColor: "#0a0e14" }}
              scrollWheelZoom={true}
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

              {cameras.map((cam) => {
                const lat = cam.lat || 22.25;
                const lng = cam.lng || 71.19;
                return (
                  <Marker
                    key={cam.id}
                    position={[lat, lng]}
                    icon={greenIcon}
                    eventHandlers={{
                      click: () => setSelectedCamera(cam),
                    }}
                  >
                    <Popup className="custom-popup">
                      <div className="p-3 text-[#0a0e14] min-w-[200px]">
                        <div className="flex items-center justify-between border-b pb-1 mb-1">
                          <span className="text-[10px] font-mono font-bold uppercase text-blue-700">{cam.id}</span>
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded">ONLINE</span>
                        </div>
                        <p className="font-bold text-xs text-gray-900 mt-1">{cam.name}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">{cam.city} Range • {cam.department}</p>
                        <p className="text-[9px] font-mono text-gray-500 mt-0.5">GPS: {lat.toFixed(4)}, {lng.toFixed(4)}</p>
                        <button
                          onClick={() => setSelectedCamera(cam)}
                          className="mt-2.5 w-full text-xs bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg font-semibold cursor-pointer transition-colors shadow-sm"
                        >
                          {t("watchLiveCctv")}
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Map Brand Badge */}
            <div className="absolute bottom-2 left-2 z-[400] bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[10px] text-white/80 flex items-center gap-1.5 pointer-events-none">
              <span className="font-semibold text-white">{activeLayer.label}</span>
              <span className="text-white/40">•</span>
              <span>Gujarat State GIS</span>
            </div>
          </div>
        </div>

        {/* Right Stats Column */}
        <div className="space-y-6">
          {/* 4 Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-[#111823] border border-[#1e2a3a]">
              <div className="flex items-center justify-between text-[#7d8da3] mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold">{t("totalCameras")}</span>
                <Radio className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-2xl font-extrabold font-mono text-white">{stats.total}</p>
              <p className="text-[10px] text-[#7d8da3] mt-1">{t("govtOnboarded")}</p>
            </div>

            <div className="p-4 rounded-xl bg-[#111823] border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center justify-between text-[#7d8da3] mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold">{t("liveFeedsCount")}</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold font-mono text-emerald-400">{stats.live}</p>
              <p className="text-[10px] text-[#7d8da3] mt-1">{t("relayOperational")}</p>
            </div>

            <div className="p-4 rounded-xl bg-[#111823] border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center justify-between text-[#7d8da3] mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold">{t("alertsToday")}</span>
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-2xl font-extrabold font-mono text-amber-400">{stats.alertsToday}</p>
              <p className="text-[10px] text-[#7d8da3] mt-1">{t("watchlistMatches")}</p>
            </div>

            <div className="p-4 rounded-xl bg-[#111823] border border-purple-500/30 bg-purple-500/5">
              <div className="flex items-center justify-between text-[#7d8da3] mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold">{t("trackedPlates")}</span>
                <Car className="h-4 w-4 text-purple-400" />
              </div>
              <p className="text-2xl font-extrabold font-mono text-purple-400">{stats.vehiclesTracked}</p>
              <p className="text-[10px] text-[#7d8da3] mt-1">{t("anprProcessed")}</p>
            </div>
          </div>

          {/* Department Coverage Widget */}
          <div className="p-5 rounded-2xl bg-[#111823] border border-[#1e2a3a]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">{t("deptDeployment")}</h3>
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-[#7d8da3] mb-1">
                  <span>{t("cityPolice")}</span>
                  <span className="font-mono text-white">12 Feeds</span>
                </div>
                <div className="h-1.5 w-full bg-[#0a0e14] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[40%] rounded-full"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#7d8da3] mb-1">
                  <span>{t("trafficPolice")}</span>
                  <span className="font-mono text-white">10 Feeds</span>
                </div>
                <div className="h-1.5 w-full bg-[#0a0e14] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[33%] rounded-full"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#7d8da3] mb-1">
                  <span>{t("highwayPatrol")}</span>
                  <span className="font-mono text-white">5 Feeds</span>
                </div>
                <div className="h-1.5 w-full bg-[#0a0e14] rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 w-[17%] rounded-full"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#7d8da3] mb-1">
                  <span>{t("coastalGram")}</span>
                  <span className="font-mono text-white">3 Feeds</span>
                </div>
                <div className="h-1.5 w-full bg-[#0a0e14] rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-[10%] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action */}
          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-600/10 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white">{t("inspectLiveFeeds")}</p>
              <p className="text-[11px] text-[#7d8da3]">{t("switchMultiGrid")}</p>
            </div>
            <button
              onClick={() => setActivePage && setActivePage("cameras")}
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg cursor-pointer transition-all shadow-sm"
            >
              {t("openGrid")}
            </button>
          </div>
        </div>
      </div>

      {/* Selected Camera Feed Modal */}
      {selectedCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111823] border border-[#1e2a3a] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-[#1e2a3a] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{selectedCamera.name}</h3>
                <p className="text-[10px] text-[#7d8da3]">{selectedCamera.city} • {selectedCamera.department} • ID: {selectedCamera.id}</p>
              </div>
              <button
                onClick={() => setSelectedCamera(null)}
                className="text-xs bg-[#0a0e14] text-[#7d8da3] hover:text-white px-3 py-1.5 rounded-lg border border-[#1e2a3a] cursor-pointer"
              >
                {t("close")}
              </button>
            </div>
            <div className="h-80 w-full bg-black">
              <HlsPlayer
                streamUrl={selectedCamera.hls_url}
                cameraName={selectedCamera.name}
                cameraId={selectedCamera.id}
              />
            </div>
          </div>
        </div>
      )}

      {/* Surveillance Ticker at bottom */}
      <div className="mt-auto border-t border-[#1e2a3a] bg-[#111823] px-6 py-2.5 flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
          <Bell className="h-3 w-3" /> {t("liveAnprFeed")}
        </span>
        <div className="text-xs text-[#7d8da3] truncate flex items-center gap-6">
          <span>🚨 <strong className="text-white">GJ-05-AB-1234</strong> (Stolen Swift) detected at <strong>Paldi Circle (CAM04)</strong> - Alert Dispatched</span>
          <span>•</span>
          <span>⚠️ <strong className="text-white">GJ-01-XY-7788</strong> (Blacklisted SUV) checked at <strong>Adalaj Tollnaka (CAM12)</strong></span>
        </div>
      </div>
    </div>
  );
}
