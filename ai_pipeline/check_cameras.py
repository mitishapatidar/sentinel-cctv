import os
import time
import json
import urllib.request
import cv2

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "dataset", "_connectivity_check")
CAMERAS_JSON = os.path.join(os.path.dirname(__file__), "..", "backend", "all_cameras.json")
RELAY_BASE = "http://127.0.0.1:8000/stream"

def check_all_cameras():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Load 30 cameras
    if os.path.exists(CAMERAS_JSON):
        with open(CAMERAS_JSON, "r", encoding="utf-8") as f:
            cameras = json.load(f)
    else:
        cameras = [{"id": f"cam{i:02d}", "name": f"Camera {i}"} for i in range(1, 31)]

    print("=" * 80)
    print("SENTINEL AI PIPELINE - 30 LIVE CCTV CONNECTIVITY AUDIT")
    print("=" * 80)
    print(f"Total Cameras Configured: {len(cameras)}")
    print(f"Saving single test frames to: {os.path.abspath(OUTPUT_DIR)}")
    print("-" * 80)
    print(f"{'Camera ID':<10} | {'Name':<32} | {'Reachable':<10} | {'Resolution':<12} | {'Time (s)':<8} | {'Notes'}")
    print("-" * 80)

    results = []

    for cam in cameras:
        cam_id = cam["id"]
        cam_name = cam.get("name", "")[:30]
        stream_url = f"{RELAY_BASE}/{cam_id}/index.m3u8"
        t0 = time.time()
        reachable = False
        res_str = "N/A"
        note = "OK"

        try:
            # 1. Quick manifest ping with 8s timeout
            req = urllib.request.Request(stream_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                manifest_data = resp.read().decode("utf-8")
                if "#EXTM3U" not in manifest_data:
                    note = "Invalid HLS manifest"
                    elapsed = time.time() - t0
                    print(f"{cam_id:<10} | {cam_name:<32} | {'No':<10} | {res_str:<12} | {elapsed:<8.2f} | {note}")
                    results.append({"id": cam_id, "name": cam_name, "reachable": False, "res": res_str, "time": elapsed, "note": note})
                    continue

            # 2. Capture exactly 1 frame via OpenCV
            cap = cv2.VideoCapture(stream_url)
            ret, frame = cap.read()
            elapsed = time.time() - t0

            if ret and frame is not None and frame.size > 0:
                h, w, c = frame.shape
                res_str = f"{w}x{h}"
                img_path = os.path.join(OUTPUT_DIR, f"{cam_id}.jpg")
                cv2.imwrite(img_path, frame)
                reachable = True
                note = f"Saved {cam_id}.jpg"
            else:
                note = "Opened stream but failed to decode video frame"
            
            cap.release()

        except Exception as e:
            elapsed = time.time() - t0
            note = str(e)[:35]

        reach_str = "YES" if reachable else "NO"
        print(f"{cam_id:<10} | {cam_name:<32} | {reach_str:<10} | {res_str:<12} | {elapsed:<8.2f} | {note}")
        results.append({"id": cam_id, "name": cam_name, "reachable": reachable, "res": res_str, "time": elapsed, "note": note})

    print("-" * 80)
    reachable_count = sum(1 for r in results if r["reachable"])
    print(f"SUMMARY: {reachable_count}/{len(cameras)} cameras verified operational and streaming.")
    print("=" * 80)
    return results

if __name__ == "__main__":
    check_all_cameras()
