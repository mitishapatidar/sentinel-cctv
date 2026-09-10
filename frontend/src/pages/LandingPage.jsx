import React from "react";
import { Shield, Eye, Database, Radio, CheckCircle, AlertTriangle, ArrowRight, Lock, MapPin, Phone, Mail, FileText } from "lucide-react";

export default function LandingPage({ onEnterLogin }) {
  return (
    <div className="min-h-screen bg-[#0a0e14] text-[#e6edf5] flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-[#1e2a3a] bg-[#111823]/90 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="font-bold tracking-wider text-base flex items-center gap-2">
              SENTINEL <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">GPIC 2026</span>
            </div>
            <p className="text-[11px] text-[#7d8da3]">Gujarat Police Innovation Challenge • Unified CCTV Platform</p>
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

      {/* Core Capabilities */}
      <section id="architecture" className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Model 1 + Model 2 Hybrid Architecture</h2>
          <p className="text-sm text-[#7d8da3] max-w-2xl mx-auto">
            Engineered specifically to solve the Gujarat Police Innovation Challenge requirements without displacing existing department VMS infrastructure.
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

      {/* Security & Compliance Highlight */}
      <section className="py-16 px-6 bg-[#111823]/40 border-t border-[#1e2a3a]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full mb-4">
              <Shield className="h-3.5 w-3.5" />
              Law-Enforcement Grade Security
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Built for Strict Chain of Custody & DPDP Compliance
            </h2>
            <div className="space-y-3 text-xs text-[#7d8da3]">
              <div className="flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Audit Logging:</strong> Every feed access, playback, search, and alert acknowledgement recorded in tamper-evident logs for judicial admissibility.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Role-Based Access Control (RBAC):</strong> Granular departmental isolation ensuring officers only inspect authorized surveillance sectors.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">DPDP Act 2023 Architecture:</strong> Automated data masking and tiered hot/cold retention policies protecting civil liberties.</span>
              </div>
            </div>
          </div>

          <div className="w-full md:w-80 p-6 rounded-2xl bg-[#0a0e14] border border-[#1e2a3a]">
            <p className="text-xs uppercase tracking-wider text-[#7d8da3] mb-4 font-semibold">Contact & Evaluation Center</p>
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-3 text-white">
                <MapPin className="h-4 w-4 text-blue-400" />
                <span>SCRB, Police Bhawan, Sector-18, Gandhinagar</span>
              </div>
              <div className="flex items-center gap-3 text-white">
                <Phone className="h-4 w-4 text-blue-400" />
                <span>+91 95370 89982</span>
              </div>
              <div className="flex items-center gap-3 text-white">
                <Mail className="h-4 w-4 text-blue-400" />
                <span>sentinel.hackathon@gujarat.gov.in</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#1e2a3a] py-6 px-6 text-center text-xs text-[#7d8da3]">
        SENTINEL Unified CCTV Platform • Gujarat Police Innovation Challenge 2026 • Real-world Deployment Model
      </footer>
    </div>
  );
}
