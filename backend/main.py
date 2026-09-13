import os
import json
import urllib.request
import urllib.parse
import http.cookiejar
import threading
import time
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
                os.environ.setdefault(k.strip(), v.strip())

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

# Authenticated Session Opener
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

last_login_time = 0

def login_to_cctv():
    global last_login_time
    now = time.time()
    if now - last_login_time < 30:
        return True
    try:
        login_url = "https://cctv.corp8.cloud/auth/login"
        cctv_email = os.getenv("CCTV_GATEWAY_EMAIL", "sentialcctv@gmail.com")
        cctv_pwd = os.getenv("CCTV_GATEWAY_PASSWORD", "sentialofficial@1428")
        data = urllib.parse.urlencode({
            "email": cctv_email,
            "password": cctv_pwd
        }).encode("utf-8")
        req = urllib.request.Request(login_url, data=data, headers={"User-Agent": "Mozilla/5.0"})
        res = opener.open(req)
        last_login_time = now
        print("[Relay] Authenticated with CCTV Gateway. Status:", res.status)
        return True
    except Exception as e:
        print("[Relay] Login error:", e)
        return False

# Background worker to refresh snapshots every 3 minutes (180s)
def snapshot_refresh_worker():
    """Captures 1 frame per operational camera feed every 180 seconds."""
    import cv2
    operational_cams = [
        "cam01", "cam02", "cam03", "cam04", "cam07", "cam08", 
        "cam09", "cam10", "cam11", "cam12", "cam13", "cam14", 
        "cam15", "cam16", "cam17"
    ]
    time.sleep(15)  # Initial wait for server to settle
    while True:
        try:
            print("[Snapshot Worker] Starting 3-minute periodic snapshot refresh cycle...")
            for cam_id in operational_cams:
                stream_url = f"http://127.0.0.1:8000/stream/{cam_id}/index.m3u8"
                try:
                    cap = cv2.VideoCapture(stream_url)
                    ret, frame = cap.read()
                    if ret and frame is not None and frame.size > 0:
                        out_path = SNAPSHOTS_DIR / f"{cam_id}.jpg"
                        cv2.imwrite(str(out_path), frame)
                    cap.release()
                except Exception as cam_err:
                    pass
                time.sleep(1.5)  # Stagger connections to avoid gateway rate limits
            print("[Snapshot Worker] Periodic snapshot refresh cycle complete.")
        except Exception as e:
            print("[Snapshot Worker] Worker loop exception:", e)
        time.sleep(180)

@app.on_event("startup")
def startup_event():
    login_to_cctv()
    t = threading.Thread(target=snapshot_refresh_worker, daemon=True)
    t.start()
    print("[Relay] Snapshot background refresh worker started.")

@app.get("/health")
def health():
    return {"status": "healthy", "service": "SENTINEL HLS Authenticated Relay"}

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
    # Fallback to cam01 snapshot if specific id not found yet
    fallback_path = SNAPSHOTS_DIR / "cam01.jpg"
    if fallback_path.exists():
        return FileResponse(fallback_path, media_type="image/jpeg")
    raise HTTPException(status_code=404, detail=f"Snapshot for {cam_id} not available")

@app.get("/stream/enc.key")
def get_encryption_key():
    """Proxies the AES-128 decryption key so browser can decrypt the video stream."""
    try:
        req = urllib.request.Request("https://cctv.corp8.cloud/enc.key", headers={"User-Agent": "Mozilla/5.0"})
        res = opener.open(req, timeout=20)
        return Response(content=res.read(), media_type="application/octet-stream")
    except Exception as e:
        login_to_cctv()
        req = urllib.request.Request("https://cctv.corp8.cloud/enc.key", headers={"User-Agent": "Mozilla/5.0"})
        res = opener.open(req, timeout=20)
        return Response(content=res.read(), media_type="application/octet-stream")

@app.get("/stream/{cam_id}/index.m3u8")
def get_hls_manifest(cam_id: str):
    """Fetches and rewrites HLS manifest to point AES key and segments through local relay."""
    try:
        target_url = f"https://cctv.corp8.cloud/{cam_id}/index.m3u8"
        req = urllib.request.Request(target_url, headers={"User-Agent": "Mozilla/5.0"})
        res = opener.open(req, timeout=20)
        manifest_text = res.read().decode("utf-8")
        
        # Rewrite AES Key URI to route through local relay
        rewritten = manifest_text.replace('URI="/enc.key"', 'URI="http://127.0.0.1:8000/stream/enc.key"')
        # Rewrite segments relative path
        rewritten_lines = []
        for line in rewritten.splitlines():
            if line.endswith(".ts") or ".ts?" in line:
                if not line.startswith("http"):
                    line = f"http://127.0.0.1:8000/stream/{cam_id}/" + line
            rewritten_lines.append(line)

        return Response(content="\n".join(rewritten_lines), media_type="application/vnd.apple.mpegurl")
    except Exception as e:
        login_to_cctv()
        raise HTTPException(status_code=502, detail=f"Upstream camera stream unreachable: {e}")

@app.get("/stream/{cam_id}/{segment_file}")
def get_hls_segment(cam_id: str, segment_file: str):
    """Proxies the TS video segments with auto-relogin fallback."""
    target_url = f"https://cctv.corp8.cloud/{cam_id}/{segment_file}"
    try:
        req = urllib.request.Request(target_url, headers={"User-Agent": "Mozilla/5.0"})
        res = opener.open(req, timeout=20)
        return Response(content=res.read(), media_type="video/MP2T")
    except Exception as e:
        login_to_cctv()
        try:
            req = urllib.request.Request(target_url, headers={"User-Agent": "Mozilla/5.0"})
            res = opener.open(req, timeout=20)
            return Response(content=res.read(), media_type="video/MP2T")
        except Exception as e2:
            raise HTTPException(status_code=502, detail=f"Failed to fetch segment: {e2}")

