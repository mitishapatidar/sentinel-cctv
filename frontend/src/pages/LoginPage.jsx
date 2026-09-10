import React, { useState } from "react";
import { Shield, Lock, Mail, ArrowRight, UserCheck, AlertTriangle, ArrowLeft } from "lucide-react";

export default function LoginPage({ onLoginSuccess, onTriggerForbidden, onBackHome }) {
  const [email, setEmail] = useState("patidarmitisha@gmail.com");
  const [password, setPassword] = useState("NYJF-T8U3-MHP8");
  const [role, setRole] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in both email and access credentials.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Success
      onLoginSuccess({
        email,
        role: role === "admin" ? "Dy. Commissioner (Admin)" : role === "operator" ? "Traffic In-Charge (Operator)" : "Observer (Viewer)",
        roleKey: role,
      });
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] text-[#e6edf5] flex flex-col items-center justify-center p-4 relative">
      <button
        onClick={onBackHome}
        className="absolute top-6 left-6 flex items-center gap-2 text-xs text-[#7d8da3] hover:text-white transition-all cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Public Portal
      </button>

      <div className="w-full max-w-md bg-[#111823] border border-[#1e2a3a] rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mx-auto mb-4">
            <Shield className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">SENTINEL // Control Room</h2>
          <p className="text-xs text-[#7d8da3] mt-1">Authorized Police Personnel Only</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#7d8da3] uppercase tracking-wider mb-2">
              Officer Registered Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#7d8da3]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@gujaratpolice.gov.in"
                className="w-full bg-[#0a0e14] border border-[#1e2a3a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#7d8da3] uppercase tracking-wider mb-2">
              Access Token Password (XXXX-XXXX-XXXX)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#7d8da3]" />
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="XXXX-XXXX-XXXX"
                className="w-full bg-[#0a0e14] border border-[#1e2a3a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#7d8da3] uppercase tracking-wider mb-2">
              Access Role (RBAC)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`py-2 px-3 rounded-lg text-xs font-medium border cursor-pointer transition-all ${
                  role === "admin"
                    ? "bg-blue-600/20 border-blue-500 text-blue-400 font-semibold"
                    : "bg-[#0a0e14] border-[#1e2a3a] text-[#7d8da3]"
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setRole("operator")}
                className={`py-2 px-3 rounded-lg text-xs font-medium border cursor-pointer transition-all ${
                  role === "operator"
                    ? "bg-blue-600/20 border-blue-500 text-blue-400 font-semibold"
                    : "bg-[#0a0e14] border-[#1e2a3a] text-[#7d8da3]"
                }`}
              >
                Operator
              </button>
              <button
                type="button"
                onClick={() => setRole("viewer")}
                className={`py-2 px-3 rounded-lg text-xs font-medium border cursor-pointer transition-all ${
                  role === "viewer"
                    ? "bg-blue-600/20 border-blue-500 text-blue-400 font-semibold"
                    : "bg-[#0a0e14] border-[#1e2a3a] text-[#7d8da3]"
                }`}
              >
                Viewer
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            {loading ? "Authenticating Session..." : "Enter Command Grid"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#1e2a3a] flex items-center justify-between text-xs text-[#7d8da3]">
          <span className="flex items-center gap-1">
            <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
            2FA Enforced
          </span>
          <button
            type="button"
            onClick={onTriggerForbidden}
            className="text-red-400 hover:underline cursor-pointer"
          >
            Simulate 403 Forbidden
          </button>
        </div>
      </div>
    </div>
  );
}
