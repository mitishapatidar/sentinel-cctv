"""
Continuous ANPR worker.

Round-robins over every registered camera, pulls the segment that is currently playing from the
local relay, samples frames, runs two-stage ANPR and writes detections (plus watchlist alerts) to
Supabase.

    python -m ai_pipeline.live_worker                 # all cameras, forever
    python -m ai_pipeline.live_worker --once          # one pass over all cameras
    python -m ai_pipeline.live_worker --cameras cam01 cam10 --fps 2
    python -m ai_pipeline.live_worker --daytime --once  # scan daytime footage (useful at night)

Needs the relay running (uvicorn backend.main:app on :8000) and SUPABASE_SERVICE_ROLE_KEY in .env.
"""
import argparse
import os
import re
import sys
import tempfile
import time
import urllib.request
from collections import defaultdict
from pathlib import Path

import cv2
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from ai_pipeline.anpr_engine import AnprEngine  # noqa: E402
from ai_pipeline.watchlist_matcher import WatchlistMatcher, SUPABASE_URL, _request, alnum  # noqa: E402

RELAY = os.getenv("RELAY_URL", "http://127.0.0.1:8000")
DEDUPE_SEC = 120          # same plate on the same camera is stored at most once per window
WATCHLIST_REFRESH_SEC = 300


def fetch(url, timeout=40):
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        return resp.read()


def load_cameras(only=None):
    rows = _request(f"{SUPABASE_URL}/rest/v1/cameras?select=id,name&order=id") or []
    cams = [(r["id"], r.get("name") or r["id"]) for r in rows]
    if only:
        cams = [c for c in cams if c[0] in set(only)] or [(c, c) for c in only]
    return cams


def daytime_segment(cam_id, cycle):
    """A daytime segment for this camera, different on every pass (for scanning recorded footage)."""
    from main import camera_range  # backend relay helpers

    rng = camera_range(cam_id)
    if not rng:
        return None
    total, d0, d1 = rng
    if d0 is None:
        d0, d1 = int(total * 0.3), int(total * 0.7)
    span = max(d1 - d0, 1)
    return f"seg{d0 + (cycle * 7919 + hash(cam_id) % 997) % span:05d}.ts"


def decode_segment(cam_id, segment, key):
    data = fetch(f"{RELAY}/stream/{cam_id}/{segment}")
    if len(data) < 1000:
        return None
    dec = Cipher(algorithms.AES(key), modes.CBC(bytes(16))).decryptor()
    path = Path(tempfile.gettempdir()) / f"sentinel_{cam_id}.ts"
    path.write_bytes(dec.update(data[: len(data) - len(data) % 16]) + dec.finalize())
    return path


def consensus(readings):
    """Groups readings of one segment by plate (or the last 6 raw characters) and keeps the best of each."""
    groups = defaultdict(list)
    for r in readings:
        # Unreadable prefixes vary frame to frame; the trailing 4-digit number is the stable part
        key = r["plate"] or "~" + alnum(r["raw"])[-4:]
        groups[key].append(r)
    out = []
    for items in groups.values():
        best = max(items, key=lambda r: r["confidence"])
        # Repeated sightings across frames raise confidence
        best = dict(best, confidence=min(0.99, best["confidence"] + 0.05 * (len(items) - 1)), hits=len(items))
        out.append(best)
    return out


def main():
    ap = argparse.ArgumentParser(description="Continuous ANPR over relay camera feeds")
    ap.add_argument("--cameras", nargs="*", help="camera ids (default: every camera in the registry)")
    ap.add_argument("--fps", type=float, default=1.0, help="frames analysed per second of video")
    ap.add_argument("--once", action="store_true", help="single pass over the cameras, then exit")
    ap.add_argument("--segment", help="process one specific segment (e.g. seg13162.ts) on each camera")
    ap.add_argument("--passes", type=int, default=0, help="stop after this many passes (0 = run forever)")
    ap.add_argument("--daytime", action="store_true", help="scan daytime segments instead of the live one")
    ap.add_argument("--min-length", type=int, default=6, help="ignore raw readings shorter than this")
    args = ap.parse_args()

    engine = AnprEngine()
    matcher = WatchlistMatcher()
    key = fetch(f"{RELAY}/stream/enc.key", timeout=10)
    cameras = load_cameras(args.cameras)
    print(f"[Worker] {len(cameras)} cameras, {args.fps} fps, {'daytime scan' if args.daytime else 'live'} mode")

    last_seen = {}
    last_refresh = time.time()
    cycle = 0
    while True:
        cycle += 1
        for cam_id, cam_name in cameras:
            t0 = time.time()
            try:
                if args.segment:
                    segment = args.segment
                elif args.daytime:
                    segment = daytime_segment(cam_id, cycle)
                else:
                    m3u8 = fetch(f"{RELAY}/stream/{cam_id}/index.m3u8", timeout=10).decode()
                    found = re.findall(r"(seg\d+\.ts)", m3u8)
                    segment = found[0] if found else None
                path = decode_segment(cam_id, segment, key) if segment else None
                if not path:
                    print(f"[Worker] {cam_id}: no footage")
                    continue

                cap = cv2.VideoCapture(str(path))
                step = max(int((cap.get(cv2.CAP_PROP_FPS) or 25) / args.fps), 1)
                readings, idx, frames = [], 0, 0
                while True:
                    ok, frame = cap.read()
                    if not ok:
                        break
                    if idx % step == 0:
                        frames += 1
                        # Keep valid plates, or partial reads that at least end in the 4-digit number
                        readings += [
                            r for r in engine.read_frame(frame)
                            if r["plate"] or (len(r["raw"]) >= args.min_length and re.search(r"\d{4}$", r["raw"]))
                        ]
                    idx += 1
                cap.release()

                seq = int(re.search(r"\d+", segment).group())
                stored = []
                for r in consensus(readings):
                    ident = r["plate"] or alnum(r["raw"])
                    if time.time() - last_seen.get((cam_id, ident), 0) < DEDUPE_SEC:
                        continue
                    last_seen[(cam_id, ident)] = time.time()
                    kind = matcher.process_detection(cam_id, cam_name, r["plate"], seq * 6000, r["confidence"],
                                                     raw_text=r["raw"], vehicle_type=r["vehicle_type"])
                    stored.append(ident + (f" [{kind}]" if kind else ""))
                print(f"[Worker] {cam_id} {segment}: {frames} frames in {time.time() - t0:.1f}s -> {stored or 'no plates'}", flush=True)
            except Exception as e:
                print(f"[Worker] {cam_id}: {e}", flush=True)

            if time.time() - last_refresh > WATCHLIST_REFRESH_SEC:
                matcher.refresh_watchlist()
                last_refresh = time.time()

        if args.once or (args.passes and cycle >= args.passes):
            break


if __name__ == "__main__":
    main()
