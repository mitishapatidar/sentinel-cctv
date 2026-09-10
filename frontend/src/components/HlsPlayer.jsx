import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Video, AlertCircle, RefreshCw } from "lucide-react";

export default function HlsPlayer({ streamUrl, cameraName, cameraId }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let hls = null;
    setError(false);
    setLoading(true);

    if (Hls.isSupported() && videoRef.current) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        videoRef.current.play().catch(() => {
          // Autoplay policy might mute or require interaction
          videoRef.current.muted = true;
          videoRef.current.play();
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setError(true);
          setLoading(false);
        }
      });
    } else if (videoRef.current && videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Safari HLS
      videoRef.current.src = streamUrl;
      videoRef.current.addEventListener("loadedmetadata", () => {
        setLoading(false);
        videoRef.current.play();
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [streamUrl]);

  return (
    <div className="relative w-full h-full bg-[#0a0e14] overflow-hidden flex items-center justify-center">
      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-[#7d8da3] text-xs gap-2 bg-[#0a0e14]/80 z-10">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
          <span>Buffering Live HLS Stream...</span>
        </div>
      )}

      {error ? (
        <div className="flex flex-col items-center justify-center text-center p-4 text-[#7d8da3] text-xs gap-2">
          <AlertCircle className="h-6 w-6 text-amber-500" />
          <span>Stream session requires portal auth cookie</span>
          <span className="text-[10px] font-mono text-[#5c6b86]">{cameraId}</span>
        </div>
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          autoPlay
        />
      )}
    </div>
  );
}
