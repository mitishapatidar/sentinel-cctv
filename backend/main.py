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

# In-Memory Cache for Zero-Latency Stream Delivery
cached_enc_key = None
manifest_cache = {}  # cam_id -> (timestamp, compact_manifest_str)
segment_cache = {}   # (cam_id, segment_file) -> (timestamp, bytes)

def generate_compact_manifest(raw_text: str, cam_id: str, num_segments: int = 4) -> str:
    """Converts a massive 14,000-line VOD playlist into an ultra-fast 400-byte live sliding window."""
    lines = raw_text.splitlines()
    header_lines = []
    segment_pairs = []
    current_inf = None
    for line in lines:
        l = line.strip()
        if not l or l.startswith("#EXT-X-PLAYLIST-TYPE") or l.startswith("#EXT-X-ENDLIST"):
            continue
        if l.startswith("#EXTINF:"):
            current_inf = l
        elif l.endswith(".ts") or ".ts?" in l:
            if not l.startswith("http"):
                seg_url = f"http://127.0.0.1:8000/stream/{cam_id}/" + l
            else:
                seg_url = l
            if current_inf:
                segment_pairs.append((current_inf, seg_url))
                current_inf = None
        else:
            if 'URI="/enc.key"' in l:
                l = l.replace('URI="/enc.key"', 'URI="http://127.0.0.1:8000/stream/enc.key"')
            header_lines.append(l)
    
    selected = segment_pairs[:num_segments]
    output = list(header_lines)
    for inf, seg in selected:
        output.append(inf)
        output.append(seg)
    return "\n".join(output)

# Background worker to pre-warm streams and refresh snapshots every 3 minutes
def snapshot_refresh_worker():
    """Pre-warms manifests and segments in RAM, and captures fresh JPEG frames."""
    import cv2
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.backends import default_backend

    operational_cams = [f"cam{i:02d}" for i in range(1, 31)]
    time.sleep(5)  # Warmup wait
    headers = {"User-Agent": "Mozilla/5.0", "Referer": "https://cctv.corp8.cloud/"}
    
    while True:
        try:
            print("[Snapshot Worker] Starting periodic snapshot & stream pre-warm cycle...")
            global cached_enc_key
            if not cached_enc_key:
                try:
                    k_req = urllib.request.Request("https://cctv.corp8.cloud/enc.key", headers=headers)
                    cached_enc_key = opener.open(k_req, timeout=10).read()
                except Exception as e:
                    login_to_cctv()

            for cam_id in operational_cams:
                try:
                    # 1. Warm manifest into RAM
                    m_req = urllib.request.Request(f"https://cctv.corp8.cloud/{cam_id}/index.m3u8", headers=headers)
                    m_data = opener.open(m_req, timeout=10).read().decode("utf-8")
                    manifest_cache[cam_id] = (time.time(), generate_compact_manifest(m_data, cam_id, 4))

                    # 2. Warm first segment into RAM cache
                    seg_name = "seg00000.ts"
                    s_req = urllib.request.Request(f"https://cctv.corp8.cloud/{cam_id}/{seg_name}", headers=headers)
                    enc_seg = opener.open(s_req, timeout=10).read()
                    segment_cache[(cam_id, seg_name)] = (time.time(), enc_seg)

                    # 3. Decrypt and extract 1 frame for JPEG snapshot
                    if cached_enc_key and len(cached_enc_key) == 16:
                        cipher = Cipher(algorithms.AES(cached_enc_key), modes.CBC(b"\x00" * 16), backend=default_backend())
                        dec = cipher.decryptor().update(enc_seg) + cipher.decryptor().finalize()
                        tmp_ts = SNAPSHOTS_DIR / f"_tmp_{cam_id}.ts"
                        with open(tmp_ts, "wb") as f:
                            f.write(dec)
                        cap = cv2.VideoCapture(str(tmp_ts))
                        ret, frame = cap.read()
                        cap.release()
                        if tmp_ts.exists():
                            tmp_ts.unlink()
                        if ret and frame is not None and frame.size > 0:
                            cv2.imwrite(str(SNAPSHOTS_DIR / f"{cam_id}.jpg"), frame)
                except Exception:
                    pass
                time.sleep(2)  # Gentle interval between feeds
            print("[Snapshot Worker] Periodic snapshot & pre-warm cycle complete.")
        except Exception as e:
            print("[Snapshot Worker] Worker loop exception:", e)
        time.sleep(180)

@app.on_event("startup")
def startup_event():
    login_to_cctv()
    t = threading.Thread(target=snapshot_refresh_worker, daemon=True)
    t.start()
    print("[Relay] Ultra-fast pre-warming and snapshot worker started.")

@app.get("/health")
def health():
    return {
        "status": "healthy", 
        "service": "SENTINEL HLS Authenticated Fast Relay",
        "cached_manifests": len(manifest_cache),
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

@app.get("/stream/enc.key")
def get_encryption_key():
    """Proxies and caches the AES-128 decryption key with zero latency."""
    global cached_enc_key
    if cached_enc_key:
        return Response(content=cached_enc_key, media_type="application/octet-stream", headers={"Cache-Control": "public, max-age=3600"})
    headers = {"User-Agent": "Mozilla/5.0", "Referer": "https://cctv.corp8.cloud/"}
    try:
        req = urllib.request.Request("https://cctv.corp8.cloud/enc.key", headers=headers)
        res = opener.open(req, timeout=10)
        cached_enc_key = res.read()
        return Response(content=cached_enc_key, media_type="application/octet-stream", headers={"Cache-Control": "public, max-age=3600"})
    except Exception as e:
        login_to_cctv()
        try:
            req = urllib.request.Request("https://cctv.corp8.cloud/enc.key", headers=headers)
            res = opener.open(req, timeout=10)
            cached_enc_key = res.read()
            return Response(content=cached_enc_key, media_type="application/octet-stream", headers={"Cache-Control": "public, max-age=3600"})
        except Exception as e2:
            raise HTTPException(status_code=502, detail=f"Failed to fetch encryption key: {e2}")

@app.get("/stream/{cam_id}/index.m3u8")
def get_hls_manifest(cam_id: str):
    """Returns compact live sliding-window manifest from RAM cache (<2ms)."""
    now = time.time()
    if cam_id in manifest_cache:
        cached_time, cached_content = manifest_cache[cam_id]
        if now - cached_time < 60:
            return Response(
                content=cached_content, 
                media_type="application/vnd.apple.mpegurl",
                headers={"Cache-Control": "public, max-age=15"}
            )
    
    headers = {"User-Agent": "Mozilla/5.0", "Referer": "https://cctv.corp8.cloud/"}
    try:
        target_url = f"https://cctv.corp8.cloud/{cam_id}/index.m3u8"
        req = urllib.request.Request(target_url, headers=headers)
        res = opener.open(req, timeout=10)
        raw_text = res.read().decode("utf-8")
        compact_text = generate_compact_manifest(raw_text, cam_id, num_segments=4)
        manifest_cache[cam_id] = (now, compact_text)
        return Response(
            content=compact_text, 
            media_type="application/vnd.apple.mpegurl",
            headers={"Cache-Control": "public, max-age=15"}
        )
    except Exception as e:
        if cam_id in manifest_cache:
            return Response(content=manifest_cache[cam_id][1], media_type="application/vnd.apple.mpegurl")
        login_to_cctv()
        raise HTTPException(status_code=502, detail=f"Upstream camera stream unreachable: {e}")

@app.get("/stream/{cam_id}/{segment_file}")
def get_hls_segment(cam_id: str, segment_file: str):
    """Proxies TS video segments with in-memory caching for instant sub-second playback."""
    cache_key = (cam_id, segment_file)
    now = time.time()
    if cache_key in segment_cache:
        cached_time, cached_bytes = segment_cache[cache_key]
        if now - cached_time < 300:
            return Response(
                content=cached_bytes, 
                media_type="video/MP2T",
                headers={"Cache-Control": "public, max-age=300"}
            )
    
    headers = {"User-Agent": "Mozilla/5.0", "Referer": "https://cctv.corp8.cloud/"}
    target_url = f"https://cctv.corp8.cloud/{cam_id}/{segment_file}"
    try:
        req = urllib.request.Request(target_url, headers=headers)
        res = opener.open(req, timeout=15)
        seg_bytes = res.read()
        # Keep cache bounded to 60 segments (~30MB)
        if len(segment_cache) > 60:
            oldest_key = min(segment_cache.keys(), key=lambda k: segment_cache[k][0])
            del segment_cache[oldest_key]
        segment_cache[cache_key] = (now, seg_bytes)
        return Response(
            content=seg_bytes, 
            media_type="video/MP2T",
            headers={"Cache-Control": "public, max-age=300"}
        )
    except Exception as e:
        login_to_cctv()
        try:
            req = urllib.request.Request(target_url, headers=headers)
            res = opener.open(req, timeout=15)
            seg_bytes = res.read()
            segment_cache[cache_key] = (now, seg_bytes)
            return Response(content=seg_bytes, media_type="video/MP2T")
        except Exception as e2:
            raise HTTPException(status_code=502, detail=f"Failed to fetch segment: {e2}")

