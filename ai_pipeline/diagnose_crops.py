import os
import cv2
import numpy as np
from pathlib import Path
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
SNAPSHOTS_DIR = BASE_DIR.parent / "backend" / "snapshots"
OUTPUT_DIR = BASE_DIR / "dataset" / "_crop_diagnostic"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

v_model = YOLO("yolov8n.pt")
plate_models = {
    "joker": YOLO(str(BASE_DIR / "models" / "joker_plate.pt")),
    "koushim": YOLO(str(BASE_DIR / "models" / "koushim_plate.pt")),
    "love671": YOLO(str(BASE_DIR / "models" / "love671_plate.pt")),
    "yolov8n_plate": YOLO(str(BASE_DIR / "models" / "pretrained_plate_yolov8n.pt"))
}

test_cams = ["cam01.jpg", "cam04.jpg", "cam05.jpg", "cam14.jpg", "cam18.jpg"]

print("=" * 70, flush=True)
print("DIAGNOSTIC: TESTING PLATE DETECTORS ON VEHICLE CROPS", flush=True)
print("=" * 70, flush=True)

for cam_file in test_cams:
    img_path = SNAPSHOTS_DIR / cam_file
    if not img_path.exists():
        continue
    img = cv2.imread(str(img_path))
    if img is None:
        continue
    
    h, w = img.shape[:2]
    res = v_model.predict(img, classes=[2, 3, 5, 7], conf=0.25, verbose=False)
    boxes = res[0].boxes
    print(f"\nCamera: {cam_file} ({w}x{h}) - {len(boxes)} vehicles detected", flush=True)
    
    for v_idx, b in enumerate(boxes[:5]): # inspect top 5 vehicles
        vx1, vy1, vx2, vy2 = [int(v) for v in b.xyxy[0].cpu().numpy()]
        vw, vh = vx2 - vx1, vy2 - vy1
        cls_name = v_model.names[int(b.cls[0])]
        
        # Vehicle crop
        vcrop = img[vy1:vy2, vx1:vx2]
        if vcrop.size == 0 or vw < 30 or vh < 30:
            continue
            
        print(f"  Vehicle #{v_idx+1} ({cls_name}, {vw}x{vh}):", flush=True)
        
        # Save raw vehicle crop
        cv2.imwrite(str(OUTPUT_DIR / f"{cam_file[:-4]}_v{v_idx}_{cls_name}.jpg"), vcrop)
        
        # Test each plate model on this crop directly and on CLAHE-enhanced 2x upscaled crop
        for m_name, p_m in plate_models.items():
            # 1. Direct on crop
            preds = p_m.predict(vcrop, conf=0.10, verbose=False)
            num_det = len(preds[0].boxes)
            
            # 2. Enhanced (CLAHE + 2x zoom)
            lab = cv2.cvtColor(vcrop, cv2.COLOR_BGR2LAB)
            l, a, b_ch = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
            cl = clahe.apply(l)
            enhanced = cv2.cvtColor(cv2.merge((cl, a, b_ch)), cv2.COLOR_LAB2BGR)
            enhanced_2x = cv2.resize(enhanced, (max(128, vw * 2), max(128, vh * 2)), interpolation=cv2.INTER_LANCZOS4)
            
            preds_enh = p_m.predict(enhanced_2x, conf=0.10, verbose=False)
            num_det_enh = len(preds_enh[0].boxes)
            
            det_info = ""
            if num_det > 0 or num_det_enh > 0:
                det_info = f" -> Found: direct={num_det}, enhanced_2x={num_det_enh}"
                if num_det_enh > 0:
                    b0 = preds_enh[0].boxes[0]
                    conf = float(b0.conf[0])
                    bx1, by1, bx2, by2 = [int(v) for v in b0.xyxy[0].tolist()]
                    asp = (bx2 - bx1) / max(1, by2 - by1)
                    det_info += f" (conf={conf:.2f}, ratio={asp:.2f})"
            print(f"    - {m_name:<15}: {det_info if det_info else '0 detected'}", flush=True)

print("\n" + "=" * 70, flush=True)
print(f"Crops saved to: {OUTPUT_DIR}", flush=True)
