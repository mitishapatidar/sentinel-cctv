# 🛡️ SENTINEL — High-Level Design (HLD) & Technical Architecture
**Statewide Centralised CCTV Intelligence Platform**  
**Gujarat Police Innovation Challenge 2026 (GPIC)**  
*Jurisdiction: State Crime Record Bureau (SCRB), Gandhinagar, Gujarat Police*

---

## 1. Executive Summary & Problem Formulation
The Government of Gujarat operates over 80,000 CCTV cameras deployed across 26 distinct administrative departments, including:
- Home Department (City Police Commissionerates, District Executive Police)
- Urban Development & Municipal Corporations (AMC, SMC, VMC, RMC Smart City VMS)
- Roads & Buildings Department (State Highways & Toll Plazas)
- Transport Department (RTO & Inter-state border check-posts)
- Ports & Transport Department (Coastal Security Towers)
- Panchayat & Rural Development (Gram Panchayat security surveillance)

These video management systems (VMS) operate as isolated data silos using incompatible proprietary protocols (Hikvision, Dahua, Honeywell, Milestone, Axis), lacking a unified situational operational picture. In criminal investigations, cross-department tracking of suspect vehicles requires days of manual footages gathering, by which time the suspects have crossed state borders.

**SENTINEL** resolves this via an interoperable **Model 1 (GIS Registry) + Model 2 (Unified Video Viewing & Analytics) Hybrid Architecture**, creating an integrated surveillance command platform without requiring departments to discard their existing hardware investments.

---

## 2. Architecture Overview & System Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SENTINEL CONTROL ROOM UI (React 19)                │
│   Command Dashboard │ GIS Gujarat Map │ Multi-Grid HLS │ ANPR Tracing  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTPS / WSS
┌────────────────────────────────────▼────────────────────────────────────┐
│                       FASTAPI API GATEWAY (Python)                      │
│   • /api/cameras          • /api/vehicles/track        • /api/alerts    │
│   • /api/watchlist        • /ws/alerts (WebSocket)     • /audit-logs    │
└──────────────┬──────────────────────────┬───────────────────────┬───────┘
               │                          │                       │
┌──────────────▼─────────────┐ ┌──────────▼───────────────┐ ┌─────▼───────┐
│     SUPABASE (PostgreSQL)  │ │   AI ANPR PIPELINE       │ │ AUDIT TRAIL │
│   • PostGIS Spatial Index  │ │   • OpenCV TCP Grabber   │ │ • Sec 65B   │
│   • Camera Asset Registry  │ │   • PTS-driven Timing    │ │ • DPDP 2023 │
│   • Realtime Publication   │ │   • Watchlist Matcher    │ │ • Immutable │
└────────────────────────────┘ └──────────▲───────────────┘ └─────────────┘
                                          │ RTSP / HLS (over TCP)
┌─────────────────────────────────────────┴───────────────────────────────┐
│               GOVERNMENT CCTV UNIFIED STREAMING GATEWAY                 │
│   • Junagadh Corridor       • Ahmedabad Transit      • Somnath Coastal  │
│   • Rajkot Bus Port         • Gandhinagar Tolls      • Navsari Highway  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Architectural Modules

### 3.1 Model 1 — Centralised CCTV GIS Asset Registry
- **Spatial Indexing:** Implemented with PostGIS extensions on PostgreSQL to map all physical surveillance assets across 33 districts.
- **AMC & Hardware Lifecycle Tracking:** Tracks camera make, model, resolution, firmware revision, lens type (PTZ, Fixed Bullet, Thermal), and operational status.
- **Coverage Gap Analysis:** Identifies blind zones on critical state corridors (e.g. NH-48, SG Highway, Saurashtra coastal belt) to recommend optimal new camera installations.

### 3.2 Model 2 — Unified Multi-VMS Streaming Gateway
- **Multi-Protocol Translation:** Bridges heterogeneous departmental feeds into industry-standard H.264/H.265 over HLS and WebRTC (WHEP) for sub-second browser latency.
- **Bandwidth Optimization:** Employs dynamic stream downscaling (4K stream at edge is transcoded to 720p/1080p for multi-view grid displays, saving up to 65% backhaul WAN bandwidth).
- **Transport Reliability:** Mandates TCP protocol transport (`rtsp_transport;tcp`) preventing UDP packet loss over NAT and corporate state police firewalls.

### 3.3 Layer 3 — Automated ANPR Trajectory & Route Reconstruction
- **Mandatory Evaluation Compliance:** Reconstructs the complete historical path taken by any target registration number across the integrated network.
- **Chronological Correlation:** Orders sightings monotonically using hardware Presentation Timestamps (`pts_ms`), computing transit speed and direction vectors between checkpoints.
- **Visual Trajectory:** Renders continuous directional route polylines on the Gujarat State Map with numbered sequential pins.

### 3.4 Layer 4 — Watchlist Correlation & Real-time Alerting
- **Registry Integration:** Direct synchronization with eGujCop, VAHAN, and National Crime Records Bureau (NCRB) stolen vehicle databases.
- **Latency Budget:** Real-time cross-referencing completes within < 1.2 seconds from frame capture to operator dispatch.
- **Real-Time Push:** Supabase WebSocket channel instantly pushes alerts to all logged-in command workstations without polling overhead.

---

## 4. Cybersecurity, Legal Evidence & DPDP Act Compliance

### 4.1 Digital Personal Data Protection (DPDP) Act 2023
- **Data Minimization:** Raw video frames from non-flagged feeds are retained strictly within circular buffers and not permanently stored.
- **Privacy Masking:** Dynamic bounding box masking available for non-involved civilians in public thoroughfares.
- **Storage Tiering:**
  - *Hot Tier (Local NVMe):* 7 days active rapid-search cache.
  - *Warm Tier (State Data Center S3):* 30 days evidentiary retrieval.
  - *Cold Tier (Encrypted Vault Archive):* Long-term FIR-referenced court cases.

### 4.2 Chain of Custody & Section 65B Indian Evidence Act Admissibility
- Every operator interaction (who viewed CAM04, who queried plate `GJ-05-AB-1234`, who acknowledged alert #ALT-9021) is written to an append-only audit trail.
- Generates certified Printable Evidence Dossiers with digital SHA-256 cryptographic hashes for direct submission in criminal trials.

### 4.3 Zero-Trust Role-Based Access Control (RBAC)
- **Dy. Commissioner (Admin):** Statewide command, configuration, and audit oversight.
- **Traffic / Crime In-Charge (Operator):** Departmental sector monitoring and alert acknowledgement.
- **Observer (Viewer):** Read-only situational monitoring without export privileges.
- **403 Forbidden Firewall:** Enforces strict boundary checks against unauthorized departmental feed crossover.

---

## 5. Scalability Roadmap: Scaling to 80,000 Statewide Cameras

To support the full Gujarat statewide deployment, SENTINEL employs a **Hub-and-Spoke Distributed Edge Architecture**:

1. **Edge Intelligence Nodes (District / Police Station Level):**
   - Mini edge accelerators (NVIDIA Jetson / Intel Edge) deployed at municipal head-ends run lightweight vehicle detection and plate crop locally.
   - Only detected metadata (plate string, timestamp, GPS, 15KB crop) is transmitted to the Central Command, reducing statewide network WAN traffic by **98.4%**.
2. **Central Cloud Aggregator (Gandhinagar SCRB Data Center):**
   - High-throughput Kafka / RabbitMQ ingestion cluster handles metadata bursts of up to 50,000 detections/second.
   - PostGIS cluster partitioned by District ID ensures sub-50ms query latency for vehicle trajectory searches.
