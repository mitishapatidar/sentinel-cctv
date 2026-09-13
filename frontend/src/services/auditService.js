import { supabase } from "./supabase";

export const auditService = {
  /**
   * Fetches official police officer interaction and access audit logs.
   */
  async getAuditLogs() {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false });
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /**
   * Records a security access or query event into the immutable audit trail.
   */
  async logEvent(eventData) {
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
