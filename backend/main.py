import os
import json
import urllib.request
import urllib.parse
import http.cookiejar
import threading
import time
import requests
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Response, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip() and not line.startswith("#") and "=" in line:
                k, v = line.strip().split("=", 1)
                os.environ[k.strip()] = v.strip()

app = FastAPI(title="SENTINEL Stream Relay", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://splqtcnmbxjojxjeauzt.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

SNAPSHOTS_DIR = Path(__file__).resolve().parent / "snapshots"
CACHE_TS_DIR = Path(__file__).resolve().parent / "cache_ts"
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)
os.makedirs(CACHE_TS_DIR, exist_ok=True)

upstream_blocked_until = 0

# Authenticated Session via requests
session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Origin": "https://cctv.corp8.cloud",
    "Referer": "https://cctv.corp8.cloud/auth/login"
})

login_lock = threading.Lock()
last_login_time = 0

def login_to_cctv():
    global last_login_time
    with login_lock:
        now = time.time()
        if now - last_login_time < 60:
            return True
        try:
            login_url = "https://cctv.corp8.cloud/auth/login"
            cctv_email = os.getenv("CCTV_GATEWAY_EMAIL")
            cctv_pwd = os.getenv("CCTV_GATEWAY_PASSWORD")
            if not cctv_email or not cctv_pwd:
                print("[Relay] CCTV_GATEWAY_EMAIL / CCTV_GATEWAY_PASSWORD not set in .env")
                return False
            session.get(login_url, timeout=10)
            res = session.post(
                login_url, 
                data={"email": cctv_email, "password": cctv_pwd}, 
                allow_redirects=False, 
                timeout=10
            )
            if res.status_code in (200, 302):
                last_login_time = now
                print(f"[Relay] Authenticated with CCTV Gateway as {cctv_email}. Status: {res.status_code}")
                return True
            else:
                print(f"[Relay] Login failed with status: {res.status_code}")
                return False
        except Exception as e:
            print("[Relay] Login error:", e)
            return False

# In-Memory Cache for Zero-Latency Stream Delivery
cached_enc_key = None
raw_manifest_cache = {}  # cam_id -> (timestamp, raw_text)
manifest_cache = {}      # backward compatibility
segment_cache = {}       # (cam_id, segment_file) -> (timestamp, bytes)

CAMERA_RANGES = {
    "cam01": (7200, 5500, 7190),
    "cam02": (7201, 5500, 7190),
    "cam03": (7199, 5500, 7190),
    "cam04": (7201, 5500, 7190),
    "cam05": (7201, 5500, 7190),
    "cam06": (14690, 11000, 14600),
    "cam07": (7190, 5500, 7180),
    "cam08": (7189, 5500, 7180),
    "cam09": (4306, 2800, 4300),
    "cam10": (7171, 5500, 7160),
    "cam11": (7180, 5500, 7170),
    "cam12": (3487, 2000, 3480),
    "cam13": (7201, 5500, 7190),
    "cam14": (7201, 5500, 7190),
    "cam15": (7200, 5500, 7190),
    "cam16": (5263, 3500, 5250),
    "cam17": (4320, 2800, 4310),
    "cam18": (4088, 2800, 4080),
    "cam19": (8240, 5500, 8230),
    "cam20": (8229, 5500, 8220),
    "cam21": (9414, 6500, 9400),
    "cam22": (7090, 5200, 7080),
    "cam23": (5987, 4000, 5980),
    "cam24": (1849, 1000, 1840),
    "cam25": (7184, 5500, 7180),
    "cam26": (601, 200, 590),
    "cam27": (2575, 1500, 2570),
    "cam28": (2416, 1400, 2410),
    "cam29": (2719, 1600, 2710),
    "cam30": (1919, 1100, 1910),
}

def generate_live_manifest(cam_id: str, num_segments: int = 5) -> str:
    """Generates an advancing live sliding-window HLS playlist synchronized with real IST daylight per camera."""
    now = time.time()
    ist_epoch = now + 19800
    seconds_in_day = ist_epoch % 86400
    hour_fraction = seconds_in_day / 3600.0
    
    total_segs, day_start, day_end = CAMERA_RANGES.get(cam_id, (7200, 5500, 7190))
    if 6.0 <= hour_fraction < 18.0:
        # Daytime: maps cleanly into THIS camera's real daytime recording
        progress = (hour_fraction - 6.0) / 12.0
        current_seq = int(day_start + progress * (day_end - day_start))
    else:
        # Nighttime: maps cleanly into THIS camera's real nighttime recording
        progress = ((hour_fraction - 18.0) % 24.0) / 12.0
        current_seq = int(progress * day_start)
        
    lines = [
        "#EXTM3U",
        "#EXT-X-VERSION:6",
        "#EXT-X-TARGETDURATION:8",
        f"#EXT-X-MEDIA-SEQUENCE:{current_seq}",
        "#EXT-X-INDEPENDENT-SEGMENTS",
        '#EXT-X-KEY:METHOD=AES-128,URI="http://127.0.0.1:8000/stream/enc.key",IV=0x00000000000000000000000000000000',
    ]
    for i in range(num_segments):
        seq = (current_seq + i) % total_segs
        lines.append("#EXTINF:6.000000,")
        lines.append(f"http://127.0.0.1:8000/stream/{cam_id}/seg{seq:05d}.ts")
        
    return "\n".join(lines)



@app.on_event("startup")
def startup_event():
    login_to_cctv()
    print("[Relay] Stream relay server ready.")

@app.get("/health")
def health():
    return {
        "status": "healthy", 
        "service": "SENTINEL HLS Authenticated Fast Relay",
        "cached_raw_manifests": len(raw_manifest_cache),
        "cached_segments": len(segment_cache)
    }

@app.get("/api/cameras/{cam_id}/snapshot")
def get_camera_snapshot(cam_id: str):
    """Returns the latest cached snapshot for the requested camera ID synchronized with IST daylight."""
    now = time.time()
    ist_epoch = now + 19800
    hour_fraction = (ist_epoch % 86400) / 3600.0
    
    # In daytime (6 AM to 6 PM IST), prefer daylight snapshot
    if 6.0 <= hour_fraction < 18.0:
        day_path = SNAPSHOTS_DIR / f"day_{cam_id}.jpg"
        if day_path.exists():
            return FileResponse(
                day_path, 
                media_type="image/jpeg",
                headers={"Cache-Control": "public, max-age=180"}
            )
            
    snapshot_path = SNAPSHOTS_DIR / f"{cam_id}.jpg"
    if snapshot_path.exists():
        return FileResponse(
            snapshot_path, 
            media_type="image/jpeg",
            headers={"Cache-Control": "public, max-age=180"}
        )
    day_fallback = SNAPSHOTS_DIR / "day_cam01.jpg"
    if day_fallback.exists():
        return FileResponse(day_fallback, media_type="image/jpeg")
    fallback_path = SNAPSHOTS_DIR / "cam01.jpg"
    if fallback_path.exists():
        return FileResponse(fallback_path, media_type="image/jpeg")
    raise HTTPException(status_code=404, detail=f"Snapshot for {cam_id} not available")

@app.get("/download/architecture-diagram")
def download_architecture_diagram():
    """Direct high-resolution 1920x1080 PNG download of SENTINEL workflow & architecture."""
    png_path = Path(__file__).resolve().parent.parent / "docs" / "sentinel_architecture_workflow.png"
    if png_path.exists():
        return FileResponse(png_path, media_type="image/png", filename="sentinel_architecture_workflow.png")
    raise HTTPException(status_code=404, detail="Diagram PNG not found")

@app.get("/download/architecture-diagram-svg")
def download_architecture_diagram_svg():
    """Direct vector SVG download of SENTINEL workflow & architecture."""
    svg_path = Path(__file__).resolve().parent.parent / "docs" / "sentinel_architecture_workflow.svg"
    if svg_path.exists():
        return FileResponse(svg_path, media_type="image/svg+xml", filename="sentinel_architecture_workflow.svg")
    raise HTTPException(status_code=404, detail="Diagram SVG not found")

FALLBACK_KEY = bytes.fromhex("a59c70f080134543ffade38733d40d4a")

@app.get("/stream/enc.key")
def get_encryption_key():
    """Returns the AES-128 decryption key with zero latency from memory."""
    return Response(
        content=FALLBACK_KEY, 
        media_type="application/octet-stream", 
        headers={"Cache-Control": "public, max-age=86400"}
    )

@app.get("/stream/{cam_id}/index.m3u8")
def get_hls_manifest(cam_id: str):
    """Returns compact live sliding-window manifest dynamically on every poll (<1ms)."""
    manifest_text = generate_live_manifest(cam_id, num_segments=5)
    return Response(
        content=manifest_text, 
        media_type="application/vnd.apple.mpegurl",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

@app.get("/stream/{cam_id}/{segment_file}")
def get_hls_segment(cam_id: str, segment_file: str):
    """Proxies TS video segments with in-memory caching and fallback for instant playback."""
    global upstream_blocked_until
    cache_key = (cam_id, segment_file)
    now = time.time()
    if cache_key in segment_cache:
        cached_time, cached_bytes = segment_cache[cache_key]
        if now - cached_time < 600 and len(cached_bytes) > 1000 and not cached_bytes.startswith(b"<!doctype"):
            return Response(
                content=cached_bytes, 
                media_type="video/MP2T",
                headers={"Cache-Control": "public, max-age=600"}
            )
    
    # Helper to serve local encrypted MPEG-TS segment when upstream is in cooldown/unavailable
    def serve_fallback_segment():
        local_ts = CACHE_TS_DIR / f"{cam_id}.ts"
        if not local_ts.exists():
            local_ts = CACHE_TS_DIR / "cam01.ts"
        if local_ts.exists():
            with open(local_ts, "rb") as f:
                data = f.read()
            segment_cache[cache_key] = (now, data)
            return Response(
                content=data, 
                media_type="video/MP2T",
                headers={"Cache-Control": "public, max-age=30"}
            )
        raise HTTPException(status_code=502, detail="Segment temporarily unavailable")

    # If upstream is currently rate-limiting or in cooldown, serve local TS immediately without network latency
    if now < upstream_blocked_until:
        return serve_fallback_segment()

    target_url = f"https://cctv.corp8.cloud/{cam_id}/{segment_file}"
    try:
        session.headers.update({"Referer": "https://cctv.corp8.cloud/"})
        res = session.get(target_url, timeout=8)
        seg_bytes = res.content
        if res.status_code == 200 and not seg_bytes.startswith(b"<!doctype") and b"watch time limit" not in seg_bytes:
            if len(segment_cache) > 200:
                oldest_key = min(segment_cache.keys(), key=lambda k: segment_cache[k][0])
                del segment_cache[oldest_key]
            segment_cache[cache_key] = (now, seg_bytes)
            return Response(
                content=seg_bytes, 
                media_type="video/MP2T",
                headers={"Cache-Control": "public, max-age=600"}
            )
        else:
            upstream_blocked_until = now + 120  # Cooldown backoff for 2 minutes
            return serve_fallback_segment()
    except Exception:
        upstream_blocked_until = now + 60
        return serve_fallback_segment()

def supabase_api_request(endpoint: str, method: str = "GET", data: dict = None):
    """Executes authenticated Supabase REST request using service role key (bypasses client RLS)."""
    if not SUPABASE_KEY:
        return None
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    payload = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode("utf-8")
            return json.loads(content) if content else {}
    except Exception as e:
        print(f"[Backend Supabase Proxy] {method} {endpoint} error: {e}")
        return None

@app.get("/api/alerts")
def get_alerts():
    """Returns real-time ANPR and security alerts bypassing client-side RLS restrictions."""
    res = supabase_api_request("alerts?select=*,cameras(name,city)&order=created_at.desc")
    if res is not None:
        return res
    return []

@app.patch("/api/alerts/{alert_id}")
def update_alert(alert_id: str, payload: dict):
    """Updates the workflow status of an alert (pending, acknowledged, resolved)."""
    res = supabase_api_request(f"alerts?id=eq.{alert_id}", method="PATCH", data=payload)
    return res or {"status": "ok"}

@app.delete("/api/alerts/{alert_id}")
def delete_alert(alert_id: str):
    """Removes an alert record from Supabase."""
    res = supabase_api_request(f"alerts?id=eq.{alert_id}", method="DELETE")
    return res or {"status": "deleted"}

@app.get("/api/watchlist")
def get_watchlist(entity_type: Optional[str] = None):
    """Returns active surveillance targets from watchlist."""
    query = "watchlist?select=*&order=created_at.desc"
    if entity_type:
        query += f"&entity_type=eq.{entity_type}"
    res = supabase_api_request(query)
    if res is not None:
        return res
    return []

@app.post("/api/watchlist")
def add_watchlist_entry(payload: dict):
    """Registers a new vehicle or suspect person to the surveillance watchlist."""
    res = supabase_api_request("watchlist", method="POST", data=payload)
    return res or {"status": "ok"}

@app.delete("/api/watchlist/{item_id}")
def delete_watchlist_entry(item_id: str):
    """Removes a target from the watchlist repository."""
    res = supabase_api_request(f"watchlist?id=eq.{item_id}", method="DELETE")
    return res or {"status": "deleted"}

@app.patch("/api/watchlist/{item_id}")
def toggle_watchlist_entry(item_id: str, payload: dict):
    """Updates active monitoring status of a target."""
    res = supabase_api_request(f"watchlist?id=eq.{item_id}", method="PATCH", data=payload)
    return res or {"status": "updated"}

@app.get("/api/detections")
def get_detections(plate: Optional[str] = None, limit: int = 50):
    """Returns vehicle trajectory detections."""
    query = f"detections?select=*,cameras(name,city,lat,lng)&order=detected_at.desc&limit={limit}"
    if plate:
        query = f"detections?select=*,cameras(name,city,lat,lng)&plate_number=eq.{plate}&order=detected_at.asc"
    res = supabase_api_request(query)
    if res is not None:
        return res
    return []

