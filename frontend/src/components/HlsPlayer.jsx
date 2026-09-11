import React, { useEffect, useRef, useState } from "react";
import { Maximize2, Shield, Eye, Radio } from "lucide-react";

export default function HlsPlayer({ streamUrl, cameraName, cameraId }) {
  const canvasRef = useRef(null);
  const [timestamp, setTimestamp] = useState(new Date().toLocaleTimeString("en-IN"));

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setTimestamp(new Date().toLocaleTimeString("en-IN"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time Canvas AI Surveillance Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    // Seed variations per camera
    const seed = Math.abs((cameraId || "cam01").split("").reduce((a, b) => a + b.charCodeAt(0), 0));
    const isNightVision = seed % 3 === 0;

    // Simulated moving vehicles across the junction
    const vehicles = [
      { x: -50, y: 130, speed: 2.2 + (seed % 3) * 0.4, type: "CAR", plate: `GJ-05-AB-${1000 + (seed * 13) % 9000}`, color: "#38bdf8" },
      { x: -180, y: 160, speed: 1.8 + (seed % 2) * 0.3, type: "TRUCK", plate: `GJ-01-XY-${2000 + (seed * 17) % 7000}`, color: "#f59e0b" },
      { x: 350, y: 90, speed: -2.0, type: "CAR", plate: `GJ-18-CD-${3000 + (seed * 19) % 6000}`, color: "#34d399" },
    ];

    let scanLineY = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Background (Road & Asphalt)
      if (isNightVision) {
        ctx.fillStyle = "#04100c"; // Night vision dark green
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = "#0c121d"; // Dark asphalt
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Road markings (Perspectives)
      ctx.strokeStyle = isNightVision ? "#134e4a" : "#1e293b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 80);
      ctx.lineTo(canvas.width, 80);
      ctx.moveTo(0, 200);
      ctx.lineTo(canvas.width, 200);
      ctx.stroke();

      // Lane dividers (dashed)
      ctx.setLineDash([12, 10]);
      ctx.strokeStyle = isNightVision ? "#059669" : "#334155";
      ctx.beginPath();
      ctx.moveTo(0, 140);
      ctx.lineTo(canvas.width, 140);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Render Moving Vehicles with AI ANPR Bounding Boxes
      vehicles.forEach((v) => {
        v.x += v.speed;
        if (v.speed > 0 && v.x > canvas.width + 60) v.x = -80;
        if (v.speed < 0 && v.x < -80) v.x = canvas.width + 60;

        const w = v.type === "TRUCK" ? 55 : 38;
        const h = v.type === "TRUCK" ? 24 : 18;

        // Vehicle Body
        ctx.fillStyle = isNightVision ? "#064e3b" : "#1e293b";
        ctx.fillRect(v.x, v.y, w, h);

        // Headlights / Taillights
        ctx.fillStyle = v.speed > 0 ? "#fef08a" : "#ef4444";
        ctx.fillRect(v.speed > 0 ? v.x + w - 3 : v.x + 1, v.y + 2, 2, 4);
        ctx.fillRect(v.speed > 0 ? v.x + w - 3 : v.x + 1, v.y + h - 6, 2, 4);

        // Green AI Detection Bounding Box
        ctx.strokeStyle = isNightVision ? "#34d399" : "#22c55e";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(v.x - 4, v.y - 4, w + 8, h + 8);

        // ANPR Detection Tag
        ctx.fillStyle = isNightVision ? "#34d399" : "#22c55e";
        ctx.font = "bold 9px monospace";
        ctx.fillText(`${v.type} [97%]`, v.x - 4, v.y - 7);

        // License Plate Tag
        ctx.fillStyle = "#ffffff";
        ctx.font = "8px monospace";
        ctx.fillText(v.plate, v.x - 4, v.y + h + 12);
      });

      // 3. AI Scanning Beam
      scanLineY = (scanLineY + 1.2) % canvas.height;
      ctx.strokeStyle = isNightVision ? "rgba(52, 211, 153, 0.4)" : "rgba(59, 130, 246, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, scanLineY);
      ctx.lineTo(canvas.width, scanLineY);
      ctx.stroke();

      // 4. Subtle CCTV Grain / Lens Grid
      ctx.strokeStyle = isNightVision ? "rgba(5, 150, 105, 0.15)" : "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [cameraId]);

  return (
    <div className="relative w-full h-full bg-[#0a0e14] overflow-hidden flex items-center justify-center group select-none">
      {/* Dynamic AI Surveillance Canvas */}
      <canvas
        ref={canvasRef}
        width={320}
        height={220}
        className="w-full h-full object-cover"
      />

      {/* CCTV OSD Overlay (Top Left) */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[10px] font-mono text-white border border-white/10">
        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
        <span className="font-bold uppercase tracking-wider">{cameraId}</span>
        <span className="text-gray-500">|</span>
        <span className="text-emerald-400 font-semibold">AI ANPR ACTIVE</span>
      </div>

      {/* CCTV Live Timestamp Overlay (Top Right) */}
      <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[10px] font-mono text-white border border-white/10">
        <span>{timestamp}</span>
      </div>

      {/* Camera Location Tag (Bottom Left) */}
      <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[9px] font-mono text-gray-300 truncate max-w-[85%] border border-white/5">
        {cameraName}
      </div>
    </div>
  );
}
