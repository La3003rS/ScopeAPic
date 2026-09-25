from __future__ import annotations

import io
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

from .metadata import analyze_photo


register_heif_opener()

BASE_DIR = Path(__file__).resolve().parent
TEMPLATE_PATH = BASE_DIR / "templates" / "index.html"
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(
    title="ScopeAPic",
    version="0.3.0",
)

app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static",
)


ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".tif",
    ".tiff",
    ".heic",
    ".heif",
}


def validate_upload(filename: str | None) -> None:
    if not filename:
        raise HTTPException(
            status_code=400,
            detail="No filename supplied.",
        )

    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported image format. "
                "Supported: JPG, PNG, WebP, TIFF, HEIC and HEIF."
            ),
        )


@app.get("/")
async def index() -> Response:
    return Response(
        TEMPLATE_PATH.read_text(encoding="utf-8"),
        media_type="text/html",
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/analyze")
async def api_analyze(file: UploadFile = File(...)):
    validate_upload(file.filename)

    data = await file.read()

    if not data:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    suffix = Path(file.filename or "").suffix.lower()

    temporary_path: Path | None = None

    try:
        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as handle:
            handle.write(data)
            temporary_path = Path(handle.name)

        result = analyze_photo(temporary_path)

        # Restore the user's filename because the analysis file is temporary.
        result["file"]["name"] = file.filename

        return JSONResponse(result)

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to analyze image: {exc}",
        ) from exc

    finally:
        if temporary_path:
            try:
                temporary_path.unlink(missing_ok=True)
            except Exception:
                pass


@app.post("/api/preview")
async def api_preview(file: UploadFile = File(...)):
    validate_upload(file.filename)

    data = await file.read()

    if not data:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    try:
        with Image.open(io.BytesIO(data)) as image:
            image = ImageOps.exif_transpose(image)

            if image.mode not in {"RGB", "RGBA"}:
                image = image.convert("RGB")

            image.thumbnail(
                (1800, 1200),
                Image.Resampling.LANCZOS,
            )

            output = io.BytesIO()

            if image.mode == "RGBA":
                background = Image.new(
                    "RGB",
                    image.size,
                    "black",
                )
                background.paste(
                    image,
                    mask=image.getchannel("A"),
                )
                image = background
            else:
                image = image.convert("RGB")

            image.save(
                output,
                format="JPEG",
                quality=90,
                optimize=True,
            )

            return Response(
                output.getvalue(),
                media_type="image/jpeg",
                headers={
                    "Cache-Control": "no-store",
                },
            )

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to create preview: {exc}",
        ) from exc
