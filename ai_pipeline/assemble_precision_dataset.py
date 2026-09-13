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

# Camera splits (Phase 4.3)
CAMERA_SPLITS = {
    "train": ["cam01", "cam02", "cam03", "cam04", "cam07", "cam08", "cam09", "cam10", "cam11", "cam12"],
    "val": ["cam13", "cam14", "cam15"],
    "test": ["cam16", "cam17"]
}

def verify_plate_region(crop):
    if crop.shape[0] < 6 or crop.shape[1] < 10:
        return False
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    mean_val = np.mean(gray)
    if mean_val < 35 or mean_val > 240:
        return False
    sobel_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    if np.mean(np.abs(sobel_x)) < 8.0:
        return False
    if np.std(gray) < 15.0:
        return False
    return True

def extract_plate_from_crop(vcrop, cls_name, p_model, p_model_single):
    ch, cw = vcrop.shape[:2]
    if ch < 10 or cw < 14:
        return None

    # Fast CLAHE on L channel
    lab = cv2.cvtColor(vcrop, cv2.COLOR_BGR2LAB)
    l, a, b_ch = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(6, 6))
    cl = clahe.apply(l)
    enhanced = cv2.cvtColor(cv2.merge((cl, a, b_ch)), cv2.COLOR_LAB2BGR)

    scale = max(1.0, min(2.5, 192.0 / max(cw, ch)))
    target_w = int(cw * scale)
    target_h = int(ch * scale)
    upscaled = cv2.resize(enhanced, (target_w, target_h), interpolation=cv2.INTER_LINEAR)

    try:
        res = p_model.predict(upscaled, imgsz=192, conf=0.10, verbose=False)
        boxes = res[0].boxes
        if len(boxes) == 0 and p_model_single is not None:
            # Secondary check with single-line specialist
            res = p_model_single.predict(upscaled, imgsz=192, conf=0.10, verbose=False)
            boxes = res[0].boxes

        if len(boxes) > 0:
            b = boxes[0]
            conf = float(b.conf[0])
            bx1, by1, bx2, by2 = [int(v) for v in b.xyxy[0].cpu().numpy()]
            rx1 = int(bx1 / scale)
            ry1 = int(by1 / scale)
            rx2 = int(bx2 / scale)
            ry2 = int(by2 / scale)
            pw, ph = rx2 - rx1, ry2 - ry1

            if pw >= 8 and ph >= 5:
                aspect = pw / float(ph)
                if 1.0 <= aspect <= 5.8:
                    plate_patch = vcrop[ry1:ry2, rx1:rx2]
                    if verify_plate_region(plate_patch):
                        # Calibrated Single-Line vs Two-Line determination:
                        if cls_name in ["motorcycle"]:
                            is_single = False
                        elif cls_name in ["car", "bus", "truck"]:
                            # Perspective foreshortening threshold calibrated to 1.6
                            is_single = aspect >= 1.6
                        else:
                            is_single = aspect >= 2.1

                        return (rx1, ry1, pw, ph, is_single, aspect, conf)
    except Exception:
        pass

    return None

def assemble_precision_dataset(step=2):
    print("=" * 70, flush=True)
    print("HIGH-SPEED PRECISION DATASET ASSEMBLY (STEP=2 DIVERSITY SAMPLING)", flush=True)
    print("=" * 70, flush=True)

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

    data_yaml = {
        "path": str(FINAL_DIR.resolve()).replace("\\", "/"),
        "train": "train/images",
        "val": "val/images",
        "test": "test/images",
        "names": {0: "plate_single_line", 1: "plate_two_line"}
    }
    with open(FINAL_DIR / "data.yaml", "w", encoding="utf-8") as f:
        yaml.dump(data_yaml, f, sort_keys=False)

    print("Loading models: YOLOv8n (Vehicle) + Precision Plate Heads...", flush=True)
    v_model = YOLO("yolov8n.pt")
    p_model = YOLO(str(BASE_DIR / "models" / "pretrained_plate_yolov8n.pt"))
    p_model_single = YOLO(str(BASE_DIR / "models" / "love671_plate.pt"))

    cam_to_split = {}
    for split, cams in CAMERA_SPLITS.items():
        for c in cams:
            cam_to_split[c] = split

    all_raw_images = sorted(list(RAW_DIR.glob("*/*.jpg")))[::step]
    total_raw = len(all_raw_images)
    print(f"Processing {total_raw} diverse sampled frames across 15 cameras...", flush=True)

    counts = {
        "inspected": 0, "discarded": 0, "review": 0,
        "train_img": 0, "val_img": 0, "test_img": 0,
        "single_line": 0, "two_line": 0
    }

    t0 = time.time()
    for idx, img_p in enumerate(all_raw_images):
        counts["inspected"] += 1
        cam_id = img_p.parent.name
        split = cam_to_split.get(cam_id, "train")

        img = cv2.imread(str(img_p))
        if img is None:
            continue
        h, w = img.shape[:2]

        v_res = v_model.predict(img, imgsz=640, classes=[2, 3, 5, 7], conf=0.25, verbose=False)
        v_boxes = v_res[0].boxes

        if len(v_boxes) == 0:
            counts["discarded"] += 1
            continue

        yolo_labels = []
        for vb in v_boxes:
            cls_name = v_model.names[int(vb.cls[0])]
            vx1, vy1, vx2, vy2 = [int(v) for v in vb.xyxy[0].cpu().numpy()]
            vw, vh = vx2 - vx1, vy2 - vy1

            if vw < 26 or vh < 26:
                continue

            if cls_name in ["car", "bus", "truck"]:
                y_start = vy1 + int(vh * 0.42)
                vcrop = img[y_start:vy2, vx1:vx2]
                offset_y = y_start
            else:
                vcrop = img[vy1:vy2, vx1:vx2]
                offset_y = vy1

            plate_info = extract_plate_from_crop(vcrop, cls_name, p_model, p_model_single)
            if plate_info:
                rx1, ry1, pw, ph, is_single, aspect, conf = plate_info
                gx1 = vx1 + rx1
                gy1 = offset_y + ry1
                gx2 = gx1 + pw
                gy2 = gy1 + ph

                cls_id = 0 if is_single else 1
                if is_single:
                    counts["single_line"] += 1
                else:
                    counts["two_line"] += 1

                cx = (gx1 + gx2) / 2.0 / w
                cy = (gy1 + gy2) / 2.0 / h
                nw = pw / float(w)
                nh = ph / float(h)
                yolo_labels.append(f"{cls_id} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")

        base_name = f"{cam_id}_{img_p.stem}"

        if len(yolo_labels) == 0:
            counts["review"] += 1
        else:
            dest_img = FINAL_DIR / split / "images" / f"{base_name}.jpg"
            dest_lbl = FINAL_DIR / split / "labels" / f"{base_name}.txt"
            shutil.copyfile(img_p, dest_img)
            with open(dest_lbl, "w", encoding="utf-8") as f:
                f.write("\n".join(yolo_labels))

            if split == "train":
                counts["train_img"] += 1
            elif split == "val":
                counts["val_img"] += 1
            else:
                counts["test_img"] += 1

        if (idx + 1) % 150 == 0 or (idx + 1) == total_raw:
            elapsed = time.time() - t0
            fps = (idx + 1) / max(0.1, elapsed)
            print(f"[{idx + 1:4d}/{total_raw}] ({fps:.1f} fps) | Train: {counts['train_img']:3d} | Val: {counts['val_img']:3d} | Test: {counts['test_img']:3d} | Single: {counts['single_line']:3d} | Two: {counts['two_line']:3d}", flush=True)

    print("\n" + "=" * 70, flush=True)
    print("HIGH-PRECISION DATASET ASSEMBLED SUCCESSFULLY", flush=True)
    print("=" * 70, flush=True)
    total_plates = counts["single_line"] + counts["two_line"]
    print(f"Total Sampled Live Frames:    {counts['inspected']}", flush=True)
    print(f"Total Valid Labeled Frames:   {counts['train_img'] + counts['val_img'] + counts['test_img']}", flush=True)
    print(f"Total Verified Plates:        {total_plates}", flush=True)
    print(f"  - Single-line (Cars/HSRP):   {counts['single_line']} ({counts['single_line']/max(1, total_plates)*100:.1f}%)", flush=True)
    print(f"  - Two-line (Two-wheelers):   {counts['two_line']} ({counts['two_line']/max(1, total_plates)*100:.1f}%)", flush=True)
    print(f"Train Imgs: {counts['train_img']} | Val Imgs: {counts['val_img']} | Test Imgs: {counts['test_img']}", flush=True)
    print("=" * 70, flush=True)

if __name__ == "__main__":
    assemble_precision_dataset()
