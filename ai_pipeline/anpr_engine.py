"""
Two-stage ANPR for wide-angle CCTV frames.

Plates on 1080p junction cameras are often only 10-15 px tall, so running a plate detector on the
whole frame (downscaled to 640 px) misses most of them. Instead:
  1. YOLOv8n finds vehicles in the full frame.
  2. Each vehicle crop is upscaled and passed to fast-alpr (YOLOv9 plate detector + CCT OCR).
Readings that don't form a valid Indian plate are kept as `raw` text so the watchlist matcher can
still do partial matching (OCR on low-res plates usually gets the last 4 digits right).
"""
import re
from pathlib import Path

import cv2

from ai_pipeline.plate_reader import PlateReader

PROJECT_ROOT = Path(__file__).resolve().parent.parent
VEHICLE_CLASSES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}

# Registration state/UT codes; an OCR result with any other prefix is treated as a partial read
STATE_CODES = {
    "AN", "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "DN", "GA", "GJ", "HP", "HR", "JH", "JK",
    "KA", "KL", "LA", "LD", "MH", "ML", "MN", "MP", "MZ", "NL", "OD", "OR", "PB", "PY", "RJ", "SK",
    "TN", "TR", "TS", "UK", "UP", "WB",
}


class AnprEngine:
    def __init__(self, vehicle_imgsz: int = 640, vehicle_conf: float = 0.35, plate_conf: float = 0.25, min_vehicle_px: int = 60):
        from ultralytics import YOLO

        self.vehicle_model = YOLO(str(PROJECT_ROOT / "yolov8n.pt"))
        self.alpr = PlateReader.get_detector(conf_thresh=plate_conf)
        self.vehicle_imgsz = vehicle_imgsz
        self.vehicle_conf = vehicle_conf
        self.min_vehicle_px = min_vehicle_px

    def read_frame(self, frame):
        """Returns [{plate, raw, confidence, vehicle_type, bbox}] for every plate found in the frame."""
        H, W = frame.shape[:2]
        result = self.vehicle_model.predict(
            frame, imgsz=self.vehicle_imgsz, conf=self.vehicle_conf, classes=list(VEHICLE_CLASSES), verbose=False
        )[0]

        readings = []
        for box in result.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            if (x2 - x1) < self.min_vehicle_px or (y2 - y1) < self.min_vehicle_px:
                continue
            pad_x, pad_y = int((x2 - x1) * 0.08), int((y2 - y1) * 0.08)
            crop = frame[max(0, y1 - pad_y):min(H, y2 + pad_y), max(0, x1 - pad_x):min(W, x2 + pad_x)]
            if crop.shape[0] < 320:
                scale = 320 / crop.shape[0]
                crop = cv2.resize(crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

            for r in self.alpr.predict(crop):
                raw = re.sub(r"[^A-Z0-9]", "", (r.ocr.text if r.ocr and r.ocr.text else "").upper())
                if len(raw) < 4:
                    continue
                ocr_conf = r.ocr.confidence if r.ocr else 0
                if isinstance(ocr_conf, (list, tuple)):
                    ocr_conf = sum(ocr_conf) / max(len(ocr_conf), 1)
                plate = PlateReader.normalize_plate(raw)
                if plate and plate[:2] not in STATE_CODES:
                    plate = ""
                readings.append({
                    "plate": plate,
                    "raw": raw,
                    "confidence": round(float(r.detection.confidence) * float(ocr_conf or 0.5), 3),
                    "vehicle_type": VEHICLE_CLASSES.get(int(box.cls[0]), "vehicle"),
                    "bbox": [x1, y1, x2, y2],
                })
        return readings
