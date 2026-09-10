import os
import json
import urllib.request
from pathlib import Path

# Auto-load .env if present
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip() and not line.startswith("#") and "=" in line:
                k, v = line.strip().split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://splqtcnmbxjojxjeauzt.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

class WatchlistMatcher:
    def __init__(self):
        self.cached_watchlist = {}
        self.refresh_watchlist()

    def refresh_watchlist(self):
        """Fetches active watchlist entities from Supabase."""
        try:
            url = f"{SUPABASE_URL}/rest/v1/watchlist?is_active=eq.true"
            headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json"
            }
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                self.cached_watchlist = {item["identifier"]: item for item in data}
                print(f"[WatchlistMatcher] Loaded {len(self.cached_watchlist)} active targets.")
        except Exception as e:
            print("[WatchlistMatcher] Error refreshing watchlist:", e)

    def process_detection(self, camera_id: str, camera_name: str, plate_number: str, pts_ms: float, confidence: float = 0.95):
        """Processes a detected vehicle plate and triggers automated alert if matched."""
        plate_clean = plate_number.strip().upper()
        
        # 1. Store in Detections Table
        try:
            det_url = f"{SUPABASE_URL}/rest/v1/detections"
            det_payload = {
                "camera_id": camera_id,
                "plate_number": plate_clean,
                "confidence": confidence,
                "pts_ms": pts_ms
            }
            headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }
            req = urllib.request.Request(det_url, data=json.dumps(det_payload).encode("utf-8"), headers=headers, method="POST")
            with urllib.request.urlopen(req) as resp:
                det_record = json.loads(resp.read().decode("utf-8"))[0]
        except Exception as e:
            print("[WatchlistMatcher] Detection insert error:", e)
            det_record = None

        # 2. Check Match
        match = self.cached_watchlist.get(plate_clean)
        if match:
            print(f"[MATCH FOUND] Vehicle: {plate_clean} | Category: {match['category']} @ {camera_name}")
            # Insert into Alerts
            try:
                alert_url = f"{SUPABASE_URL}/rest/v1/alerts"
                import time, random
                alert_code = f"ALT-{int(time.time() * 1000) % 1000000:06d}-{random.randint(10, 99)}"
                alert_payload = {
                    "alert_code": alert_code,
                    "alert_type": "Watchlist Match",
                    "severity": "critical" if match["category"] == "stolen" else "high",
                    "camera_id": camera_id,
                    "watchlist_id": match["id"],
                    "title": f"{match['category'].upper()} Vehicle Detected: {plate_clean}",
                    "message": f"Identified at {camera_name}. Match confidence {int(confidence * 100)}%. Automated law enforcement intercept notified.",
                    "status": "pending"
                }
                req_alert = urllib.request.Request(alert_url, data=json.dumps(alert_payload).encode("utf-8"), headers=headers, method="POST")
                with urllib.request.urlopen(req_alert) as resp:
                    print(f"[SUCCESS] Alert {alert_code} registered in system.")
            except Exception as e:
                print("[WatchlistMatcher] Alert trigger error:", e)
