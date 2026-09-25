import os
import re
import json
import time
import random
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

# Don't raise the same watchlist alert from the same camera more than once in this window
ALERT_COOLDOWN_SEC = 300


def alnum(text: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", (text or "").upper())


def edit_distance(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def match_plate(reading: str, identifier: str):
    """
    Compares an OCR reading with a watchlist plate.
    Returns "exact", "fuzzy" (1-2 characters off), "partial" (same last 4 digits, rest mostly
    unreadable - typical for low-resolution plates) or None.
    """
    r, t = alnum(reading), alnum(identifier)
    if len(r) < 4 or len(t) < 6:
        return None
    if r == t:
        return "exact"
    if len(r) >= 8 and edit_distance(r, t) <= 2:
        return "fuzzy"
    if r[-4:] == t[-4:] and r[-4:].isdigit() and edit_distance(r, t) <= 4:
        return "partial"
    return None


def _request(url, payload=None, method="GET"):
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=15) as resp:
        body = resp.read().decode("utf-8")
        return json.loads(body) if body else None


class WatchlistMatcher:
    def __init__(self):
        self.cached_watchlist = {}
        self._last_alert = {}  # (camera_id, watchlist_id) -> epoch seconds
        self.refresh_watchlist()

    def refresh_watchlist(self):
        """Fetches active vehicle watchlist entries from Supabase."""
        try:
            data = _request(f"{SUPABASE_URL}/rest/v1/watchlist?is_active=eq.true&entity_type=eq.vehicle")
            self.cached_watchlist = {item["identifier"]: item for item in data or []}
            print(f"[WatchlistMatcher] Loaded {len(self.cached_watchlist)} active vehicle targets.")
        except Exception as e:
            print("[WatchlistMatcher] Error refreshing watchlist:", e)

    def find_match(self, plate_number: str, raw_text: str = ""):
        """Best watchlist match for a reading: (entry, match_type) or (None, None)."""
        best, best_type, rank = None, None, {"exact": 3, "fuzzy": 2, "partial": 1}
        for identifier, entry in self.cached_watchlist.items():
            for candidate in (plate_number, raw_text):
                kind = match_plate(candidate, identifier) if candidate else None
                if kind and (best_type is None or rank[kind] > rank[best_type]):
                    best, best_type = entry, kind
        return best, best_type

    def process_detection(self, camera_id: str, camera_name: str, plate_number: str, pts_ms: float,
                          confidence: float = 0.95, raw_text: str = "", vehicle_type: str = None):
        """Stores the detection and raises an alert when it matches the watchlist."""
        plate_clean = (plate_number or "").strip().upper() or alnum(raw_text)
        if not plate_clean:
            return None

        try:
            det = {"camera_id": camera_id, "plate_number": plate_clean, "confidence": round(float(confidence), 3), "pts_ms": pts_ms}
            if vehicle_type:
                det["vehicle_type"] = vehicle_type
            _request(f"{SUPABASE_URL}/rest/v1/detections", det, method="POST")
        except Exception as e:
            print("[WatchlistMatcher] Detection insert error:", e)

        match, kind = self.find_match(plate_clean, raw_text)
        if not match:
            return None

        key = (camera_id, match["id"])
        if time.time() - self._last_alert.get(key, 0) < ALERT_COOLDOWN_SEC:
            return kind
        self._last_alert[key] = time.time()

        exact = kind == "exact"
        severity = ("critical" if match["category"] in ("stolen", "wanted") else "high") if exact else "medium"
        title = (
            f"{match['category'].upper()} vehicle detected: {match['identifier']}"
            if exact
            else f"Possible match: {match['identifier']} (read as {plate_clean})"
        )
        print(f"[MATCH {kind.upper()}] {plate_clean} ~ {match['identifier']} @ {camera_name}")
        try:
            _request(f"{SUPABASE_URL}/rest/v1/alerts", {
                "alert_code": f"ALT-{int(time.time() * 1000) % 1000000:06d}-{random.randint(10, 99)}",
                "alert_type": "Watchlist Match" if exact else "Possible Watchlist Match",
                "severity": severity,
                "camera_id": camera_id,
                "watchlist_id": match["id"],
                "title": title,
                "message": f"Seen at {camera_name}. OCR confidence {int(float(confidence) * 100)}%, match type: {kind}.",
                "status": "pending",
            }, method="POST")
        except Exception as e:
            print("[WatchlistMatcher] Alert trigger error:", e)
        return kind
