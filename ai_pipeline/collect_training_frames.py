import os
import time
import argparse
import cv2

# Default target cameras from the SENTINEL live grid
DEFAULT_CAMERAS = {
    "cam01": "http://127.0.0.1:8000/stream/cam01/index.m3u8",
    "cam04": "http://127.0.0.1:8000/stream/cam04/index.m3u8",
    "cam06": "http://127.0.0.1:8000/stream/cam06/index.m3u8",
    "cam12": "http://127.0.0.1:8000/stream/cam12/index.m3u8",
}

def harvest_frames(camera_id="cam04", stream_url=None, max_frames=50, interval_sec=2, output_dir="ai_pipeline/dataset/raw"):
    """
    Connects to the specified live CCTV grid stream, samples high-quality frames
    at regular intervals, and saves them for YOLO dataset training.
    """
    if not stream_url:
        stream_url = DEFAULT_CAMERAS.get(camera_id, f"http://127.0.0.1:8000/stream/{camera_id}/index.m3u8")

    os.makedirs(output_dir, exist_ok=True)
    print(f"\n[SENTINEL Dataset Harvester]")
    print(f"Connecting to Camera: {camera_id}")
    print(f"Stream URL: {stream_url}")
    print(f"Target Frames: {max_frames} (1 frame every {interval_sec}s)")
    print(f"Saving to: {os.path.abspath(output_dir)}\n")

    # RTSP/HLS transport configuration
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
    cap = cv2.VideoCapture(stream_url)

    if not cap.isOpened():
        print(f"[ERROR] Unable to open stream: {stream_url}")
        print("Tip: Make sure the FastAPI relay is running (python -m uvicorn main:app on port 8000)")
        return 0

    saved_count = 0
    last_saved_time = 0

    try:
        while saved_count < max_frames:
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.5)
                continue

            current_time = time.time()
            if current_time - last_saved_time >= interval_sec:
                saved_count += 1
                timestamp = int(current_time)
                filename = f"{camera_id}_{timestamp}_{saved_count:04d}.jpg"
                filepath = os.path.join(output_dir, filename)

                # Save raw high-res frame
                cv2.imwrite(filepath, frame)
                last_saved_time = current_time
                print(f"[{saved_count}/{max_frames}] Saved: {filename} (Res: {frame.shape[1]}x{frame.shape[0]})")

    except KeyboardInterrupt:
        print("\n[INFO] Capture paused by user.")
    finally:
        cap.release()

    print(f"\n[SUCCESS] Harvested {saved_count} frames into '{output_dir}'.")
    print("Next step: Upload this folder to Roboflow.com to auto-label plates and train YOLOv8.")
    return saved_count

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Harvest live CCTV grid frames for ANPR model training")
    parser.add_argument("--camera", type=str, default="cam04", help="Camera ID (e.g. cam01, cam04, cam12)")
    parser.add_argument("--url", type=str, default=None, help="Custom stream URL")
    parser.add_argument("--frames", type=int, default=30, help="Number of frames to capture")
    parser.add_argument("--interval", type=float, default=2.0, help="Interval in seconds between frames")
    parser.add_argument("--out", type=str, default="ai_pipeline/dataset/raw", help="Output directory")

    args = parser.parse_args()
    harvest_frames(
        camera_id=args.camera,
        stream_url=args.url,
        max_frames=args.frames,
        interval_sec=args.interval,
        output_dir=args.out
    )
