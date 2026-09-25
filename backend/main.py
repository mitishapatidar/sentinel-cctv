import os
import re
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
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
# LRU cache bounded by total bytes, so memory stays flat no matter how many cameras are streamed
segment_cache = OrderedDict()  # (cam_id, segment_file) -> (timestamp, bytes)
SEGMENT_CACHE_MAX_BYTES = 150 * 1024 * 1024
segment_cache_bytes = 0
segment_cache_lock = threading.Lock()


def cache_segment(key, data: bytes):
    global segment_cache_bytes
    with segment_cache_lock:
        old = segment_cache.pop(key, None)
        if old:
            segment_cache_bytes -= len(old[1])
        segment_cache[key] = (time.time(), data)
        segment_cache_bytes += len(data)
        while segment_cache_bytes > SEGMENT_CACHE_MAX_BYTES and segment_cache:
            _, (_, evicted) = segment_cache.popitem(last=False)
            segment_cache_bytes -= len(evicted)


CAM_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,40}$")
SEGMENT_PATTERN = re.compile(r"^seg\d{5}\.ts$")


def validate_cam_id(cam_id: str):
    if not CAM_ID_PATTERN.match(cam_id):
        raise HTTPException(status_code=400, detail="Invalid camera id")

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

# Cameras added after launch are not in CAMERA_RANGES; their segment count is read from the
# gateway's VOD playlist once an hour. Unknown/offline cameras are cached as 0 to avoid hammering.
discovered_segments = {}  # cam_id -> (checked_at, total_segments)
DISCOVERY_TTL_SEC = 3600
DISCOVERY_MAX_ENTRIES = 5000


def discover_segment_count(cam_id: str) -> int:
    cached = discovered_segments.get(cam_id)
    if cached and time.time() - cached[0] < DISCOVERY_TTL_SEC:
        return cached[1]
    total = 0
    try:
        if login_to_cctv():
            res = session.get(
                f"https://cctv.corp8.cloud/{cam_id}/index.m3u8",
                headers={"Referer": "https://cctv.corp8.cloud/"},
                timeout=8,
            )
            if res.status_code == 200 and res.text.startswith("#EXTM3U"):
                total = sum(1 for line in res.text.splitlines() if line.strip().endswith(".ts"))
    except Exception as e:
        print(f"[Relay] Playlist discovery failed for {cam_id}:", e)
    if len(discovered_segments) >= DISCOVERY_MAX_ENTRIES:
        discovered_segments.clear()
    discovered_segments[cam_id] = (time.time(), total)
    return total


def camera_range(cam_id: str):
    """(total_segments, day_start, day_end) or None when the camera has no recording on the gateway."""
    if cam_id in CAMERA_RANGES:
        return CAMERA_RANGES[cam_id]
    total = discover_segment_count(cam_id)
    return (total, None, None) if total else None


def current_segment_seq(cam_id: str):
    """Maps the current IST time of day onto this camera's recorded segment sequence (None if unavailable)."""
    ist_epoch = time.time() + 19800
    hour_fraction = (ist_epoch % 86400) / 3600.0

    rng = camera_range(cam_id)
    if rng is None:
        return None
    total_segs, day_start, day_end = rng
    if day_start is None:
        # Newly discovered camera: spread its recording evenly across the 24h day
        return int(hour_fraction / 24.0 * total_segs) % total_segs
    if 6.0 <= hour_fraction < 18.0:
        # Daytime: maps cleanly into THIS camera's real daytime recording
        progress = (hour_fraction - 6.0) / 12.0
        return int(day_start + progress * (day_end - day_start))
    # Nighttime: maps cleanly into THIS camera's real nighttime recording
    progress = ((hour_fraction - 18.0) % 24.0) / 12.0
    return int(progress * day_start)


def generate_live_manifest(cam_id: str, num_segments: int = 5) -> str:
    """Generates an advancing live sliding-window HLS playlist synchronized with real IST daylight per camera."""
    rng = camera_range(cam_id)
    if rng is None:
        return None
    total_segs = rng[0]
    current_seq = current_segment_seq(cam_id)

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

# Preview snapshots: a frame grabbed from the segment currently playing for each camera,
# refreshed in the background at most every SNAPSHOT_REFRESH_SEC.
SNAPSHOT_REFRESH_SEC = 300
snapshot_updated_at = {}  # cam_id -> epoch seconds of the last successful grab
snapshot_attempted_at = {}  # cam_id -> epoch seconds of the last attempt (success or not)
snapshot_inflight = set()
snapshot_lock = threading.Lock()
# Grabbing many cameras at once trips the gateway's rate limit; a small fixed pool keeps
# thread count constant regardless of camera count
snapshot_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="snapshot")
SNAPSHOT_RETRY_SEC = 60


def refresh_snapshot(cam_id: str):
    tmp_ts = SNAPSHOTS_DIR / f".{cam_id}.ts"
    tmp_jpg = SNAPSHOTS_DIR / f".{cam_id}.jpg"
    try:
        import cv2
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

        if time.time() < upstream_blocked_until or not login_to_cctv():
            return
        seq = current_segment_seq(cam_id)
        if seq is None:
            return
        res = session.get(
            f"https://cctv.corp8.cloud/{cam_id}/seg{seq:05d}.ts",
            headers={"Referer": "https://cctv.corp8.cloud/"},
            timeout=10,
        )
        data = res.content
        if res.status_code != 200 or len(data) < 1000 or data.lstrip()[:1] == b"<":
            return
        # Segments are AES-128-CBC encrypted with a zero IV (see the manifest's EXT-X-KEY)
        decryptor = Cipher(algorithms.AES(FALLBACK_KEY), modes.CBC(bytes(16))).decryptor()
        usable = len(data) - len(data) % 16
        tmp_ts.write_bytes(decryptor.update(data[:usable]) + decryptor.finalize())

        cap = cv2.VideoCapture(str(tmp_ts))
        ok, frame = cap.read()
        cap.release()
        if ok and frame is not None:
            cv2.imwrite(str(tmp_jpg), frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            os.replace(tmp_jpg, SNAPSHOTS_DIR / f"live_{cam_id}.jpg")
            snapshot_updated_at[cam_id] = time.time()
    except Exception as e:
        print(f"[Snapshot] Refresh failed for {cam_id}:", e)
    finally:
        tmp_ts.unlink(missing_ok=True)
        tmp_jpg.unlink(missing_ok=True)
        with snapshot_lock:
            snapshot_inflight.discard(cam_id)


def schedule_snapshot_refresh(cam_id: str):
    now = time.time()
    if now - snapshot_updated_at.get(cam_id, 0) < SNAPSHOT_REFRESH_SEC:
        return
    if now - snapshot_attempted_at.get(cam_id, 0) < SNAPSHOT_RETRY_SEC:
        return
    with snapshot_lock:
        if cam_id in snapshot_inflight:
            return
        snapshot_inflight.add(cam_id)
        snapshot_attempted_at[cam_id] = now
    snapshot_executor.submit(refresh_snapshot, cam_id)


@app.get("/api/cameras/snapshots/meta")
def get_snapshot_meta():
    """Epoch seconds of each camera's last fresh preview frame (cameras without one are omitted)."""
    return snapshot_updated_at


@app.get("/api/cameras/{cam_id}/snapshot")
def get_camera_snapshot(cam_id: str):
    """Returns the freshest preview frame for the camera, falling back to archived snapshots."""
    validate_cam_id(cam_id)
    schedule_snapshot_refresh(cam_id)
    live_path = SNAPSHOTS_DIR / f"live_{cam_id}.jpg"
    if cam_id in snapshot_updated_at and live_path.exists():
        return FileResponse(live_path, media_type="image/jpeg", headers={"Cache-Control": "no-cache"})

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
    # No preview yet for this camera (e.g. just registered): let the UI show a placeholder
    # instead of another camera's image
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
    validate_cam_id(cam_id)
    manifest_text = generate_live_manifest(cam_id, num_segments=5)
    if manifest_text is None:
        raise HTTPException(status_code=404, detail="No stream available for this camera")
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
    validate_cam_id(cam_id)
    if not SEGMENT_PATTERN.match(segment_file):
        raise HTTPException(status_code=400, detail="Invalid segment name")
    cache_key = (cam_id, segment_file)
    now = time.time()
    cached = segment_cache.get(cache_key)
    if cached:
        cached_time, cached_bytes = cached
        if now - cached_time < 600 and len(cached_bytes) > 1000 and not cached_bytes.startswith(b"<!doctype"):
            return Response(
                content=cached_bytes, 
                media_type="video/MP2T",
                headers={"Cache-Control": "public, max-age=600"}
            )
    
    # Helper to serve local encrypted MPEG-TS segment when upstream is in cooldown/unavailable
    def serve_fallback_segment():
        # Only this camera's own cached clip; never substitute another camera's footage
        local_ts = CACHE_TS_DIR / f"{cam_id}.ts"
        if local_ts.exists():
            with open(local_ts, "rb") as f:
                data = f.read()
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
            cache_segment(cache_key, seg_bytes)
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

@app.get("/api/vehicles/{plate}/sightings")
def get_vehicle_sightings(plate: str):
    """
    Every ANPR sighting of a plate, oldest first, with camera location and watchlist entry.
    Low-resolution plates are often only partly read, so detections that match on the trailing
    number (and are close enough overall) are returned too, flagged as "partial".
    """
    import sys as _sys
    root = str(Path(__file__).resolve().parent.parent)
    if root not in _sys.path:
        _sys.path.insert(0, root)
    from ai_pipeline.watchlist_matcher import alnum, match_plate

    target = alnum(plate)
    if len(target) < 4:
        raise HTTPException(status_code=400, detail="Plate too short")

    select = "select=id,camera_id,plate_number,confidence,vehicle_type,detected_at,cameras(name,city,lat,lng)"
    rows = supabase_api_request(
        f"detections?{select}&plate_number=like.*{urllib.parse.quote(target[-4:])}&order=detected_at.asc&limit=500"
    ) or []
    sightings = []
    for d in rows:
        kind = match_plate(d.get("plate_number", ""), target)
        if not kind:
            continue
        cam = d.get("cameras") or {}
        sightings.append({
            "camera_id": d["camera_id"],
            "name": cam.get("name") or d["camera_id"],
            "city": cam.get("city"),
            "lat": cam.get("lat"),
            "lng": cam.get("lng"),
            "plate_read": d.get("plate_number"),
            "confidence": d.get("confidence"),
            "vehicle_type": d.get("vehicle_type"),
            "detected_at": d.get("detected_at"),
            "match": kind,
        })

    watch = None
    for entry in supabase_api_request("watchlist?select=*&entity_type=eq.vehicle") or []:
        if alnum(entry.get("identifier", "")) == target:
            watch = entry
            break
    return {"plate": plate.upper(), "watchlist": watch, "sightings": sightings}


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

