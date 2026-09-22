from __future__ import annotations

from fractions import Fraction
from io import BytesIO
from typing import Any

from PIL import ExifTags, Image
from pillow_heif import register_heif_opener

from .fujifilm import decode_fujifilm


register_heif_opener()


TAG_NAMES = {
    tag_id: name
    for tag_id, name in ExifTags.TAGS.items()
}


GPS_TAG_NAMES = {
    tag_id: name
    for tag_id, name in ExifTags.GPSTAGS.items()
}


def safe_value(value: Any) -> Any:

    if value is None:
        return None

    if isinstance(value, bytes):
        try:
            return value.decode(
                "utf-8",
                errors="replace",
            )
        except Exception:
            return value.hex()

    if isinstance(value, Fraction):
        if value.denominator == 1:
            return value.numerator

        return float(value)

    if isinstance(value, tuple):
        return [
            safe_value(item)
            for item in value
        ]

    if isinstance(value, list):
        return [
            safe_value(item)
            for item in value
        ]

    if isinstance(value, dict):
        return {
            str(key): safe_value(item)
            for key, item in value.items()
        }

    try:
        if hasattr(value, "item"):
            return safe_value(value.item())
    except Exception:
        pass

    if isinstance(value, (str, int, float, bool)):
        return value

    return str(value)


def numeric_value(value):

    if value is None:
        return None

    if isinstance(value, dict):

        if "value" in value:
            return numeric_value(
                value["value"]
            )

        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def format_exposure_time(value):

    number = numeric_value(value)

    if number is None:
        return None

    if number == 0:
        return None

    if number >= 1:
        return f"{number:g} s"

    reciprocal = round(1 / number)

    if reciprocal > 1:
        return f"1/{reciprocal} s"

    return f"{number:g} s"


def format_aperture(value):

    number = numeric_value(value)

    if number is None:
        return None

    return f"f/{number:g}"


def collect_ifd(
    section: str,
    values: dict,
    tag_names: dict | None = None,
):

    tag_names = tag_names or TAG_NAMES

    records = []

    for tag_id, value in values.items():

        name = tag_names.get(
            tag_id,
            f"UnknownTag_{tag_id}",
        )

        records.append(
            {
                "section": section,
                "tag_id": tag_id,
                "name": name,
                "value": safe_value(value),
            }
        )

    return records


def collect_all_ifds(image: Image.Image):

    records = []

    try:
        exif = image.getexif()
    except Exception:
        exif = None

    if not exif:
        return records

    try:
        records.extend(
            collect_ifd(
                "IFD0",
                dict(exif),
            )
        )
    except Exception:
        pass

    for ifd_name, ifd_type in [
        ("EXIF", ExifTags.IFD.Exif),
        ("GPS", ExifTags.IFD.GPSInfo),
        ("MAKERNOTE", ExifTags.IFD.MakerNote),
        ("INTEROP", ExifTags.IFD.Interop),
        ("IFD1", ExifTags.IFD.IFD1),
    ]:

        try:

            values = exif.get_ifd(
                ifd_type
            )

            if not values:
                continue

            if ifd_name == "GPS":
                records.extend(
                    collect_ifd(
                        ifd_name,
                        dict(values),
                        GPS_TAG_NAMES,
                    )
                )
            else:
                records.extend(
                    collect_ifd(
                        ifd_name,
                        dict(values),
                    )
                )

        except Exception:
            continue

    return records


def find(
    records,
    name,
    section=None,
):

    for record in records:

        if record["name"] != name:
            continue

        if (
            section is not None
            and record["section"] != section
        ):
            continue

        return record["value"]

    return None


def find_record(
    records,
    name,
    section=None,
):

    for record in records:

        if record["name"] != name:
            continue

        if (
            section is not None
            and record["section"] != section
        ):
            continue

        return record

    return None


def gps_to_decimal(
    coordinates,
    reference,
):

    if not coordinates:
        return None

    try:

        parts = [
            numeric_value(item)
            for item in coordinates
        ]

        if any(
            item is None
            for item in parts
        ):
            return None

        degrees, minutes, seconds = parts

        decimal = (
            degrees
            + minutes / 60
            + seconds / 3600
        )

        if reference in ("S", "W"):
            decimal *= -1

        return decimal

    except Exception:
        return None


def gps_coordinates(records):

    latitude = find(
        records,
        "GPSLatitude",
        "GPS",
    )

    latitude_ref = find(
        records,
        "GPSLatitudeRef",
        "GPS",
    )

    longitude = find(
        records,
        "GPSLongitude",
        "GPS",
    )

    longitude_ref = find(
        records,
        "GPSLongitudeRef",
        "GPS",
    )

    if (
        latitude is None
        or longitude is None
    ):
        return None

    lat = gps_to_decimal(
        latitude,
        str(latitude_ref or ""),
    )

    lon = gps_to_decimal(
        longitude,
        str(longitude_ref or ""),
    )

    if lat is None or lon is None:
        return None

    altitude = find(
        records,
        "GPSAltitude",
        "GPS",
    )

    altitude_ref = find(
        records,
        "GPSAltitudeRef",
        "GPS",
    )

    altitude_value = numeric_value(
        altitude
    )

    if (
        altitude_value is not None
        and altitude_ref in (1, "1", b"\x01")
    ):
        altitude_value *= -1

    direction = find(
        records,
        "GPSImgDirection",
        "GPS",
    )

    direction_value = numeric_value(
        direction
    )

    return {
        "latitude": lat,
        "longitude": lon,
        "altitude": altitude_value,
        "direction": direction_value,
        "latitude_raw": safe_value(
            latitude
        ),
        "longitude_raw": safe_value(
            longitude
        ),
    }


def image_file_info(
    image,
    image_data,
    filename,
    content_type,
):

    width, height = image.size

    megapixels = (
        width * height
    ) / 1_000_000

    aspect_ratio = None

    if height:
        ratio = width / height

        aspect_ratio = (
            f"{ratio:.2f}:1"
        )

    format_name = (
        image.format
        or PathLikeFormat(filename)
    )

    return {
        "filename": filename,
        "content_type": content_type,
        "format": format_name,
        "width": width,
        "height": height,
        "megapixels": round(
            megapixels,
            2,
        ),
        "aspect_ratio": aspect_ratio,
        "size_bytes": len(image_data),
        "mode": image.mode,
    }


def PathLikeFormat(filename):

    if "." not in filename:
        return "Unknown"

    extension = (
        filename
        .rsplit(".", 1)[-1]
        .upper()
    )

    return extension


def analyze_photo(
    image_data: bytes,
    filename: str,
    content_type: str | None,
):

    image = Image.open(
        BytesIO(image_data)
    )

    records = collect_all_ifds(
        image
    )

    fujifilm_records = []

    camera_make = find(
        records,
        "Make",
    )

    camera_model = find(
        records,
        "Model",
    )

    if (
        camera_make
        and "FUJIFILM"
        in str(camera_make).upper()
    ):

        fujifilm_records = (
            decode_fujifilm(records)
        )

    camera_software = find(
        records,
        "Software",
    )

    lens_model = find(
        records,
        "LensModel",
    )

    lens_make = find(
        records,
        "LensMake",
    )

    iso = find(
        records,
        "ISOSpeedRatings",
    )

    shutter = find(
        records,
        "ExposureTime",
    )

    aperture = find(
        records,
        "FNumber",
    )

    focal_length = find(
        records,
        "FocalLength",
    )

    focal_35 = find(
        records,
        "FocalLengthIn35mmFilm",
    )

    exposure_bias = find(
        records,
        "ExposureBiasValue",
    )

    metering = find(
        records,
        "MeteringMode",
    )

    flash = find(
        records,
        "Flash",
    )

    white_balance = find(
        records,
        "WhiteBalance",
    )

    exposure_program = find(
        records,
        "ExposureProgram",
    )

    exposure_mode = find(
        records,
        "ExposureMode",
    )

    max_aperture = find(
        records,
        "MaxApertureValue",
    )

    date_original = find(
        records,
        "DateTimeOriginal",
    )

    offset_original = find(
        records,
        "OffsetTimeOriginal",
    )

    subsec_original = find(
        records,
        "SubsecTimeOriginal",
    )

    artist = find(
        records,
        "Artist",
    )

    copyright_value = find(
        records,
        "Copyright",
    )

    body_serial = find(
        records,
        "BodySerialNumber",
    )

    lens_serial = find(
        records,
        "LensSerialNumber",
    )

    orientation = find(
        records,
        "Orientation",
    )

    color_space = find(
        records,
        "ColorSpace",
    )

    gps = gps_coordinates(
        records
    )

    file_info = image_file_info(
        image,
        image_data,
        filename,
        content_type,
    )

    privacy = {
        "gps_present": gps is not None,
        "camera_serial_present": bool(
            body_serial
        ),
        "lens_serial_present": bool(
            lens_serial
        ),
        "artist_present": bool(
            artist
        ),
        "copyright_present": bool(
            copyright_value
        ),
        "software_present": bool(
            camera_software
        ),
    }

    return {
        "file": file_info,

        "camera": {
            "make": camera_make,
            "model": camera_model,
            "lens": lens_model,
            "lens_make": lens_make,
            "software": camera_software,
        },

        "exposure": {
            "iso": safe_value(iso),
            "shutter_speed": format_exposure_time(
                shutter
            ),
            "aperture": format_aperture(
                aperture
            ),
            "focal_length": safe_value(
                focal_length
            ),
            "focal_length_35mm": safe_value(
                focal_35
            ),
            "exposure_bias": safe_value(
                exposure_bias
            ),
            "metering_mode": safe_value(
                metering
            ),
            "flash": safe_value(
                flash
            ),
            "white_balance": safe_value(
                white_balance
            ),
            "exposure_program": safe_value(
                exposure_program
            ),
            "exposure_mode": safe_value(
                exposure_mode
            ),
            "max_aperture": format_aperture(
                max_aperture
            ),
        },

        "capture": {
            "date_time_original": safe_value(
                date_original
            ),
            "offset_time_original": safe_value(
                offset_original
            ),
            "subsec_time_original": safe_value(
                subsec_original
            ),
        },

        "location": gps,
        "gps": gps,

        "privacy": privacy,

        "identifiers": {
            "camera_serial": safe_value(
                body_serial
            ),
            "lens_serial": safe_value(
                lens_serial
            ),
            "artist": safe_value(
                artist
            ),
            "copyright": safe_value(
                copyright_value
            ),
        },

        "image": {
            "orientation": safe_value(
                orientation
            ),
            "color_space": safe_value(
                color_space
            ),
        },

        "fujifilm": {
            "detected": bool(
                fujifilm_records
            ),
            "metadata": fujifilm_records,
        },

        "metadata": records,
        "metadata_count": len(records),
    }
