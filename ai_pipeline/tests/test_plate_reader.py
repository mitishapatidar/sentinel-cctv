import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from ai_pipeline.plate_reader import PlateReader

def run_tests():
    print("=" * 60)
    print("PHASE 8.5 UNIT TEST: PLATE READER PIPELINE")
    print("=" * 60)

    test_cases = [
        ("GJ 01 AB 1234", "GJ-01-AB-1234"),
        ("gj-05-cd-5678", "GJ-05-CD-5678"),
        ("6J18XY9012", "GJ-18-XY-9012"),
        ("CJ 06 ER 3456", "GJ-06-ER-3456"),
        ("GJ 03 GH 7890", "GJ-03-GH-7890"),
        ("IND GJ12KL4321", "GJ-12-KL-4321"),
        ("GJ 15 PQ 2109", "GJ-15-PQ-2109"),
        ("6J 10 RS 6543", "GJ-10-RS-6543"),
        ("GJ 08 TU 1098", "GJ-08-TU-1098"),
        ("GJ 23 VW 5432", "GJ-23-VW-5432"),
    ]

    all_pass = True
    for idx, (raw, expected) in enumerate(test_cases, 1):
        res = PlateReader.normalize_plate(raw)
        passed = (res == expected)
        if not passed:
            all_pass = False
        tag = "PASS" if passed else "FAIL"
        print(f"[{tag}] Case {idx:02d}: '{raw}' -> '{res}' (Expected: '{expected}')")

    print("\n[Testing Model Checkpoint Loading]")
    model = PlateReader.get_model()
    model_ok = model is not None
    print(f"[{'PASS' if model_ok else 'FAIL'}] Fine-tuned Plate Detector Loaded: {model.ckpt_path}")

    print("=" * 60)
    if all_pass and model_ok:
        print(">>> ALL 10 UNIT TEST CASES PASSED SUCCESSFULLY (10/10) <<<")
        return 0
    else:
        print(">>> UNIT TESTS FAILED <<<")
        return 1

if __name__ == "__main__":
    sys.exit(run_tests())
