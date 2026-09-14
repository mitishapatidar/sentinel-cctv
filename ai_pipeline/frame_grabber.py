import os
import time
import cv2

# System Requirement: Force RTSP over TCP for RTSP streams to prevent packet loss
# For HTTP/HLS streams, avoid forcing rtsp_transport to prevent connection stalls.

class FrameGrabber:
    def __init__(self, camera_id: str, stream_url: str):
        self.camera_id = camera_id
        self.stream_url = stream_url
        self.cap = None
        self.running = False
        self.backoff_sec = 2

    def connect(self):
        if self.stream_url.startswith("rtsp://"):
            os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
        else:
            os.environ.pop("OPENCV_FFMPEG_CAPTURE_OPTIONS", None)

        print(f"[{self.camera_id}] Connecting stream: {self.stream_url}")
        self.cap = cv2.VideoCapture(self.stream_url)
        if not self.cap.isOpened():
            print(f"[{self.camera_id}] Connection failed. Will retry.")
            return False
        self.backoff_sec = 2
        return True

    def read_frames(self, sample_interval_ms: int = 1000):
        """Yields sampled frames with monotonic PTS timestamps."""
        self.running = True
        last_yield_pts = -1

        while self.running:
            if not self.cap or not self.cap.isOpened():
                success = self.connect()
                if not success:
                    time.sleep(self.backoff_sec)
                    self.backoff_sec = min(self.backoff_sec * 2, 30) # Backoff up to 30s
                    continue

            ok, frame = self.cap.read()
            if not ok:
                print(f"[{self.camera_id}] Frame drop or loop cut. Reconnecting...")
                if self.cap:
                    self.cap.release()
                time.sleep(1)
                self.connect()
                continue

            # DO — Drive all timing from PTS, never from arrival time
            pts_ms = self.cap.get(cv2.CAP_PROP_POS_MSEC)

            # Sample every X ms to prevent GPU/CPU bottleneck
            if last_yield_pts == -1 or (pts_ms - last_yield_pts) >= sample_interval_ms:
                last_yield_pts = pts_ms
                yield {
                    "camera_id": self.camera_id,
                    "frame": frame,
                    "pts_ms": pts_ms,
                }

    def harvest_to_disk(self, output_base_dir: str = "ai_pipeline/dataset/raw", interval_sec: float = 4.0, max_frames: int = 140, max_duration_sec: float = None):
        """
        Batch harvests frames at a defined interval (default 1 frame every 4 seconds)
        and saves them directly to ai_pipeline/dataset/raw/<camera_id>/<timestamp>.jpg
        """
        cam_dir = os.path.join(output_base_dir, self.camera_id)
        os.makedirs(cam_dir, exist_ok=True)

        if not self.connect():
            print(f"[{self.camera_id}] Unable to connect to stream for harvesting.")
            return 0

        saved_count = 0
        last_saved_time = 0
        start_time = time.time()
        print(f"[{self.camera_id}] Starting frame harvest (Target: {max_frames} frames, 1 frame every {interval_sec}s)...")

        try:
            while saved_count < max_frames:
                if max_duration_sec and (time.time() - start_time) >= max_duration_sec:
                    print(f"[{self.camera_id}] Max duration of {max_duration_sec}s reached.")
                    break

                ok, frame = self.cap.read()
                if not ok:
                    time.sleep(0.3)
                    continue

                curr_time = time.time()
                if curr_time - last_saved_time >= interval_sec:
                    saved_count += 1
                    timestamp = int(curr_time)
                    filename = f"{timestamp}_{saved_count:05d}.jpg"
                    filepath = os.path.join(cam_dir, filename)

                    cv2.imwrite(filepath, frame)
                    last_saved_time = curr_time
                    if saved_count % 10 == 0 or saved_count <= 5:
                        print(f"[{self.camera_id}] Saved {saved_count}/{max_frames}: {filename} ({frame.shape[1]}x{frame.shape[0]})")

        except KeyboardInterrupt:
            print(f"[{self.camera_id}] Harvest interrupted by user.")
        finally:
            self.stop()

        print(f"[{self.camera_id}] Harvest complete: {saved_count} frames saved to '{cam_dir}'.")
        return saved_count

    def stop(self):
        self.running = False
        if self.cap:
            self.cap.release()

def batch_harvest_cameras(camera_ids, output_base_dir="ai_pipeline/dataset/raw", interval_sec=4.0, frames_per_camera=140, relay_base_url="http://127.0.0.1:8000/stream"):
    """
    Harvests frames from a collection of cameras sequentially or with safe failover.
    """
    summary = {}
    total_harvested = 0
    t_start = time.time()
    print("=" * 70)
    print(f"STARTING BATCH CCTV HARVEST: {len(camera_ids)} Cameras, Target ~{frames_per_camera * len(camera_ids)} frames")
    print("=" * 70)

    for idx, cam_id in enumerate(camera_ids, 1):
        stream_url = f"{relay_base_url}/{cam_id}/index.m3u8"
        print(f"\n--- Camera {idx}/{len(camera_ids)}: {cam_id} ---")
        grabber = FrameGrabber(cam_id, stream_url)
        count = grabber.harvest_to_disk(
            output_base_dir=output_base_dir,
            interval_sec=interval_sec,
            max_frames=frames_per_camera
        )
        summary[cam_id] = count
        total_harvested += count

    elapsed = time.time() - t_start
    print("\n" + "=" * 70)
    print("BATCH HARVEST SUMMARY")
    print("=" * 70)
    for cam_id, count in summary.items():
        print(f"  {cam_id:<10}: {count:>4} frames")
    print("-" * 70)
    print(f"TOTAL FRAMES HARVESTED: {total_harvested}")
    print(f"TOTAL TIME ELAPSED:     {elapsed / 60:.2f} minutes")
    print("=" * 70)
    return summary

