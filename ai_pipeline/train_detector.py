import os
from ultralytics import YOLO

def train_anpr_detector(
    data_yaml="ai_pipeline/dataset/data.yaml",
    model_size="yolov8n.pt",
    epochs=50,
    imgsz=640,
    batch_size=16
):
    """
    Fine-tunes a lightweight YOLOv8 detector specifically on Indian License Plates
    harvested from the SENTINEL live CCTV grid.
    """
    print("=" * 60)
    print("  SENTINEL ANPR - YOLOv8 LICENSE PLATE TRAINING PIPELINE")
    print("=" * 60)

    if not os.path.exists(data_yaml):
        print(f"[ERROR] Dataset configuration file not found: {data_yaml}")
        print("\nHow to prepare data.yaml:")
        print("1. Collect frames with: python -m ai_pipeline.collect_training_frames")
        print("2. Label bounding boxes on Roboflow / LabelImg (class: license_plate)")
        print("3. Place exported dataset inside ai_pipeline/dataset/\n")
        return

    # Load base transfer-learning checkpoint
    print(f"\n[1/3] Loading pre-trained base model: {model_size}")
    model = YOLO(model_size)

    # Train on custom Indian CCTV plates
    print(f"\n[2/3] Starting training for {epochs} epochs on {data_yaml}...")
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch_size,
        device=0 if os.environ.get("CUDA_VISIBLE_DEVICES") else "cpu",
        patience=12,
        save=True,
        project="ai_pipeline/models",
        name="sentinel_plate_detector",
        exist_ok=True
    )

    # Export best model
    best_weights = "ai_pipeline/models/sentinel_plate_detector/weights/best.pt"
    print(f"\n[3/3] Training finished successfully!")
    print(f"Optimal model weights saved to: {best_weights}")
    print(f"To plug into PlateReader, use: PlateReader(model_path='{best_weights}')")

if __name__ == "__main__":
    train_anpr_detector()
