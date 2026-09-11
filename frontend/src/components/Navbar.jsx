import React, { useState, useRef, useEffect } from "react";
import { Shield, Bell, Radio, LogOut, User, Menu, Globe, ChevronDown, Check } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export default function Navbar({ activePage, setActivePage, user, onLogout, onToggleMobileMenu, liveCount = 30, alertCount = 3 }) {
  const { language, setLanguage, t } = useLanguage();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langMenuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setLangDropdownOpen(false);
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
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-lg bg-[#0a0e14] border border-[#1e2a3a] text-gray-400 hover:text-white cursor-pointer"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Gujarat Police Emblem Badge with Satyameva Jayate */}
        <div className="h-11 w-11 rounded-xl bg-gradient-to-b from-blue-900/60 to-blue-950/90 border border-blue-500/40 flex flex-col items-center justify-center text-blue-400 shrink-0 shadow-md shadow-blue-950/60">
          <Shield className="h-5 w-5 text-amber-400 fill-amber-400/20" />
          <span className="text-[7px] font-semibold text-amber-300/90 tracking-tighter leading-none mt-0.5">
            સત્યમેવ જયતે
          </span>
        </div>

        <div>
          {/* Top Line: Gujarati & English Police Department + Grid Badge */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-blue-400 tracking-wide">
              {t("policeDept")}
            </span>
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
              {t("gridBadge")}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight leading-snug">
            {t("projectTitle")} <span className="text-white/60 font-normal">—</span> {t("projectTitleSuffix")}
          </h1>

          {/* Subtitle */}
          <p className="text-[10px] text-[#7d8da3] tracking-wide hidden xl:block leading-none mt-0.5">
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
            <div className="absolute right-0 mt-1.5 w-36 rounded-xl bg-[#111823] border border-[#1e2a3a] shadow-2xl p-1 z-50">
              <div className="px-2.5 py-1 text-[10px] font-bold text-[#5c6b86] uppercase tracking-wider border-b border-[#1e2a3a] mb-1">
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


        {/* Alert notification bell */}
        <button
          onClick={() => setActivePage("alerts")}
          className="relative p-2 rounded-xl border border-[#1e2a3a] bg-[#0a0e14] text-[#7d8da3] hover:text-white hover:border-blue-500/50 transition-all cursor-pointer"
          title={t("alerts")}
        >
          <Bell className="h-4 w-4" />
          {alertCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
              {alertCount}
            </span>
          )}
        </button>

        {/* User profile */}
        <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10">
          <div className="h-6 w-6 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-400 text-xs font-bold font-mono">
            {user?.roleKey === "admin" ? "DC" : "OP"}
          </div>
          <div className="hidden md:block text-left leading-tight">
            <p className="text-xs font-semibold text-white">{user?.email || t("officer")}</p>
            <p className="text-[10px] text-blue-400">{user?.role || t("adminRole")}</p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={onLogout}
          title={t("signOut")}
          className="p-2 rounded-xl border border-[#1e2a3a] bg-[#0a0e14] text-[#7d8da3] hover:text-red-400 hover:border-red-500/40 transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
