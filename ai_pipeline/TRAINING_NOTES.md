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
- **Train Cameras (70%):** `cam01`, `cam02`, `cam03`, `cam04`, `cam07`, `cam08`, `cam09`, `cam10`, `cam11`, `cam12`
- **Validation Cameras (20%):** `cam13`, `cam14`, `cam15` (unseen viewpoints)
- **Test Cameras (10%):** `cam16`, `cam17` (unseen viewpoints)

---

## 4. Hardware Constraints & Execution Strategy
- **Local Machine Compute:** Intel CPU (CUDA available: False, 0 GPUs)
- **Sanity Check:** 3-epoch local verification on CPU to validate loss convergence and export pipeline.
- **Full 50-Epoch GPU Training:** Google Colab notebook (`ai_pipeline/train_on_colab.ipynb`) provided for accelerated T4 GPU execution.
