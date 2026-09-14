"""
Phase 9: Multi-Frame Temporal Voting Tracker
=============================================
Approach: Centroid + IoU tracker (no heavy ByteTrack dependency).
For each tracked vehicle, collects OCR plate readings across consecutive
frames and returns a character-position majority vote as the confirmed plate.

Usage:
    voter = TemporalVoter(iou_threshold=0.35, min_readings=3, max_age=30)
    for frame_result in plate_reader_stream:
        confirmed = voter.update(frame_result["detections"], frame_result["frame_id"])
        for plate in confirmed:
            print(plate)  # final voted plate string
"""

import time
from collections import defaultdict, Counter


def compute_iou(box_a, box_b):
    """Compute IoU between two [x1, y1, x2, y2] bounding boxes."""
    x1 = max(box_a[0], box_b[0])
    y1 = max(box_a[1], box_b[1])
    x2 = min(box_a[2], box_b[2])
    y2 = min(box_a[3], box_b[3])

    inter = max(0, x2 - x1) * max(0, y2 - y1)
    area_a = max(0, box_a[2] - box_a[0]) * max(0, box_a[3] - box_a[1])
    area_b = max(0, box_b[2] - box_b[0]) * max(0, box_b[3] - box_b[1])
    union = area_a + area_b - inter

    return inter / union if union > 0 else 0.0


def centroid(box):
    """Return (cx, cy) centroid of [x1, y1, x2, y2] box."""
    return ((box[0] + box[2]) / 2.0, (box[1] + box[3]) / 2.0)


def centroid_distance(box_a, box_b):
    """Euclidean distance between centroids of two boxes."""
    ca = centroid(box_a)
    cb = centroid(box_b)
    return ((ca[0] - cb[0]) ** 2 + (ca[1] - cb[1]) ** 2) ** 0.5


class TrackedVehicle:
    """Represents a single tracked vehicle across consecutive frames."""

    _next_id = 1

    def __init__(self, bbox, plate_text, confidence, frame_id):
        self.track_id = TrackedVehicle._next_id
        TrackedVehicle._next_id += 1
        self.bbox = bbox
        self.readings = []  # list of (plate_text, confidence)
        self.first_frame = frame_id
        self.last_frame = frame_id
        self.age = 0  # frames since last seen

        if plate_text:
            self.readings.append((plate_text, confidence))

    def update(self, bbox, plate_text, confidence, frame_id):
        """Update track with new detection."""
        self.bbox = bbox
        self.last_frame = frame_id
        self.age = 0
        if plate_text:
            self.readings.append((plate_text, confidence))

    def get_voted_plate(self):
        """
        Character-position majority vote across all collected readings.
        Returns the consensus plate string or empty string if insufficient data.
        """
        valid_readings = [r for r, c in self.readings if r and len(r) >= 10]
        if not valid_readings:
            # Fall back to most common full string
            all_readings = [r for r, c in self.readings if r]
            if all_readings:
                counter = Counter(all_readings)
                return counter.most_common(1)[0][0]
            return ""

        # Normalize to same length for character voting
        # Indian plates in normalized form: XX-NN-XXX-NNNN (13-15 chars)
        # Group by length and vote within the largest group
        len_counter = Counter(len(r) for r in valid_readings)
        target_len = len_counter.most_common(1)[0][0]
        same_len = [r for r in valid_readings if len(r) == target_len]

        if len(same_len) < 2:
            # Not enough same-length readings for voting, return most common
            counter = Counter(valid_readings)
            return counter.most_common(1)[0][0]

        # Character-position majority vote
        voted = []
        for pos in range(target_len):
            chars_at_pos = [r[pos] for r in same_len]
            counter = Counter(chars_at_pos)
            voted.append(counter.most_common(1)[0][0])

        return "".join(voted)

    @property
    def reading_count(self):
        return len(self.readings)


class TemporalVoter:
    """
    Multi-frame temporal voting tracker.

    For each incoming frame's detections, matches them to existing tracks
    via IoU + centroid proximity, collects OCR readings, and emits a
    confirmed voted plate when:
      - The track has >= min_readings OCR samples, OR
      - The track has aged out (vehicle left the frame).
    """

    def __init__(self, iou_threshold=0.35, centroid_max_dist=120.0,
                 min_readings=3, max_age=30):
        self.iou_threshold = iou_threshold
        self.centroid_max_dist = centroid_max_dist
        self.min_readings = min_readings
        self.max_age = max_age  # frames without match before track expires
        self.active_tracks = []  # list of TrackedVehicle
        self.confirmed_plates = []  # finalized results

    def update(self, detections, frame_id):
        """
        Process one frame's detections.

        Args:
            detections: list of dicts from PlateReader.parse_frame_for_plates()
                Each dict has: bbox, confidence, plate_number, class_name
            frame_id: monotonic frame counter or timestamp

        Returns:
            list of dicts for any newly confirmed plates this frame:
            [{"track_id": int, "plate": str, "readings": int, "confidence": float}]
        """
        newly_confirmed = []

        # Build cost matrix: IoU between each detection and each active track
        matched_tracks = set()
        matched_dets = set()

        # Sort detections and tracks for greedy matching
        for det_idx, det in enumerate(detections):
            best_iou = 0.0
            best_track_idx = -1

            for trk_idx, track in enumerate(self.active_tracks):
                if trk_idx in matched_tracks:
                    continue
                iou = compute_iou(det["bbox"], track.bbox)
                cdist = centroid_distance(det["bbox"], track.bbox)

                # Match if IoU exceeds threshold OR centroids are close enough
                score = iou + (0.3 if cdist < self.centroid_max_dist else 0.0)
                if score > best_iou:
                    best_iou = score
                    best_track_idx = trk_idx

            if best_track_idx >= 0 and best_iou >= self.iou_threshold:
                # Update existing track
                track = self.active_tracks[best_track_idx]
                track.update(
                    det["bbox"],
                    det.get("plate_number", ""),
                    det.get("confidence", 0.0),
                    frame_id
                )
                matched_tracks.add(best_track_idx)
                matched_dets.add(det_idx)

        # Create new tracks for unmatched detections
        for det_idx, det in enumerate(detections):
            if det_idx not in matched_dets:
                new_track = TrackedVehicle(
                    det["bbox"],
                    det.get("plate_number", ""),
                    det.get("confidence", 0.0),
                    frame_id
                )
                self.active_tracks.append(new_track)

        # Age out unmatched tracks and emit confirmed plates
        still_active = []
        for trk_idx, track in enumerate(self.active_tracks):
            if trk_idx not in matched_tracks:
                track.age += 1

            if track.age > self.max_age:
                # Track expired — emit voted plate if enough readings
                if track.reading_count >= 1:
                    voted = track.get_voted_plate()
                    if voted:
                        avg_conf = sum(c for _, c in track.readings) / len(track.readings) if track.readings else 0.0
                        result = {
                            "track_id": track.track_id,
                            "plate": voted,
                            "readings": track.reading_count,
                            "confidence": round(avg_conf, 4),
                            "first_frame": track.first_frame,
                            "last_frame": track.last_frame,
                        }
                        newly_confirmed.append(result)
                        self.confirmed_plates.append(result)
            else:
                still_active.append(track)

        self.active_tracks = still_active

        # Also check if any active track has accumulated enough readings
        # and hasn't been emitted yet — emit early for real-time response
        for track in self.active_tracks:
            if track.reading_count >= self.min_readings:
                voted = track.get_voted_plate()
                if voted:
                    # Check if we already emitted this track
                    already_emitted = any(
                        c["track_id"] == track.track_id
                        for c in self.confirmed_plates
                    )
                    if not already_emitted:
                        avg_conf = sum(c for _, c in track.readings) / len(track.readings)
                        result = {
                            "track_id": track.track_id,
                            "plate": voted,
                            "readings": track.reading_count,
                            "confidence": round(avg_conf, 4),
                            "first_frame": track.first_frame,
                            "last_frame": track.last_frame,
                        }
                        newly_confirmed.append(result)
                        self.confirmed_plates.append(result)

        return newly_confirmed

    def flush(self):
        """Force-emit all remaining active tracks (call at end of stream)."""
        results = []
        for track in self.active_tracks:
            if track.reading_count >= 1:
                voted = track.get_voted_plate()
                if voted:
                    already = any(c["track_id"] == track.track_id for c in self.confirmed_plates)
                    if not already:
                        avg_conf = sum(c for _, c in track.readings) / len(track.readings)
                        result = {
                            "track_id": track.track_id,
                            "plate": voted,
                            "readings": track.reading_count,
                            "confidence": round(avg_conf, 4),
                            "first_frame": track.first_frame,
                            "last_frame": track.last_frame,
                        }
                        results.append(result)
                        self.confirmed_plates.append(result)
        self.active_tracks = []
        return results

    def get_summary(self):
        """Returns summary statistics."""
        return {
            "total_confirmed": len(self.confirmed_plates),
            "active_tracks": len(self.active_tracks),
            "all_plates": [c["plate"] for c in self.confirmed_plates],
        }
