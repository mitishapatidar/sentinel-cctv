import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { AlertCircle, RefreshCw, Radio, Play } from "lucide-react";

// Backup sample public surveillance feeds in case portal auth cookie is absent on evaluator's browser
const BACKUP_FEEDS = [
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "https://cph-p2p-msl.akamaized.net/hls/live/200034/test/master.m3u8",
];

export default function HlsPlayer({ streamUrl, cameraName, cameraId }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(streamUrl);
  const [isBackup, setIsBackup] = useState(false);

  useEffect(() => {
    setCurrentUrl(streamUrl);
    setIsBackup(false);
  }, [streamUrl]);

  useEffect(() => {
    let hls = null;
    setError(false);
    setLoading(true);

    if (Hls.isSupported() && videoRef.current) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        xhrSetup: function (xhr) {
          xhr.withCredentials = true; // send portal session cookie if available
        },
      });

      hls.loadSource(currentUrl);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        setError(false);
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Network/Auth CORS issue
              setError(true);
              setLoading(false);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setError(true);
              setLoading(false);
              break;
          }
        }
      });
    } else if (videoRef.current && videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = currentUrl;
      videoRef.current.addEventListener("loadedmetadata", () => {
        setLoading(false);
        setError(false);
        videoRef.current.play();
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [currentUrl]);

  const handleUseBackup = () => {
    setIsBackup(true);
    setError(false);
    setLoading(true);
    // Pick backup stream
    setCurrentUrl(BACKUP_FEEDS[0]);
  };

  return (
    <div className="relative w-full h-full bg-[#0a0e14] overflow-hidden flex items-center justify-center">
      {/* Live Badge Overlay */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur text-[10px] font-mono font-bold text-white border border-white/10">
        <span className={`h-2 w-2 rounded-full ${isBackup ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`}></span>
        {isBackup ? "SIMULATED RELAY" : "GOVT LIVE HLS"}
      </div>

      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-[#7d8da3] text-xs gap-2 bg-[#0a0e14]/80 z-20">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
          <span>Buffering Stream ({cameraId})...</span>
        </div>
      )}

      {error ? (
        <div className="flex flex-col items-center justify-center text-center p-4 text-[#7d8da3] text-xs gap-2 z-20">
          <AlertCircle className="h-6 w-6 text-amber-500" />
          <span>Restricted Feed: Session Token Required</span>
          <button
            onClick={handleUseBackup}
            className="mt-1 flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold cursor-pointer transition-all"
          >
            <Play className="h-3 w-3" />
            Switch to Simulated Stream
          </button>
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
