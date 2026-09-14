import os
import re
import sys
from pathlib import Path
import cv2
import numpy as np

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Global shared configuration
from ai_pipeline.config import PLATE_ASPECT_RATIO_THRESHOLD

# Standard Indian License Plate Regex pattern
# Matches standard formats like GJ01AB1234, GJ-05-CD-5678, GJ 18 XY 9012
PLATE_REGEX = re.compile(r"([A-Z]{2})[- ]?([0-9]{1,2})[- ]?([A-Z]{1,3})[- ]?([0-9]{4})", re.IGNORECASE)

class PlateReader:
    _alpr = None
    _ocr_reader = None

    @classmethod
    def get_detector(cls, conf_thresh: float = 0.15):
        if cls._alpr is None:
            from fast_alpr import ALPR
            print(f"[PlateReader] Initializing fast-alpr Stage 1 detector (conf_thresh={conf_thresh})...", flush=True)
            cls._alpr = ALPR(
                detector_model="yolo-v9-t-640-license-plate-end2end",
                detector_conf_thresh=conf_thresh,
                ocr_model="cct-xs-v2-global-model"
            )
        return cls._alpr

    @classmethod
    def get_ocr(cls):
        if cls._ocr_reader is None:
            try:
                import easyocr
                print("[PlateReader] Initializing EasyOCR engine (CPU mode)...", flush=True)
                cls._ocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
            except Exception as e:
                print(f"[PlateReader] OCR init warning: {e}", flush=True)
        return cls._ocr_reader

    @staticmethod
    def preprocess_plate(crop):
        """
        Applies CLAHE contrast equalization on the L channel in LAB color space
        and normalizes plate resolution for optimal OCR text extraction.
        """
        if crop is None or crop.size == 0:
            return None
        h, w = crop.shape[:2]
        if h < 8 or w < 12:
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
        Cleans, applies phonetic confusion heuristics, and strictly validates
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
    def read_plate_crop(cls, crop, is_two_line: bool = False, fallback_text: str = "") -> str:
        """
        Performs OCR using CLAHE preprocessed crop with EasyOCR.
        For two-line plates (ratio < 2.5), bisects into top (RTO) and bottom (Number).
        Falls back to fast-alpr OCR text if EasyOCR does not match regex.
        """
        if fallback_text:
            norm_fallback = cls.normalize_plate(fallback_text)
            if norm_fallback:
                return norm_fallback

        preprocessed = cls.preprocess_plate(crop)
        if preprocessed is None:
            return cls.normalize_plate(fallback_text)

        ocr = cls.get_ocr()
        raw_strings = []

        if ocr is not None:
            h, w = preprocessed.shape[:2]
            if is_two_line:
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
        normalized = cls.normalize_plate(joined)
        if normalized:
            return normalized

        # If EasyOCR didn't produce a valid Indian plate, try fallback text from fast-alpr
        if fallback_text:
            return cls.normalize_plate(fallback_text)

        return ""

    @classmethod
    def parse_frame_for_plates(cls, frame, conf_threshold: float = 0.15):
        """
        End-to-end frame processor:
        Stage 1: Detects plate bounding boxes using fast-alpr (YOLOv9-t ONNX)
        Stage 2: Classifies single-line vs two-line based on PLATE_ASPECT_RATIO_THRESHOLD (2.5)
        Stage 3: Applies CLAHE + bisection + EasyOCR + Indian HSRP regex normalization
        """
        if frame is None or frame.size == 0:
            return []

        h, w = frame.shape[:2]
        alpr = cls.get_detector(conf_thresh=conf_threshold)

        # Run fast-alpr prediction
        alpr_results = alpr.predict(frame)

        detections = []
        for res in alpr_results:
            bb = res.detection.bounding_box
            conf = float(res.detection.confidence)
            fast_alpr_ocr = res.ocr.text if (res.ocr and res.ocr.text) else ""

            x1 = max(0, int(bb.x1))
            y1 = max(0, int(bb.y1))
            x2 = min(w, int(bb.x2))
            y2 = min(h, int(bb.y2))
            bw = x2 - x1
            bh = y2 - y1

            if bw < 10 or bh < 6:
                continue

            # Classify single-line vs two-line using unified threshold: 2.5
            ratio = bw / float(bh) if bh > 0 else 1.0
            is_two_line = (ratio < PLATE_ASPECT_RATIO_THRESHOLD)
            cls_id = 1 if is_two_line else 0
            cls_name = "plate_two_line" if is_two_line else "plate_single_line"

            # Extract crop and read with CLAHE + EasyOCR
            crop = frame[y1:y2, x1:x2]
            plate_text = cls.read_plate_crop(crop, is_two_line=is_two_line, fallback_text=fast_alpr_ocr)

            detections.append({
                "bbox": [x1, y1, x2, y2],
                "confidence": round(conf, 4),
                "class_id": cls_id,
                "class_name": cls_name,
                "aspect_ratio": round(ratio, 2),
                "plate_number": plate_text,
                "raw_ocr": fast_alpr_ocr
            })

        return detections
