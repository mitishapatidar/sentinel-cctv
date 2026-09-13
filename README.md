# 🛡️ SENTINEL — Statewide Centralised CCTV Intelligence Platform
### Gujarat Police Innovation Challenge 2026 (GPIC) • Model 1 + Model 2 Hybrid Architecture
*Developed for State Crime Record Bureau (SCRB), Gandhinagar, Gujarat Police*

---

## 🌟 Overview
**SENTINEL** is a next-generation unified CCTV management and AI video analytics platform engineered to bridge isolated video silos across **26 Gujarat Government departments** and scale to **80,000+ statewide surveillance assets**.

Built specifically for the **Gujarat Police Innovation Challenge 2026**, SENTINEL integrates **Model 1 (Centralised GIS Registry)** and **Model 2 (Unified Video Viewing & Analytics)** into an interoperable command platform without requiring departments to replace their existing VMS or roadside hardware.

---

## 🚀 Key Platform Capabilities

### 1. GIS Centralised Camera Registry (Model 1)
- **PostGIS Spatial Mapping:** Live coordinates across Ahmedabad, Junagadh, Somnath, Rajkot, Gandhinagar, Navsari, and Patan.
- **Hardware Inventory & AMC Tracking:** Tracks codecs (H.264/H.265), resolutions (4K/1080p), and camera types (PTZ, Bullet, Dome, Thermal).
- **Coverage Gap Analysis:** Identifies surveillance blind spots across state highway corridors.

### 2. Unified Multi-VMS Streaming Grid (Model 2)
- **30 Live Feeds Synchronized:** Authenticated ingestion from `cctv.corp8.cloud` with HLS streams and background 3-minute cached snapshot architecture.
- **Optimized Hover-to-Play Playback:** On-demand HLS streaming with in-memory compact sliding-window playlists and seamless snapshot cross-fade.
- **Departmental Filtering:** Instant views for City Police, Traffic Police, Highway Patrol, Coastal Security, and Gram Panchayats.

### 3. Automated Vehicle Trajectory Reconstruction *(Mandatory Test Case)*
- **Statewide Route Tracing:** Enter any registration plate (e.g. `GJ-05-AB-1234`) to trace chronological movement across camera checkpoints.
- **Sequential GIS Route:** Renders directional route polylines on the Gujarat State Map with numbered checkpoint markers.
- **Certified Evidence Dossier:** Generates printable evidentiary reports formatted based on Section 65B requirements of the Indian Evidence Act.

### 4. Real-Time Watchlist & Automated Alerts
- Cross-references incoming ANPR detections against stolen vehicle and wanted suspect registries.
- **Supabase Realtime WebSockets:** Pushes real-time emergency alerts to command consoles with audio notification and floating toast alerts.

### 5. Cybersecurity & DPDP Act 2023 Compliance
- **Zero-Trust RBAC:** Granular roles for Dy. Commissioner (Admin), Traffic In-Charge (Operator), and Viewer with 403 Forbidden enforcement.
- **Immutable Chain of Custody:** Comprehensive audit logging tracking all feed accesses, searches, and alert acknowledgements.

---

## 🏗️ Architecture & Tech Stack

```
Frontend:   React 19 + Vite + Tailwind CSS + Leaflet.js (GIS) + Hls.js
Backend:    Python FastAPI + Uvicorn + WebSockets
Database:   Supabase (Cloud PostgreSQL + PostGIS Spatial Engine)
AI Engine:  OpenCV (TCP RTSP Capture with PTS Timing) + License Plate Normalizer
Security:   TLS 1.3 + AES-256 + Role-Based Access Control (RBAC) + DPDP 2023 Audit
```

---

## 📋 Evaluation Test Case Quick Guide

To verify the platform's mandatory evaluation test cases:

1. **Launch the Web Portal:**
   ```bash
   cd frontend
   npm run dev
   # Open http://localhost:5173/
   ```
2. **Access the Command Grid:**
   - Click **"Control Room Sign In"** ➔ Pre-filled credentials (`sentialcctv@gmail.com` / `sentialofficial@1428`) ➔ **"Enter Command Grid"**.
3. **Verify Mandatory Vehicle Tracking:**
   - Navigate to **"Vehicle Tracking"** on the left menu.
   - Click quick test button **`GJ-05-AB-1234 (Stolen Swift)`**.
   - Observe the 4-step route drawn across Ahmedabad, Gandhinagar, and Junagadh.
   - Click **"Generate Certified Evidence Dossier"** to view the printable court certificate.
4. **Simulate Live ANPR Intercept:**
   - Navigate to **Dashboard** and click **"Simulate Live Intercept"**.
   - Observe the Web Audio police chime, bouncing red toast, and real-time alert dispatch.

---

## 📁 Repository Structure

```
sentinel-cctv/
├── frontend/               # React 19 + Vite + Tailwind Control Room UI
│   ├── src/
│   │   ├── components/     # Navbar, Sidebar, HlsPlayer, AlertToast
│   │   ├── pages/          # Landing, Dashboard, Cameras, Tracking, Alerts, Registry, Audit
│   │   └── utils/          # Web Audio alert chime utility
├── backend/                # Python FastAPI Gateway & Endpoints
│   ├── main.py             # REST API + WebSocket Server
│   └── test_db.py          # Database integrity test
├── ai_pipeline/            # Computer Vision & ANPR Processing
│   ├── frame_grabber.py    # TCP RTSP Ingestion with PTS Timestamps
│   ├── plate_reader.py     # Indian Number Plate Regex Normalizer
│   └── watchlist_matcher.py# Supabase Watchlist Live Correlation
├── docs/                   # Submission Deliverables
│   ├── HLD_ARCHITECTURE.md # Full High-Level Design Document
│   └── PRESENTATION_SLIDES.md # 10-Slide Pitch Deck & 3-Min Video Script
└── README.md               # Project Documentation
```

---

## 🏆 Gujarat Police Innovation Challenge 2026 Submission Status
- [x] Model 1: Centralised CCTV GIS Registry (30 Gujarat Police Camera Sites Configured)
- [x] Model 2: Unified Multi-VMS Streaming Grid (Hover-to-Play HLS Relay & Snapshots Verified)
- [x] Mandatory Evaluation Test Case: Vehicle Trajectory Reconstruction (Sequential GPS Route Tracing)
- [x] High-Level Design (HLD) Document Ready (`docs/HLD_ARCHITECTURE.md`)
- [x] 10-Slide Presentation Pitch Deck Ready (`docs/PRESENTATION_SLIDES.md`)
- [x] 3-Minute Video Walkthrough Script Ready
- [x] Production Frontend Build Verified (Vite 8.3 / Zero Errors)

*Submitted for Gujarat Police Innovation Challenge 2026 by Mitisha Patidar.*
