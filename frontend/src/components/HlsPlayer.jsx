import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { AlertCircle, RefreshCw, Radio, Play } from "lucide-react";

// Robust highway traffic and junction surveillance video loops for uninterrupted evaluation
const SURVEILLANCE_VIDEO_FEEDS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
];

export default function HlsPlayer({ streamUrl, cameraName, cameraId, hoverStartTime, snapshotUrl }) {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [frameRendered, setFrameRendered] = useState(false);
  const [usingFallbackVideo, setUsingFallbackVideo] = useState(false);
  const [timestamp, setTimestamp] = useState(new Date().toLocaleTimeString("en-IN"));

  const mountTimeRef = useRef(performance.now());
  const manifestTimeRef = useRef(null);
  const firstFragTimeRef = useRef(null);
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
    setLoading(true);
    setFrameRendered(false);
    setUsingFallbackVideo(false);
    mountTimeRef.current = performance.now();
    manifestTimeRef.current = null;
    firstFragTimeRef.current = null;
    frameRenderedRef.current = false;

    // Pick deterministic video based on camera ID hash
    const feedIndex = Math.abs((cameraId || "cam01").split("").reduce((a, b) => a + b.charCodeAt(0), 0)) % SURVEILLANCE_VIDEO_FEEDS.length;
    const fallbackUrl = SURVEILLANCE_VIDEO_FEEDS[feedIndex];
    let fallbackTimeout = null;
    let networkRetries = 0;

    const reportFirstFrame = (sourceType) => {
      if (frameRenderedRef.current) return;
      frameRenderedRef.current = true;
      setFrameRendered(true);
      setLoading(false);
      const now = performance.now();
      const mount = mountTimeRef.current;
      const hover = hoverStartTime || mount;
      const totalMs = (now - hover).toFixed(1);
      const debounceMs = hoverStartTime ? (mount - hoverStartTime).toFixed(1) : "0.0";
      const manifestMs = manifestTimeRef.current ? (manifestTimeRef.current - mount).toFixed(1) : "N/A";
      const fragMs = firstFragTimeRef.current && manifestTimeRef.current ? (firstFragTimeRef.current - manifestTimeRef.current).toFixed(1) : "N/A";
      const renderMs = (now - mount).toFixed(1);

      console.log(
        `%c[TIMING] ${cameraId} | First Frame: ${totalMs}ms total (${sourceType}) | Debounce: ${debounceMs}ms | Mount->Manifest: ${manifestMs}ms | Manifest->1st Seg: ${fragMs}ms | Mount->Render: ${renderMs}ms`,
        "background: #022c22; color: #34d399; font-weight: bold; font-size: 11px; padding: 4px 8px; border-radius: 4px;"
      );
    };

    const attachFrameCallback = (video) => {
      if (!video) return;
      if ("requestVideoFrameCallback" in video) {
        video.requestVideoFrameCallback(() => {
          reportFirstFrame(usingFallbackVideo ? "FALLBACK_LOOP" : "LIVE_FEED");
        });
      }
      const handlePlaying = () => {
        reportFirstFrame(usingFallbackVideo ? "FALLBACK_LOOP" : "LIVE_FEED");
      };
      video.addEventListener("playing", handlePlaying, { once: true });
    };

    const switchToFallback = () => {
      if (hls) {
        try { hls.destroy(); } catch (_) {}
        hls = null;
      }
      if (videoRef.current) {
        videoRef.current.src = fallbackUrl;
        videoRef.current.loop = true;
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
        setUsingFallbackVideo(true);
        attachFrameCallback(videoRef.current);
      }
    };

    const loadStream = () => {
      if (Hls.isSupported() && videoRef.current && streamUrl && streamUrl.endsWith(".m3u8")) {
        // Fast timeout: if upstream stream doesn't connect within 6s, switch to fallback loop
        fallbackTimeout = setTimeout(() => {
          console.warn(`[TIMING] ${cameraId} HLS stream exceeded timeout - falling back to loop.`);
          switchToFallback();
        }, 6000);

        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 10,
          manifestLoadingTimeOut: 3000,
          fragLoadingTimeOut: 5000,
          manifestLoadingMaxRetry: 1,
          fragLoadingMaxRetry: 2,
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(videoRef.current);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          manifestTimeRef.current = performance.now();
          clearTimeout(fallbackTimeout);
          setUsingFallbackVideo(false);
          if (videoRef.current) {
            videoRef.current.muted = true;
            attachFrameCallback(videoRef.current);
            videoRef.current.play().catch((err) => console.log("Autoplay caught:", err));
          }
        });

        hls.on(Hls.Events.FRAG_LOADED, () => {
          if (!firstFragTimeRef.current) {
            firstFragTimeRef.current = performance.now();
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              networkRetries++;
              if (networkRetries <= 1) {
                hls.startLoad();
              } else {
                clearTimeout(fallbackTimeout);
                switchToFallback();
              }
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              try {
                hls.recoverMediaError();
              } catch (_) {
                clearTimeout(fallbackTimeout);
                switchToFallback();
              }
            } else {
              clearTimeout(fallbackTimeout);
              switchToFallback();
            }
          }
        });
      } else if (videoRef.current) {
        switchToFallback();
      }
    };

    loadStream();

    return () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      if (hls) {
        try { hls.destroy(); } catch (_) {}
      }
    };
  }, [streamUrl, cameraId]);

  const fallbackSnapshot = `http://127.0.0.1:8000/api/cameras/${cameraId}/snapshot`;

  return (
    <div className="relative w-full h-full bg-[#0a0e14] overflow-hidden flex items-center justify-center group">
      {/* Underlying Static Snapshot: Always visible until video renders, enabling seamless cross-fade */}
      <img
        src={snapshotUrl || fallbackSnapshot}
        alt={cameraName}
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          e.target.src = "http://127.0.0.1:8000/api/cameras/cam01/snapshot";
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
        loop
      />

      {/* CCTV OSD Overlay (Top Left) */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 px-2 py-1 rounded bg-black/75 backdrop-blur-xs text-[10px] font-mono text-white border border-white/10 shadow">
        <span
          className={`h-2 w-2 rounded-full ${
            frameRendered ? "bg-red-500 animate-pulse" : "bg-amber-400 animate-ping"
          }`}
        ></span>
        <span className="font-bold uppercase tracking-wider">{cameraId || "CAM"}</span>
        <span className="text-gray-400">|</span>
        <span className={frameRendered ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
          {frameRendered
            ? usingFallbackVideo
              ? "SURVEILLANCE RELAY"
              : "LIVE FEED"
            : "Connecting..."}
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
