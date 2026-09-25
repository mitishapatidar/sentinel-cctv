import { supabase } from "./supabase";

export const AUDIT_LOGGING_ENABLED = import.meta.env.VITE_AUDIT_LOGGING === "on";

// Officer attached to every audit event; set on login, cleared on logout.
let currentActor = { operator: "anonymous", role: null };

export const auditService = {
  setActor(user) {
    currentActor = user?.email
      ? { operator: user.email, role: user.role || null }
      : { operator: "anonymous", role: null };
  },

  /**
   * Records an operator action for the current officer. Never throws, so logging can't break the UI.
   */
  log(action, target, status = "RECORDED") {
    return this.logEvent({ ...currentActor, action, target, status });
  },

  /**
   * Fetches official police officer interaction and access audit logs.
   */
  async getAuditLogs() {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(200);
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /**
   * Records a security access or query event into the immutable audit trail.
   */
  async logEvent(eventData) {
    // Paused during development to keep the table clean; set VITE_AUDIT_LOGGING=on to re-enable
    if (!AUDIT_LOGGING_ENABLED) return { data: null, error: null };
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .insert([
          {
            timestamp: new Date().toISOString(),
            ...eventData,
          },
        ]);
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },
};
