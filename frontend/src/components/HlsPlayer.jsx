import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export default function HlsPlayer({ streamUrl, cameraName, cameraId, hoverStartTime, snapshotUrl }) {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [frameRendered, setFrameRendered] = useState(false);
  const [timestamp, setTimestamp] = useState(new Date().toLocaleTimeString("en-IN"));
  const [streamError, setStreamError] = useState(false);

  const mountTimeRef = useRef(performance.now());
  const frameRenderedRef = useRef(false);

  // Live CCTV OSD Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setTimestamp(new Date().toLocaleTimeString("en-IN"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let hls = null;
    let retryTimer = null;
    setLoading(true);
    setFrameRendered(false);
    setStreamError(false);
    mountTimeRef.current = performance.now();
    frameRenderedRef.current = false;

    const reportFirstFrame = () => {
      if (frameRenderedRef.current) return;
      frameRenderedRef.current = true;
      setFrameRendered(true);
      setLoading(false);
      setStreamError(false);
      const totalMs = (performance.now() - mountTimeRef.current).toFixed(1);
      console.log(`[LIVE STREAM] ${cameraId} | First Frame: ${totalMs}ms`);
    };

    const attachFrameCallback = (video) => {
      if (!video) return;
      if ("requestVideoFrameCallback" in video) {
        video.requestVideoFrameCallback(() => reportFirstFrame());
      }
      const handlePlaying = () => reportFirstFrame();
      video.addEventListener("playing", handlePlaying, { once: true });
    };

    if (Hls.isSupported() && videoRef.current && streamUrl && streamUrl.endsWith(".m3u8")) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        maxBufferLength: 15,
        maxMaxBufferLength: 30,
        manifestLoadingTimeOut: 8000,
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 1500,
        fragLoadingTimeOut: 12000,
        fragLoadingMaxRetry: 4,
        fragLoadingRetryDelay: 1500,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          attachFrameCallback(videoRef.current);
          videoRef.current.play().catch((err) => console.log("Autoplay caught:", err));
        }
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        reportFirstFrame();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            console.warn(`[HLS] Network error on ${cameraId}, retrying in 2s...`);
            retryTimer = setTimeout(() => {
              try { hls.startLoad(); } catch (_) {}
            }, 2000);
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            console.warn(`[HLS] Media error on ${cameraId}, recovering...`);
            try { hls.recoverMediaError(); } catch (_) {}
          } else {
            setStreamError(true);
          }
        }
      });
    } else if (videoRef.current && videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS for Safari / iOS
      videoRef.current.src = streamUrl;
      videoRef.current.muted = true;
      attachFrameCallback(videoRef.current);
      videoRef.current.play().catch(() => {});
    }

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (hls) {
        try { hls.destroy(); } catch (_) {}
      }
    };
  }, [streamUrl, cameraId]);

  const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const now = new Date();
  const istHour = (now.getUTCHours() + 5.5) % 24;
  const isDaytime = istHour >= 6 && istHour < 18;
  const dayPrefix = isDaytime ? "day_" : "";
  const fallbackSnapshot = isLocal 
    ? `http://127.0.0.1:8000/api/cameras/${cameraId}/snapshot` 
    : `/snapshots/${dayPrefix}${cameraId}.jpg`;

  return (
    <div className="relative w-full h-full bg-[#0a0e14] overflow-hidden flex items-center justify-center group">
      {/* Underlying Static Snapshot: Always visible until live video frame renders */}
      <img
        src={snapshotUrl || fallbackSnapshot}
        alt={cameraName}
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          if (!e.target.dataset.triedFallback) {
            e.target.dataset.triedFallback = "true";
            e.target.src = `/snapshots/${dayPrefix}${cameraId}.jpg`;
          } else {
            e.target.src = isDaytime ? "/snapshots/day_cam01.jpg" : "/snapshots/cam01.jpg";
          }
        }}
      />

      {/* Real Video Element: Cross-fades into view with opacity transition */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          frameRendered ? "opacity-100" : "opacity-0"
        }`}
        muted
        playsInline
        autoPlay
      />

      {/* CCTV OSD Overlay (Top Left) */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 px-2 py-1 rounded bg-black/75 backdrop-blur-xs text-[10px] font-mono text-white border border-white/10 shadow">
        <span
          className={`h-2 w-2 rounded-full ${
            frameRendered ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-ping"
          }`}
        ></span>
        <span className="font-bold uppercase tracking-wider">{cameraId || "CAM"}</span>
        <span className="text-gray-400">|</span>
        <span className={frameRendered ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
          {frameRendered ? "LIVE FEED" : streamError ? "RETRYING LIVE..." : "CONNECTING..."}
        </span>
      </div>

      {/* CCTV Live Timestamp Overlay (Top Right) */}
      <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded bg-black/75 backdrop-blur-xs text-[10px] font-mono text-white border border-white/10 shadow">
        <span>{timestamp} IST</span>
      </div>

      {/* Camera Location Tag (Bottom Left) */}
      <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[9px] font-mono text-gray-300 truncate max-w-[80%] shadow">
        {cameraName}
      </div>
    </div>
  );
}
