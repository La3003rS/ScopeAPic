from __future__ import annotations


FUJI_TAGS = {
    0x1000: "Version",
    0x1001: "InternalSerialNumber",
    0x1002: "Quality",
    0x1003: "Sharpness",
    0x1006: "WhiteBalance",
    0x1007: "Saturation",
    0x1008: "Contrast",
    0x1009: "ColorTemperature",
    0x100A: "WhiteBalanceFineTune",
    0x100B: "NoiseReduction",
    0x100C: "HighISONoiseReduction",
    0x100D: "Clarity",

    0x1010: "FlashMode",
    0x1011: "FlashExposureCompensation",
    0x1020: "Macro",
    0x1021: "FocusMode",
    0x1022: "AFMode",
    0x1023: "FocusPixel",

    0x1030: "SlowSync",
    0x1031: "PictureMode",
    0x1032: "ExposureCount",

    0x1100: "ShadowTone",
    0x1101: "HighlightTone",
    0x1102: "LensModulationOptimizer",
    0x1103: "GrainEffectRoughness",
    0x1104: "ColorChromeEffect",
    0x1105: "GrainEffectSize",
    0x1106: "ColorChromeFXBlue",
    0x1107: "ShutterType",

    0x1200: "AutoBracketing",
    0x1201: "SequenceNumber",

    0x1300: "AdvancedFilter",
    0x1301: "ColorMode",

    0x1400: "BlurWarning",
    0x1401: "FocusWarning",
    0x1402: "ExposureWarning",

    0x1404: "DynamicRange",
    0x1405: "FilmMode",
    0x1406: "DynamicRangeSetting",
    0x1407: "DevelopmentDynamicRange",

    0x1420: "MinFocalLength",
    0x1421: "MaxFocalLength",
    0x1422: "MaxApertureAtMinFocal",
    0x1423: "MaxApertureAtMaxFocal",

    0x1424: "ImageStabilization",
    0x1430: "SceneRecognition",

    0x1431: "Rating",
    0x1432: "ImageGeneration",
    0x1433: "ImageCount",

    0x1440: "DynamicRangePriority",
    0x1441: "DynamicRangePriorityAuto",
    0x1442: "DynamicRangePriorityFixed",

    0x1443: "FlickerReduction",

    0x1600: "FujiModel",
    0x1601: "FujiModel2",

    0x1700: "WBRed",
    0x1701: "WBGreen",
    0x1702: "WBBlue",

    0x1800: "RollAngle",
}


WHITE_BALANCE = {
    0x000: "Auto",
    0x100: "Daylight",
    0x200: "Cloudy",
    0x300: "Fluorescent",
    0x400: "Incandescent",
    0x500: "Flash",
    0x600: "Underwater",
    0xF00: "Custom",
}


FOCUS_MODE = {
    0: "Manual",
    1: "Single AF",
    2: "Continuous AF",
}


AF_MODE = {
    0: "Single Point",
    1: "Zone",
    2: "Wide / Tracking",
}


SHUTTER_TYPE = {
    0: "Mechanical",
    1: "Electronic",
    2: "Electronic Front Curtain",
}


DYNAMIC_RANGE = {
    1: "Standard",
    3: "Wide",
}


DYNAMIC_RANGE_SETTING = {
    0: "Auto",
    1: "Manual",
    100: "Standard",
    200: "Wide 1",
    400: "Wide 2",
}


FILM_MODES = {
    0x000: "PROVIA / Standard",
    0x100: "PRO Neg. Hi",
    0x120: "ASTIA / Soft",
    0x200: "Velvia / Vivid",
    0x500: "PRO Neg. Std",
    0x600: "Classic Chrome",
    0x700: "ETERNA / Cinema",
    0x800: "Classic Negative",
    0x900: "ETERNA Bleach Bypass",
    0xA00: "Nostalgic Neg.",
    0xB00: "REALA ACE",
}


def raw_number(value):

    if isinstance(value, dict):

        if "value" in value:
            return raw_number(
                value["value"]
            )

    try:
        return float(value)
    except (
        TypeError,
        ValueError,
    ):
        return None


def raw_integer(value):

    number = raw_number(value)

    if number is None:
        return None

    return int(number)


def raw_array(value):

    if isinstance(value, dict):

        if "value" in value:
            value = value["value"]

    if isinstance(value, (list, tuple)):
        return list(value)

    return [value]


def on_off(value):

    number = raw_integer(value)

    if number is None:
        return None

    if number == 0:
        return "Off"

    if number == 1:
        return "On"

    return str(number)


def interpret(
    tag_id,
    raw,
):

    number = raw_integer(raw)

    name = FUJI_TAGS.get(
        tag_id,
        f"UnknownTag_{tag_id}",
    )


    if name == "WhiteBalance":

        if number in WHITE_BALANCE:
            return (
                WHITE_BALANCE[number],
                "high",
            )


    if name == "FocusMode":

        if number in FOCUS_MODE:
            return (
                FOCUS_MODE[number],
                "medium",
            )


    if name == "AFMode":

        if number in AF_MODE:
            return (
                AF_MODE[number],
                "medium",
            )


    if name in {
        "LensModulationOptimizer",
        "GrainEffectRoughness",
        "GrainEffectSize",
        "ColorChromeEffect",
        "ColorChromeFXBlue",
        "NoiseReduction",
        "HighISONoiseReduction",
        "FlickerReduction",
    }:

        result = on_off(raw)

        if result is not None:
            return (
                result,
                "medium",
            )


    if name == "ShutterType":

        if number in SHUTTER_TYPE:
            return (
                SHUTTER_TYPE[number],
                "medium",
            )


    if name == "DynamicRange":

        if number in DYNAMIC_RANGE:
            return (
                DYNAMIC_RANGE[number],
                "medium",
            )


    if name == "DynamicRangeSetting":

        if number in DYNAMIC_RANGE_SETTING:
            return (
                DYNAMIC_RANGE_SETTING[number],
                "medium",
            )


    if name == "FilmMode":

        if number in FILM_MODES:
            return (
                FILM_MODES[number],
                "medium",
            )


    if name == "MinFocalLength":

        if number is not None:
            return (
                f"{number:g} mm",
                "high",
            )


    if name == "MaxFocalLength":

        if number is not None:
            return (
                f"{number:g} mm",
                "high",
            )


    if name in {
        "MaxApertureAtMinFocal",
        "MaxApertureAtMaxFocal",
    }:

        if number is not None:
            return (
                f"f/{number:g}",
                "high",
            )


    if name == "ImageStabilization":

        values = raw_array(raw)

        return (
            {
                "raw_components": values,
                "description":
                    "Fujifilm stabilization data",
            },
            "low",
        )


    if name in {
        "FujiModel",
        "FujiModel2",
    }:

        if raw is not None:

            return (
                str(raw),
                "high",
            )


    if name in {
        "WBRed",
        "WBGreen",
        "WBBlue",
    }:

        if number is not None:

            return (
                int(number),
                "medium",
            )


    if name == "RollAngle":

        if number is not None:

            return (
                f"{number:g}°",
                "medium",
            )


    return (
        None,
        "unknown",
    )


def decode_fujifilm(records):

    decoded = []

    for record in records:

        if record["section"] != "MAKERNOTE":
            continue

        tag_id = record["tag_id"]

        name = FUJI_TAGS.get(
            tag_id,
            f"UnknownTag_{tag_id}",
        )

        raw = record["value"]

        interpreted, confidence = interpret(
            tag_id,
            raw,
        )

        decoded.append(
            {
                "tag_id": tag_id,
                "name": name,
                "raw_value": raw,
                "interpreted_value": interpreted,
                "confidence": confidence,
                "source": "Fujifilm MakerNote",
            }
        )

    return decoded
