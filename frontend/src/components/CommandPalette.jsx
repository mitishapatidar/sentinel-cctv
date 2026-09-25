import React, { useState, useEffect, useRef } from "react";
import { Search, LayoutDashboard, Grid3x3, Car, ShieldAlert, Bell, Server, ShieldCheck, CornerDownLeft } from "lucide-react";

const PAGES = [
  { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { page: "cameras", label: "Camera Grid", icon: Grid3x3 },
  { page: "vehicle-search", label: "Vehicle Tracking", icon: Car },
  { page: "watchlist", label: "Watchlist", icon: ShieldAlert },
  { page: "alerts", label: "Live Alerts", icon: Bell },
  { page: "registry", label: "Camera Registry", icon: Server },
  { page: "audit-logs", label: "Security & Audit", icon: ShieldCheck },
];

const PLATE_PATTERN = /^[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{0,3}[-\s]?\d{3,4}$/i;

// Ctrl/Cmd+K launcher: jump to any page or track a number plate directly
export default function CommandPalette({ open, onClose, onNavigate, onTrackPlate }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const q = query.trim();
  const items = PAGES.filter((p) => p.label.toLowerCase().includes(q.toLowerCase())).map((p) => ({
    key: p.page,
    label: p.label,
    icon: p.icon,
    run: () => onNavigate(p.page),
  }));
  if (PLATE_PATTERN.test(q)) {
    items.unshift({
      key: "plate",
      label: `Track vehicle ${q.toUpperCase()}`,
      icon: Car,
      run: () => onTrackPlate(q.toUpperCase()),
    });
  }
  const active = Math.min(index, Math.max(items.length - 1, 0));

  const select = (item) => {
    if (!item) return;
    item.run();
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => (items.length ? (Math.min(i, items.length - 1) + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => (items.length ? (Math.min(i, items.length - 1) - 1 + items.length) % items.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(items[active]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2500] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-lg bg-[#111823] border border-[#1e2a3a] rounded-2xl shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#1e2a3a]">
          <Search className="h-4 w-4 text-[#7d8da3]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Go to page or type a plate (e.g. GJ-05-AB-1234)"
            aria-label="Search pages or number plate"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#7d8da3] focus:outline-none"
          />
          <kbd className="text-[12px] text-[#7d8da3] border border-[#1e2a3a] rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto py-1.5" role="listbox">
          {items.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-[#7d8da3]">No matching page</li>
          )}
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <li
                key={item.key}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setIndex(i)}
                onClick={() => select(item)}
                className={`mx-1.5 px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm cursor-pointer ${
                  i === active ? "bg-blue-600/20 text-blue-400" : "text-[#e6edf5]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {i === active && <CornerDownLeft className="h-3.5 w-3.5 opacity-70" />}
              </li>
            );
          })}
        </ul>
        <div className="px-4 py-2 border-t border-[#1e2a3a] text-[12px] text-[#7d8da3] flex gap-4">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>/ plate search</span>
        </div>
      </div>
    </div>
  );
}
