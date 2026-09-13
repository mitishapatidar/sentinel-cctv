import os
import sys
import shutil
from pathlib import Path
import yaml
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
DATA_YAML = BASE_DIR / "dataset" / "final" / "data.yaml"
OUTPUT_DIR = BASE_DIR / "models" / "sentinel_plate_detector"

def prepare_sanity_subset(num_train=40, num_val=15):
    """Prepares a fast representative small subset for Phase 6.2 CPU sanity check."""
    subset_dir = BASE_DIR / "dataset" / "_sanity_subset"
    train_imgs_src = sorted(list((BASE_DIR / "dataset" / "final" / "train" / "images").glob("*.jpg")))[:num_train]
    val_imgs_src = sorted(list((BASE_DIR / "dataset" / "final" / "val" / "images").glob("*.jpg")))[:num_val]

    for split in ["train", "val"]:
        (subset_dir / split / "images").mkdir(parents=True, exist_ok=True)
        (subset_dir / split / "labels").mkdir(parents=True, exist_ok=True)

    for img_p in train_imgs_src:
        shutil.copyfile(img_p, subset_dir / "train" / "images" / img_p.name)
        lbl_p = img_p.parent.parent / "labels" / f"{img_p.stem}.txt"
        if lbl_p.exists():
            shutil.copyfile(lbl_p, subset_dir / "train" / "labels" / lbl_p.name)

    for img_p in val_imgs_src:
        shutil.copyfile(img_p, subset_dir / "val" / "images" / img_p.name)
        lbl_p = img_p.parent.parent / "labels" / f"{img_p.stem}.txt"
        if lbl_p.exists():
            shutil.copyfile(lbl_p, subset_dir / "val" / "labels" / lbl_p.name)

    subset_yaml = {
        "path": str(subset_dir.resolve()).replace("\\", "/"),
        "train": "train/images",
        "val": "val/images",
        "names": {0: "plate_single_line", 1: "plate_two_line"}
    }
    yaml_path = subset_dir / "data.yaml"
    with open(yaml_path, "w", encoding="utf-8") as f:
        yaml.dump(subset_yaml, f, sort_keys=False)

    return str(yaml_path)

def train_detector(
    data_yaml=None,
    base_model="yolov8n.pt",
    epochs=50,
    imgsz=640,
    batch_size=16,
    is_sanity_check=False
):
    """
    Fine-tunes YOLOv8 detector on the SENTINEL live CCTV plate dataset.
    Supports both 3-epoch sanity check mode and full training.
    """
    print("=" * 70, flush=True)
    mode_str = "SANITY CHECK (3 EPOCHS)" if is_sanity_check else f"FULL TRAINING ({epochs} EPOCHS)"
    print(f"SENTINEL ANPR - YOLOv8 LICENSE PLATE TRAINING: {mode_str}", flush=True)
    print("=" * 70, flush=True)

    if is_sanity_check:
        print("[Setup] Creating small subset for fast sanity verification...", flush=True)
        data_yaml = prepare_sanity_subset(num_train=40, num_val=15)
        epochs = 3
        batch_size = 4
        imgsz = 480
    elif data_yaml is None:
        data_yaml = str(DATA_YAML)

    if not os.path.exists(data_yaml):
        print(f"[ERROR] Dataset configuration not found: {data_yaml}", flush=True)
        return False

    import torch
    device = 0 if torch.cuda.is_available() else "cpu"
    print(f"Compute Device: {device} ({'GPU' if torch.cuda.is_available() else 'CPU'})", flush=True)

    print(f"\n[1/3] Loading base model: {base_model}...", flush=True)
    model = YOLO(base_model)

    print(f"\n[2/3] Starting transfer learning for {epochs} epochs...", flush=True)
    print(f"Data config: {data_yaml} | Image size: {imgsz} | Batch: {batch_size}", flush=True)

    run_name = "sanity_run" if is_sanity_check else "sentinel_plate_detector"
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch_size,
        device=device,
        patience=10,
        save=True,
        project=str(BASE_DIR / "models"),
        name=run_name,
        exist_ok=True,
        verbose=True
    )

    # Save best checkpoint
    weights_dir = OUTPUT_DIR / "weights"
    weights_dir.mkdir(parents=True, exist_ok=True)
    
    run_best = BASE_DIR / "models" / run_name / "weights" / "best.pt"
    run_last = BASE_DIR / "models" / run_name / "weights" / "last.pt"
    target_best = weights_dir / "best.pt"
    
    if run_best.exists():
        shutil.copyfile(run_best, target_best)
        print(f"\n[3/3] Checkpoint successfully verified and saved to: {target_best}", flush=True)
        print(f"File size: {target_best.stat().st_size / (1024*1024):.2f} MB", flush=True)
    elif run_last.exists():
        shutil.copyfile(run_last, target_best)
        print(f"\n[3/3] Checkpoint saved to: {target_best}", flush=True)

    print("=" * 70, flush=True)
    return True

if __name__ == "__main__":
    is_sanity = "--sanity" in sys.argv
    train_detector(epochs=5, imgsz=480, batch_size=8, is_sanity_check=is_sanity)
