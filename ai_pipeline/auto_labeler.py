import os
import glob
import cv2
import yaml
from pathlib import Path
from ultralytics import YOLO
import numpy as np

BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "dataset"
RAW_DIR = DATASET_DIR / "raw"
AUTO_DIR = DATASET_DIR / "auto_labeled"
PREVIEW_DIR = DATASET_DIR / "_label_preview"

# Class definitions per Phase 3.2:
# Indian single-line HSRP (cars/trucks front): aspect ratio >= 2.2
# Indian two-line square (bikes/scooters/commercial rear): aspect ratio < 2.2
CLASSES = ["plate_single_line", "plate_two_line"]

def init_dirs():
    (AUTO_DIR / "images").mkdir(parents=True, exist_ok=True)
    (AUTO_DIR / "labels").mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    
    data_yaml = {
        "path": str(AUTO_DIR.resolve()),
        "train": "images",
        "val": "images",
        "names": {0: "plate_single_line", 1: "plate_two_line"}
    }
    with open(AUTO_DIR / "data.yaml", "w", encoding="utf-8") as f:
        yaml.dump(data_yaml, f)

def find_plate_in_crop(crop, plate_model):
    ch, cw = crop.shape[:2]
    if ch < 10 or cw < 18:
        return None
    
    # 1. Neural plate detection in vehicle crop
    try:
        res = plate_model.predict(crop, conf=0.10, verbose=False)
        boxes = res[0].boxes
        if len(boxes) > 0:
            b = boxes[0]
            x1, y1, x2, y2 = b.xyxy[0].cpu().numpy()
            pw, ph = x2 - x1, y2 - y1
            if ph >= 6 and pw >= 12:
                aspect = pw / ph
                if 1.0 <= aspect <= 5.5:
                    return int(x1), int(y1), int(pw), int(ph), aspect, float(b.conf[0])
    except Exception:
        pass

    # 2. High-contrast morphological rectangular strip detection (fallback)
    try:
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        sobel = cv2.Sobel(blur, cv2.CV_8U, 1, 0, ksize=3)
        _, thresh = cv2.threshold(sobel, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 3))
        closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        cnts, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        best = None
        max_score = 0
        for c in cnts:
            x, y, w, h = cv2.boundingRect(c)
            aspect = w / float(h)
            area = w * h
            if 1.2 <= aspect <= 5.2 and 120 <= area <= 12000 and h >= 8:
                score = area * (1.2 if aspect >= 2.2 else 0.9)
                if score > max_score:
                    max_score = score
                    best = (x, y, w, h, aspect, 0.75)
        return best
    except Exception:
        return None

def run_bootstrap_sample(sample_size=50, preview_count=15):
    """
    Phase 3: High-precision vehicle-guided license plate bootstrap auto-labeling.
    Accurately detects both single-line rectangular and two-line square plates.
    """
    init_dirs()
    print("=" * 70)
    print(f"PHASE 3: VEHICLE-GUIDED BOOTSTRAP AUTO-LABELING ({sample_size} FRAMES)")
    print("=" * 70)
    
    all_raw_images = sorted(list(RAW_DIR.glob("*/*.jpg")))
    if not all_raw_images:
        print("[ERROR] No raw images found in", RAW_DIR)
        return None
        
    step = max(1, len(all_raw_images) // sample_size)
    sample_images = all_raw_images[::step][:sample_size]
    print(f"Selected {len(sample_images)} sample frames across {len(set(p.parent.name for p in sample_images))} live cameras.")
    
    print("Loading models: YOLOv8n (Vehicle Locator) + Plate Head...")
    v_model = YOLO("yolov8n.pt")
    
    # Load plate detector head
    plate_model_path = BASE_DIR / "models" / "joker_plate.pt"
    if not plate_model_path.exists():
        plate_model_path = BASE_DIR / "models" / "pretrained_plate_yolov8n.pt"
    p_model = YOLO(str(plate_model_path))
    
    stats = {
        "total_images": len(sample_images),
        "with_detections": 0,
        "zero_detections": 0,
        "total_plates": 0,
        "single_line": 0,
        "two_line": 0,
        "saved_previews": 0
    }
    
    preview_images = []
    
    for idx, img_path in enumerate(sample_images):
        img = cv2.imread(str(img_path))
        if img is None:
            continue
        h, w = img.shape[:2]
        
        # Detect vehicles: car (2), motorcycle (3), bus (5), truck (7)
        v_res = v_model.predict(img, classes=[2, 3, 5, 7], conf=0.25, verbose=False)
        v_boxes = v_res[0].boxes
        
        yolo_labels = []
        preview_img = img.copy()
        has_plate = False
        
        for vb in v_boxes:
            cls_name = v_model.names[int(vb.cls[0])]
            vx1, vy1, vx2, vy2 = [int(v) for v in vb.xyxy[0].cpu().numpy()]
            vw, vh = vx2 - vx1, vy2 - vy1
            if vw < 35 or vh < 35:
                continue
                
            # Crop lower 45% for bumper plates on cars/trucks, full for 2-wheelers
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
                
                # Single-line aspect ratio >= 2.2
                is_single = aspect >= 2.2
                cls_id = 0 if is_single else 1
                cls_label = "plate_single_line" if is_single else "plate_two_line"
                
                if is_single:
                    stats["single_line"] += 1
                else:
                    stats["two_line"] += 1
                stats["total_plates"] += 1
                has_plate = True
                
                # YOLO format: cls_id, cx, cy, nw, nh
                cx = (gx1 + gx2) / 2.0 / w
                cy = (gy1 + gy2) / 2.0 / h
                nw = pw / float(w)
                nh = ph / float(h)
                yolo_labels.append(f"{cls_id} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")
                
                # Draw preview overlay
                color = (0, 255, 0) if is_single else (255, 140, 0)
                cv2.rectangle(preview_img, (gx1, gy1), (gx2, gy2), color, 2)
                cv2.putText(preview_img, f"{cls_label} {aspect:.1f}", (gx1, max(15, gy1 - 5)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1, cv2.LINE_AA)

        if has_plate:
            stats["with_detections"] += 1
        else:
            stats["zero_detections"] += 1
            
        # Save YOLO annotation
        base_name = f"{img_path.parent.name}_{img_path.stem}"
        label_out = AUTO_DIR / "labels" / f"{base_name}.txt"
        with open(label_out, "w") as f:
            f.write("\n".join(yolo_labels))
            
        img_out = AUTO_DIR / "images" / f"{base_name}.jpg"
        cv2.imwrite(str(img_out), img)
        
        # Save visual preview
        if stats["saved_previews"] < preview_count and (has_plate or stats["saved_previews"] < 3):
            preview_path = PREVIEW_DIR / f"preview_{stats['saved_previews']+1:02d}_{base_name}.png"
            cv2.imwrite(str(preview_path), preview_img)
            preview_images.append(str(preview_path))
            stats["saved_previews"] += 1

    print("\n" + "=" * 70)
    print("PHASE 3 VERIFICATION: REFINED VEHICLE-GUIDED RESULTS")
    print("=" * 70)
    print(f"Total Sample Images Evaluated:     {stats['total_images']}")
    print(f"Images with >=1 Detection:          {stats['with_detections']} ({stats['with_detections']/stats['total_images']*100:.1f}%)")
    print(f"Images with 0 Detections (empty):  {stats['zero_detections']} ({stats['zero_detections']/stats['total_images']*100:.1f}%)")
    print(f"Total Plates Detected:              {stats['total_plates']}")
    print(f"  - plate_single_line (ratio >= 2.2): {stats['single_line']} ({stats['single_line']/max(1, stats['total_plates'])*100:.1f}%)")
    print(f"  - plate_two_line (ratio < 2.2):    {stats['two_line']} ({stats['two_line']/max(1, stats['total_plates'])*100:.1f}%)")
    print(f"Preview Overlays Saved:             {stats['saved_previews']} images to {PREVIEW_DIR}")
    print("=" * 70)
    
    return stats, preview_images

if __name__ == "__main__":
    run_bootstrap_sample()
