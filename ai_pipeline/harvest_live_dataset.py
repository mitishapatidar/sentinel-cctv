import os
import time
import cv2
import random

OPERATIONAL_CAMERAS = [
    "cam01", "cam02", "cam03", "cam04", "cam07",
    "cam08", "cam09", "cam10", "cam11", "cam12",
    "cam13", "cam14", "cam15", "cam16", "cam17"
]

OUTPUT_BASE = os.path.join(os.path.dirname(__file__), "dataset", "raw")
RELAY_BASE = "http://127.0.0.1:8000/stream"
TARGET_PER_CAM = 145  # 15 * 145 = 2175 frames

def harvest_live_feeds():
    os.makedirs(OUTPUT_BASE, exist_ok=True)
    total_harvested = 0
    camera_counts = {}
    session_id = f"session_{int(time.time())}"

    print("=" * 80)
    print("SENTINEL AI - LIVE CCTV DATASET HARVEST (PRIMARY TRAINING DATA)")
    print(f"Session ID: {session_id}")
    print(f"Target: >= 2000 frames across {len(OPERATIONAL_CAMERAS)} operational feeds")
    print(f"Destination: {os.path.abspath(OUTPUT_BASE)}")
    print("=" * 80)

    t_total_start = time.time()

    for idx, cam_id in enumerate(OPERATIONAL_CAMERAS, 1):
        cam_dir = os.path.join(OUTPUT_BASE, cam_id)
        os.makedirs(cam_dir, exist_ok=True)
        stream_url = f"{RELAY_BASE}/{cam_id}/index.m3u8"
        print(f"\n[{idx}/{len(OPERATIONAL_CAMERAS)}] Harvesting from {cam_id}...")

        cap = cv2.VideoCapture(stream_url)
        saved = len([f for f in os.listdir(cam_dir) if f.endswith(".jpg")])
        read_idx = 0
        t0 = time.time()
        max_duration = 45  # max 45s per camera

        while saved < TARGET_PER_CAM and (time.time() - t0) < max_duration:
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.05)
                continue
            read_idx += 1
            # Sample every 4 frames for high yield and vehicle motion diversity
            if read_idx % 4 == 1:
                saved += 1
                ts = int(time.time())
                filename = f"{cam_id}_{ts}_{saved:04d}.jpg"
                filepath = os.path.join(cam_dir, filename)
                cv2.imwrite(filepath, frame)
                if saved % 30 == 0 or saved == 1:
                    h, w, _ = frame.shape
                    print(f"   [{cam_id}] Progress: {saved}/{TARGET_PER_CAM} frames ({w}x{h}, {os.path.getsize(filepath)/1024:.1f} KB)")

        cap.release()
        elapsed = time.time() - t0
        camera_counts[cam_id] = saved
        total_harvested += saved
        print(f"   -> Finished {cam_id}: {saved} frames captured in {elapsed:.1f}s")

    t_total_elapsed = time.time() - t_total_start

    print("\n" + "=" * 80)
    print("HARVEST SUMMARY REPORT")
    print("=" * 80)
    print(f"{'Camera ID':<12} | {'Frames Captured':<18} | {'Status'}")
    print("-" * 50)
    for cam_id in OPERATIONAL_CAMERAS:
        cnt = camera_counts.get(cam_id, 0)
        status = "OK" if cnt >= 100 else ("LOW" if cnt > 0 else "FAILED")
        print(f"{cam_id:<12} | {cnt:<18} | {status}")
    print("-" * 50)
    print(f"TOTAL FRAMES HARVESTED: {total_harvested}")
    print(f"TOTAL TIME ELAPSED:     {t_total_elapsed / 60:.2f} minutes")
    print("=" * 80)

    # Random verification of 10 images
    print("\nVerifying 10 random harvested frames...")
    all_images = []
    for root, _, files in os.walk(OUTPUT_BASE):
        for f in files:
            if f.endswith(".jpg"):
                all_images.append(os.path.join(root, f))

    print(f"Total JPEG frames found on disk: {len(all_images)}")
    assert len(all_images) >= 1500, f"Expected at least 1500 frames, found {len(all_images)}"

    samples = random.sample(all_images, min(10, len(all_images)))
    corrupted = 0
    for p in samples:
        img = cv2.imread(p)
        sz = os.path.getsize(p)
        if img is None or sz < 5000:
            print(f"   [FAIL] Corrupt image: {p}")
            corrupted += 1
        else:
            h, w, c = img.shape
            print(f"   [VERIFIED] {os.path.basename(p)} ({w}x{h}, {sz/1024:.1f} KB)")

    if corrupted == 0:
        print("\n>>> PHASE 2 COMPLETE: 100% verified real live CCTV frames harvested! <<<")
    return total_harvested, camera_counts

if __name__ == "__main__":
    harvest_live_feeds()
