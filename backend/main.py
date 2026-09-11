import os
import json
import urllib.request
import urllib.parse
import http.cookiejar
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Response, HTTPException
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

# Authenticated Session Opener
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def login_to_cctv():
    try:
        login_url = "https://cctv.corp8.cloud/auth/login"
        data = urllib.parse.urlencode({
            "email": "patidarmitisha@gmail.com",
            "password": "NYJF-T8U3-MHP8"
        }).encode("utf-8")
        req = urllib.request.Request(login_url, data=data, headers={"User-Agent": "Mozilla/5.0"})
        res = opener.open(req)
        print("[Relay] Authenticated with CCTV Gateway. Status:", res.status)
        return True
    except Exception as e:
        print("[Relay] Login error:", e)
        return False

# Authenticate on startup
login_to_cctv()

@app.get("/health")
def health():
    return {"status": "healthy", "service": "SENTINEL HLS Authenticated Relay"}

@app.get("/stream/enc.key")
def get_encryption_key():
    """Proxies the AES-128 decryption key so browser can decrypt the video stream."""
    try:
        req = urllib.request.Request("https://cctv.corp8.cloud/enc.key", headers={"User-Agent": "Mozilla/5.0"})
        res = opener.open(req, timeout=5)
        return Response(content=res.read(), media_type="application/octet-stream")
    except Exception as e:
        login_to_cctv()
        req = urllib.request.Request("https://cctv.corp8.cloud/enc.key", headers={"User-Agent": "Mozilla/5.0"})
        res = opener.open(req, timeout=5)
        return Response(content=res.read(), media_type="application/octet-stream")

@app.get("/stream/{cam_id}/index.m3u8")
def get_hls_manifest(cam_id: str):
    """Fetches and rewrites HLS manifest to point AES key and segments through local relay."""
    try:
        target_url = f"https://cctv.corp8.cloud/{cam_id}/index.m3u8"
        req = urllib.request.Request(target_url, headers={"User-Agent": "Mozilla/5.0"})
        res = opener.open(req, timeout=5)
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
        raise HTTPException(status_code=502, detail="Upstream camera stream unreachable")

@app.get("/stream/{cam_id}/{segment_file}")
def get_hls_segment(cam_id: str, segment_file: str):
    """Proxies the TS video segments."""
    try:
        target_url = f"https://cctv.corp8.cloud/{cam_id}/{segment_file}"
        req = urllib.request.Request(target_url, headers={"User-Agent": "Mozilla/5.0"})
        res = opener.open(req, timeout=10)
        return Response(content=res.read(), media_type="video/MP2T")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch segment: {e}")

