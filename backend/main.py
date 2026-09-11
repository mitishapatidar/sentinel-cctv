import os
import json
import urllib.request
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

app = FastAPI(title="SENTINEL Stream Gateway", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://splqtcnmbxjojxjeauzt.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Authenticated Session Opener for cctv.corp8.cloud
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def ensure_login():
    try:
        login_url = "https://cctv.corp8.cloud/auth/login"
        data = urllib.parse.urlencode({
            "email": "patidarmitisha@gmail.com",
            "password": "NYJF-T8U3-MHP8"
        }).encode("utf-8")
        req = urllib.request.Request(login_url, data=data, headers={"User-Agent": "Mozilla/5.0"})
        opener.open(req)
        return True
    except Exception as e:
        print("[Gateway] Login error:", e)
        return False

# Initial login
ensure_login()

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/api/cameras")
def get_cameras():
    url = f"{SUPABASE_URL}/rest/v1/cameras?select=*"
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

@app.get("/api/stream/proxy/{cam_id}")
def proxy_hls_stream(cam_id: str):
    """Proxies HLS manifest and segments bypassing CORS and attaching session cookies."""
    target_url = f"https://cctv.corp8.cloud/{cam_id}/index.m3u8"
    try:
        req = urllib.request.Request(target_url, headers={"User-Agent": "Mozilla/5.0"})
        res = opener.open(req, timeout=5)
        content = res.read()
        return Response(content=content, media_type="application/vnd.apple.mpegurl")
    except Exception as e:
        # Re-login once if expired
        ensure_login()
        try:
            req = urllib.request.Request(target_url, headers={"User-Agent": "Mozilla/5.0"})
            res = opener.open(req, timeout=5)
            return Response(content=res.read(), media_type="application/vnd.apple.mpegurl")
        except Exception:
            raise HTTPException(status_code=502, detail="Upstream camera stream unreachable")

