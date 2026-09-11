import React, { useState, useEffect } from "react";
import { ShieldAlert, Plus, Trash2, CheckCircle2, Car, User, Search, RefreshCw } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState([]);
  const [activeTab, setActiveTab] = useState("vehicle");
  const [loading, setLoading] = useState(true);

  // Form State
  const [identifier, setIdentifier] = useState("");
  const [category, setCategory] = useState("stolen");
  const [description, setDescription] = useState("");

  const loadWatchlist = async () => {
    setLoading(true);
    const { data } = await supabase.from("watchlist").select("*").order("created_at", { ascending: false });
    if (data) {
      setWatchlist(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!identifier) return;

    const { error } = await supabase.from("watchlist").insert([
      {
        entity_type: activeTab,
        identifier: identifier.toUpperCase().trim(),
        category,
        description,
        is_active: true,
      },
    ]);

    if (!error) {
      setIdentifier("");
      setDescription("");
      loadWatchlist();
    }
  };

  const toggleActive = async (id, currentStatus) => {
    await supabase.from("watchlist").update({ is_active: !currentStatus }).eq("id", id);
    loadWatchlist();
  };

  const handleDelete = async (id) => {
    await supabase.from("watchlist").delete().eq("id", id);
    loadWatchlist();
  };

  const filteredItems = watchlist.filter((w) => w.entity_type === activeTab);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-[#1e2a3a] px-6 py-4 bg-[#111823] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Surveillance Watchlist Repository</h1>
          <p className="text-xs text-[#7d8da3] mt-0.5">Automated Cross-Referencing against eGujCop & VAHAN Databases</p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-[#0a0e14] border border-[#1e2a3a] p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("vehicle")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeTab === "vehicle" ? "bg-blue-600 text-white" : "text-[#7d8da3] hover:text-white"
            }`}
          >
            <Car className="h-3.5 w-3.5" />
            Vehicles ({watchlist.filter((w) => w.entity_type === "vehicle").length})
          </button>
          <button
            onClick={() => setActiveTab("person")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeTab === "person" ? "bg-blue-600 text-white" : "text-[#7d8da3] hover:text-white"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Persons ({watchlist.filter((w) => w.entity_type === "person").length})
          </button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Entry Form (Left) */}
        <div className="bg-[#111823] border border-[#1e2a3a] rounded-2xl p-5 shadow-xl h-fit">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-400" />
            Onboard New Watchlist Target
          </h2>

          <form onSubmit={handleAddEntry} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#7d8da3] font-semibold mb-1 uppercase tracking-wider text-[10px]">
                {activeTab === "vehicle" ? "Number Plate (e.g. GJ-01-AB-1234)" : "Full Name / Suspect Tag"}
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={activeTab === "vehicle" ? "GJ-05-AB-1234" : "Wanted Suspect Name"}
                className="w-full bg-[#0a0e14] border border-[#1e2a3a] rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-[#7d8da3] font-semibold mb-1 uppercase tracking-wider text-[10px]">
                Classification Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0a0e14] border border-[#1e2a3a] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="stolen">Stolen Vehicle (FIR Registered)</option>
                <option value="wanted">Wanted / Absconding Suspect</option>
                <option value="blacklisted">Blacklisted / Smuggling</option>
                <option value="suspicious">Suspicious / Loitering</option>
                <option value="missing">Missing Person / Tracing</option>
              </select>
            </div>

            <div>
              <label className="block text-[#7d8da3] font-semibold mb-1 uppercase tracking-wider text-[10px]">
                Case Details / Police Station FIR
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="FIR #392/2026, Varachha PS, White sedan..."
                className="w-full bg-[#0a0e14] border border-[#1e2a3a] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl cursor-pointer transition-all shadow-lg shadow-blue-600/20"
            >
              Add to Active Surveillance
            </button>
          </form>
        </div>

        {/* Watchlist Entries (Right) */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-[#7d8da3] text-xs">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto text-blue-400 mb-2" />
              Loading database watchlist...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-[#111823] border border-[#1e2a3a] rounded-2xl text-xs text-[#7d8da3]">
              No {activeTab} watchlist entries found. Add one on the left!
            </div>
          ) : (
            filteredItems.map((entry) => {
              const badgeColors = {
                stolen: "bg-red-500/15 text-red-400 border-red-500/30",
                wanted: "bg-red-500/15 text-red-400 border-red-500/30",
                blacklisted: "bg-amber-500/15 text-amber-400 border-amber-500/30",
                suspicious: "bg-blue-500/15 text-blue-400 border-blue-500/30",
              };

              return (
                <div
                  key={entry.id}
                  className="bg-[#111823] border border-[#1e2a3a] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-500/40 transition-all shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#0a0e14] border border-[#1e2a3a] flex items-center justify-center text-blue-400 shrink-0">
                      {entry.entity_type === "vehicle" ? <Car className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white tracking-wider">
                          {entry.identifier}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            badgeColors[entry.category] || badgeColors.suspicious
                          }`}
                        >
                          {entry.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#7d8da3] mt-1">{entry.description || "No specific FIR remarks provided."}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleActive(entry.id, entry.is_active)}
                      className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                        entry.is_active
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-[#0a0e14] text-[#7d8da3] border-[#1e2a3a]"
                      }`}
                    >
                      {entry.is_active ? "? Active Monitoring" : "? Inactive"}
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1.5 rounded-lg bg-[#0a0e14] text-[#7d8da3] hover:text-red-400 border border-[#1e2a3a] cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
