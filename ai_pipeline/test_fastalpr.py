"""
Task 1.2: Test fast-alpr on 10 frames from ai_pipeline/dataset/_connectivity_check/
Saves annotated images with boxes + OCR text to ai_pipeline/dataset/_fastalpr_test/
"""

import os
import sys
from pathlib import Path
import cv2
import numpy as np

# Ensure root is in sys.path
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fast_alpr import ALPR

def run_fastalpr_test():
    input_dir = BASE_DIR / "dataset" / "_connectivity_check"
    output_dir = BASE_DIR / "dataset" / "_fastalpr_test"
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("TASK 1.2: TESTING FAST-ALPR ON 10 SURVEILLANCE FRAMES")
    print("=" * 70)

    # Initialize ALPR with ONNX runtime
    print("Initializing fast-alpr (detector: yolo-v9-t-640, ocr: cct-xs-v2)...")
    alpr = ALPR(
        detector_model="yolo-v9-t-640-license-plate-end2end",
        detector_conf_thresh=0.15,
        ocr_model="cct-xs-v2-global-model"
    )

    # Select 10 frames
    all_imgs = sorted(list(input_dir.glob("*.jpg")))
    test_imgs = all_imgs[:10]
    print(f"Selected {len(test_imgs)} test frames from {input_dir.name}\n")

    summary = []

    for idx, img_path in enumerate(test_imgs, 1):
        img = cv2.imread(str(img_path))
        if img is None:
            print(f"[{idx:02d}] Failed to load {img_path.name}")
            continue

        h, w = img.shape[:2]
        annotated = img.copy()

        # Run prediction
        results = alpr.predict(img)
        det_count = len(results)

        print(f"[{idx:02d}] {img_path.name:<12} ({w}x{h}): {det_count} detection(s) found")

        img_detections = []
        for d_idx, res in enumerate(results, 1):
            bb = res.detection.bounding_box
            conf = res.detection.confidence
            ocr_text = res.ocr.text if (res.ocr and res.ocr.text) else "(no OCR text)"
            bx1, by1, bx2, by2 = bb.x1, bb.y1, bb.x2, bb.y2
            bw, bh = bx2 - bx1, by2 - by1

            print(f"     Det #{d_idx}: Box=[{bx1}, {by1}, {bx2}, {by2}] | Size={bw}x{bh} px | Conf={conf:.3f} | OCR=\"{ocr_text}\"")

            # Draw box
            color = (0, 255, 0)
            cv2.rectangle(annotated, (bx1, by1), (bx2, by2), color, 2)

            # Draw label
            label = f"{ocr_text} ({conf:.2f})"
            cv2.putText(annotated, label, (bx1, max(20, by1 - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 3, cv2.LINE_AA)
            cv2.putText(annotated, label, (bx1, max(20, by1 - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 1, cv2.LINE_AA)

            # Save crop for inspection
            crop = img[max(0, by1):min(h, by2), max(0, bx1):min(w, bx2)]
            if crop.size > 0:
                crop_path = output_dir / f"{img_path.stem}_det{d_idx}_{bw}x{bh}.jpg"
                cv2.imwrite(str(crop_path), crop)

            img_detections.append({
                "box": [bx1, by1, bx2, by2],
                "size": f"{bw}x{bh}",
                "conf": conf,
                "ocr": ocr_text
            })

        out_path = output_dir / f"annotated_{img_path.name}"
        cv2.imwrite(str(out_path), annotated)

        summary.append({
            "name": img_path.name,
            "detections": img_detections,
            "out_file": out_path.name
        })

    print("\n" + "=" * 70)
    print("TASK 1.2 TEST SUMMARY")
    print("=" * 70)
    total_dets = sum(len(s["detections"]) for s in summary)
    print(f"Total Frames Tested:     {len(summary)}")
    print(f"Frames With Detections:  {sum(1 for s in summary if len(s['detections']) > 0)}")
    print(f"Total Plates Detected:   {total_dets}")
    print(f"Annotated Images Saved:  {output_dir}")
    print("=" * 70)

if __name__ == "__main__":
    run_fastalpr_test()
