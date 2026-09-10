import React from "react";
import { ShieldAlert, ArrowLeft, Lock } from "lucide-react";

export default function ForbiddenPage({ onBackToLogin }) {
  return (
    <div className="min-h-screen bg-[#0a0e14] text-[#e6edf5] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md bg-[#111823] border border-red-500/30 rounded-2xl p-8 shadow-2xl shadow-red-900/20">
        <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mx-auto mb-6">
          <ShieldAlert className="h-10 w-10" />
        </div>

        <span className="text-xs font-mono font-bold uppercase tracking-widest text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/30">
          403 Access Forbidden
        </span>

        <h2 className="text-2xl font-bold text-white mt-4 mb-2">Unauthorized Command Level</h2>
        <p className="text-xs text-[#7d8da3] leading-relaxed mb-6">
          Security Alert: Your biometric/credential clearance does not match the clearance matrix for this departmental CCTV sector. All unauthorized access attempts are logged under <strong>IPC Section 66 / DPDP Compliance Audit</strong>.
        </p>

        <div className="p-3 bg-[#0a0e14] border border-[#1e2a3a] rounded-xl text-left text-xs font-mono text-[#7d8da3] mb-6 space-y-1">
          <div><strong className="text-white">IP Recorded:</strong> 103.250.160.xxx</div>
          <div><strong className="text-white">Reason:</strong> Role clearance insufficient</div>
          <div><strong className="text-white">Audit Event:</strong> #SEC-AUTH-FAILED-991</div>
        </div>

        <button
          onClick={onBackToLogin}
          className="w-full flex items-center justify-center gap-2 bg-[#1e2a3a] hover:bg-[#28384f] text-white text-xs font-semibold py-3 rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Secure Login
        </button>
      </div>
    </div>
  );
}
