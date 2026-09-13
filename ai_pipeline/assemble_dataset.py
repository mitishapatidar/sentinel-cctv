import os
import sys
import shutil
import time
from pathlib import Path
import cv2
import yaml
import numpy as np
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
RAW_DIR = BASE_DIR / "dataset" / "raw"
FINAL_DIR = BASE_DIR / "dataset" / "final"
NEEDS_REVIEW_DIR = BASE_DIR / "dataset" / "_needs_review"

# Split assignments by Camera ID (Phase 4.3)
# 10 cameras Train (~70%), 3 cameras Val (~20%), 2 cameras Test (~10%)
CAMERA_SPLITS = {
    "train": ["cam01", "cam02", "cam03", "cam04", "cam07", "cam08", "cam09", "cam10", "cam11", "cam12"],
    "val": ["cam13", "cam14", "cam15"],
    "test": ["cam16", "cam17"]
}

def find_plate_in_crop(crop, plate_model):
    ch, cw = crop.shape[:2]
    if ch < 8 or cw < 15:
        return None

    # 1. Neural plate detection on crop with lightweight imgsz=192
    try:
        res = plate_model.predict(crop, imgsz=192, conf=0.10, verbose=False)
        boxes = res[0].boxes
        if len(boxes) > 0:
            b = boxes[0]
            x1, y1, x2, y2 = b.xyxy[0].cpu().numpy()
            pw, ph = x2 - x1, y2 - y1
            if ph >= 6 and pw >= 10:
                aspect = pw / float(ph)
                if 1.0 <= aspect <= 5.5:
                    return int(x1), int(y1), int(pw), int(ph), aspect, float(b.conf[0])
    except Exception:
        pass

    # 2. Fast rectangular morphology fallback
    try:
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (3, 3), 0)
        sobel = cv2.Sobel(blur, cv2.CV_8U, 1, 0, ksize=3)
        _, thresh = cv2.threshold(sobel, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (13, 3))
        closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        cnts, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        best = None
        max_score = 0
        for c in cnts:
            x, y, w, h = cv2.boundingRect(c)
            aspect = w / float(h)
            area = w * h
            if 1.2 <= aspect <= 5.2 and 100 <= area <= 12000 and h >= 8:
                score = area * (1.2 if aspect >= 2.2 else 0.9)
                if score > max_score:
                    max_score = score
                    best = (x, y, w, h, aspect, 0.70)
        return best
    except Exception:
        return None

def assemble_dataset():
    print("=" * 70, flush=True)
    print("PHASE 4: HIGH-SPEED DATASET ASSEMBLY & CAMERA-BASED SPLIT", flush=True)
    print("=" * 70, flush=True)

    # Clean / prepare directory structure
    for split in ["train", "val", "test"]:
        s_img = FINAL_DIR / split / "images"
        s_lbl = FINAL_DIR / split / "labels"
        if s_img.exists():
            shutil.rmtree(s_img)
        if s_lbl.exists():
            shutil.rmtree(s_lbl)
        s_img.mkdir(parents=True, exist_ok=True)
        s_lbl.mkdir(parents=True, exist_ok=True)
    
    if NEEDS_REVIEW_DIR.exists():
        shutil.rmtree(NEEDS_REVIEW_DIR)
    NEEDS_REVIEW_DIR.mkdir(parents=True, exist_ok=True)

    # Write data.yaml
    data_yaml = {
        "path": str(FINAL_DIR.resolve()).replace("\\", "/"),
        "train": "train/images",
        "val": "val/images",
        "test": "test/images",
        "names": {
            0: "plate_single_line",
            1: "plate_two_line"
        }
    }
    with open(FINAL_DIR / "data.yaml", "w", encoding="utf-8") as f:
        yaml.dump(data_yaml, f, sort_keys=False)
    print(f"[Config] Generated {FINAL_DIR / 'data.yaml'}", flush=True)

    # Load models
    print("\nLoading models: YOLOv8n (Vehicle Detector) + Plate Detection Head...", flush=True)
    v_model = YOLO("yolov8n.pt")
    
    plate_model_path = BASE_DIR / "models" / "joker_plate.pt"
    if not plate_model_path.exists():
        plate_model_path = BASE_DIR / "models" / "pretrained_plate_yolov8n.pt"
    p_model = YOLO(str(plate_model_path))

    cam_to_split = {}
    for split, cams in CAMERA_SPLITS.items():
        for c in cams:
            cam_to_split[c] = split

    all_raw_images = sorted(list(RAW_DIR.glob("*/*.jpg")))
    total_raw = len(all_raw_images)
    print(f"Processing {total_raw} harvested frames across {len(cam_to_split)} cameras...", flush=True)

    counts = {
        "total_inspected": 0,
        "discarded_no_vehicle": 0,
        "needs_review": 0,
        "train_images": 0,
        "val_images": 0,
        "test_images": 0,
        "train_plates": 0,
        "val_plates": 0,
        "test_plates": 0,
        "single_line": 0,
        "two_line": 0
    }

    t0 = time.time()
    for idx, img_path in enumerate(all_raw_images):
        counts["total_inspected"] += 1
        cam_id = img_path.parent.name
        split = cam_to_split.get(cam_id, "train")

        img = cv2.imread(str(img_path))
        if img is None:
            continue
        h, w = img.shape[:2]

        # Vehicle detection with fast imgsz=640
        v_res = v_model.predict(img, imgsz=640, classes=[2, 3, 5, 7], conf=0.25, verbose=False)
        v_boxes = v_res[0].boxes

        if len(v_boxes) == 0:
            counts["discarded_no_vehicle"] += 1
            continue

        yolo_labels = []
        for vb in v_boxes:
            cls_name = v_model.names[int(vb.cls[0])]
            vx1, vy1, vx2, vy2 = [int(v) for v in vb.xyxy[0].cpu().numpy()]
            vw, vh = vx2 - vx1, vy2 - vy1

            if vw < 30 or vh < 30:
                continue

            if cls_name in ["car", "bus", "truck"]:
                y_start = vy1 + int(vh * 0.4)
                vcrop = img[y_start:vy2, vx1:vx2]
                offset_y = y_start
            else:
                vcrop = img[vy1:vy2, vx1:vx2]
                offset_y = vy1

            plate_box = find_plate_in_crop(vcrop, p_model)
            if plate_box:
                px, py, pw, ph, aspect, conf = plate_box
                gx1, gy1 = vx1 + px, offset_y + py
                gx2, gy2 = gx1 + pw, gy1 + ph

                is_single = aspect >= 2.2
                cls_id = 0 if is_single else 1

                if is_single:
                    counts["single_line"] += 1
                else:
                    counts["two_line"] += 1

                if split == "train":
                    counts["train_plates"] += 1
                elif split == "val":
                    counts["val_plates"] += 1
                else:
                    counts["test_plates"] += 1

                # Normalize coordinates
                cx = (gx1 + gx2) / 2.0 / w
                cy = (gy1 + gy2) / 2.0 / h
                nw = pw / float(w)
                nh = ph / float(h)
                yolo_labels.append(f"{cls_id} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")

        base_name = f"{cam_id}_{img_path.stem}"

        if len(yolo_labels) == 0:
            counts["needs_review"] += 1
            if counts["needs_review"] <= 50:
                shutil.copyfile(img_path, NEEDS_REVIEW_DIR / f"{base_name}.jpg")
        else:
            dest_img = FINAL_DIR / split / "images" / f"{base_name}.jpg"
            dest_lbl = FINAL_DIR / split / "labels" / f"{base_name}.txt"
            shutil.copyfile(img_path, dest_img)
            with open(dest_lbl, "w", encoding="utf-8") as f:
                f.write("\n".join(yolo_labels))

            if split == "train":
                counts["train_images"] += 1
            elif split == "val":
                counts["val_images"] += 1
            else:
                counts["test_images"] += 1

        if (idx + 1) % 100 == 0 or (idx + 1) == total_raw:
            elapsed = time.time() - t0
            fps = (idx + 1) / max(0.1, elapsed)
            print(f"[{idx + 1:4d}/{total_raw}] ({fps:.1f} fps) | Train: {counts['train_images']:3d} | Val: {counts['val_images']:3d} | Test: {counts['test_images']:3d} | Discarded: {counts['discarded_no_vehicle']:3d} | Review: {counts['needs_review']:3d}", flush=True)

    print("\n" + "=" * 70, flush=True)
    print("PHASE 4 DATASET ASSEMBLY SUMMARY", flush=True)
    print("=" * 70, flush=True)
    print(f"Total Raw Harvested Frames:        {counts['total_inspected']}", flush=True)
    print(f"Discarded Frames (No Vehicle):      {counts['discarded_no_vehicle']} ({counts['discarded_no_vehicle']/counts['total_inspected']*100:.1f}%)", flush=True)
    print(f"Flagged for Review (Hard Negatives):{counts['needs_review']}", flush=True)
    print("-" * 70, flush=True)
    print("CAMERA-BASED SPLIT BREAKDOWN:", flush=True)
    print(f"Train Set (Cameras: {', '.join(CAMERA_SPLITS['train'])}):", flush=True)
    print(f"  - Images: {counts['train_images']} | Plates: {counts['train_plates']}", flush=True)
    print(f"Val Set (Cameras: {', '.join(CAMERA_SPLITS['val'])}):", flush=True)
    print(f"  - Images: {counts['val_images']} | Plates: {counts['val_plates']}", flush=True)
    print(f"Test Set (Cameras: {', '.join(CAMERA_SPLITS['test'])}):", flush=True)
    print(f"  - Images: {counts['test_images']} | Plates: {counts['test_plates']}", flush=True)
    print("-" * 70, flush=True)
    total_active = counts['train_images'] + counts['val_images'] + counts['test_images']
    total_plates = counts['train_plates'] + counts['val_plates'] + counts['test_plates']
    print(f"Total Labeled Images:              {total_active}", flush=True)
    print(f"Total Labeled Plates:              {total_plates}", flush=True)
    print(f"  - Single-line (ratio >= 2.2):     {counts['single_line']} ({counts['single_line']/max(1, total_plates)*100:.1f}%)", flush=True)
    print(f"  - Two-line (ratio < 2.2):        {counts['two_line']} ({counts['two_line']/max(1, total_plates)*100:.1f}%)", flush=True)
    print(f"Data Configuration Saved to:       {FINAL_DIR / 'data.yaml'}", flush=True)
    print("=" * 70, flush=True)

if __name__ == "__main__":
    assemble_dataset()
