import { supabase } from "./supabase";
import { INITIAL_CAMERAS } from "../data/camerasData";

export const cameraService = {
  /**
   * Fetches all registered CCTV cameras from Supabase, falling back to INITIAL_CAMERAS.
   */
  async getCameras() {
    try {
      const { data, error } = await supabase.from("cameras").select("*");
      if (!error && data && data.length > 0) {
        return { cameras: data, error: null };
      }
      return { cameras: INITIAL_CAMERAS, error: null };
    } catch (err) {
      console.warn("Using offline cameras dataset fallback:", err);
      return { cameras: INITIAL_CAMERAS, error: err };
    }
  },

  /**
   * Updates camera operational status.
   */
  async updateStatus(cameraId, newStatus) {
    try {
      const { data, error } = await supabase
        .from("cameras")
        .update({ status: newStatus })
        .eq("id", cameraId);
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /**
   * Registers a new camera into the centralized registry.
   */
  async registerCamera(cameraData) {
    try {
      const { data, error } = await supabase
        .from("cameras")
        .insert([cameraData]);
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },
};
