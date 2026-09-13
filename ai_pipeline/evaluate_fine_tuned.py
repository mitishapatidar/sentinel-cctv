import os
import sys
import random
from pathlib import Path
import cv2
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
FINAL_DIR = BASE_DIR / "dataset" / "final"
DATA_YAML = FINAL_DIR / "data.yaml"
PREVIEW_DIR = BASE_DIR / "dataset" / "_final_preview"
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

def evaluate_post_training(baseline_metrics=None):
    print("=" * 70, flush=True)
    print("PHASE 7: POST-TRAINING EVALUATION & VERIFICATION", flush=True)
    print("=" * 70, flush=True)

    weights_path = BASE_DIR / "models" / "sentinel_plate_detector" / "weights" / "best.pt"
    if not weights_path.exists():
        # Fallback to sanity check weights or pretrained
        weights_path = BASE_DIR / "models" / "sanity_run" / "weights" / "best.pt"
    if not weights_path.exists():
        weights_path = BASE_DIR / "models" / "pretrained_plate_yolov8n.pt"

    print(f"Evaluating model: {weights_path}", flush=True)
    model = YOLO(str(weights_path))

    # 1. Run validation against SAME val set used in Phase 5
    print("\n[1/2] Running validation against val split...", flush=True)
    val_res = model.val(
        data=str(DATA_YAML),
        split="val",
        imgsz=640,
        batch=8,
        device="cpu",
        plots=False,
        verbose=True
    )

    ft_p = float(val_res.box.mp)
    ft_r = float(val_res.box.mr)
    ft_map50 = float(val_res.box.map50)
    ft_map50_95 = float(val_res.box.map)

    # 2. Side-by-side comparison table (Phase 7.3)
    print("\n" + "=" * 70, flush=True)
    print("PHASE 7.3: BASELINE VS FINE-TUNED COMPARISON TABLE")
    print("=" * 70, flush=True)
    print(f"{'Metric':<18} | {'Phase 5 Baseline':<18} | {'Fine-Tuned':<18} | {'Delta':<12}")
    print("-" * 70)

    base_p = baseline_metrics.get("precision", 0.0) if baseline_metrics else 0.0
    base_r = baseline_metrics.get("recall", 0.0) if baseline_metrics else 0.0
    base_map50 = baseline_metrics.get("map50", 0.0) if baseline_metrics else 0.0
    base_map50_95 = baseline_metrics.get("map50_95", 0.0) if baseline_metrics else 0.0

    print(f"{'Precision':<18} | {base_p*100:<17.2f}% | {ft_p*100:<17.2f}% | {(ft_p - base_p)*100:+6.2f}%")
    print(f"{'Recall':<18} | {base_r*100:<17.2f}% | {ft_r*100:<17.2f}% | {(ft_r - base_r)*100:+6.2f}%")
    print(f"{'mAP@50':<18} | {base_map50*100:<17.2f}% | {ft_map50*100:<17.2f}% | {(ft_map50 - base_map50)*100:+6.2f}%")
    print(f"{'mAP@50-95':<18} | {base_map50_95*100:<17.2f}% | {ft_map50_95*100:<17.2f}% | {(ft_map50_95 - base_map50_95)*100:+6.2f}%")
    print("-" * 70)

    # 3. Predict on 10 random test-set images and save visual overlays (Phase 7.4)
    print("\n[2/2] Generating visual preview on 10 test-set images...", flush=True)
    test_images = sorted(list((FINAL_DIR / "test" / "images").glob("*.jpg")))
    if not test_images:
        test_images = sorted(list((FINAL_DIR / "val" / "images").glob("*.jpg")))

    random.seed(42)
    sample_test = random.sample(test_images, min(10, len(test_images)))

    saved_previews = []
    for idx, t_img_path in enumerate(sample_test):
        img = cv2.imread(str(t_img_path))
        if img is None:
            continue
        preds = model.predict(img, conf=0.15, imgsz=640, verbose=False)
        boxes = preds[0].boxes
        
        preview_img = img.copy()
        for b in boxes:
            x1, y1, x2, y2 = [int(v) for v in b.xyxy[0].cpu().numpy()]
            cls_id = int(b.cls[0])
            cls_name = model.names.get(cls_id, f"cls_{cls_id}")
            conf = float(b.conf[0])
            color = (0, 255, 0) if "single" in cls_name.lower() or cls_id == 0 else (255, 140, 0)
            cv2.rectangle(preview_img, (x1, y1), (x2, y2), color, 2)
            cv2.putText(preview_img, f"{cls_name} ({conf*100:.0f}%)", (x1, max(18, y1 - 6)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1, cv2.LINE_AA)

        out_path = PREVIEW_DIR / f"test_pred_{idx+1:02d}_{t_img_path.stem}.png"
        cv2.imwrite(str(out_path), preview_img)
        saved_previews.append(str(out_path))

    print(f"Saved {len(saved_previews)} test evaluation overlays to: {PREVIEW_DIR}")
    print("=" * 70, flush=True)

    return {
        "precision": ft_p,
        "recall": ft_r,
        "map50": ft_map50,
        "map50_95": ft_map50_95,
        "previews": saved_previews
    }

if __name__ == "__main__":
    evaluate_post_training()
