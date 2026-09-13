import React, { useState } from "react";
import { Shield, Lock, Mail, ArrowRight, AlertTriangle, ArrowLeft, Building, BadgeCheck } from "lucide-react";

export default function LoginPage({ onLoginSuccess, onTriggerForbidden, onBackHome }) {
  const [badgeId, setBadgeId] = useState("GP-CID-7809");
  const [email, setEmail] = useState("sentialcctv@gmail.com");
  const [password, setPassword] = useState("sentialofficial@1428");
  const [role, setRole] = useState("admin"); // Only "admin" | "operator"
  const [department, setDepartment] = useState("CID Crime Branch (Criminal Pursuit & ANPR)");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!badgeId || !email || !password) {
      setError("Please fill in Police Badge ID, Email, and Access Token Password.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);

      // Validate credentials:
      // Authorized Access Token Password is "sentialofficial@1428"
      const isAuthorized = password.trim() === "sentialofficial@1428";

      if (!isAuthorized) {
        // Fake person / unauthorized intruder attempt -> Redirect to 403 Forbidden!
        onTriggerForbidden();
        return;
      }

      // Authorized Police Officer
      onLoginSuccess({
        badgeId,
        email,
        department,
        role: role === "admin" ? "Dy. Commissioner (Admin)" : "Traffic In-Charge (Operator)",
        roleKey: role,
      });
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] text-[#e6edf5] flex flex-col justify-between p-4 sm:p-6 relative">
      
      {/* Top Header Bar from Government of Gujarat Home Department */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4 pb-4 border-b border-[#1e2a3a]/80">
        <div className="flex items-center gap-3">
          {/* Gujarat Police Emblem Badge with Satyameva Jayate */}
          <div className="h-11 w-11 rounded-xl bg-gradient-to-b from-blue-900/80 to-blue-950 border border-blue-500/50 flex flex-col items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-blue-950/60">
            <Shield className="h-5 w-5 text-amber-400 fill-amber-400/20" />
            <span className="text-[7px] font-bold text-amber-300/90 tracking-tighter leading-none mt-0.5">
              સત્યમેવ જયતે
            </span>
          </div>

          <div>
            <h1 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-blue-400">
              GOVERNMENT OF GUJARAT • HOME DEPARTMENT
            </h1>
            <p className="text-[11px] text-[#7d8da3] tracking-wide font-medium">
              Gujarat State Unified CCTV Grid ("SENTINEL")
            </p>
          </div>
        </div>

        <button
          onClick={onBackHome}
          className="flex items-center gap-2 text-xs font-semibold text-[#7d8da3] hover:text-white bg-[#111823] hover:bg-[#16233b] border border-[#1e2a3a] px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Public Portal</span>
        </button>
      </header>

      {/* Main Signin Card Container */}
      <div className="w-full max-w-lg mx-auto my-6 bg-[#111823] border border-[#1e2a3a] rounded-2xl p-6 sm:p-8 shadow-2xl">
        
        {/* Card Header */}
        <div className="text-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mx-auto mb-3 shadow-inner">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-wide uppercase">
            RESTRICTED LAW-ENFORCEMENT ACCESS
          </h2>
          <p className="text-xs text-[#7d8da3] mt-1">
            Officer Single Sign-On • State Emergency CCTV Surveillance
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* 1. Police Badge / Officer ID */}
          <div>
            <label className="block font-semibold text-[#7d8da3] uppercase tracking-wider mb-1.5">
              Police Badge / Officer ID
            </label>
            <div className="relative">
              <BadgeCheck className="absolute left-3.5 top-3 h-4 w-4 text-[#7d8da3]" />
              <input
                type="text"
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                placeholder="GP-CID-7809"
                className="w-full bg-[#0a0e14] border border-[#1e2a3a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* 2. Officer Registered Email */}
          <div>
            <label className="block font-semibold text-[#7d8da3] uppercase tracking-wider mb-1.5">
              Officer Registered Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#7d8da3]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sentialcctv@gmail.com"
                className="w-full bg-[#0a0e14] border border-[#1e2a3a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* 3. Access Token Password */}
          <div>
            <label className="block font-semibold text-[#7d8da3] uppercase tracking-wider mb-1.5">
              Access Token Password (XXXX-XXXX-XXXX)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#7d8da3]" />
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="sentialofficial@1428"
                className="w-full bg-[#0a0e14] border border-[#1e2a3a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* 4. Access Role (RBAC) - Admin and Operator only */}
          <div>
            <label className="block font-semibold text-[#7d8da3] uppercase tracking-wider mb-1.5">
              Access Role (RBAC)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`py-2 px-4 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-2 ${
                  role === "admin"
                    ? "bg-blue-600/20 border-blue-500 text-blue-400 font-bold shadow-sm"
                    : "bg-[#0a0e14] border-[#1e2a3a] text-[#7d8da3] hover:text-white"
                }`}
              >
                <span>🛡️ Admin</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("operator")}
                className={`py-2 px-4 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-2 ${
                  role === "operator"
                    ? "bg-blue-600/20 border-blue-500 text-blue-400 font-bold shadow-sm"
                    : "bg-[#0a0e14] border-[#1e2a3a] text-[#7d8da3] hover:text-white"
                }`}
              >
                <span>📡 Operator</span>
              </button>
            </div>
          </div>

          {/* 5. Department Clearance */}
          <div>
            <label className="block font-semibold text-[#7d8da3] uppercase tracking-wider mb-1.5">
              Department Clearance
            </label>
            <div className="relative">
              <Building className="absolute left-3.5 top-3 h-4 w-4 text-[#7d8da3]" />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-[#0a0e14] border border-[#1e2a3a] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="CID Crime Branch (Criminal Pursuit & ANPR)">
                  CID Crime Branch (Criminal Pursuit & ANPR)
                </option>
                <option value="State Command & Control Center (Gandhinagar HQ)">
                  State Command & Control Center (Gandhinagar HQ)
                </option>
                <option value="Traffic Police Directorate (State Highway Grid)">
                  Traffic Police Directorate (State Highway Grid)
                </option>
                <option value="Anti-Terrorism Squad (ATS) & Coastal Security">
                  Anti-Terrorism Squad (ATS) & Coastal Security
                </option>
                <option value="Cyber Crime Cell & Digital Forensics">
                  Cyber Crime Cell & Digital Forensics
                </option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/25 cursor-pointer text-sm"
          >
            {loading ? "Authenticating Clearance..." : "Secure Access to Statewide Grid"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Legal Notice Box */}
        <div className="mt-5 p-3 rounded-xl bg-[#0a0e14] border border-[#1e2a3a] text-[10px] text-[#7d8da3] leading-relaxed">
          ⚖️ <strong className="text-white">LEGAL NOTICE:</strong> Restricted to authorized enforcement personnel under IT Act 2000. All terminal interactions and telemetry lookups are digitally watermarked.
        </div>
      </div>

      {/* Page Footer */}
      <footer className="text-center text-[11px] text-[#5c6b86] py-2">
        © 2026 Home Department, Government of Gujarat. SENTINEL Unified Platform.
      </footer>
    </div>
  );
}
