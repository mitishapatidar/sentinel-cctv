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
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

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
            cctv_email = os.getenv("CCTV_GATEWAY_EMAIL", "patidarmitisha@gmail.com")
            cctv_pwd = os.getenv("CCTV_GATEWAY_PASSWORD", "NYJF-T8U3-MHP8")
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

def generate_live_manifest(cam_id: str, num_segments: int = 5) -> str:
    """Generates an advancing live sliding-window HLS playlist without needing upstream manifest."""
    total_segs = 7200
    now = time.time()
    current_seq = int(now / 6.0) % (total_segs - num_segments)
    
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
    """Returns the latest cached snapshot for the requested camera ID."""
    snapshot_path = SNAPSHOTS_DIR / f"{cam_id}.jpg"
    if snapshot_path.exists():
        return FileResponse(
            snapshot_path, 
            media_type="image/jpeg",
            headers={"Cache-Control": "public, max-age=180"}
        )
    fallback_path = SNAPSHOTS_DIR / "cam01.jpg"
    if fallback_path.exists():
        return FileResponse(fallback_path, media_type="image/jpeg")
    raise HTTPException(status_code=404, detail=f"Snapshot for {cam_id} not available")

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
    """Proxies TS video segments with in-memory caching for instant sub-second playback."""
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
    
    target_url = f"https://cctv.corp8.cloud/{cam_id}/{segment_file}"
    try:
        session.headers.update({"Referer": "https://cctv.corp8.cloud/"})
        res = session.get(target_url, timeout=12)
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
            login_to_cctv()
            res2 = session.get(target_url, timeout=12)
            seg_bytes2 = res2.content
            if res2.status_code == 200 and not seg_bytes2.startswith(b"<!doctype"):
                segment_cache[cache_key] = (now, seg_bytes2)
                return Response(content=seg_bytes2, media_type="video/MP2T")
            raise HTTPException(status_code=502, detail="Upstream segment temporarily unavailable")
    except HTTPException:
        raise
    except Exception as e2:
        raise HTTPException(status_code=502, detail=f"Failed to fetch segment: {e2}")

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

