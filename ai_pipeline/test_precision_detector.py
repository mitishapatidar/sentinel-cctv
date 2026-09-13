import cv2
import numpy as np
from pathlib import Path
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
SNAPSHOTS_DIR = BASE_DIR.parent / "backend" / "snapshots"
OUTPUT_DIR = BASE_DIR / "dataset" / "_precision_preview"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

v_model = YOLO("yolov8n.pt")
p_model = YOLO(str(BASE_DIR / "models" / "pretrained_plate_yolov8n.pt"))

def verify_plate_region(crop):
    """
    Rejects false positives (like wheels, grilles, or asphalt) by checking:
    1. Edge density (characters produce multiple high-frequency vertical gradients)
    2. Intensity distribution (plates have high contrast text vs plate background)
    """
    if crop.shape[0] < 8 or crop.shape[1] < 12:
        return False
        
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    
    # 1. Reject pure dark objects (like black rubber tires)
    mean_val = np.mean(gray)
    if mean_val < 45 or mean_val > 230:
        return False
        
    # 2. Vertical edge density check (Sobel X for vertical character strokes)
    sobel_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    edge_energy = np.mean(np.abs(sobel_x))
    if edge_energy < 10.0:
        return False
        
    # 3. Standard deviation (characters against plate background have high std dev)
    std_dev = np.std(gray)
    if std_dev < 18.0:
        return False
        
    return True

def detect_plates_precision(img):
    h, w = img.shape[:2]
    # Vehicle detection
    v_res = v_model.predict(img, classes=[2, 3, 5, 7], conf=0.25, verbose=False)
    v_boxes = v_res[0].boxes
    
    detected_plates = []
    
    for vb in v_boxes:
        cls_id = int(vb.cls[0])
        cls_name = v_model.names[cls_id] # 'car', 'motorcycle', 'bus', 'truck'
        vx1, vy1, vx2, vy2 = [int(v) for v in vb.xyxy[0].cpu().numpy()]
        vw, vh = vx2 - vx1, vy2 - vy1
        
        if vw < 30 or vh < 30:
            continue
            
        # For 4-wheelers: bumper is in lower 50%
        # For 2-wheelers: plate can be center-rear or front fender
        if cls_name in ["car", "bus", "truck"]:
            y_start = vy1 + int(vh * 0.45)
            vcrop = img[y_start:vy2, vx1:vx2]
            offset_y = y_start
        else:
            vcrop = img[vy1:vy2, vx1:vx2]
            offset_y = vy1
            
        cw, ch = vcrop.shape[1], vcrop.shape[0]
        if ch < 12 or cw < 18:
            continue
            
        # Super-Resolution + CLAHE enhancement
        lab = cv2.cvtColor(vcrop, cv2.COLOR_BGR2LAB)
        l, a, b_ch = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        enhanced = cv2.cvtColor(cv2.merge((cl, a, b_ch)), cv2.COLOR_LAB2BGR)
        
        scale_factor = max(1.0, 256.0 / max(cw, ch))
        target_w = int(cw * scale_factor)
        target_h = int(ch * scale_factor)
        upscaled = cv2.resize(enhanced, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
        
        # Plate neural prediction on upscaled contrast crop
        p_res = p_model.predict(upscaled, conf=0.12, verbose=False)
        p_boxes = p_res[0].boxes
        
        for pb in p_boxes:
            conf = float(pb.conf[0])
            bx1, by1, bx2, by2 = [int(v) for v in pb.xyxy[0].cpu().numpy()]
            
            # Map back to original unscaled crop coordinates
            rx1 = int(bx1 / scale_factor)
            ry1 = int(by1 / scale_factor)
            rx2 = int(bx2 / scale_factor)
            ry2 = int(by2 / scale_factor)
            pw, ph = rx2 - rx1, ry2 - ry1
            
            if pw < 10 or ph < 6:
                continue
                
            aspect = pw / float(ph)
            
            # Global image coordinates
            gx1 = vx1 + rx1
            gy1 = offset_y + ry1
            gx2 = gx1 + pw
            gy2 = gy1 + ph
            
            # Extract plate patch for verification
            plate_patch = img[gy1:gy2, gx1:gx2]
            if not verify_plate_region(plate_patch):
                continue # Rejects false positives like wheels or bumper textures
                
            # Calibrated Single-Line vs Two-Line determination:
            # - Motorcycles & Scooters: two_line
            # - Cars / Trucks / Buses: single_line (if aspect >= 1.6 due to 45 deg perspective)
            if cls_name in ["motorcycle"]:
                is_single = False
            elif cls_name in ["car", "bus", "truck"]:
                if aspect >= 1.6:
                    is_single = True
                else:
                    # If very square on a car rear (e.g. commercial vehicle)
                    is_single = False
            else:
                is_single = aspect >= 2.1
                
            label = "plate_single_line" if is_single else "plate_two_line"
            detected_plates.append({
                "box": (gx1, gy1, gx2, gy2),
                "cls_name": label,
                "aspect": aspect,
                "conf": conf,
                "vehicle_type": cls_name
            })
            
    return detected_plates

def test_precision():
    print("=" * 70)
    print("TESTING PRECISION ANPR (CLAHE + SUPER-RES + VEHICLE PRIOR + VERIFICATION)")
    print("=" * 70)
    
    test_files = ["cam01.jpg", "cam02.jpg", "cam04.jpg", "cam05.jpg", "cam08.jpg", "cam10.jpg", "cam14.jpg", "cam30.jpg"]
    
    total_single = 0
    total_two = 0
    
    for f in test_files:
        p = SNAPSHOTS_DIR / f
        if not p.exists():
            continue
        img = cv2.imread(str(p))
        if img is None:
            continue
            
        plates = detect_plates_precision(img)
        preview = img.copy()
        
        single_cnt = sum(1 for pl in plates if pl["cls_name"] == "plate_single_line")
        two_cnt = sum(1 for pl in plates if pl["cls_name"] == "plate_two_line")
        total_single += single_cnt
        total_two += two_cnt
        
        for pl in plates:
            gx1, gy1, gx2, gy2 = pl["box"]
            is_single = pl["cls_name"] == "plate_single_line"
            color = (0, 255, 0) if is_single else (255, 140, 0)
            cv2.rectangle(preview, (gx1, gy1), (gx2, gy2), color, 2)
            cv2.putText(preview, f"{pl['cls_name']} ({pl['vehicle_type']} {pl['aspect']:.1f})",
                        (gx1, max(18, gy1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1, cv2.LINE_AA)
                        
        out_p = OUTPUT_DIR / f"prec_{f}"
        cv2.imwrite(str(out_p), preview)
        print(f"Camera {f:<10} -> Detected {len(plates)} plates (Single-line: {single_cnt}, Two-line: {two_cnt})")
        
    print("-" * 70)
    print(f"Total Plates Detected Across Sample: {total_single + total_two}")
    print(f"  - Single-line: {total_single}")
    print(f"  - Two-line:    {total_two}")
    print(f"Previews saved to: {OUTPUT_DIR}")
    print("=" * 70)

if __name__ == "__main__":
    test_precision()
