from ai_pipeline.plate_reader import PlateReader
from ai_pipeline.watchlist_matcher import WatchlistMatcher

print("--- TESTING ANPR RECOGNITION & WATCHLIST MATCHING ---")
raw_ocr_samples = [
    "GJ 05 AB 1234",
    "GJ01-XY-7788",
    "GJ18CD4501",
    "DL 01 AA 9999"
]

matcher = WatchlistMatcher()

for raw in raw_ocr_samples:
    normalized = PlateReader.normalize_plate(raw)
    print(f"\nRaw OCR: '{raw}' -> Normalized: '{normalized}'")
    matcher.process_detection(
        camera_id="cam04",
        camera_name="04 Paldi Circle",
        plate_number=normalized,
        pts_ms=104250.0,
        confidence=0.98
    )

print("\nANPR pipeline test finished successfully!")
