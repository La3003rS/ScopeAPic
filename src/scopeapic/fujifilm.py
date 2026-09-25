"""
Conservative Fujifilm MakerNote decoding.

Vendor MakerNote fields vary between models and firmware versions.
Values returned here are labelled with confidence and should be treated
as useful decoded evidence rather than absolute truth.
"""

from typing import Any


FUJI_TAGS = {
    0x1000: ("Quality", "quality"),
    0x1001: ("Sharpness", "sharpness"),
    0x1002: ("White Balance", "white_balance"),
    0x1003: ("Color", "color"),
    0x1004: ("Tone", "tone"),
    0x1005: ("Noise Reduction", "noise_reduction"),
    0x1006: ("Film Mode", "film_mode"),
    0x1007: ("Dynamic Range", "dynamic_range"),
    0x1008: ("Development Dynamic Range", "development_dynamic_range"),
    0x1009: ("White Balance Fine Tune", "wb_fine_tune"),
    0x100A: ("Color Temperature", "color_temperature"),
    0x100B: ("Contrast", "contrast"),
    0x100C: ("Saturation", "saturation"),
    0x100D: ("Sharpness", "sharpness_2"),
    0x1010: ("Focus Mode", "focus_mode"),
    0x1011: ("AF Mode", "af_mode"),
    0x1012: ("AF Area", "af_area"),
    0x1013: ("Shutter Type", "shutter_type"),
    0x1014: ("Image Stabilization", "image_stabilization"),
    0x1015: ("Grain Effect", "grain_effect"),
    0x1016: ("Color Chrome Effect", "color_chrome_effect"),
}


FILM_MODES = {
    0: "Provia / Standard",
    1: "Velvia / Vivid",
    2: "Astia / Soft",
    3: "Black & White",
    4: "Sepia",
    5: "Pro Neg. Hi",
    6: "Pro Neg. Std",
    7: "Classic Chrome",
    8: "Acros",
    9: "Eterna",
    10: "Classic Negative",
    11: "Nostalgic Neg.",
    12: "Eterna Bleach Bypass",
}


WHITE_BALANCE = {
    0: "Auto",
    1: "Daylight",
    2: "Cloudy",
    3: "Daylight Fluorescent",
    4: "Day White Fluorescent",
    5: "Cool White Fluorescent",
    6: "Incandescent",
    7: "Underwater",
    8: "Custom",
}


FOCUS_MODES = {
    0: "Auto",
    1: "Single AF",
    2: "Continuous AF",
    3: "Manual",
}


AF_MODES = {
    0: "Single Point",
    1: "Zone",
    2: "Wide / Tracking",
    3: "All",
}


SHUTTER_TYPES = {
    0: "Mechanical",
    1: "Electronic",
    2: "Electronic Front Curtain",
}


def _primitive(value: Any) -> Any:
    if value is None:
        return None

    if isinstance(value, bytes):
        return f"<{len(value)} bytes>"

    if isinstance(value, (str, int, float, bool)):
        return value

    if isinstance(value, (list, tuple)):
        return [_primitive(v) for v in value]

    try:
        return float(value)
    except Exception:
        return str(value)


def _confidence(value: Any) -> str:
    if value is None:
        return "unknown"

    if isinstance(value, (int, float)):
        return "medium"

    if isinstance(value, str):
        return "medium"

    return "low"


def decode_fujifilm(records: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Look for Fuji MakerNote records in a normalized metadata list.

    The decoder deliberately stays conservative. Unknown proprietary
    fields are not invented.
    """

    if not records:
        return {}

    output: dict[str, Any] = {}

    for record in records:
        name = str(record.get("name", ""))
        value = record.get("value")
        tag = record.get("tag")

        if tag is None:
            continue

        try:
            tag_number = int(tag)
        except Exception:
            continue

        if tag_number not in FUJI_TAGS:
            continue

        label, key = FUJI_TAGS[tag_number]

        if key == "film_mode" and isinstance(value, (int, float)):
            value = FILM_MODES.get(int(value), value)

        elif key == "white_balance" and isinstance(value, (int, float)):
            value = WHITE_BALANCE.get(int(value), value)

        elif key == "focus_mode" and isinstance(value, (int, float)):
            value = FOCUS_MODES.get(int(value), value)

        elif key == "af_mode" and isinstance(value, (int, float)):
            value = AF_MODES.get(int(value), value)

        elif key == "shutter_type" and isinstance(value, (int, float)):
            value = SHUTTER_TYPES.get(int(value), value)

        output[key] = {
            "label": label,
            "value": _primitive(value),
            "confidence": _confidence(value),
            "source": "Fujifilm MakerNote",
            "raw_name": name,
        }

    return output
