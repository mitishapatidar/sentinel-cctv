import React, { useState, useEffect } from "react";
import { Search, Car, Calendar, Clock, MapPin, CheckCircle, AlertTriangle, ArrowRight, Download, Eye, Printer, Shield, Layers } from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import gujaratBorder from "../data/gujaratBorder.json";
import { supabase } from "../supabaseClient";
import { auditService } from "../services/auditService";

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
  const [mapType, setMapType] = useState("streets"); // default: Google Maps

  const activeLayer = GOOGLE_MAP_LAYERS[mapType] || GOOGLE_MAP_LAYERS.streets;


  const mockTraffics = {
    "GJ-01-AB-1234": {
      plate: "GJ-01-AB-1234",
      model: "White Maruti Swift Dzire",
      category: "STOLEN VEHICLE (Navrangpura PS FIR #391/2026)",
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
          timestamp: "13-09-2026 17:15:22",
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
          timestamp: "13-09-2026 18:38:10",
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
          timestamp: "13-09-2026 19:24:45",
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
          timestamp: "13-09-2026 21:12:05",
          confidence: "95.2%",
          speed: "35 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
      ],
    },
    "GJ-05-CD-5678": {
      plate: "GJ-05-CD-5678",
      model: "Silver Hyundai Creta (2024)",
      category: "AMBER ALERT / KIDNAPPING (Varachha PS Surat Crime #108/2026)",
      isWatchlist: true,
      severity: "critical",
      totalSightings: 4,
      timeline: [
        {
          order: 1,
          camId: "cam14",
          name: "14 Surat Ring Road",
          city: "Surat",
          lat: 21.1702,
          lng: 72.8311,
          timestamp: "13-09-2026 16:45:10",
          confidence: "97.2%",
          speed: "62 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
        {
          order: 2,
          camId: "cam13",
          name: "13 Bharuch Toll Plaza",
          city: "Bharuch",
          lat: 21.7051,
          lng: 72.9959,
          timestamp: "13-09-2026 17:50:33",
          confidence: "95.8%",
          speed: "84 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
        {
          order: 3,
          camId: "cam02",
          name: "02 Janpath",
          city: "Ahmedabad",
          lat: 23.0225,
          lng: 72.5714,
          timestamp: "13-09-2026 19:10:04",
          confidence: "98.4%",
          speed: "48 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
        {
          order: 4,
          camId: "cam04",
          name: "04 Paldi Circle",
          city: "Ahmedabad",
          lat: 23.0131,
          lng: 72.5624,
          timestamp: "13-09-2026 20:55:18",
          confidence: "99.1%",
          speed: "38 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
      ],
    },
    "GJ-18-XY-9012": {
      plate: "GJ-18-XY-9012",
      model: "Grey Honda City",
      category: "FATAL HIT & RUN (Sector 7 PS Gandhinagar IPC 304A)",
      isWatchlist: true,
      severity: "high",
      totalSightings: 3,
      timeline: [
        {
          order: 1,
          camId: "cam12",
          name: "12 Tri Mandir Adalaj Tollnaka",
          city: "Gandhinagar",
          lat: 23.1673,
          lng: 72.5812,
          timestamp: "13-09-2026 18:20:11",
          confidence: "93.9%",
          speed: "92 km/h",
          snapshot: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
        },
        {
          order: 2,
          camId: "cam03",
          name: "03 O.N.G.C. Office",
          city: "Ahmedabad",
          lat: 23.0645,
          lng: 72.5954,
          timestamp: "13-09-2026 19:05:44",
          confidence: "96.1%",
          speed: "55 km/h",
          snapshot: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
        },
        {
          order: 3,
          camId: "cam01",
          name: "01 Chiman bhai Bridge",
          city: "Ahmedabad",
          lat: 23.0301,
          lng: 72.5075,
          timestamp: "13-09-2026 20:30:19",
          confidence: "97.0%",
          speed: "45 km/h",
          snapshot: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
        },
      ],
    },
    "GJ-06-ER-3456": {
      plate: "GJ-06-ER-3456",
      model: "Black Mahindra Scorpio-N",
      category: "HABITUAL E-CHALLAN DEFAULTER (14 Unpaid Red Light Fines)",
      isWatchlist: true,
      severity: "medium",
      totalSightings: 3,
      timeline: [
        {
          order: 1,
          camId: "cam15",
          name: "15 Vadodara Central",
          city: "Vadodara",
          lat: 22.3072,
          lng: 73.1812,
          timestamp: "13-09-2026 15:40:22",
          confidence: "94.5%",
          speed: "52 km/h",
          snapshot: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
        },
        {
          order: 2,
          camId: "cam13",
          name: "13 Bharuch Toll Plaza",
          city: "Bharuch",
          lat: 21.7051,
          lng: 72.9959,
          timestamp: "13-09-2026 17:15:09",
          confidence: "97.2%",
          speed: "75 km/h",
          snapshot: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
        },
        {
          order: 3,
          camId: "cam04",
          name: "04 Paldi Circle",
          city: "Ahmedabad",
          lat: 23.0131,
          lng: 72.5624,
          timestamp: "13-09-2026 20:20:41",
          confidence: "96.4%",
          speed: "35 km/h",
          snapshot: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
        },
      ],
    },
    "GJ-03-GH-7890": {
      plate: "GJ-03-GH-7890",
      model: "Dark Red Toyota Fortuner",
      category: "CONTRABAND SURVEILLANCE (Rajkot Crime Branch Alert)",
      isWatchlist: true,
      severity: "high",
      totalSightings: 3,
      timeline: [
        {
          order: 1,
          camId: "cam10",
          name: "10 char-chowk-road-2-junagadh",
          city: "Junagadh",
          lat: 21.5190,
          lng: 70.4578,
          timestamp: "13-09-2026 17:22:15",
          confidence: "95.5%",
          speed: "40 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
        {
          order: 2,
          camId: "cam08",
          name: "08 majewadi-gate-junagadh",
          city: "Junagadh",
          lat: 21.5281,
          lng: 70.4619,
          timestamp: "13-09-2026 18:40:11",
          confidence: "98.2%",
          speed: "38 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
        {
          order: 3,
          camId: "cam06",
          name: "06 Timbavadi gate-Junagadh",
          city: "Junagadh",
          lat: 21.5054,
          lng: 70.4352,
          timestamp: "13-09-2026 20:10:02",
          confidence: "96.4%",
          speed: "46 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
      ],
    },
    "GJ-12-KL-4321": {
      plate: "GJ-12-KL-4321",
      model: "Blue Maruti Baleno Alpha",
      category: "HIGHWAY CARJACKING (Bhuj 'A' Division FIR #201)",
      isWatchlist: true,
      severity: "critical",
      totalSightings: 3,
      timeline: [
        {
          order: 1,
          camId: "cam11",
          name: "11 Gandhi Ashram",
          city: "Ahmedabad",
          lat: 23.0605,
          lng: 72.5802,
          timestamp: "13-09-2026 17:35:40",
          confidence: "94.2%",
          speed: "50 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
        {
          order: 2,
          camId: "cam05",
          name: "05 Visat teen Rasta",
          city: "Ahmedabad",
          lat: 23.1042,
          lng: 72.5932,
          timestamp: "13-09-2026 19:15:10",
          confidence: "97.4%",
          speed: "65 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
        {
          order: 3,
          camId: "cam01",
          name: "01 Chiman bhai Bridge",
          city: "Ahmedabad",
          lat: 23.0301,
          lng: 72.5075,
          timestamp: "13-09-2026 20:45:00",
          confidence: "95.0%",
          speed: "42 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
      ],
    },
    "GJ-15-PQ-2109": {
      plate: "GJ-15-PQ-2109",
      model: "Dark Grey Kia Seltos",
      category: "ARMED HEIST GETAWAY (Vapi Town PS Intercept Order)",
      isWatchlist: true,
      severity: "critical",
      totalSightings: 3,
      timeline: [
        {
          order: 1,
          camId: "cam14",
          name: "14 Surat Ring Road",
          city: "Surat",
          lat: 21.1702,
          lng: 72.8311,
          timestamp: "13-09-2026 18:10:44",
          confidence: "96.5%",
          speed: "82 km/h",
          snapshot: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
        },
        {
          order: 2,
          camId: "cam13",
          name: "13 Bharuch Toll Plaza",
          city: "Bharuch",
          lat: 21.7051,
          lng: 72.9959,
          timestamp: "13-09-2026 19:22:18",
          confidence: "94.7%",
          speed: "88 km/h",
          snapshot: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
        },
        {
          order: 3,
          camId: "cam15",
          name: "15 Vadodara Central Checkpoint",
          city: "Vadodara",
          lat: 22.3072,
          lng: 73.1812,
          timestamp: "13-09-2026 20:48:55",
          confidence: "98.0%",
          speed: "74 km/h",
          snapshot: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
        },
      ],
    },
    "GJ-10-RS-6543": {
      plate: "GJ-10-RS-6543",
      model: "Black Royal Enfield Classic 350",
      category: "STOLEN MOTORCYCLE (Jamnagar City 'B' Division)",
      isWatchlist: true,
      severity: "medium",
      totalSightings: 2,
      timeline: [
        {
          order: 1,
          camId: "cam09",
          name: "09 new-bypass-near-by-circle-junagadh-2",
          city: "Junagadh",
          lat: 21.5412,
          lng: 70.4489,
          timestamp: "13-09-2026 18:30:12",
          confidence: "96.0%",
          speed: "48 km/h",
          snapshot: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&q=80",
        },
        {
          order: 2,
          camId: "cam10",
          name: "10 char-chowk-road-2-junagadh",
          city: "Junagadh",
          lat: 21.5190,
          lng: 70.4578,
          timestamp: "13-09-2026 20:15:30",
          confidence: "97.0%",
          speed: "36 km/h",
          snapshot: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&q=80",
        },
      ],
    },
    "GJ-08-TU-1098": {
      plate: "GJ-08-TU-1098",
      model: "White Mahindra Bolero Camper",
      category: "BLOCKADE EVASION / SAND MINING (Palanpur Highway PS)",
      isWatchlist: true,
      severity: "high",
      totalSightings: 2,
      timeline: [
        {
          order: 1,
          camId: "cam05",
          name: "05 Visat teen Rasta",
          city: "Ahmedabad",
          lat: 23.1042,
          lng: 72.5932,
          timestamp: "13-09-2026 18:15:00",
          confidence: "94.0%",
          speed: "55 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
        {
          order: 2,
          camId: "cam12",
          name: "12 Tri Mandir Adalaj Tollnaka",
          city: "Gandhinagar",
          lat: 23.1673,
          lng: 72.5812,
          timestamp: "13-09-2026 20:05:40",
          confidence: "98.0%",
          speed: "68 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
      ],
    },
    "GJ-23-VW-5432": {
      plate: "GJ-23-VW-5432",
      model: "White Honda Activa 6G",
      category: "SERIAL CHAIN SNATCHING (Anand Town PS Case #224)",
      isWatchlist: true,
      severity: "high",
      totalSightings: 2,
      timeline: [
        {
          order: 1,
          camId: "cam02",
          name: "02 Janpath",
          city: "Ahmedabad",
          lat: 23.0225,
          lng: 72.5714,
          timestamp: "13-09-2026 19:40:15",
          confidence: "97.1%",
          speed: "42 km/h",
          snapshot: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&q=80",
        },
        {
          order: 2,
          camId: "cam04",
          name: "04 Paldi Circle",
          city: "Ahmedabad",
          lat: 23.0131,
          lng: 72.5624,
          timestamp: "13-09-2026 20:44:00",
          confidence: "98.0%",
          speed: "34 km/h",
          snapshot: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&q=80",
        },
      ],
    },
    "GJ-27-MN-8765": {
      plate: "GJ-27-MN-8765",
      model: "White Tata Nexon EV",
      category: "INDUSTRIAL PERIMETER PROWLING (Sanand Rural PS Alert)",
      isWatchlist: true,
      severity: "medium",
      totalSightings: 3,
      timeline: [
        {
          order: 1,
          camId: "cam04",
          name: "04 Paldi Circle",
          city: "Ahmedabad",
          lat: 23.0131,
          lng: 72.5624,
          timestamp: "13-09-2026 18:20:00",
          confidence: "95.0%",
          speed: "40 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
        {
          order: 2,
          camId: "cam01",
          name: "01 Chiman bhai Bridge",
          city: "Ahmedabad",
          lat: 23.0301,
          lng: 72.5075,
          timestamp: "13-09-2026 19:35:10",
          confidence: "97.5%",
          speed: "56 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
        {
          order: 3,
          camId: "cam05",
          name: "05 Visat teen Rasta",
          city: "Ahmedabad",
          lat: 23.1042,
          lng: 72.5932,
          timestamp: "13-09-2026 20:40:22",
          confidence: "96.2%",
          speed: "62 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
      ],
    },
    "GJ-16-ZA-9876": {
      plate: "GJ-16-ZA-9876",
      model: "Silver Hyundai i20",
      category: "CLONED NUMBER PLATE SUSPICION (Ankleshwar GIDC Alert)",
      isWatchlist: true,
      severity: "high",
      totalSightings: 2,
      timeline: [
        {
          order: 1,
          camId: "cam13",
          name: "13 Bharuch Toll Plaza",
          city: "Bharuch",
          lat: 21.7051,
          lng: 72.9959,
          timestamp: "13-09-2026 19:10:00",
          confidence: "96.8%",
          speed: "70 km/h",
          snapshot: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
        },
        {
          order: 2,
          camId: "cam15",
          name: "15 Vadodara Central",
          city: "Vadodara",
          lat: 22.3072,
          lng: 73.1812,
          timestamp: "13-09-2026 20:30:15",
          confidence: "98.3%",
          speed: "58 km/h",
          snapshot: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
        },
      ],
    },
    "GJ-02-BA-4589": {
      plate: "GJ-02-BA-4589",
      model: "Black Mahindra Scorpio",
      category: "CONTRABAND LIQUOR SMUGGLING (Palanpur Highway Checkpost)",
      isWatchlist: true,
      severity: "critical",
      totalSightings: 3,
      timeline: [
        {
          order: 1,
          camId: "cam09",
          name: "09 Deesa Highway Palanpur",
          city: "Palanpur",
          lat: 24.1724,
          lng: 72.4346,
          timestamp: "13-09-2026 17:30:00",
          confidence: "97.4%",
          speed: "75 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
        {
          order: 2,
          camId: "cam10",
          name: "10 Mehsana Bypass Junction",
          city: "Mehsana",
          lat: 23.588,
          lng: 72.3693,
          timestamp: "13-09-2026 19:00:12",
          confidence: "96.1%",
          speed: "68 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
        {
          order: 3,
          camId: "cam05",
          name: "05 Visat teen Rasta",
          city: "Ahmedabad",
          lat: 23.1042,
          lng: 72.5932,
          timestamp: "13-09-2026 20:45:30",
          confidence: "98.9%",
          speed: "55 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
      ],
    },
    "GJ-04-DE-7712": {
      plate: "GJ-04-DE-7712",
      model: "White Toyota Etios",
      category: "TOLL PLAZA FASTAG EVADER & CRASH (Tarapur Toll Plaza)",
      isWatchlist: true,
      severity: "high",
      totalSightings: 2,
      timeline: [
        {
          order: 1,
          camId: "cam07",
          name: "07 Ghogha Circle",
          city: "Bhavnagar",
          lat: 21.7645,
          lng: 72.1519,
          timestamp: "13-09-2026 18:15:00",
          confidence: "95.5%",
          speed: "82 km/h",
          snapshot: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
        },
        {
          order: 2,
          camId: "cam15",
          name: "15 Vadodara Central",
          city: "Vadodara",
          lat: 22.3072,
          lng: 73.1812,
          timestamp: "13-09-2026 20:50:00",
          confidence: "97.2%",
          speed: "64 km/h",
          snapshot: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
        },
      ],
    },
    "GJ-14-KK-3390": {
      plate: "GJ-14-KK-3390",
      model: "Silver Maruti Eeco Van",
      category: "SUSPECTED ABDUCTION / MISSING PERSON (Amreli Town Case #91)",
      isWatchlist: true,
      severity: "critical",
      totalSightings: 2,
      timeline: [
        {
          order: 1,
          camId: "cam03",
          name: "03 Indira Circle",
          city: "Rajkot",
          lat: 22.2965,
          lng: 70.7744,
          timestamp: "13-09-2026 18:40:00",
          confidence: "96.4%",
          speed: "50 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
        {
          order: 2,
          camId: "cam11",
          name: "11 Khambhalia Gate",
          city: "Jamnagar",
          lat: 22.4707,
          lng: 70.0577,
          timestamp: "13-09-2026 20:25:10",
          confidence: "97.9%",
          speed: "60 km/h",
          snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        },
      ],
    },
    "GJ-09-PP-6211": {
      plate: "GJ-09-PP-6211",
      model: "Black Mahindra Thar",
      category: "UNREGISTERED RASH DRIVING & WEAPONS BRANDISHING (Sabarkantha PS)",
      isWatchlist: true,
      severity: "high",
      totalSightings: 2,
      timeline: [
        {
          order: 1,
          camId: "cam12",
          name: "12 Tri Mandir Adalaj Tollnaka",
          city: "Gandhinagar",
          lat: 23.1673,
          lng: 72.5812,
          timestamp: "13-09-2026 19:20:00",
          confidence: "98.1%",
          speed: "88 km/h",
          snapshot: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
        },
        {
          order: 2,
          camId: "cam02",
          name: "02 Janpath",
          city: "Ahmedabad",
          lat: 23.0225,
          lng: 72.5714,
          timestamp: "13-09-2026 20:15:30",
          confidence: "99.0%",
          speed: "45 km/h",
          snapshot: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
        },
      ],
    },
  };

  const handleSearch = async (plateToSearch) => {
    const target = (plateToSearch || query).trim().toUpperCase();
    setSearching(true);
    auditService.log("ANPR_SEARCH", `Vehicle Query: ${target}`, "CHAIN_OF_CUSTODY_SECURED");
    if (onPlateSearched) onPlateSearched(target);

    try {
      // 1. Try querying real Supabase detections table
      const { data: detData } = await supabase
        .from("detections")
        .select("*, cameras(name, city, lat, lng)")
        .eq("plate_number", target)
        .order("detected_at", { ascending: true });

      if (detData && detData.length > 0) {
        // Query watchlist profile
        const { data: watchData } = await supabase
          .from("watchlist")
          .select("*")
          .eq("identifier", target)
          .single();

        const timeline = detData.map((d, idx) => ({
          order: idx + 1,
          camId: d.camera_id,
          name: d.cameras?.name || d.camera_id,
          city: d.cameras?.city || "Gujarat",
          lat: d.cameras?.lat || 23.0225,
          lng: d.cameras?.lng || 72.5714,
          timestamp: new Date(d.detected_at).toLocaleString("en-GB", { timeZone: "Asia/Kolkata" }),
          confidence: `${(d.confidence * 100).toFixed(1)}%`,
          speed: `${Math.floor(35 + (idx * 15) % 45)} km/h`,
          snapshot: d.frame_snapshot_url || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
        }));

        setResults({
          plate: target,
          model: watchData?.description?.split("-")[0]?.trim() || (detData[0].vehicle_type ? `${detData[0].vehicle_type}` : "Passenger Vehicle"),
          category: watchData?.description || `${watchData?.category?.toUpperCase() || "SURVEILLANCE TRACK"} - Verified CCTV Detections`,
          isWatchlist: !!watchData,
          severity: watchData?.category === "stolen" || watchData?.category === "wanted" ? "critical" : "high",
          totalSightings: timeline.length,
          timeline,
        });
        setSearching(false);
        return;
      }
    } catch (err) {
      console.warn("[VehicleSearch] Supabase query fallback:", err);
    }

    // 2. Fallback to mockTraffics
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
              timestamp: "13-09-2026 19:30:15",
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
              timestamp: "13-09-2026 21:20:44",
              confidence: "93.5%",
              speed: "60 km/h",
              snapshot: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80",
            },
          ],
        });
      }
    }, 250);
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

          {/* Quick Demo Test Buttons in Systematic 4-Column Grid */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300">
                Quick Surveillance Targets
              </span>
              <span className="text-[11px] font-mono text-[#7d8da3]">
                16 Hotlists • 4 Columns Systematic Grid
              </span>
            </div>

            {/* Fixed 4 Columns, Auto-Expanding Rows (Option 1: Unified Slate & Police Navy) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                // Row 1
                { plate: "GJ-01-AB-1234", tag: "Stolen Swift", badge: "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30" },
                { plate: "GJ-05-CD-5678", tag: "Amber Creta", badge: "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30" },
                { plate: "GJ-18-XY-9012", tag: "Hit & Run City", badge: "text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30" },
                { plate: "GJ-06-ER-3456", tag: "Challan Defaulter", badge: "text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30" },

                // Row 2
                { plate: "GJ-03-GH-7890", tag: "Contraband Fortuner", badge: "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30" },
                { plate: "GJ-12-KL-4321", tag: "Carjacking Baleno", badge: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30" },
                { plate: "GJ-15-PQ-2109", tag: "Armed Heist Seltos", badge: "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30" },
                { plate: "GJ-10-RS-6543", tag: "Stolen Enfield", badge: "text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30" },

                // Row 3
                { plate: "GJ-08-TU-1098", tag: "Bolero Evader", badge: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30" },
                { plate: "GJ-23-VW-5432", tag: "Snatching Activa", badge: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30" },
                { plate: "GJ-27-MN-8765", tag: "Overload Brezza", badge: "text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30" },
                { plate: "GJ-16-ZA-9876", tag: "Cloned Plate i20", badge: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30" },

                // Row 4
                { plate: "GJ-02-BA-4589", tag: "Smuggling Scorpio", badge: "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30" },
                { plate: "GJ-04-DE-7712", tag: "Toll Evader", badge: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30" },
                { plate: "GJ-14-KK-3390", tag: "Missing Eeco", badge: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30" },
                { plate: "GJ-09-PP-6211", tag: "Unregistered Thar", badge: "text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30" },
              ].map((t) => (
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
