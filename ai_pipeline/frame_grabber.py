import os
import time
import cv2

# Rule from Official Hackathon Checklist: Force RTSP over TCP
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

class FrameGrabber:
    def __init__(self, camera_id: str, stream_url: str):
        self.camera_id = camera_id
        self.stream_url = stream_url
        self.cap = None
        self.running = False
        self.backoff_sec = 2

    def connect(self):
        print(f"[{self.camera_id}] Connecting stream via TCP: {self.stream_url}")
        self.cap = cv2.VideoCapture(self.stream_url, cv2.CAP_FFMPEG)
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

    def stop(self):
        self.running = False
        if self.cap:
            self.cap.release()
