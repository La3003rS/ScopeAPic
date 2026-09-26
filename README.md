# ScopeAPic

**ScopeAPic is a local-first photo metadata analysis tool.**

It analyzes photos and presents useful information stored inside them, including camera and device details, lens information, exposure settings, capture data, GPS information and raw metadata.

ScopeAPic also provides additional analysis for Fujifilm cameras.

## Features

- Camera and device information
- Lens and focal-length information
- Shutter speed, aperture and ISO
- Capture date and time
- Image dimensions and file information
- GPS coordinates and map location
- OpenStreetMap and Google Maps links
- Fujifilm-specific metadata analysis
- Raw metadata inspection
- Responsive desktop and mobile interface
- Local-first processing

### Fujifilm

For supported Fujifilm images, ScopeAPic can interpret information such as:

- Film Simulation
- White Balance
- Focus Mode
- AF Mode
- Dynamic Range
- Shutter Type
- Grain Effect
- Color Chrome Effect
- Image Stabilization

Support for additional camera manufacturers can be added in the future.

## Supported formats

- JPG / JPEG
- PNG
- HEIC / HEIF

## Privacy

Photo metadata can contain sensitive information such as GPS coordinates, camera and lens serial numbers, author information and capture dates.

ScopeAPic is designed to run locally, so images do not need to be uploaded to a third-party analysis service.

Always check an image's metadata before sharing it publicly.

## Installation

### Requirements

You need:

- Python 3.13 or newer
- Git
- A modern web browser

### Download ScopeAPic

Clone the repository from GitHub:

    git clone https://github.com/La3003rS/ScopeAPic.git
    cd ScopeAPic

### Create a virtual environment

    python3 -m venv .venv

### Activate the virtual environment

On macOS or Linux:

    source .venv/bin/activate

On Windows:

    .venv\Scripts\activate

### Install dependencies

    pip install -e .

## Run ScopeAPic

Start the web server:

    python3 -m uvicorn scopeapic.app:app --reload --host 0.0.0.0 --port 8000

Then open this address in your browser:

    http://127.0.0.1:8000

Keep the Terminal window open while ScopeAPic is running.

To stop ScopeAPic, press Ctrl+C in the Terminal.

## Access from another device

ScopeAPic can be accessed from another device connected to the same Wi-Fi network.

On macOS, find your local IP address with:

    ipconfig getifaddr en0

Then open this address on the other device:

    http://YOUR-IP-ADDRESS:8000

For example:

    http://192.168.178.168:8000

## Run ScopeAPic again later

After the first installation, you only need to run:

    cd ScopeAPic
    source .venv/bin/activate
    python3 -m uvicorn scopeapic.app:app --reload --host 0.0.0.0 --port 8000

Then open:

    http://127.0.0.1:8000

## Technology

- Python
- FastAPI
- Uvicorn
- Pillow
- pillow-heif
- Pydantic
- HTML, CSS and JavaScript
- OpenStreetMap

## Roadmap

Possible future improvements:

- Additional camera manufacturer support
- Batch image analysis
- Metadata comparison
- Metadata export
- Additional privacy tools
- More RAW formats
- More automated tests

## Status

ScopeAPic is an actively developed personal project focused on photo metadata inspection and analysis.
