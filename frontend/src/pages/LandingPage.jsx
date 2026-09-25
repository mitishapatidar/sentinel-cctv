import React from "react";
import { Shield, Eye, Database, Radio, CheckCircle, AlertTriangle, ArrowRight, Lock, MapPin, Phone, Mail, FileText, Car, Building2, Landmark, Anchor } from "lucide-react";

const DEPARTMENTS = [
  {
    title: "Gujarat Police (City & Highway Surveillance)",
    nodes: "28,400 Nodes",
    desc: "Integrated city surveillance mesh, 24x7 ANPR hotlist scanners, traffic junction PTZ cameras, and PCR van dispatch link across 33 districts.",
    coverage: "Ahmedabad, Gandhinagar, Surat, Vadodara, Rajkot",
    icon: Shield,
  },
  {
    title: "Traffic & RTO (Speed & ANPR Corridors)",
    nodes: "19,200 Nodes",
    desc: "National & State Highway automated speed violation detection, FASTag integration, electronic toll nakas, and overload freight enforcement.",
    coverage: "NE-1 Expressway, NH-48, SG Highway, Ring Roads",
    icon: Car,
  },
  {
    title: "Civil Supplies & Warehousing (PDS Depot Security)",
    nodes: "12,100 Nodes",
    desc: "Food grain warehouses, essential supplies distribution depots, anti-diversion vigilance, and state-backed transport trucks tracking.",
    coverage: "PDS Supply Depots, State Freight Terminals",
    icon: Building2,
  },
  {
    title: "Smart Cities / Municipal Corporations (AMC, SMC, VMC)",
    nodes: "14,300 Nodes",
    desc: "Unified municipal corporation surveillance, public transport BRTS/Metro corridors, waste management centers, and civic hubs.",
    coverage: "Ahmedabad (AMC), Surat (SMC), Vadodara (VMC)",
    icon: Landmark,
  },
  {
    title: "Border & Coastal Security (Kutch, Jamnagar, Dwarka)",
    nodes: "6,000 Nodes",
    desc: "Marine police checkpoints, coastal highway checkpoints, international border security gates, and port peripheral surveillance.",
    coverage: "Rann of Kutch, Okha, Kandla, Mundra Coastal Belt",
    icon: Anchor,
  },
];

export default function LandingPage({ onEnterLogin }) {
  return (
    <div className="min-h-screen bg-[#0a0e14] text-[#e6edf5] flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-[#1e2a3a] bg-[#111823]/95 backdrop-blur px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Gujarat Police Emblem Badge with Satyameva Jayate */}
          <div className="h-11 w-11 rounded-xl bg-gradient-to-b from-blue-900/60 to-blue-950/90 border border-blue-500/40 flex flex-col items-center justify-center text-blue-400 shrink-0 shadow-md shadow-blue-950/60">
            <Shield className="h-5 w-5 text-amber-400 fill-amber-400/20" />
            <span className="text-[7px] font-semibold text-amber-300/90 tracking-tighter leading-none mt-0.5">
              સત્યમેવ જયતે
            </span>
          </div>

          <div>
            {/* Top Line: Gujarati & English Police Department */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-blue-400 tracking-wide">
                ગુજરાત પોલીસ • GUJARAT POLICE
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight leading-snug">
              SENTINEL <span className="text-white/60 font-normal">—</span> Unified CCTV &amp; AI ANPR Command Grid
            </h1>

            {/* Subtitle */}
            <p className="text-[11px] sm:text-[12px] text-[#7d8da3] tracking-wide leading-none mt-0.5 hidden sm:block">
              Connecting 80,000 Heterogeneous Cameras across Municipal Corporations, Smart Cities, RTOs &amp; Police
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            30 Live Feeds Connected
          </div>
          <button
            onClick={onEnterLogin}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5" />
            Control Room Sign In
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 py-20 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-full mb-6">
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          Real-world Government CCTV Integration & Video Analytics
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Next-Gen AI Policing & <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Unified CCTV Command Center
          </span>
        </h1>

        <p className="text-base md:text-lg text-[#7d8da3] max-w-3xl mx-auto mb-10 leading-relaxed">
          Unifying 26 independent Gujarat Government departments across a 1,000 km geographic stretch.
          Bridging heterogeneous VMS systems, RTSP/HLS feeds, real-time ANPR vehicle tracking, and automated watchlist alerting for statewide public safety.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onEnterLogin}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-xl transition-all shadow-xl shadow-blue-600/30 cursor-pointer"
          >
            Launch Command Dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href="#architecture"
            className="flex items-center gap-2 bg-[#111823] hover:bg-[#16233b] border border-[#1e2a3a] text-[#7d8da3] hover:text-white font-medium px-6 py-3 rounded-xl transition-all"
          >
            <FileText className="h-4 w-4" />
            Explore Architecture Model
          </a>
        </div>
      </section>

      {/* Statewide Scale Metrics */}
      <section className="border-y border-[#1e2a3a] bg-[#111823]/50 py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-4 border border-[#1e2a3a] rounded-xl bg-[#0a0e14]">
            <p className="text-3xl font-extrabold text-blue-400 font-mono">80,000+</p>
            <p className="text-xs text-[#7d8da3] uppercase tracking-wider mt-1">Target Statewide Cameras</p>
          </div>
          <div className="p-4 border border-[#1e2a3a] rounded-xl bg-[#0a0e14]">
            <p className="text-3xl font-extrabold text-emerald-400 font-mono">26</p>
            <p className="text-xs text-[#7d8da3] uppercase tracking-wider mt-1">Government Departments</p>
          </div>
          <div className="p-4 border border-[#1e2a3a] rounded-xl bg-[#0a0e14]">
            <p className="text-3xl font-extrabold text-amber-400 font-mono">&lt; 1.2s</p>
            <p className="text-xs text-[#7d8da3] uppercase tracking-wider mt-1">Realtime ANPR Latency</p>
          </div>
          <div className="p-4 border border-[#1e2a3a] rounded-xl bg-[#0a0e14]">
            <p className="text-3xl font-extrabold text-purple-400 font-mono">1,000 km</p>
            <p className="text-xs text-[#7d8da3] uppercase tracking-wider mt-1">Geographic Dispersion</p>
          </div>
        </div>
      </section>

      {/* Inter-Departmental Node Breakdown (5 Statewide Pillars) */}
      <section className="py-14 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEPARTMENTS.map((dept, idx) => {
            const IconComponent = dept.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#111823] border border-[#1e2a3a] hover:border-blue-500/40 transition-all flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Active
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-4 leading-snug">
                    {dept.title}
                  </h3>
                  <p className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono mt-1 mb-3">
                    {dept.nodes}
                  </p>
                  <p className="text-xs text-[#7d8da3] leading-relaxed mb-6">
                    {dept.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-[#1e2a3a]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#5c6b86]">
                    Key Coverage:
                  </p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-[#cad5e2] mt-0.5">
                    {dept.coverage}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Core Capabilities */}
      <section id="architecture" className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Model 1 + Model 2 Hybrid Architecture</h2>
          <p className="text-sm text-[#7d8da3] max-w-2xl mx-auto">
            Engineered specifically for Gujarat Police statewide surveillance operations without displacing existing department VMS infrastructure.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#111823] border border-[#1e2a3a] hover:border-blue-500/50 transition-all">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-5">
              <MapPin className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">GIS Centralised Registry</h3>
            <p className="text-xs text-[#7d8da3] leading-relaxed">
              PostGIS-backed spatial mapping of all camera assets across municipal corporations, highways, and police stations with coverage gap analysis.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#111823] border border-[#1e2a3a] hover:border-emerald-500/50 transition-all">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5">
              <Eye className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Unified Multi-VMS Viewer</h3>
            <p className="text-xs text-[#7d8da3] leading-relaxed">
              Seamless HLS and WebRTC low-latency streaming pipeline consolidating feeds from 30 live government checkpoints into a command video wall.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#111823] border border-[#1e2a3a] hover:border-purple-500/50 transition-all">
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-5">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">ANPR & Watchlist Correlation</h3>
            <p className="text-xs text-[#7d8da3] leading-relaxed">
              Live automated cross-referencing against eGujCop, VAHAN, and stolen vehicle registries with instant WebSocket alert dispatching.
            </p>
          </div>
        </div>
      </section>

      {/* Contact & Command Center */}
      <section className="py-8 px-6 bg-[#111823]/40 border-t border-[#1e2a3a]">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-3 text-white">
            <MapPin className="h-4 w-4 text-blue-400 shrink-0" />
            <span>State CCTV Surveillance Hub, Sector-18, Gandhinagar</span>
          </div>
          <div className="flex items-center gap-3 text-white">
            <Phone className="h-4 w-4 text-blue-400 shrink-0" />
            <span>+91 79 2325 0000 / 1800-000-0000</span>
          </div>
          <div className="flex items-center gap-3 text-white">
            <Mail className="h-4 w-4 text-blue-400 shrink-0" />
            <span>controlroom.demo@sentinel-cctv.in</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#1e2a3a] py-6 px-6 text-center text-xs text-[#7d8da3]">
        SENTINEL Unified CCTV Platform • State Crime Record Bureau (SCRB), Gandhinagar • Gujarat Police
      </footer>
    </div>
  );
}
