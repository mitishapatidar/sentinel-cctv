import React, { useState } from "react";
import { Search, Car, Calendar, Clock, MapPin, CheckCircle, AlertTriangle, ArrowRight, Download, Eye, Printer, Shield } from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";

const createNumberedIcon = (number, isAlert = false) => {
  return L.divIcon({
    className: "route-marker",
    html: `<div style="
      background-color: ${isAlert ? "#ef4444" : "#3b82f6"};
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
      border: 2px solid white;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
    ">${number}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export default function VehicleSearchPage() {
  const [query, setQuery] = useState("GJ-05-AB-1234");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);

  const mockTraffics = {
    "GJ-05-AB-1234": {
      plate: "GJ-05-AB-1234",
      model: "White Maruti Swift",
      category: "STOLEN VEHICLE (Surat Varachha FIR #391/2026)",
      isWatchlist: true,
      severity: "critical",
      totalSightings: 4,
      timeline: [
        {
          order: 1,
          camId: "cam01",
          name: "01 Chiman bhai Bridge",
          city: "Ahmedabad",
          lat: 23.0301,
          lng: 72.5075,
          timestamp: "10-09-2026 09:15:22",
          confidence: "96.4%",
          speed: "54 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
        {
          order: 2,
          camId: "cam04",
          name: "04 Paldi Circle",
          city: "Ahmedabad",
          lat: 23.0131,
          lng: 72.5624,
          timestamp: "10-09-2026 09:38:10",
          confidence: "98.1%",
          speed: "42 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
        {
          order: 3,
          camId: "cam12",
          name: "12 Tri Mandir Adalaj Tollnaka",
          city: "Gandhinagar",
          lat: 23.1673,
          lng: 72.5812,
          timestamp: "10-09-2026 10:24:45",
          confidence: "94.8%",
          speed: "78 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
        {
          order: 4,
          camId: "cam08",
          name: "08 majewadi-gate-junagadh",
          city: "Junagadh",
          lat: 21.5281,
          lng: 70.4619,
          timestamp: "10-09-2026 14:12:05",
          confidence: "95.2%",
          speed: "35 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
      ],
    },
    "GJ-01-XY-7788": {
      plate: "GJ-01-XY-7788",
      model: "Black Mahindra Scorpio",
      category: "BLACKLISTED VEHICLE (Smuggling Task Force Alert)",
      isWatchlist: true,
      severity: "high",
      totalSightings: 3,
      timeline: [
        {
          order: 1,
          camId: "cam21",
          name: "23 Patan Dethali Char Rasta",
          city: "Patan",
          lat: 23.8493,
          lng: 72.1266,
          timestamp: "10-09-2026 11:02:18",
          confidence: "97.0%",
          speed: "65 km/h",
          snapshot: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
        },
        {
          order: 2,
          camId: "cam05",
          name: "05 Visat teen Rasta",
          city: "Ahmedabad",
          lat: 23.1042,
          lng: 72.5932,
          timestamp: "10-09-2026 12:40:02",
          confidence: "95.5%",
          speed: "58 km/h",
          snapshot: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
        },
        {
          order: 3,
          camId: "cam17",
          name: "17 Rajkot Bus Port CCTV",
          city: "Rajkot",
          lat: 22.3039,
          lng: 70.8022,
          timestamp: "10-09-2026 15:30:11",
          confidence: "93.9%",
          speed: "40 km/h",
          snapshot: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
        },
      ],
    },
  };

  const handleSearch = (plateToSearch) => {
    const target = (plateToSearch || query).trim().toUpperCase();
    setSearching(true);
    setTimeout(() => {
      setSearching(false);
      if (mockTraffics[target]) {
        setResults(mockTraffics[target]);
      } else {
        setResults({
          plate: target,
          model: "Sedan / Passenger Vehicle",
          category: "General Registry Check",
          isWatchlist: false,
          totalSightings: 2,
          timeline: [
            {
              order: 1,
              camId: "cam02",
              name: "02 Janpath",
              city: "Ahmedabad",
              lat: 23.0225,
              lng: 72.5714,
              timestamp: "10-09-2026 08:30:15",
              confidence: "91.2%",
              speed: "45 km/h",
              snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
            },
            {
              order: 2,
              camId: "cam06",
              name: "06 Timbavadi gate-Junagadh",
              city: "Junagadh",
              lat: 21.5054,
              lng: 70.4352,
              timestamp: "10-09-2026 13:20:44",
              confidence: "93.5%",
              speed: "60 km/h",
              snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
            },
          ],
        });
      }
    }, 350);
  };

  const routeCoordinates = results ? results.timeline.map((t) => [t.lat, t.lng]) : [];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Search Header */}
      <div className="border-b border-[#1e2a3a] px-6 py-6 bg-[#111823]">
        <div className="max-w-4xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 mb-1">
            <Car className="h-4 w-4" />
            <span>MANDATORY TEST CASE • STATEWIDE ANPR TRAJECTORY RECONSTRUCTION</span>
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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Number Plate (e.g. GJ-05-AB-1234)"
                className="w-full bg-[#0a0e14] border border-[#1e2a3a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-blue-500 tracking-wider transition-colors"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={searching}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <Search className="h-4 w-4" />
              {searching ? "Tracing Route..." : "Track Trajectory"}
            </button>
          </div>

          {/* Quick Demo Test Buttons */}
          <div className="mt-3 flex items-center gap-2 text-xs text-[#7d8da3]">
            <span>Quick Test Cases:</span>
            <button
              onClick={() => {
                setQuery("GJ-05-AB-1234");
                handleSearch("GJ-05-AB-1234");
              }}
              className="px-2 py-0.5 rounded bg-[#0a0e14] border border-red-500/30 text-red-400 hover:bg-red-500/10 cursor-pointer font-mono"
            >
              GJ-05-AB-1234 (Stolen Swift)
            </button>
            <button
              onClick={() => {
                setQuery("GJ-01-XY-7788");
                handleSearch("GJ-01-XY-7788");
              }}
              className="px-2 py-0.5 rounded bg-[#0a0e14] border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 cursor-pointer font-mono"
            >
              GJ-01-XY-7788 (Blacklisted Scorpio)
            </button>
          </div>
        </div>
      </div>

      {/* Trajectory Results View */}
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
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
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
              <div className="px-5 py-3.5 border-b border-[#1e2a3a] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  <span>Traversed Route on Gujarat State Network</span>
                </div>
                <span className="text-xs text-emerald-400 font-mono font-semibold">
                  {results.timeline.length} Checkpoints Correlated
                </span>
              </div>

              <div className="h-[420px] w-full relative z-0">
                <MapContainer
                  center={[22.5, 71.5]}
                  zoom={7}
                  style={{ height: "100%", width: "100%", backgroundColor: "#0a0e14" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  />

                  <Polyline
                    positions={routeCoordinates}
                    color="#3b82f6"
                    weight={4}
                    dashArray="6, 8"
                  />

                  {results.timeline.map((step) => (
                    <Marker
                      key={step.order}
                      position={[step.lat, step.lng]}
                      icon={createNumberedIcon(step.order, results.isWatchlist && step.order === results.timeline.length)}
                    >
                      <Popup>
                        <div className="p-2 text-[#0a0e14]">
                          <p className="font-bold text-xs">Step {step.order}: {step.name}</p>
                          <p className="text-[10px] text-gray-600">{step.timestamp}</p>
                          <p className="text-[10px] text-blue-600 font-bold">Confidence: {step.confidence}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>

            {/* Chronological Timeline */}
            <div className="bg-[#111823] border border-[#1e2a3a] rounded-2xl p-5 flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                Detection Chronology
              </h3>

              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {results.timeline.map((item) => (
                  <div key={item.order} className="relative pl-6 pb-2 border-l border-[#1e2a3a] last:border-0">
                    <div className="absolute -left-3 top-0 h-6 w-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center border-2 border-[#111823]">
                      {item.order}
                    </div>

                    <div className="bg-[#0a0e14] border border-[#1e2a3a] rounded-xl p-3">
                      <p className="text-xs font-bold text-white">{item.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-[#7d8da3] mt-1">
                        <Clock className="h-3 w-3" />
                        <span className="font-mono text-white">{item.timestamp}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#7d8da3] mt-2 pt-2 border-t border-[#1e2a3a]">
                        <span>Confidence: <strong className="text-emerald-400">{item.confidence}</strong></span>
                        <span>Speed: <strong className="text-white">{item.speed}</strong></span>
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
                <p className="text-gray-500 uppercase font-semibold text-[10px]">Registration Plate</p>
                <p className="text-base font-black font-mono text-blue-900">{results.plate}</p>
              </div>
              <div>
                <p className="text-gray-500 uppercase font-semibold text-[10px]">Vehicle Classification</p>
                <p className="text-xs font-bold text-gray-900">{results.model}</p>
              </div>
              <div>
                <p className="text-gray-500 uppercase font-semibold text-[10px]">Registry Status</p>
                <p className="text-xs font-bold text-red-600">{results.category}</p>
              </div>
              <div>
                <p className="text-gray-500 uppercase font-semibold text-[10px]">Total Checkpoints Correlated</p>
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
            <div className="border-t pt-4 text-[10px] text-gray-500 space-y-1">
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
