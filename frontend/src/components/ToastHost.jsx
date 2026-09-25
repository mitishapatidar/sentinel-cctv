import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

const STYLES = {
  success: { icon: CheckCircle2, cls: "border-emerald-500/40 text-emerald-400" },
  error: { icon: AlertTriangle, cls: "border-red-500/40 text-red-400" },
  info: { icon: Info, cls: "border-blue-500/40 text-blue-400" },
};

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    let nextId = 0;
    const onToast = (e) => {
      const id = ++nextId;
      setToasts((prev) => [...prev.slice(-3), { id, ...e.detail }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
    };
    window.addEventListener("sentinel-toast", onToast);
    return () => window.removeEventListener("sentinel-toast", onToast);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[3000] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]" role="status" aria-live="polite">
      {toasts.map((t) => {
        const { icon: Icon, cls } = STYLES[t.type] || STYLES.info;
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 p-3 rounded-xl bg-[#111823] border shadow-2xl text-sm ${cls}`}
          >
            <Icon className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="flex-1 text-[#e6edf5]">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-[#7d8da3] hover:text-white cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
