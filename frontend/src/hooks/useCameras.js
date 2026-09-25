import { useState, useEffect } from "react";
import { cameraService } from "../services/cameraService";
import { INITIAL_CAMERAS } from "../data/camerasData";

/**
 * Live camera registry: loads every camera once, then applies Supabase realtime inserts,
 * updates and deletes so new cameras appear on every page without a reload.
 */
export function useCameras() {
  const [cameras, setCameras] = useState(INITIAL_CAMERAS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      const { cameras: data, error: err } = await cameraService.getCameras();
      if (isMounted) {
        setCameras(data);
        setError(err);
        setLoading(false);
      }
    }

    load();

    const subscription = cameraService.subscribeCameras(({ eventType, new: row, old }) => {
      if (!isMounted) return;
      setCameras((prev) => {
        if (eventType === "DELETE") return prev.filter((c) => c.id !== old?.id);
        if (!row?.id) return prev;
        const next = cameraService.enrich(row);
        const exists = prev.some((c) => c.id === row.id);
        const updated = exists ? prev.map((c) => (c.id === row.id ? next : c)) : [...prev, next];
        return updated.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { cameras, loading, error, setCameras };
}
