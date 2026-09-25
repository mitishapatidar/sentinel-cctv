import React, { useState, useRef, useEffect } from "react";
import { 
  Shield, 
  Bell, 
  Radio, 
  LogOut, 
  User, 
  Menu, 
  Globe, 
  ChevronDown, 
  Check, 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  FileText, 
  Lock, 
  Award,
  Key,
  Sun,
  Moon
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { isAudioMuted, setAudioMuted } from "../utils/audioAlert";

export default function Navbar({ 
  activePage, 
  setActivePage, 
  user, 
  onUserChange,
  onLogout, 
  sidebarOpen, 
  onToggleSidebar, 
  liveCount = 30, 
  alertCount = 0 
}) {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langMenuRef = useRef(null);

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const profileMenuRef = useRef(null);

  const [audioMuted, setAudioMutedState] = useState(() => isAudioMuted());

  useEffect(() => {
    const handleMuteChange = (e) => {
      setAudioMutedState(e.detail?.muted ?? isAudioMuted());
    };
    window.addEventListener("sentinel-audio-mute-changed", handleMuteChange);
    return () => window.removeEventListener("sentinel-audio-mute-changed", handleMuteChange);
  }, []);

  const toggleAudioMute = () => {
    const next = !audioMuted;
    setAudioMutedState(next);
    setAudioMuted(next);
  };

  const handleSwitchRole = (roleKey) => {
    if (onUserChange) {
      onUserChange((prev) => ({
        ...prev,
        roleKey,
        role: roleKey === "admin" ? "Dy. Commissioner (Admin)" : "Traffic In-Charge (Operator)",
      }));
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setLangDropdownOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
        setShowLogoutConfirm(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const languageOptions = [
    { code: "en", label: "English", sub: "English" },
    { code: "gu", label: "ગુજરાતી", sub: "Gujarati" },
    { code: "hi", label: "हिन्दी", sub: "Hindi" },
  ];

  const currentLang = languageOptions.find((l) => l.code === language) || languageOptions[0];

  return (
    <header className="sticky top-0 z-30 min-h-[4.5rem] py-2 border-b border-[#1e2a3a] bg-[#111823]/95 backdrop-blur px-3 sm:px-6 flex items-center justify-between gap-3">
      {/* Brand Header */}
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
              {t("policeDept")}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight leading-snug">
            {t("projectTitle")} <span className="text-white/60 font-normal">—</span> {t("projectTitleSuffix")}
          </h1>

          {/* Subtitle */}
          <p className="text-[11px] text-[#7d8da3] tracking-wide hidden xl:block leading-none mt-0.5">
            {t("projectSubtitle")}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Compact Multi-language Dropdown (Shows current language, opens Gujarati & Hindi on click) */}
        <div className="relative" ref={langMenuRef}>
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-2 bg-[#0a0e14] hover:bg-[#16233b] border border-[#1e2a3a] px-3 py-1.5 rounded-xl text-xs text-white transition-all cursor-pointer shadow-inner"
            title="Change language / ભાષા બદલો / भाषा बदलें"
          >
            <Globe className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span className="font-semibold">{currentLang.label}</span>
            <ChevronDown className={`h-3 w-3 text-[#7d8da3] transition-transform duration-200 ${langDropdownOpen ? "rotate-180 text-blue-400" : ""}`} />
          </button>

          {/* Dropdown Menu */}
          {langDropdownOpen && (
            <div className="officer-dropdown-menu absolute right-0 mt-2 w-48 rounded-xl bg-[#111823] border-2 border-black dark:border-[#1e2a3a] shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-2.5 py-1 text-[11px] font-bold text-[#5c6b86] uppercase tracking-wider border-b border-[#1e2a3a] mb-1">
                Select Language
              </div>
              {languageOptions.map((opt) => {
                const isSelected = language === opt.code;
                return (
                  <button
                    key={opt.code}
                    onClick={() => {
                      setLanguage(opt.code);
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                      isSelected
                        ? "bg-blue-600 text-white font-bold shadow-sm"
                        : "text-[#e6edf5] hover:bg-[#1c293d] hover:text-white"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>


        {/* Audio Alert Chime Mute/Unmute Toggle */}
        <button
          onClick={toggleAudioMute}
          className={`p-2 rounded-xl border transition-all cursor-pointer ${
            audioMuted
              ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
              : "border-[#1e2a3a] bg-[#0a0e14] text-[#7d8da3] hover:text-white hover:border-blue-500/50"
          }`}
          title={audioMuted ? "Unmute Alert Chimes (Currently Muted)" : "Mute Alert Chimes (Currently Active)"}
        >
          {audioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {/* Alert notification bell */}
        <button
          onClick={() => setActivePage("alerts")}
          className="relative p-2 rounded-xl border border-[#1e2a3a] bg-[#0a0e14] text-[#7d8da3] hover:text-white hover:border-blue-500/50 transition-all cursor-pointer"
          title={t("alerts")}
        >
          <Bell className="h-4 w-4" />
          {alertCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-red-600 text-[11px] font-bold text-white flex items-center justify-center animate-pulse">
              {alertCount}
            </span>
          )}
        </button>

        {/* Unified Officer Command Profile & Logout Dropdown */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => {
              setProfileDropdownOpen(!profileDropdownOpen);
              setShowLogoutConfirm(false);
            }}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              profileDropdownOpen
                ? "border-blue-500 bg-blue-500/20 text-white shadow-lg shadow-blue-500/20"
                : "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-white"
            }`}
            title="Officer Command Profile & Options"
          >
            {/* Avatar with Live Online Status Pulse */}
            <div className="relative shrink-0">
              <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold font-mono shadow-sm border border-blue-400/40">
                {user?.roleKey === "admin" ? "DC" : "OP"}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#111823]"></span>
            </div>

            {/* Officer Details */}
            <div className="hidden md:block text-left leading-tight">
              <p className="text-xs font-bold text-white tracking-wide truncate max-w-[130px]">
                {user?.email ? user.email.split("@")[0] : t("officer")}
              </p>
              <p className="text-[11px] font-medium text-blue-400 truncate max-w-[130px]">
                {user?.role || t("adminRole")}
              </p>
            </div>

            <ChevronDown
              className={`h-3.5 w-3.5 text-blue-400 transition-transform duration-200 ${
                profileDropdownOpen ? "rotate-180 text-blue-300" : ""
              }`}
            />
          </button>

          {/* Officer Command Profile Popover Menu */}
          {profileDropdownOpen && (
            <div className="officer-dropdown-menu absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl bg-[#111823] border-2 border-black dark:border-[#1e2a3a] shadow-2xl shadow-black/80 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header: Officer ID & Security Badges */}
              <div className="p-4 border-b border-[#1e2a3a] bg-[#0d131c]">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-900 border border-blue-400/40 flex items-center justify-center text-white font-bold text-base font-mono shadow-md shrink-0">
                    {user?.roleKey === "admin" ? "DC" : "OP"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-white truncate">
                        {user?.roleKey === "admin" ? "Dy. Commissioner of Police" : "Duty Surveillance Officer"}
                      </h4>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                    </div>
                    <p className="text-[12px] text-[#7d8da3] truncate mt-0.5">{user?.email}</p>

                    {/* Badge Number & Clearance Chip */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400">
                        <Shield className="h-2.5 w-2.5" />
                        {user?.badgeId || "GP-CID-7809"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                        <Award className="h-2.5 w-2.5" />
                        CLEARANCE LEVEL 4
                      </span>
                    </div>
                  </div>
                </div>

                {/* Jurisdiction & 2FA Status */}
                <div className="mt-3 pt-2.5 border-t border-[#1e2a3a] grid grid-cols-2 gap-2 text-[11px] text-[#7d8da3]">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-[#5c6b86]">Jurisdiction</span>
                    <span className="font-semibold text-gray-300 truncate block">Gujarat Police HQ</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-[#5c6b86]">Session Security</span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5" /> CCTNS 2FA Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Role Switcher */}
              <div className="p-3 border-b border-[#1e2a3a]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#5c6b86] mb-1.5">
                  Command Role Switcher
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSwitchRole("admin")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                      user?.roleKey === "admin"
                        ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                        : "bg-[#0a0e14] text-[#7d8da3] border-[#1e2a3a] hover:text-white hover:bg-[#162130]"
                    }`}
                  >
                    <span>Admin (DC)</span>
                    {user?.roleKey === "admin" && <Check className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => handleSwitchRole("operator")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                      user?.roleKey === "operator"
                        ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                        : "bg-[#0a0e14] text-[#7d8da3] border-[#1e2a3a] hover:text-white hover:bg-[#162130]"
                    }`}
                  >
                    <span>Operator</span>
                    {user?.roleKey === "operator" && <Check className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* Display Theme Switcher (White Mode / Dark Grid) */}
              <div className="p-3 border-b border-[#1e2a3a]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#5c6b86] mb-1.5 flex items-center justify-between">
                  <span>Display Theme</span>
                  <span className="text-[10px] font-mono font-bold text-blue-500 uppercase">
                    {theme === "light" ? "White Theme Active" : "Dark Theme Active"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTheme("light")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      theme === "light"
                        ? "bg-amber-500/20 text-amber-600 border-amber-500/50 shadow-sm font-bold"
                        : "bg-[#0a0e14] text-[#7d8da3] border-[#1e2a3a] hover:text-white hover:bg-[#162130]"
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    <span>White Mode</span>
                    {theme === "light" && <Check className="h-3 w-3 text-amber-600" />}
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      theme === "dark"
                        ? "bg-blue-600 text-white border-blue-500 shadow-sm font-bold"
                        : "bg-[#0a0e14] text-[#7d8da3] border-[#1e2a3a] hover:text-white hover:bg-[#162130]"
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5 text-blue-400" />
                    <span>Dark Grid</span>
                    {theme === "dark" && <Check className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* Navigation Shortcuts */}
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    setActivePage("audit-logs");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#cad5e2] hover:text-white hover:bg-[#162130] transition-all cursor-pointer text-left"
                >
                  <ShieldAlert className="h-4 w-4 text-blue-400 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold block">Security & Audit Logs</span>
                    <span className="text-[11px] text-[#7d8da3]">Track session and surveillance history</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    setActivePage("registry");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#cad5e2] hover:text-white hover:bg-[#162130] transition-all cursor-pointer text-left"
                >
                  <FileText className="h-4 w-4 text-amber-400 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold block">Camera Registry & Nodes</span>
                    <span className="text-[11px] text-[#7d8da3]">Review 30 statewide sensor endpoints</span>
                  </div>
                </button>
              </div>

              {/* Secure Sign Out Section with Confirmation */}
              <div className="p-2.5 border-t border-[#1e2a3a] bg-[#0d131c]">
                {showLogoutConfirm ? (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl animate-in fade-in duration-150">
                    <p className="text-[12px] text-red-300 font-semibold text-center mb-2">
                      Exit Gujarat Police Command Grid?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowLogoutConfirm(false)}
                        className="logout-cancel-btn flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm text-center"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setShowLogoutConfirm(false);
                          onLogout();
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-all cursor-pointer shadow-md shadow-red-600/30"
                      >
                        Confirm Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out of Command Session</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
