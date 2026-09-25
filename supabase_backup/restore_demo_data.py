"""
Restores the demo/seed data that was removed on 2026-09-25 (watchlist, detections, alerts).

    python supabase_backup/restore_demo_data.py

Rows keep their original ids, so running it twice is safe (existing ids are skipped).
Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the root .env.
"""
import json
import os
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
    if line.strip() and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())

URL = os.getenv("SUPABASE_URL", "https://splqtcnmbxjojxjeauzt.supabase.co")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DATA = Path(__file__).resolve().parent / "demo_data_2026-09-25"

# Order matters: alerts reference watchlist entries
for table in ("watchlist", "detections", "alerts"):
    rows = json.loads((DATA / f"{table}.json").read_text(encoding="utf-8"))
    for row in rows:
        row.pop("cameras", None)
    req = urllib.request.Request(
        f"{URL}/rest/v1/{table}",
        data=json.dumps(rows).encode("utf-8"),
        method="POST",
        headers={
            "apikey": KEY,
            "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=ignore-duplicates,return=minimal",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        print(f"{table}: {len(rows)} rows restored (HTTP {resp.status})")
