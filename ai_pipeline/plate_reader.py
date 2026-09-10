import re

# Standard Indian License Plate Regex pattern
# Examples: GJ05AB1234, GJ-01-XY-7788, GJ 18 CD 4501
PLATE_REGEX = re.compile(r"([A-Z]{2})[- ]?([0-9]{1,2})[- ]?([A-Z]{1,3})[- ]?([0-9]{4})", re.IGNORECASE)

class PlateReader:
    @staticmethod
    def normalize_plate(raw_text: str) -> str:
        """Cleans and standardizes raw OCR string into standard GJ-XX-XX-XXXX format."""
        if not raw_text:
            return ""
        
        # Remove extra punctuation and whitespace
        cleaned = re.sub(r"[^A-Za-z0-9]", "", raw_text).upper()
        
        # Common OCR fixes
        if cleaned.startswith("6J") or cleaned.startswith("CJ"):
            cleaned = "GJ" + cleaned[2:]
            
        match = PLATE_REGEX.search(cleaned)
        if match:
            state, district, series, number = match.groups()
            # Standardize 2-digit district
            district = district.zfill(2)
            return f"{state.upper()}-{district}-{series.upper()}-{number}"
            
        return cleaned

    @staticmethod
    def parse_frame_for_plates(frame):
        """Simulates license plate region extraction and character recognition."""
        # For evaluation, return detected candidates
        return []
