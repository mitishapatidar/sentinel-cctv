import cv2, glob, os
from pathlib import Path
from ultralytics import YOLO
import numpy as np

v_model = YOLO('yolov8n.pt')
p_model = YOLO('ai_pipeline/models/joker_plate.pt')

# Test on 50 images across cameras
raw_dir = Path('ai_pipeline/dataset/raw')
all_images = sorted(list(raw_dir.glob('*/*.jpg')))
step = max(1, len(all_images) // 50)
sample_images = all_images[::step][:50]

print(f"Testing on {len(sample_images)} sample images...")

stats = {
    'total': len(sample_images),
    'with_plate': 0,
    'single_line': 0,
    'two_line': 0,
    'total_plates': 0
}

preview_dir = Path('ai_pipeline/dataset/_label_preview_hybrid')
preview_dir.mkdir(parents=True, exist_ok=True)

def find_plate_in_crop(crop):
    ch, cw = crop.shape[:2]
    if ch < 12 or cw < 20: return None
    
    # Try plate model first
    res = p_model.predict(crop, conf=0.10, verbose=False)
    boxes = res[0].boxes
    if len(boxes) > 0:
        b = boxes[0]
        x1, y1, x2, y2 = b.xyxy[0].cpu().numpy()
        pw, ph = x2 - x1, y2 - y1
        if ph > 6 and pw > 14:
            aspect = pw / ph
            if 1.0 <= aspect <= 5.5:
                return int(x1), int(y1), int(pw), int(ph), aspect, float(b.conf[0])
                
    # Fallback to high-contrast morphology for rectangular plates
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
        if 1.2 <= aspect <= 5.2 and 150 <= area <= 12000 and h >= 8:
            score = area * (1.0 if aspect >= 2.2 else 0.8)
            if score > max_score:
                max_score = score
                best = (x, y, w, h, aspect, 0.75)
    return best

saved_previews = 0

for p in sample_images:
    img = cv2.imread(str(p))
    if img is None: continue
    h, w = img.shape[:2]
    
    v_res = v_model.predict(img, classes=[2, 3, 5, 7], conf=0.25, verbose=False)
    v_boxes = v_res[0].boxes
    
    found_in_frame = 0
    preview_img = img.copy()
    
    for vb in v_boxes:
        cls_name = v_model.names[int(vb.cls[0])]
        vx1, vy1, vx2, vy2 = [int(v) for v in vb.xyxy[0].cpu().numpy()]
        vw, vh = vx2 - vx1, vy2 - vy1
        if vw < 35 or vh < 35: continue
        
        if cls_name in ['car', 'bus', 'truck']:
            y_start = vy1 + int(vh * 0.4)
            vcrop = img[y_start:vy2, vx1:vx2]
            offset_y = y_start
        else:
            vcrop = img[vy1:vy2, vx1:vx2]
            offset_y = vy1
            
        plate_box = find_plate_in_crop(vcrop)
        if plate_box:
            px, py, pw, ph, aspect, conf = plate_box
            gx1, gy1 = vx1 + px, offset_y + py
            gx2, gy2 = gx1 + pw, gy1 + ph
            
            # Classify single line vs two line
            is_single = aspect >= 2.2
            cls_id = 0 if is_single else 1
            cls_label = "plate_single_line" if is_single else "plate_two_line"
            
            if is_single:
                stats['single_line'] += 1
            else:
                stats['two_line'] += 1
            stats['total_plates'] += 1
            found_in_frame += 1
            
            # Draw on preview
            color = (0, 255, 0) if is_single else (255, 140, 0)
            cv2.rectangle(preview_img, (gx1, gy1), (gx2, gy2), color, 2)
            cv2.putText(preview_img, f"{cls_label} {aspect:.1f}", (gx1, max(15, gy1 - 5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1, cv2.LINE_AA)
                        
    if found_in_frame > 0:
        stats['with_plate'] += 1
        if saved_previews < 15:
            cv2.imwrite(str(preview_dir / f"preview_{saved_previews+1:02d}_{p.parent.name}_{p.stem}.png"), preview_img)
            saved_previews += 1

print("\n" + "=" * 60)
print("HYBRID AUTO-LABELER RESULTS (50 SAMPLE FRAMES):")
print("=" * 60)
print(f"Total Frames:          {stats['total']}")
print(f"Frames with Plate:     {stats['with_plate']} ({stats['with_plate']/stats['total']*100:.1f}%)")
print(f"Total Plates Detected: {stats['total_plates']}")
print(f"  - plate_single_line: {stats['single_line']} ({stats['single_line']/max(1,stats['total_plates'])*100:.1f}%)")
print(f"  - plate_two_line:   {stats['two_line']} ({stats['two_line']/max(1,stats['total_plates'])*100:.1f}%)")
print(f"Saved Previews:        {saved_previews} in {preview_dir}")
print("=" * 60)
