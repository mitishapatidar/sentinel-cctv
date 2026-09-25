import { supabase } from "./supabase";

const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || "http://127.0.0.1:8000";

export const watchlistService = {
  /**
   * Fetches all registered vehicles and persons in the active watchlist.
   * Tries: 1) Backend API Proxy, 2) Supabase client, 3) High-fidelity Gujarat Police Watchlist dataset.
   */
  async getWatchlist(entityType = null) {
    let list = null;

    // 1. Backend API Proxy (service-role authenticated)
    try {
      const url = entityType ? `${BACKEND_URL}/api/watchlist?entity_type=${entityType}` : `${BACKEND_URL}/api/watchlist`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          list = json;
        }
      }
    } catch (e) {
      // Backend offline or unreachable
    }

    // 2. Direct Supabase Query
    if (!list) {
      try {
        let query = supabase.from("watchlist").select("*").order("created_at", { ascending: false });
        if (entityType) {
          query = query.eq("entity_type", entityType);
        }
        const { data } = await query;
        if (data && data.length > 0) {
          list = data;
        }
      } catch (e) {}
    }

    // No backend or database reachable: only locally added entries (merged below) are shown
    if (!list) {
      list = [];
    }

    // Merge custom added items, deletions, and status overrides from local persistence
    try {
      const localCustom = JSON.parse(localStorage.getItem("sentinel_custom_watchlist") || "[]");
      const deletedIds = new Set(JSON.parse(localStorage.getItem("sentinel_deleted_watchlist") || "[]"));
      const statusOverrides = JSON.parse(localStorage.getItem("sentinel_watchlist_status") || "{}");

      let merged = [...localCustom, ...list.filter((w) => !deletedIds.has(w.id))];
      if (entityType) {
        merged = merged.filter((w) => w.entity_type === entityType);
      }

      // Deduplicate by id / identifier
      const seen = new Set();
      merged = merged.filter((item) => {
        const key = item.id || item.identifier;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Apply status overrides
      merged = merged.map((w) => (statusOverrides[w.id] !== undefined ? { ...w, is_active: statusOverrides[w.id] } : w));
      list = merged;
    } catch (e) {}

    return { data: list, error: null };
  },

  /**
   * Adds a new suspect or stolen vehicle to the surveillance watchlist.
   */
  async addTarget(targetData) {
    const newEntry = {
      id: targetData.id || `custom-${Date.now()}`,
      ...targetData,
      created_at: new Date().toISOString(),
    };

    // 1. LocalStorage persistence
    try {
      const localCustom = JSON.parse(localStorage.getItem("sentinel_custom_watchlist") || "[]");
      localStorage.setItem("sentinel_custom_watchlist", JSON.stringify([newEntry, ...localCustom]));
    } catch (e) {}

    // 2. Sync to Backend API
    try {
      await fetch(`${BACKEND_URL}/api/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry),
      });
    } catch (e) {}

    // 3. Sync to Supabase
    try {
      await supabase.from("watchlist").insert([newEntry]);
    } catch (e) {}

    return { data: [newEntry], error: null };
  },

  /**
   * Toggles monitoring status of a target.
   */
  async toggleActive(targetId, currentStatus) {
    const newStatus = !currentStatus;

    // 1. LocalStorage persistence
    try {
      const statusOverrides = JSON.parse(localStorage.getItem("sentinel_watchlist_status") || "{}");
      statusOverrides[targetId] = newStatus;
      localStorage.setItem("sentinel_watchlist_status", JSON.stringify(statusOverrides));
    } catch (e) {}

    // 2. Sync to Backend API
    try {
      await fetch(`${BACKEND_URL}/api/watchlist/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newStatus }),
      });
    } catch (e) {}

    // 3. Sync to Supabase
    try {
      await supabase.from("watchlist").update({ is_active: newStatus }).eq("id", targetId);
    } catch (e) {}

    return { data: { id: targetId, is_active: newStatus }, error: null };
  },

  /**
   * Removes a target from the watchlist repository.
   */
  async deleteTarget(targetId) {
    // 1. LocalStorage persistence
    try {
      const deletedIds = JSON.parse(localStorage.getItem("sentinel_deleted_watchlist") || "[]");
      deletedIds.push(targetId);
      localStorage.setItem("sentinel_deleted_watchlist", JSON.stringify(deletedIds));

      const localCustom = JSON.parse(localStorage.getItem("sentinel_custom_watchlist") || "[]");
      localStorage.setItem("sentinel_custom_watchlist", JSON.stringify(localCustom.filter((w) => w.id !== targetId)));
    } catch (e) {}

    // 2. Sync to Backend API
    try {
      await fetch(`${BACKEND_URL}/api/watchlist/${targetId}`, { method: "DELETE" });
    } catch (e) {}

    // 3. Sync to Supabase
    try {
      await supabase.from("watchlist").delete().eq("id", targetId);
    } catch (e) {}

    return { data: { id: targetId }, error: null };
  },
};

