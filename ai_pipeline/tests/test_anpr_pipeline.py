import sys
from pathlib import Path

# Add project root to sys.path so modules can be imported from any location
project_root = Path(__file__).resolve().parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from ai_pipeline.plate_reader import PlateReader
from ai_pipeline.watchlist_matcher import WatchlistMatcher

print("========================================")
print("TEST: ANPR RECOGNITION & WATCHLIST MATCHER")
print("========================================")

raw_ocr_samples = [
    ("GJ 05 AB 1234", "GJ-05-AB-1234"),
    ("GJ01-XY-7788", "GJ-01-XY-7788"),
    ("GJ18CD4501", "GJ-18-CD-4501"),
    ("6J 01 ER 8921", "GJ-01-ER-8921")
]

all_passed = True
matcher = WatchlistMatcher()

for raw, expected in raw_ocr_samples:
    normalized = PlateReader.normalize_plate(raw)
    passed = normalized == expected
    if not passed:
        all_passed = False
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] Raw OCR: '{raw}' -> Normalized: '{normalized}' (Expected: '{expected}')")
    
    # Run through watchlist matcher
    matcher.process_detection(
        camera_id="cam04",
        camera_name="04 Paldi Circle",
        plate_number=normalized,
        pts_ms=104250.0,
        confidence=0.98
    )

if all_passed:
    print("\n>>> ALL ANPR TESTS PASSED SUCCESSFULLY! <<<")
else:
    print("\n>>> SOME ANPR TESTS FAILED <<<")
    sys.exit(1)
