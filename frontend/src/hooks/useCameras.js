import { useState, useEffect } from "react";
import { cameraService } from "../services/cameraService";
import { INITIAL_CAMERAS } from "../data/camerasData";

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
    return () => {
      isMounted = false;
    };
  }, []);

  return { cameras, loading, error, setCameras };
}
