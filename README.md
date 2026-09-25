# ScopeAPic

**Local-first photo metadata analysis tool.**

ScopeAPic analyzes images and turns their embedded metadata into useful, easy-to-read information. It can show camera and device details, lens information, exposure settings, capture data, GPS location, and raw metadata.

It also includes additional metadata analysis for **Fujifilm cameras**.

## Features

- 📷 Camera and device information
- 🔭 Lens and focal-length information
- 🎛️ Shutter speed, aperture and ISO
- 📅 Capture date and time
- 📍 GPS coordinates with OpenStreetMap
- 🗺️ Links to OpenStreetMap and Google Maps
- 🟦 Fujifilm-specific metadata analysis
- 🔎 Raw metadata inspection
- 📱 Responsive interface for desktop and mobile
- 🔐 Local-first processing

### Fujifilm

For supported Fujifilm images, ScopeAPic can interpret information such as:

- Film Simulation
- White Balance
- Focus Mode
- AF Mode
- Dynamic Range
- Shutter Type
- Grain Effect
- Color Chrome
- Image Stabilization

Support for additional camera manufacturers can be added in the future.

## Supported formats

- JPG / JPEG
- PNG
- HEIC / HEIF

## Privacy

Photo metadata can contain sensitive information such as GPS coordinates, camera serial numbers, author information and capture dates.

ScopeAPic is designed to run locally, so your images do not need to be sent to a third-party analysis service.

Always check an image's metadata before sharing it publicly.

## Installation

```bash
git clone https://github.com/La3003rS/ScopeAPic.git
cd ScopeAPic

python3 -m venv .venv
source .venv/bin/activate

pip install -e .

