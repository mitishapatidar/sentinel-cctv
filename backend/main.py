import os
import json
import urllib.request
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Auto-load .env
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip() and not line.startswith("#") and "=" in line:
                k, v = line.strip().split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

app = FastAPI(
    title="SENTINEL // Gujarat Police CCTV Intelligence API",
    description="Video Management & AI Video Analytics Platform",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://splqtcnmbxjojxjeauzt.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                pass

manager = ConnectionManager()

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "system": "SENTINEL CCTV Gateway",
        "jurisdiction": "Gujarat Police SCRB",
        "cameras_supervised": 30,
        "protocols_supported": ["RTSP", "HLS", "WHEP"]
    }

@app.get("/api/cameras")
def get_cameras():
    url = f"{SUPABASE_URL}/rest/v1/cameras?select=*"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

@app.get("/api/watchlist")
def get_watchlist():
    url = f"{SUPABASE_URL}/rest/v1/watchlist?select=*"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

@app.get("/api/alerts")
def get_alerts():
    url = f"{SUPABASE_URL}/rest/v1/alerts?select=*&order=created_at.desc"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

@app.get("/api/vehicles/track")
def track_vehicle(plate: str = Query(..., description="Vehicle registration plate e.g. GJ-05-AB-1234")):
    clean_plate = plate.strip().upper()
    return {
        "plate": clean_plate,
        "status": "trajectory_correlated",
        "total_sightings": 4,
        "checkpoints": [
            {
                "sequence": 1,
                "camera_id": "cam01",
                "location": "01 Chiman bhai Bridge, Ahmedabad",
                "lat": 23.0301,
                "lng": 72.5075,
                "timestamp": "10-09-2026 09:15:22",
                "speed_kmh": 54,
                "confidence": 0.96
            },
            {
                "sequence": 2,
                "camera_id": "cam04",
                "location": "04 Paldi Circle, Ahmedabad",
                "lat": 23.0131,
                "lng": 72.5624,
                "timestamp": "10-09-2026 09:38:10",
                "speed_kmh": 42,
                "confidence": 0.98
            },
            {
                "sequence": 3,
                "camera_id": "cam12",
                "location": "12 Tri Mandir Adalaj Tollnaka, Gandhinagar",
                "lat": 23.1673,
                "lng": 72.5812,
                "timestamp": "10-09-2026 10:24:45",
                "speed_kmh": 78,
                "confidence": 0.95
            },
            {
                "sequence": 4,
                "camera_id": "cam08",
                "location": "08 majewadi-gate-junagadh, Junagadh",
                "lat": 21.5281,
                "lng": 70.4619,
                "timestamp": "10-09-2026 14:12:05",
                "speed_kmh": 35,
                "confidence": 0.95
            }
        ]
    }

class DetectionPayload(BaseModel):
    plate_number: str
    camera_id: str
    camera_name: str
    confidence: Optional[float] = 0.96

@app.post("/api/anpr/simulate-detection")
async def trigger_anpr_detection(payload: DetectionPayload):
    alert_event = {
        "event": "WATCHLIST_MATCH",
        "plate": payload.plate_number,
        "camera": payload.camera_name,
        "camera_id": payload.camera_id,
        "timestamp": "Just now",
        "severity": "critical"
    }
    await manager.broadcast(alert_event)
    return {"status": "broadcasted", "event": alert_event}

@app.websocket("/ws/alerts")
async def websocket_alerts_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
