import os
import re
from pathlib import Path
import cv2
import numpy as np
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "sentinel_plate_detector" / "weights" / "best.pt"
if not MODEL_PATH.exists():
    MODEL_PATH = BASE_DIR / "models" / "pretrained_plate_yolov8n.pt"

# Standard Indian License Plate Regex pattern
# Matches standard formats like GJ01AB1234, GJ-05-CD-5678, GJ 18 XY 9012
PLATE_REGEX = re.compile(r"([A-Z]{2})[- ]?([0-9]{1,2})[- ]?([A-Z]{1,3})[- ]?([0-9]{4})", re.IGNORECASE)

class PlateReader:
    _model = None
    _ocr_reader = None

    @classmethod
    def get_model(cls):
        if cls._model is None:
            print(f"[PlateReader] Loading fine-tuned detector: {MODEL_PATH.name}", flush=True)
            cls._model = YOLO(str(MODEL_PATH))
        return cls._model

    @classmethod
    def get_ocr(cls):
        if cls._ocr_reader is None:
            try:
                import easyocr
                # English only, CPU mode
                cls._ocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
            except Exception as e:
                print(f"[PlateReader] OCR init warning: {e}", flush=True)
        return cls._ocr_reader

    @staticmethod
    def preprocess_plate(crop):
        """
        Phase 8.2: Applies CLAHE contrast equalization on the L channel in LAB color space
        and normalizes plate resolution for optimal OCR text extraction.
        """
        if crop is None or crop.size == 0:
            return None
        h, w = crop.shape[:2]
        if h < 10 or w < 15:
            return None

        # Convert to LAB and apply CLAHE on L channel
        lab = cv2.cvtColor(crop, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(6, 6))
        cl = clahe.apply(l)
        enhanced = cv2.cvtColor(cv2.merge((cl, a, b)), cv2.COLOR_LAB2BGR)

        # Upscale low-resolution crops to minimum height of 56px
        target_h = max(56, h)
        if target_h != h:
            scale = target_h / float(h)
            enhanced = cv2.resize(enhanced, (int(w * scale), target_h), interpolation=cv2.INTER_CUBIC)

        return enhanced

    @staticmethod
    def normalize_plate(raw_text: str) -> str:
        """
        Phase 8.4: Cleans, applies phonetic confusion heuristics, and strictly validates
        raw text against standard Indian HSRP registration syntax.
        """
        if not raw_text:
            return ""

        cleaned = re.sub(r"[^A-Za-z0-9]", "", raw_text).upper()

        # Fix common OCR leading misreads in Gujarat
        if cleaned.startswith("6J") or cleaned.startswith("CJ") or cleaned.startswith("OJ"):
            cleaned = "GJ" + cleaned[2:]
        elif cleaned.startswith("IND"):
            cleaned = cleaned[3:]

        match = PLATE_REGEX.search(cleaned)
        if match:
            state, district, series, number = match.groups()
            district = district.zfill(2)

            # Clean number part (letters commonly misread as numbers)
            num_clean = number.replace("O", "0").replace("I", "1").replace("B", "8").replace("S", "5").replace("Z", "2")
            # Clean series part (numbers commonly misread as letters)
            ser_clean = series.replace("0", "O").replace("1", "I").replace("8", "B").replace("5", "S")

            return f"{state.upper()}-{district}-{ser_clean.upper()}-{num_clean}"

        return ""

    @classmethod
    def read_plate_crop(cls, crop, is_two_line: bool = False) -> str:
        """
        Phase 8.3: Performs OCR with single-line vs two-line geometric handling.
        For two-line plates, segments top (RTO) and bottom (Number) lines.
        """
        preprocessed = cls.preprocess_plate(crop)
        if preprocessed is None:
            return ""

        ocr = cls.get_ocr()
        if ocr is None:
            return ""

        h, w = preprocessed.shape[:2]
        ratio = w / float(h) if h > 0 else 1.0

        raw_strings = []
        if is_two_line or ratio < 2.0:
            # Two-line plate: Read top half and bottom half separately
            mid = int(h * 0.52)
            top_half = preprocessed[:mid, :]
            bot_half = preprocessed[mid:, :]

            try:
                top_res = ocr.readtext(top_half, detail=0)
                bot_res = ocr.readtext(bot_half, detail=0)
                raw_strings.extend(top_res)
                raw_strings.extend(bot_res)
            except Exception:
                pass
        else:
            # Single-line plate: Read as full strip
            try:
                res = ocr.readtext(preprocessed, detail=0)
                raw_strings.extend(res)
            except Exception:
                pass

        joined = "".join(raw_strings)
        return cls.normalize_plate(joined)

    @classmethod
    def parse_frame_for_plates(cls, frame, conf_threshold: float = 0.20):
        """
        End-to-end frame processor: Detects plates using fine-tuned best.pt
        and reads text using CLAHE + Indian syntax validation.
        """
        model = cls.get_model()
        results = model.predict(frame, imgsz=512, conf=conf_threshold, verbose=False)
        boxes = results[0].boxes

        detections = []
        h, w = frame.shape[:2]

        for box in boxes:
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].cpu().numpy()]
            cls_id = int(box.cls[0].item())
            conf = float(box.conf[0].item())

            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(w, x2)
            y2 = min(h, y2)

            crop = frame[y1:y2, x1:x2]
            is_two_line = (cls_id == 1)
            plate_text = cls.read_plate_crop(crop, is_two_line=is_two_line)

            detections.append({
                "bbox": [x1, y1, x2, y2],
                "confidence": conf,
                "class_id": cls_id,
                "class_name": "plate_two_line" if is_two_line else "plate_single_line",
                "plate_number": plate_text
            })

        return detections

