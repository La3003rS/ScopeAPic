from pathlib import Path
from io import BytesIO

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles

from PIL import Image
from pillow_heif import register_heif_opener

from .metadata import analyze_photo


register_heif_opener()


app = FastAPI(
    title="ScopeAPic",
    description="Photo intelligence and deep metadata analysis.",
    version="0.2.0",
)


BASE_DIR = Path(__file__).resolve().parent


app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "static"),
    name="static",
)


@app.get("/", response_class=HTMLResponse)
async def home():
    return (
        BASE_DIR / "templates" / "index.html"
    ).read_text(encoding="utf-8")


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)):

    image_data = await file.read()

    return analyze_photo(
        image_data=image_data,
        filename=file.filename or "unknown",
        content_type=file.content_type,
    )


@app.post("/api/preview")
async def preview(file: UploadFile = File(...)):

    image_data = await file.read()

    image = Image.open(
        BytesIO(image_data)
    )

    image.thumbnail(
        (2400, 2400),
        Image.Resampling.LANCZOS,
    )

    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    output = BytesIO()

    image.save(
        output,
        format="JPEG",
        quality=92,
        optimize=True,
    )

    return Response(
        content=output.getvalue(),
        media_type="image/jpeg",
    )
