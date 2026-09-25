import { supabase } from "./supabase";
import { INITIAL_CAMERAS } from "../data/camerasData";

const PAGE_SIZE = 1000; // Supabase caps a single select at 1000 rows

const isLocalHost = () =>
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

// Registry rows keep static enrichment (camera type, vendor, IP...) from the bundled dataset when present
function enrich(row) {
  const initial = INITIAL_CAMERAS.find((c) => c.id === row.id) || {};
  return { ...initial, ...row };
}

export const cameraService = {
  /**
   * Playback URL for a camera. Locally every camera goes through the FastAPI relay, which holds the
   * gateway session; the gateway's own URLs need a login cookie the browser doesn't have.
   */
  getStreamUrl(camera) {
    if (isLocalHost()) return `http://127.0.0.1:8000/stream/${encodeURIComponent(camera.id)}/index.m3u8`;
    return camera.hls_url;
  },

  /**
   * Fetches every registered camera from Supabase (paged, so any registry size works),
   * falling back to INITIAL_CAMERAS when the table is unreachable or empty.
   */
  async getCameras() {
    try {
      const rows = [];
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from("cameras")
          .select("*")
          .order("id", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < PAGE_SIZE) break;
      }
      if (rows.length > 0) {
        return { cameras: rows.map(enrich), error: null };
      }
      return { cameras: INITIAL_CAMERAS, error: null };
    } catch (err) {
      console.warn("Using offline cameras dataset fallback:", err);
      return { cameras: INITIAL_CAMERAS, error: err };
    }
  },

  /**
   * Subscribes to camera registry changes. onChange receives { eventType, new, old } per row change.
   */
  subscribeCameras(onChange) {
    const channel = supabase
      .channel(`cameras-registry-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cameras" }, (payload) => onChange(payload))
      .subscribe();
    return { unsubscribe: () => supabase.removeChannel(channel) };
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

  enrich,
};
