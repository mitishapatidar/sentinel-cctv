"""
Task 1.4: Run updated plate_reader.py on 10 surveillance frames from _connectivity_check
"""

import sys
from pathlib import Path
import cv2

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai_pipeline.plate_reader import PlateReader

def main():
    input_dir = PROJECT_ROOT / "ai_pipeline" / "dataset" / "_connectivity_check"
    test_imgs = sorted(list(input_dir.glob("*.jpg")))[:10]

    print("=" * 70)
    print("TASK 1.4: RUNNING NEW PLATE_READER ON 10 SURVEILLANCE FRAMES")
    print("=" * 70)

    for idx, p in enumerate(test_imgs, 1):
        img = cv2.imread(str(p))
        if img is None:
            continue
        h, w = img.shape[:2]
        dets = PlateReader.parse_frame_for_plates(img, conf_threshold=0.15)
        print(f"[{idx:02d}] {p.name:<12} ({w}x{h}): {len(dets)} plate detection(s)")
        for d in dets:
            plate = d.get("plate_number", "")
            raw = d.get("raw_ocr", "")
            conf = d.get("confidence", 0.0)
            cls_name = d.get("class_name", "")
            ratio = d.get("aspect_ratio", 0.0)
            box = d.get("bbox", [])
            bw = box[2] - box[0]
            bh = box[3] - box[1]
            print(f"     Class: {cls_name:<17} | Ratio={ratio:.2f} (thresh=2.5) | Conf={conf:.3f} | Box={box} ({bw}x{bh} px)")
            print(f"     Raw OCR Text: \"{raw}\" -> Normalized HSRP Plate: \"{plate if plate else '(unmatched)'}\"")

    print("=" * 70)

if __name__ == "__main__":
    main()
