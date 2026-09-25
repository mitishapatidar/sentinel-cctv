import React, { useState } from "react";
import { Shield, Lock, Mail, ArrowRight, AlertTriangle, ArrowLeft, Building, BadgeCheck, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { authService } from "../services/authService";

const DEPARTMENTS = [
  "CID Crime Branch (Criminal Pursuit & ANPR)",
  "State Command & Control Center (Gandhinagar HQ)",
  "Traffic Police Directorate (State Highway Grid)",
  "Anti-Terrorism Squad (ATS) & Coastal Security",
  "Cyber Crime Cell & Digital Forensics",
];

export default function LoginPage({ onLoginSuccess, onBackHome }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [badgeId, setBadgeId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("admin"); // Only "admin" | "operator"
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isSignUp = mode === "signup";

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setNotice("");
    setPassword("");
    setConfirmPassword("");
  };

  const fillDemoAccount = () => {
    switchMode("signin");
    setEmail(authService.demoAccount.email);
    setPassword(authService.demoAccount.password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (isSignUp) {
      if (!badgeId.trim()) {
        setError("Please enter your Police Badge / Officer ID.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const res = await authService.signUp({ email, password, badgeId, roleKey: role, department });
        if (res.error) {
          setError(res.error);
        } else if (res.needsConfirmation) {
          switchMode("signin");
          setNotice(`Account created. A verification link has been sent to ${email.trim()}. Confirm it, then sign in.`);
        } else {
          onLoginSuccess(res.profile);
        }
      } else {
        const res = await authService.signIn({ email, password });
        if (res.error) {
          setError(res.error);
        } else {
          onLoginSuccess(res.profile);
        }
      }
    } catch (err) {
      setError("Could not reach the authentication server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-[#0a0e14] border border-[#1e2a3a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors";
  const labelClass = "block font-semibold text-[#7d8da3] uppercase tracking-wider mb-1.5";

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

        {/* Sign In / Sign Up Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 mb-5 rounded-xl bg-[#0a0e14] border border-[#1e2a3a] text-xs">
          {[
            { key: "signin", label: "Sign In" },
            { key: "signup", label: "Sign Up" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => switchMode(tab.key)}
              aria-pressed={mode === tab.key}
              className={`py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                mode === tab.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-[#7d8da3] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">

          {/* Police Badge / Officer ID (sign up only) */}
          {isSignUp && (
            <div>
              <label className={labelClass}>Police Badge / Officer ID</label>
              <div className="relative">
                <BadgeCheck className="absolute left-3.5 top-3 h-4 w-4 text-[#7d8da3]" />
                <input
                  type="text"
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                  placeholder="GP-CID-7809"
                  className={`${inputClass} font-mono uppercase`}
                  required
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className={labelClass}>Officer Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#7d8da3]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@example.com"
                autoComplete="email"
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className={labelClass}>Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#7d8da3]" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? "Minimum 6 characters" : "Enter your password"}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                className={`${inputClass} pr-10 font-mono`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-2.5 text-[#7d8da3] hover:text-white cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isSignUp && (
            <>
              {/* Confirm Password */}
              <div>
                <label className={labelClass}>Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#7d8da3]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className={`${inputClass} font-mono`}
                    required
                  />
                </div>
              </div>

              {/* Access Role (RBAC) - Admin and Operator only */}
              <div>
                <label className={labelClass}>Access Role (RBAC)</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { key: "admin", label: "🛡️ Admin" },
                    { key: "operator", label: "📡 Operator" },
                  ].map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setRole(r.key)}
                      aria-pressed={role === r.key}
                      aria-label={`${r.key === "admin" ? "Admin" : "Operator"} role`}
                      className={`py-2 px-4 rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-2 ${
                        role === r.key
                          ? "bg-blue-600/20 border-blue-500 text-blue-400 font-bold shadow-sm"
                          : "bg-[#0a0e14] border-[#1e2a3a] text-[#7d8da3] hover:text-white"
                      }`}
                    >
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Department Clearance */}
              <div>
                <label className={labelClass}>Department Clearance</label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-3 h-4 w-4 text-[#7d8da3]" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-[#0a0e14] border border-[#1e2a3a] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/25 cursor-pointer text-sm"
          >
            {loading
              ? isSignUp ? "Creating Officer Account..." : "Authenticating Clearance..."
              : isSignUp ? "Create Officer Account" : "Secure Access to Statewide Grid"}
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="text-center text-[12px] text-[#7d8da3]">
            {isSignUp ? "Already have an account? " : "New officer? "}
            <button
              type="button"
              onClick={() => switchMode(isSignUp ? "signin" : "signup")}
              className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
            >
              {isSignUp ? "Sign in" : "Create an account"}
            </button>
            {!isSignUp && (
              <>
                {" • "}
                <button
                  type="button"
                  onClick={fillDemoAccount}
                  className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                >
                  Use demo account
                </button>
              </>
            )}
          </p>
        </form>

        {/* Legal Notice Box */}
        <div className="mt-5 p-3 rounded-xl bg-[#0a0e14] border border-[#1e2a3a] text-[11px] text-[#7d8da3] leading-relaxed">
          ⚖️ <strong className="text-white">LEGAL NOTICE:</strong> Restricted to authorized enforcement personnel under IT Act 2000. All terminal interactions and telemetry lookups are digitally watermarked.
        </div>
      </div>

      {/* Page Footer */}
      <footer className="text-center text-[12px] text-[#5c6b86] py-2">
        © 2026 Home Department, Government of Gujarat. SENTINEL Unified Platform.
      </footer>
    </div>
  );
}
