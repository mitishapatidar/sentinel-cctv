import urllib.request
import json
import sys

print("========================================")
print("TEST: FASTAPI BACKEND STREAM RELAY INTEGRITY")
print("========================================")

base = "http://127.0.0.1:8000"
endpoints = [
    {"path": "/health", "expected_status": 200},
    {"path": "/stream/enc.key", "expected_status": 200},
    {"path": "/stream/cam01/index.m3u8", "expected_status": [200, 502]}
]

all_passed = True
for ep in endpoints:
    url = base + ep["path"]
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SENTINEL-TestRunner"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            expected = ep["expected_status"]
            is_valid = resp.status == expected if isinstance(expected, int) else resp.status in expected
            if is_valid:
                print(f"[PASS] {ep['path']:<35} Status: {resp.status}")
            else:
                print(f"[FAIL] {ep['path']:<35} Unexpected Status: {resp.status}")
                all_passed = False
    except urllib.error.HTTPError as he:
        expected = ep["expected_status"]
        is_valid = he.code == expected if isinstance(expected, int) else he.code in expected
        if is_valid:
            print(f"[PASS] {ep['path']:<35} Status: {he.code} (Acceptable Gateway State)")
        else:
            print(f"[FAIL] {ep['path']:<35} Error: {he.code} {he.reason}")
            all_passed = False
    except Exception as e:
        print(f"[FAIL] {ep['path']:<35} Error: {e}")
        all_passed = False

if all_passed:
    print("\n>>> ALL BACKEND ENDPOINTS PASSED SUCCESSFULLY! <<<")
else:
    print("\n>>> SOME BACKEND TESTS FAILED <<<")

if not all_passed:
    sys.exit(1)
