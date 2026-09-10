import urllib.request
import json

print("========================================")
print("TEST 1: FASTAPI BACKEND API INTEGRITY")
print("========================================")

base = "http://127.0.0.1:8000"
endpoints = [
    "/health",
    "/api/cameras",
    "/api/watchlist",
    "/api/alerts",
    "/api/vehicles/track?plate=GJ-05-AB-1234"
]

all_passed = True
for ep in endpoints:
    url = base + ep
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            count = len(data) if isinstance(data, list) else len(data.keys())
            print(f"[PASS] {ep:<40} Status: {resp.status} (Items/Keys: {count})")
    except Exception as e:
        print(f"[FAIL] {ep:<40} Error: {e}")
        all_passed = False

if all_passed:
    print("\n>>> ALL BACKEND ENDPOINTS PASSED WITH ZERO ERRORS! <<<")
else:
    print("\n>>> SOME ENDPOINTS FAILED <<<")
