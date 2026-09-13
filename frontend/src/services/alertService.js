import { supabase } from "./supabase";

export const alertService = {
  /**
   * Fetches real-time ANPR and security alerts.
   */
  async getAlerts() {
    try {
      const { data, error } = await supabase
        .from("alerts")
        .select("*, cameras(name, city)")
        .order("created_at", { ascending: false });
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /**
   * Updates the workflow status of an alert (pending, acknowledged, resolved, dismissed).
   */
  async updateStatus(alertId, newStatus) {
    try {
      const { data, error } = await supabase
        .from("alerts")
        .update({ status: newStatus })
        .eq("id", alertId);
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
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
