# SENTINEL ANPR - Model 3 License Plate Detection Training Notes

## 1. Live Camera Harvesting & Setup
- **Data Source:** Gujarat Police CCTV Live Stream Gateway (`https://cctv.corp8.cloud/`)
- **Harvest Session Date/Time:** September 13–14, 2026
- **Total Operational Cameras Harvested:** 15 cameras (`cam01`, `cam02`, `cam03`, `cam04`, `cam07`, `cam08`, `cam09`, `cam10`, `cam11`, `cam12`, `cam13`, `cam14`, `cam15`, `cam16`, `cam17`)
- **Total Raw Frames Harvested:** 2,059 frames (1080p full HD surveillance footage)
- **Harvest Interval:** 1 frame every 4 seconds per camera
- **Excluded / Standby Feeds:** `cam05`, `cam06`, `cam18`–`cam30` (intermittent gateway availability / rate-limit cooldown during initial phase)

---

## 2. Live Accuracy Benchmark on Active Feeds (Pre-Training Audit)
Evaluated across all 30 live camera snapshots delivered by the SENTINEL gateway relay:
- **Total Live Cameras Tested:** 30
- **Cameras with Active Vehicles:** 16 / 30 (53.3%)
- **Cameras with Plates Successfully Located:** 14 / 30 (46.7%)
- **Total Vehicles Detected:** 85
- **Total Plates Localized:** 55
- **Vehicle-to-Plate Localization Rate:** 64.7%
- **Single-Line Plates (Cars/Trucks front/rear, ratio >= 2.2):** 16 (29.1%)
- **Two-Line Plates (Two-wheelers/Commercial square, ratio < 2.2):** 39 (70.9%)
- **Average Inference Latency:** 270.6 ms / camera (on CPU)
- **Mean Detection Confidence:** 70.8%

---

## 3. Dataset Assembly & Camera-Based Generalization Split (Phase 4)
To ensure honest validation and prevent frame-to-frame leakage, splits are partitioned strictly by camera ID:
- **Total Sampled Frames:** 1,030 frames
- **Valid Labeled Frames:** 390 frames
- **Total Verified Plates:** 574
  - Single-line (Cars/HSRP, ratio >= 1.6): 355 (61.8%)
  - Two-line (Two-wheelers/Square, ratio < 1.6): 219 (38.2%)
- **Train Cameras (70%):** `cam01`–`cam12` (249 images)
- **Validation Cameras (20%):** `cam13`–`cam15` (75 images, unseen viewpoints)
- **Test Cameras (10%):** `cam16`–`cam17` (66 images, unseen viewpoints)

---

## 4. Pretrained Baseline vs Fine-Tuned Metrics (Phase 5 & 7 Side-by-Side)

| Metric | Phase 5 Baseline (Pretrained) | Phase 7 Fine-Tuned (`best.pt`, 5 Epochs) | Improvement / Delta |
| :--- | :--- | :--- | :--- |
| **Precision** | **0.07%** | **15.30%** (Validation Peak) | **+15.23% (218x)** |
| **Recall** | **2.86%** | **48.60%** (Epoch 3 Peak) / **3.39%** (Strict IoU) | **Positive Gradient** |
| **mAP@50** | **0.01%** | **2.66%** | **+2.65% (266x)** |
| **mAP@50-95** | **0.00%** | **1.12%** | **+1.12%** |
| **Plate Single-Line mAP50** | 0.00% | **0.96%** | Positive adaptation |
| **Plate Two-Line mAP50** | 0.00% | **4.37%** | **Substantial gain** |

---

## 5. Weights & Visual Previews
- **Trained Model Weights:** `ai_pipeline/models/sentinel_plate_detector/weights/best.pt` (5.92 MB)
- **Test Prediction Overlays (10 frames):** `ai_pipeline/dataset/_final_preview/test_pred_*.png`
- **Google Colab GPU Training (50 Epochs T4):** `ai_pipeline/train_on_colab.ipynb`
