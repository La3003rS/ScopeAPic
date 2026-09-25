from __future__ import annotations

import hashlib
import math
from fractions import Fraction
from pathlib import Path
from typing import Any

from PIL import ExifTags, Image

# Register HEIC/HEIF support before opening any images.
# This is required for Pillow to expose HEIC EXIF/GPS data correctly.
try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
except Exception:
    # JPEG/TIFF/etc. should continue to work even if pillow-heif
    # is unavailable.
    pass


TAG_NAMES = {
    tag: name
    for tag, name in ExifTags.TAGS.items()
}

GPS_TAG_NAMES = {
    tag: name
    for tag, name in ExifTags.GPSTAGS.items()
}


def safe_value(value: Any) -> Any:
    if value is None:
        return None

    if isinstance(value, bytes):
        if len(value) <= 64:
            try:
                return value.decode("utf-8", errors="replace")
            except Exception:
                return f"<{len(value)} bytes>"
        return f"<{len(value)} bytes>"

    if isinstance(value, (str, int, float, bool)):
        if isinstance(value, float):
            if math.isnan(value) or math.isinf(value):
                return None
        return value

    if isinstance(value, Fraction):
        return float(value)

    if isinstance(value, (list, tuple)):
        return [safe_value(v) for v in value]

    try:
        return float(value)
    except Exception:
        return str(value)


def numeric_value(value: Any) -> float | None:
    if value is None:
        return None

    try:
        if isinstance(value, Fraction):
            return float(value)

        if isinstance(value, (int, float)):
            return float(value)

        if isinstance(value, str):
            return float(value.strip())

        return float(value)
    except Exception:
        return None


def format_exposure_time(value: Any) -> str | None:
    number = numeric_value(value)

    if number is None:
        return None

    if number <= 0:
        return None

    if number >= 1:
        if abs(number - round(number)) < 0.0001:
            return f"{int(round(number))} s"
        return f"{number:.2f} s"

    denominator = round(1 / number)

    if denominator > 0:
        return f"1/{denominator} s"

    return f"{number:.4f} s"


def format_aperture(value: Any) -> str | None:
    number = numeric_value(value)

    if number is None:
        return None

    return f"f/{number:g}"


def _tag_name(tag: Any) -> str:
    try:
        return TAG_NAMES.get(int(tag), f"Tag {tag}")
    except Exception:
        return str(tag)


def _gps_name(tag: Any) -> str:
    try:
        return GPS_TAG_NAMES.get(int(tag), f"GPS {tag}")
    except Exception:
        return str(tag)


def collect_ifd(
    ifd: Any,
    *,
    section: str,
    records: list[dict[str, Any]],
) -> None:
    if not ifd:
        return

    try:
        iterator = ifd.items()
    except Exception:
        return

    for tag, value in iterator:
        name = _gps_name(tag) if section == "GPS" else _tag_name(tag)

        records.append(
            {
                "section": section,
                "tag": int(tag) if isinstance(tag, int) else str(tag),
                "name": name,
                "value": safe_value(value),
            }
        )


def _get_gps_ifd(exif: Any) -> Any:
    """
    Read the EXIF GPS IFD robustly.

    Some HEIC files return an offset from:
        exif.get(34853)

    while the actual GPS dictionary is returned by:
        exif.get_ifd(34853)

    Therefore we must use get_ifd() rather than treating the
    value returned by exif.get(34853) as the GPS dictionary.
    """
    gps_tag = 34853

    try:
        return exif.get_ifd(gps_tag)
    except Exception:
        pass

    try:
        gps_ifd_tag = ExifTags.IFD.GPS
        return exif.get_ifd(gps_ifd_tag)
    except Exception:
        return None


def collect_all_ifds(exif: Any) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []

    try:
        collect_ifd(exif, section="IFD0", records=records)
    except Exception:
        pass

    try:
        exif_ifd = exif.get_ifd(ExifTags.IFD.Exif)
        collect_ifd(exif_ifd, section="EXIF", records=records)
    except Exception:
        pass

    # GPS is handled explicitly because HEIC files can expose
    # tag 34853 as an offset while get_ifd(34853) contains
    # the actual GPS dictionary.
    try:
        gps_ifd = _get_gps_ifd(exif)
        collect_ifd(gps_ifd, section="GPS", records=records)
    except Exception:
        pass

    try:
        interop_ifd = exif.get_ifd(ExifTags.IFD.Interop)
        collect_ifd(interop_ifd, section="Interop", records=records)
    except Exception:
        pass

    try:
        maker_ifd = exif.get_ifd(ExifTags.IFD.MakerNote)
        collect_ifd(maker_ifd, section="MakerNote", records=records)
    except Exception:
        pass

    return records


def find_record(
    records: list[dict[str, Any]],
    *names: str,
) -> dict[str, Any] | None:
    wanted = {name.lower() for name in names}

    for record in records:
        name = str(record.get("name", "")).lower()

        if name in wanted:
            return record

    return None


def find(
    records: list[dict[str, Any]],
    *names: str,
) -> Any:
    record = find_record(records, *names)

    if not record:
        return None

    return record.get("value")


def gps_to_decimal(value: Any, reference: Any) -> float | None:
    if value is None:
        return None

    try:
        parts = list(value)

        numbers = []

        for part in parts[:3]:
            number = numeric_value(part)

            if number is None:
                return None

            numbers.append(number)

        if len(numbers) != 3:
            return None

        degrees, minutes, seconds = numbers

        decimal = degrees + minutes / 60 + seconds / 3600

        ref = str(reference or "").upper().strip()

        if ref in {"S", "W"}:
            decimal *= -1

        return round(decimal, 7)

    except Exception:
        return None


def gps_coordinates(records: list[dict[str, Any]]) -> tuple[float, float] | None:
    latitude = find(records, "GPSLatitude")
    latitude_ref = find(records, "GPSLatitudeRef")
    longitude = find(records, "GPSLongitude")
    longitude_ref = find(records, "GPSLongitudeRef")

    lat = gps_to_decimal(latitude, latitude_ref)
    lon = gps_to_decimal(longitude, longitude_ref)

    if lat is None or lon is None:
        return None

    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return None

    # Never allow an empty/invalid GPS position to become
    # 0.000000, 0.000000.
    if abs(lat) < 0.0000001 and abs(lon) < 0.0000001:
        return None

    return lat, lon


def _hash_file(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)

    return digest.hexdigest()


def image_file_info(path: Path, image: Image.Image) -> dict[str, Any]:
    stat = path.stat()

    return {
        "name": path.name,
        "extension": path.suffix.lower().lstrip(".").upper() or "UNKNOWN",
        "size_bytes": stat.st_size,
        "size_human": _human_size(stat.st_size),
        "sha256": _hash_file(path),
        "modified": stat.st_mtime,
        "format": image.format or path.suffix.upper().lstrip("."),
        "mode": image.mode,
    }


def _human_size(size: int) -> str:
    units = ["B", "KB", "MB", "GB", "TB"]

    value = float(size)

    for unit in units:
        if value < 1024 or unit == units[-1]:
            if unit == "B":
                return f"{int(value)} B"
            return f"{value:.1f} {unit}"

        value /= 1024

    return f"{size} B"


def _date_value(records: list[dict[str, Any]]) -> str | None:
    return find(
        records,
        "DateTimeOriginal",
        "DateTimeDigitized",
        "DateTime",
    )


def _camera_value(records: list[dict[str, Any]], *names: str) -> Any:
    return find(records, *names)


def analyze_photo(path: str | Path) -> dict[str, Any]:
    path = Path(path)

    with Image.open(path) as image:
        image_format = image.format
        width, height = image.size
        mode = image.mode

        exif = image.getexif()

        records = collect_all_ifds(exif)

        make = _camera_value(
            records,
            "Make",
            "Manufacturer",
        )

        model = _camera_value(
            records,
            "Model",
            "CameraModelName",
        )

        lens = _camera_value(
            records,
            "LensModel",
            "Lens",
            "LensInfo",
        )

        software = _camera_value(
            records,
            "Software",
        )

        date_original = _camera_value(
            records,
            "DateTimeOriginal",
            "DateTimeDigitized",
        )

        date_general = _camera_value(
            records,
            "DateTime",
        )

        exposure_time = _camera_value(
            records,
            "ExposureTime",
            "ShutterSpeedValue",
        )

        aperture = _camera_value(
            records,
            "FNumber",
            "ApertureValue",
        )

        iso = _camera_value(
            records,
            "ISOSpeedRatings",
            "PhotographicSensitivity",
        )

        focal_length = _camera_value(
            records,
            "FocalLength",
        )

        flash = _camera_value(
            records,
            "Flash",
        )

        orientation = _camera_value(
            records,
            "Orientation",
        )

        color_space = _camera_value(
            records,
            "ColorSpace",
        )

        artist = _camera_value(
            records,
            "Artist",
            "Author",
        )

        copyright_value = _camera_value(
            records,
            "Copyright",
        )

        serial = _camera_value(
            records,
            "BodySerialNumber",
            "CameraSerialNumber",
            "SerialNumber",
        )

        lens_serial = _camera_value(
            records,
            "LensSerialNumber",
        )

        gps = gps_coordinates(records)

        privacy_items: list[dict[str, Any]] = []

        if gps:
            privacy_items.append(
                {
                    "type": "location",
                    "label": "GPS location",
                    "value": "Exact coordinates embedded",
                }
            )

        if artist:
            privacy_items.append(
                {
                    "type": "identity",
                    "label": "Author",
                    "value": str(artist),
                }
            )

        if copyright_value:
            privacy_items.append(
                {
                    "type": "copyright",
                    "label": "Copyright",
                    "value": str(copyright_value),
                }
            )

        if serial:
            privacy_items.append(
                {
                    "type": "device",
                    "label": "Camera serial",
                    "value": str(serial),
                }
            )

        if lens_serial:
            privacy_items.append(
                {
                    "type": "device",
                    "label": "Lens serial",
                    "value": str(lens_serial),
                }
            )

        if software:
            privacy_items.append(
                {
                    "type": "software",
                    "label": "Software",
                    "value": str(software),
                }
            )

        # Import here to keep the decoder isolated.
        from .fujifilm import decode_fujifilm

        fujifilm = {}

        make_text = str(make or "").lower()

        if "fujifilm" in make_text or "fuji" in make_text:
            fujifilm = decode_fujifilm(
                [
                    record
                    for record in records
                    if record.get("section") == "MakerNote"
                ]
            )

        if gps:
            lat, lon = gps

            location = {
                "latitude": lat,
                "longitude": lon,
                "available": True,
                "map_url": (
                    "https://www.openstreetmap.org/"
                    f"?mlat={lat}&mlon={lon}"
                    f"#map=16/{lat}/{lon}"
                ),
            }
        else:
            location = {
                "available": False,
            }

        return {
            "file": {
                **image_file_info(path, image),
                "format": image_format,
                "extension": path.suffix.lower().lstrip(".").upper(),
            },
            "camera": {
                "manufacturer": safe_value(make),
                "make": safe_value(make),
                "model": safe_value(model),
                "lens": safe_value(lens),
                "software": safe_value(software),
                "detected": bool(make or model),
            },
            "exposure": {
                "shutter": format_exposure_time(exposure_time),
                "aperture": format_aperture(aperture),
                "iso": safe_value(iso),
                "focal_length": (
                    f"{numeric_value(focal_length):g} mm"
                    if numeric_value(focal_length) is not None
                    else None
                ),
                "flash": safe_value(flash),
            },
            "capture": {
                "original": safe_value(date_original),
                "date_time": safe_value(date_general),
            },
            "location": location,
            "gps": {
                "available": bool(gps),
                "latitude": gps[0] if gps else None,
                "longitude": gps[1] if gps else None,
            },
            "privacy": {
                "items": privacy_items,
                "count": len(privacy_items),
            },
            "identifiers": {
                "camera_serial": safe_value(serial),
                "lens_serial": safe_value(lens_serial),
                "artist": safe_value(artist),
                "copyright": safe_value(copyright_value),
            },
            "image": {
                "width": width,
                "height": height,
                "dimensions": f"{width:,} × {height:,} px",
                "mode": mode,
                "orientation": safe_value(orientation),
                "color_space": safe_value(color_space),
            },
            "fujifilm": fujifilm,
            "metadata": records,
            "metadata_count": len(records),
        }
