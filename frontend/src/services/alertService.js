import { supabase } from "./supabase";
import { INITIAL_ALERTS } from "../data/alertsData";

const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || "http://127.0.0.1:8000";

export const alertService = {
  /**
   * Fetches real-time ANPR and security alerts.
   * Tries: 1) Backend API Proxy, 2) Supabase client, 3) High-fidelity Gujarat Police Alerts dataset.
   */
  async getAlerts() {
    let alerts = null;

    // 1. Backend API Proxy (service-role authenticated)
    try {
      const res = await fetch(`${BACKEND_URL}/api/alerts`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          alerts = json;
        }
      }
    } catch (e) {
      // Backend offline or unreachable
    }

    // 2. Direct Supabase Query
    if (!alerts) {
      try {
        const { data } = await supabase
          .from("alerts")
          .select("*, cameras(name, city)")
          .order("created_at", { ascending: false });
        if (data && data.length > 0) {
          alerts = data;
        }
      } catch (e) {}
    }

    // 3. High-fidelity Gujarat Police Alerts Dataset
    if (!alerts || alerts.length === 0) {
      alerts = INITIAL_ALERTS;
    }

    // Merge status overrides from local persistence
    try {
      const overrides = JSON.parse(localStorage.getItem("sentinel_alert_status_overrides") || "{}");
      alerts = alerts.map((a) => (overrides[a.id] ? { ...a, status: overrides[a.id] } : a));
    } catch (e) {}

    return { data: alerts, error: null };
  },

  /**
   * Updates the workflow status of an alert (pending, acknowledged, resolved, dismissed).
   */
  async updateStatus(alertId, newStatus) {
    // 1. LocalStorage persistence
    try {
      const overrides = JSON.parse(localStorage.getItem("sentinel_alert_status_overrides") || "{}");
      overrides[alertId] = newStatus;
      localStorage.setItem("sentinel_alert_status_overrides", JSON.stringify(overrides));
    } catch (e) {}

    // 2. Sync to Backend API
    try {
      await fetch(`${BACKEND_URL}/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (e) {}

    // 3. Sync to Supabase
    try {
      await supabase.from("alerts").update({ status: newStatus }).eq("id", alertId);
    } catch (e) {}

    return { data: { id: alertId, status: newStatus }, error: null };
  },

  /**
   * Subscribes to real-time incoming alerts via Supabase realtime.
   */
  subscribeAlerts(callback) {
    return supabase
      .channel("realtime-alerts-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        (payload) => callback(payload)
      )
      .subscribe();
  },
};

