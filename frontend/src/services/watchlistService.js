import { supabase } from "./supabase";

export const watchlistService = {
  /**
   * Fetches all registered vehicles and persons in the active watchlist.
   */
  async getWatchlist() {
    try {
      const { data, error } = await supabase
        .from("watchlist")
        .select("*")
        .order("created_at", { ascending: false });
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /**
   * Adds a new suspect or stolen vehicle to the surveillance watchlist.
   */
  async addTarget(targetData) {
    try {
      const { data, error } = await supabase
        .from("watchlist")
        .insert([targetData]);
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /**
   * Toggles monitoring status of a target.
   */
  async toggleActive(targetId, currentStatus) {
    try {
      const { data, error } = await supabase
        .from("watchlist")
        .update({ is_active: !currentStatus })
        .eq("id", targetId);
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /**
   * Removes a target from the watchlist repository.
   */
  async deleteTarget(targetId) {
    try {
      const { data, error } = await supabase
        .from("watchlist")
        .delete()
        .eq("id", targetId);
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },
};
