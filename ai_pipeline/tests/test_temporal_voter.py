"""
Phase 9 Verification: Test temporal voting on simulated multi-frame sequences.
Demonstrates single-frame raw reads vs temporal-voted consensus for 3+ vehicles.
"""

import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from ai_pipeline.temporal_voter import TemporalVoter, compute_iou


def test_iou():
    """Basic IoU sanity check."""
    box_a = [100, 100, 200, 200]
    box_b = [150, 150, 250, 250]
    iou = compute_iou(box_a, box_b)
    assert 0.1 < iou < 0.3, f"IoU should be ~0.143, got {iou}"
    print(f"[PASS] IoU computation: {iou:.4f}")

    # Identical boxes
    iou_same = compute_iou(box_a, box_a)
    assert abs(iou_same - 1.0) < 0.001, f"Same-box IoU should be 1.0, got {iou_same}"
    print(f"[PASS] Same-box IoU: {iou_same:.4f}")

    # Non-overlapping boxes
    box_c = [500, 500, 600, 600]
    iou_none = compute_iou(box_a, box_c)
    assert iou_none == 0.0, f"Non-overlapping IoU should be 0.0, got {iou_none}"
    print(f"[PASS] Non-overlapping IoU: {iou_none:.4f}")


def simulate_vehicle_sequence():
    """
    Simulate 3 vehicles passing through a camera over 40 frames.
    Each vehicle has slightly noisy OCR readings across frames.
    Shows before (single-frame) vs after (temporal-voted) results.
    """
    voter = TemporalVoter(iou_threshold=0.3, min_readings=3, max_age=5)

    # Vehicle 1: White Maruti Swift - passes frames 1-12
    # True plate: GJ-05-AB-1234
    v1_readings = [
        "GJ-05-AB-1234",  # correct
        "GJ-05-A8-1234",  # B->8 misread
        "GJ-05-AB-1234",  # correct
        "GJ-05-AB-I234",  # 1->I misread
        "GJ-05-AB-1234",  # correct
        "GJ-05-AB-1234",  # correct
        "GJ-05-AB-1234",  # correct
        "6J-05-AB-1234",  # G->6 misread
        "GJ-05-AB-1234",  # correct
        "GJ-05-AB-1234",  # correct
    ]
    v1_bbox_start = [300, 400, 420, 440]

    # Vehicle 2: Black Royal Enfield - passes frames 8-25
    # True plate: GJ-10-RS-6543 (two-line plate)
    v2_readings = [
        "GJ-10-RS-6543",  # correct
        "GJ-10-R5-6543",  # S->5 misread
        "GJ-I0-RS-6543",  # 1->I misread
        "GJ-10-RS-6543",  # correct
        "GJ-10-RS-6543",  # correct
        "",               # OCR failed this frame
        "GJ-10-RS-6543",  # correct
        "GJ-10-RS-6543",  # correct
        "GJ-10-RS-6S43",  # 5->S misread in number
        "GJ-10-RS-6543",  # correct
        "GJ-10-RS-6543",  # correct
        "GJ-10-RS-6543",  # correct
    ]
    v2_bbox_start = [600, 350, 720, 400]

    # Vehicle 3: Heavy Truck - passes frames 20-35
    # True plate: GJ-08-TU-1098
    v3_readings = [
        "GJ-08-TU-1098",  # correct
        "GJ-O8-TU-1098",  # 0->O misread
        "GJ-08-TU-1098",  # correct
        "GJ-08-TU-1O98",  # 0->O misread
        "GJ-08-TU-1098",  # correct
        "GJ-08-TU-1098",  # correct
        "GJ-08-TU-1098",  # correct
        "",               # OCR failed
        "GJ-08-TU-1098",  # correct
        "GJ-08-TU-1098",  # correct
    ]
    v3_bbox_start = [100, 200, 250, 260]

    all_single_frame_reads = {"Vehicle 1 (GJ-05-AB-1234)": [],
                               "Vehicle 2 (GJ-10-RS-6543)": [],
                               "Vehicle 3 (GJ-08-TU-1098)": []}

    all_confirmed = []

    for frame_id in range(1, 41):
        detections = []

        # Vehicle 1: frames 1-12
        if 1 <= frame_id <= min(12, len(v1_readings)):
            idx = frame_id - 1
            if idx < len(v1_readings):
                dx = (frame_id - 1) * 8  # vehicle moves right
                bbox = [v1_bbox_start[0] + dx, v1_bbox_start[1],
                        v1_bbox_start[2] + dx, v1_bbox_start[3]]
                reading = v1_readings[idx]
                detections.append({
                    "bbox": bbox,
                    "confidence": 0.85,
                    "class_name": "plate_single_line",
                    "plate_number": reading,
                })
                all_single_frame_reads["Vehicle 1 (GJ-05-AB-1234)"].append(reading)

        # Vehicle 2: frames 8-25
        if 8 <= frame_id <= 25:
            idx = frame_id - 8
            if idx < len(v2_readings):
                dx = (frame_id - 8) * 6
                bbox = [v2_bbox_start[0] + dx, v2_bbox_start[1],
                        v2_bbox_start[2] + dx, v2_bbox_start[3]]
                reading = v2_readings[idx]
                detections.append({
                    "bbox": bbox,
                    "confidence": 0.78,
                    "class_name": "plate_two_line",
                    "plate_number": reading,
                })
                all_single_frame_reads["Vehicle 2 (GJ-10-RS-6543)"].append(reading)

        # Vehicle 3: frames 20-35
        if 20 <= frame_id <= 35:
            idx = frame_id - 20
            if idx < len(v3_readings):
                dx = (frame_id - 20) * 10
                bbox = [v3_bbox_start[0] + dx, v3_bbox_start[1],
                        v3_bbox_start[2] + dx, v3_bbox_start[3]]
                reading = v3_readings[idx]
                detections.append({
                    "bbox": bbox,
                    "confidence": 0.82,
                    "class_name": "plate_single_line",
                    "plate_number": reading,
                })
                all_single_frame_reads["Vehicle 3 (GJ-08-TU-1098)"].append(reading)

        confirmed = voter.update(detections, frame_id)
        all_confirmed.extend(confirmed)

    # Flush remaining tracks
    flushed = voter.flush()
    all_confirmed.extend(flushed)

    return all_single_frame_reads, all_confirmed, voter


def run_tests():
    print("=" * 70)
    print("PHASE 9 VERIFICATION: TEMPORAL VOTING TRACKER")
    print("=" * 70)

    # 1. IoU tests
    print("\n--- IoU Unit Tests ---")
    test_iou()

    # 2. Full simulation
    print("\n--- Multi-Vehicle Temporal Voting Simulation ---")
    single_reads, confirmed, voter = simulate_vehicle_sequence()

    print("\n" + "=" * 70)
    print("BEFORE vs AFTER COMPARISON")
    print("=" * 70)

    ground_truth = {
        "Vehicle 1 (GJ-05-AB-1234)": "GJ-05-AB-1234",
        "Vehicle 2 (GJ-10-RS-6543)": "GJ-10-RS-6543",
        "Vehicle 3 (GJ-08-TU-1098)": "GJ-08-TU-1098",
    }

    all_pass = True
    for vehicle_name, gt_plate in ground_truth.items():
        reads = single_reads[vehicle_name]
        noisy_reads = [r for r in reads if r]
        correct_single = sum(1 for r in noisy_reads if r == gt_plate)
        total_single = len(noisy_reads)
        single_accuracy = (correct_single / total_single * 100) if total_single > 0 else 0

        # Find matching confirmed track
        voted_plate = ""
        voted_readings = 0
        for c in confirmed:
            if c["plate"] == gt_plate or c["plate"].replace("-", "") == gt_plate.replace("-", ""):
                voted_plate = c["plate"]
                voted_readings = c["readings"]
                break

        # If no exact match, find closest
        if not voted_plate:
            for c in confirmed:
                # Check if plate is roughly similar (at least same length)
                if len(c["plate"]) >= 10:
                    voted_plate = c["plate"]
                    voted_readings = c["readings"]
                    break

        voted_correct = voted_plate == gt_plate
        if not voted_correct:
            all_pass = False

        print(f"\n{'─' * 60}")
        print(f"  {vehicle_name}")
        print(f"  Ground Truth:      {gt_plate}")
        print(f"  Single-Frame Reads ({total_single} frames):")
        for i, r in enumerate(noisy_reads, 1):
            marker = "✓" if r == gt_plate else "✗"
            print(f"    Frame {i:2d}: {r} {marker}")
        print(f"  Single-Frame Accuracy: {correct_single}/{total_single} ({single_accuracy:.1f}%)")
        print(f"  Temporal Voted Result: {voted_plate} {'✓ CORRECT' if voted_correct else '✗ INCORRECT'}")
        print(f"  Readings Used:         {voted_readings}")

    print(f"\n{'=' * 70}")
    print(f"TRACKER SUMMARY")
    summary = voter.get_summary()
    print(f"  Total Confirmed Plates: {summary['total_confirmed']}")
    print(f"  Active Tracks Left:     {summary['active_tracks']}")
    print(f"  All Voted Plates:       {summary['all_plates']}")

    print(f"\n{'=' * 70}")
    if all_pass:
        print(">>> PHASE 9 VERIFICATION PASSED: All 3 vehicles correctly identified <<<")
        return 0
    else:
        print(">>> PHASE 9 PARTIAL: Some vehicles had incorrect voted results <<<")
        return 1


if __name__ == "__main__":
    sys.exit(run_tests())
