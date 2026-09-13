import os
import sys
from pathlib import Path
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
DATA_YAML = BASE_DIR / "dataset" / "final" / "data.yaml"

def evaluate_baseline():
    print("=" * 70, flush=True)
    print("PHASE 5: PRETRAINED BASELINE EVALUATION (BEFORE FINE-TUNING)", flush=True)
    print("=" * 70, flush=True)

    if not DATA_YAML.exists():
        print(f"[ERROR] Dataset configuration not found at: {DATA_YAML}", flush=True)
        return None

    # Load unmodified pretrained checkpoint
    model_path = BASE_DIR / "models" / "pretrained_plate_yolov8n.pt"
    if not model_path.exists():
        model_path = BASE_DIR / "models" / "joker_plate.pt"

    print(f"Evaluating baseline model: {model_path.name}", flush=True)
    print(f"Dataset split: val (configured in {DATA_YAML})", flush=True)

    model = YOLO(str(model_path))

    # Evaluate on val set
    results = model.val(
        data=str(DATA_YAML),
        split="val",
        imgsz=640,
        batch=8,
        device="cpu",
        plots=False,
        verbose=True
    )

    p = float(results.box.mp)
    r = float(results.box.mr)
    map50 = float(results.box.map50)
    map50_95 = float(results.box.map)

    print("\n" + "=" * 70, flush=True)
    print("PHASE 5 BASELINE EVALUATION RESULTS", flush=True)
    print("=" * 70, flush=True)
    print(f"Model:                {model_path.name} (Unmodified Pretrained)", flush=True)
    print(f"Validation Precision: {p:.4f} ({p*100:.2f}%)", flush=True)
    print(f"Validation Recall:    {r:.4f} ({r*100:.2f}%)", flush=True)
    print(f"mAP@50:               {map50:.4f} ({map50*100:.2f}%)", flush=True)
    print(f"mAP@50-95:            {map50_95:.4f} ({map50_95*100:.2f}%)", flush=True)
    print("=" * 70, flush=True)

    return {
        "precision": p,
        "recall": r,
        "map50": map50,
        "map50_95": map50_95
    }

if __name__ == "__main__":
    evaluate_baseline()
