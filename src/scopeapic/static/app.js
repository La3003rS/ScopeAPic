const $ = (id) => document.getElementById(id);

const dropzone = $("dropzone");
const fileInput = $("fileInput");
const uploadStatus = $("uploadStatus");
const results = $("results");
const chooseButton = document.querySelector(".choose-button");

const ACCEPTED_EXTENSIONS = [
    "jpg",
    "jpeg",
    "png",
    "heic",
    "heif"
];

const HEIC_TYPES = [
    "image/heic",
    "image/heif"
];

const REQUEST_TIMEOUT_MS = 30000;

let currentData = null;
let allMetadata = [];
let previewUrl = null;


/* =========================================================
   HELPERS
   ========================================================= */

function esc(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function plainValue(value) {
    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "object") {
        return JSON.stringify(value);
    }

    return String(value);
}


function value(object, ...keys) {
    if (!object || typeof object !== "object") {
        return null;
    }

    for (const key of keys) {
        if (
            object[key] !== undefined &&
            object[key] !== null &&
            object[key] !== ""
        ) {
            return object[key];
        }
    }

    return null;
}


function copyText(text, button = null) {
    if (!text) {
        return;
    }

    navigator.clipboard.writeText(String(text))
        .then(() => {
            if (!button) {
                return;
            }

            const old = button.textContent;
            button.textContent = "Copied";

            setTimeout(() => {
                button.textContent = old || "Copy";
            }, 1200);
        })
        .catch(() => {
            // Clipboard can be unavailable in some browser contexts.
        });
}


function makeRows(items) {
    const valid = items.filter(
        ([, value]) =>
            value !== null &&
            value !== undefined &&
            value !== ""
    );

    if (!valid.length) {
        return `<div class="device-empty">No information found.</div>`;
    }

    return `
        <div class="metadata-content">
            ${valid.map(([label, itemValue]) => `
                <div class="data-row">
                    <span class="data-label">${esc(label)}</span>
                    <span class="data-value">${esc(itemValue)}</span>
                </div>
            `).join("")}
        </div>
    `;
}


function rowsAsText(title, items) {
    return [
        title,
        ...items
            .filter(([, v]) => v !== null && v !== undefined && v !== "")
            .map(([label, v]) => `${label}: ${plainValue(v)}`)
    ].join("\n");
}


/* =========================================================
   DEVICE
   ========================================================= */

function renderDevice(data) {

    const camera = data.camera || {};

    const make = value(
        camera,
        "make",
        "manufacturer",
        "brand"
    );

    const model = value(
        camera,
        "model",
        "camera_model",
        "device"
    );

    const lens = value(
        camera,
        "lens",
        "lens_model"
    );

    const software = value(
        camera,
        "software"
    );

    const content = $("deviceContent");
    const copyButton = $("copyDevice");

    if (!make && !model && !lens && !software) {

        content.innerHTML = `
            <div class="device-empty">
                No camera or device information was found
                in the image metadata.
            </div>
        `;

        copyButton.hidden = true;
        return;
    }

    content.innerHTML = `
        ${make
            ? `<div class="device-maker">${esc(make)}</div>`
            : ""
        }

        <div class="device-model">
            ${esc(model || "Unknown model")}
        </div>

        ${lens ? `
            <div class="device-field">
                <label>Lens</label>
                <div class="device-field-value">
                    ${esc(lens)}
                </div>
            </div>
        ` : ""}

        ${software ? `
            <div class="device-field">
                <label>Software</label>
                <div class="device-field-value">
                    ${esc(software)}
                </div>
            </div>
        ` : ""}
    `;

    const copyLines = [];

    if (make) {
        copyLines.push(`Manufacturer: ${plainValue(make)}`);
    }

    if (model) {
        copyLines.push(`Model: ${plainValue(model)}`);
    }

    if (lens) {
        copyLines.push(`Lens: ${plainValue(lens)}`);
    }

    if (software) {
        copyLines.push(`Software: ${plainValue(software)}`);
    }

    copyButton.dataset.copy = [
        "Device",
        ...copyLines
    ].join("\n");

    copyButton.hidden = false;
}


/* =========================================================
   EXPOSURE
   ========================================================= */

function renderExposure(data) {

    const e = data.exposure || {};

    const items = [
        [
            "Shutter",
            value(
                e,
                "shutter_speed",
                "shutter",
                "exposure_time"
            )
        ],
        [
            "Aperture",
            value(
                e,
                "aperture",
                "f_number",
                "fnumber"
            )
        ],
        [
            "ISO",
            value(
                e,
                "iso",
                "sensitivity"
            )
        ],
        [
            "Focal length",
            value(
                e,
                "focal_length",
                "focal"
            )
        ],
        [
            "Flash",
            value(e, "flash")
        ],
        [
            "Exposure bias",
            value(
                e,
                "exposure_bias",
                "exposure_compensation"
            )
        ]
    ];

    $("exposureContent").innerHTML = makeRows(items);

    return rowsAsText("Exposure", items);
}


/* =========================================================
   CAPTURE
   ========================================================= */

function renderCapture(data) {

    const capture = data.capture || {};

    /*
     * Keep date/time here only.
     * Do NOT put software or privacy data in this section.
     */

    const original = value(
        capture,
        "original",
        "date_time",
        "datetime",
        "captured_at"
    );

    const date = value(
        capture,
        "date"
    );

    const time = value(
        capture,
        "time"
    );

    const items = [
        [
            "Date & time",
            original || (
                date && time
                    ? `${date} ${time}`
                    : date || time
            )
        ],
        [
            "Original",
            original && original !== (date || time)
                ? original
                : null
        ],
        [
            "Orientation",
            value(capture, "orientation")
        ],
        [
            "Color space",
            value(capture, "color_space")
        ]
    ];

    $("captureContent").innerHTML = makeRows(items);

    return rowsAsText("Capture", items);
}


/* =========================================================
   FILE
   ========================================================= */

function renderFile(data) {

    const f = data.file || {};
    const image = data.image || {};

    const width = value(image, "width");
    const height = value(image, "height");

    const items = [
        [
            "Filename",
            value(f, "name", "filename")
        ],
        [
            "Format",
            value(f, "format", "mime_type", "type")
        ],
        [
            "Size",
            value(f, "size_human", "size")
        ],
        [
            "Dimensions",
            width && height
                ? `${width} × ${height}`
                : null
        ],
        [
            "Megapixels",
            value(image, "megapixels")
        ]
    ];

    $("fileContent").innerHTML = makeRows(items);

    return rowsAsText("File", items);
}


/* =========================================================
   GPS
   ========================================================= */

function unwrapCoordinate(input) {

    if (
        input === null ||
        input === undefined ||
        input === ""
    ) {
        return null;
    }

    if (typeof input === "number") {
        return Number.isFinite(input)
            ? input
            : null;
    }

    if (Array.isArray(input)) {

        if (!input.length) {
            return null;
        }

        if (
            input.length === 1 &&
            typeof input[0] === "object"
        ) {
            return unwrapCoordinate(input[0]);
        }

        const values = input
            .map(unwrapCoordinate)
            .filter(v => v !== null);

        if (values.length === 1) {
            return values[0];
        }

        if (values.length >= 3) {

            const degrees = Number(values[0]);
            const minutes = Number(values[1]);
            const seconds = Number(values[2]);

            if (
                Number.isFinite(degrees) &&
                Number.isFinite(minutes) &&
                Number.isFinite(seconds)
            ) {
                return (
                    Math.abs(degrees) +
                    Math.abs(minutes) / 60 +
                    Math.abs(seconds) / 3600
                ) * (degrees < 0 ? -1 : 1);
            }
        }

        return null;
    }

    if (typeof input === "object") {

        const nested = [
            "decimal",
            "value",
            "formatted",
            "raw",
            "description",
            "coordinates"
        ];

        for (const key of nested) {

            if (
                input[key] !== undefined &&
                input[key] !== null
            ) {
                const result = unwrapCoordinate(input[key]);

                if (result !== null) {
                    return result;
                }
            }
        }

        return null;
    }

    const text = String(input).trim();

    if (!text) {
        return null;
    }

    const numeric = Number(text);

    if (Number.isFinite(numeric)) {
        return numeric;
    }

    const dms = text.match(
        /(-?\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)?\D*(\d+(?:\.\d+)?)?/i
    );

    if (dms) {

        const degrees = Number(dms[1]);
        const minutes = dms[2] ? Number(dms[2]) : 0;
        const seconds = dms[3] ? Number(dms[3]) : 0;

        if (Number.isFinite(degrees)) {
            return (
                Math.abs(degrees) +
                minutes / 60 +
                seconds / 3600
            ) * (degrees < 0 ? -1 : 1);
        }
    }

    return null;
}


function findCoordinate(objects, keys) {

    for (const object of objects) {

        if (!object || typeof object !== "object") {
            continue;
        }

        for (const key of keys) {

            if (
                object[key] !== undefined &&
                object[key] !== null
            ) {
                const result = unwrapCoordinate(object[key]);

                if (result !== null) {
                    return result;
                }
            }
        }
    }

    return null;
}


function getGPS(data) {

    const location = data.location || {};
    const gps = data.gps || {};

    const objects = [
        location,
        gps,
        data
    ];

    let lat = findCoordinate(
        objects,
        [
            "latitude",
            "lat",
            "gps_latitude",
            "GPSLatitude",
            "gps_lat",
            "GPSLat",
            "latitude_decimal"
        ]
    );

    let lon = findCoordinate(
        objects,
        [
            "longitude",
            "lon",
            "lng",
            "gps_longitude",
            "GPSLongitude",
            "gps_lon",
            "GPSLng",
            "longitude_decimal"
        ]
    );

    const coordinateArrays = [
        location.coordinates,
        gps.coordinates,
        data.coordinates
    ];

    for (const coordinates of coordinateArrays) {

        if (
            Array.isArray(coordinates) &&
            coordinates.length >= 2
        ) {

            const a = unwrapCoordinate(coordinates[0]);
            const b = unwrapCoordinate(coordinates[1]);

            if (
                a !== null &&
                b !== null
            ) {
                lat = a;
                lon = b;
                break;
            }
        }
    }

    const latRef = findCoordinate(
        objects,
        [
            "latitude_ref",
            "GPSLatitudeRef"
        ]
    );

    const lonRef = findCoordinate(
        objects,
        [
            "longitude_ref",
            "GPSLongitudeRef"
        ]
    );

    /*
     * If the backend gives a positive coordinate plus a
     * hemisphere reference, apply the correct sign.
     */
    if (
        lat !== null &&
        typeof latRef === "string" &&
        latRef.toUpperCase() === "S"
    ) {
        lat = -Math.abs(lat);
    }

    if (
        lon !== null &&
        typeof lonRef === "string" &&
        lonRef.toUpperCase() === "W"
    ) {
        lon = -Math.abs(lon);
    }

    if (
        lat === null ||
        lon === null ||
        !Number.isFinite(Number(lat)) ||
        !Number.isFinite(Number(lon))
    ) {
        return null;
    }

    lat = Number(lat);
    lon = Number(lon);

    /*
     * Never display the broken 0,0 coordinate.
     */
    if (
        Math.abs(lat) < 0.000001 &&
        Math.abs(lon) < 0.000001
    ) {
        return null;
    }

    if (
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
    ) {
        return null;
    }

    return {
        latitude: lat,
        longitude: lon
    };
}


/* =========================================================
   LOCATION
   ========================================================= */

function renderLocation(data) {

    const gps = getGPS(data);
    const content = $("locationContent");

    if (!gps) {

        content.innerHTML = `
            <div class="location-message">
                No valid GPS coordinates were found in the image metadata.
            </div>
        `;

        $("copyLocation").dataset.copy = "";
        return "";
    }

    const lat = gps.latitude;
    const lon = gps.longitude;

    const delta = 0.006;

    const left = lon - delta;
    const right = lon + delta;
    const bottom = lat - delta;
    const top = lat + delta;

    const mapUrl =
        "https://www.openstreetmap.org/export/embed.html" +
        `?bbox=${encodeURIComponent(
            `${left},${bottom},${right},${top}`
        )}` +
        "&layer=mapnik" +
        `&marker=${encodeURIComponent(`${lat},${lon}`)}`;

    const osmUrl =
        `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}` +
        `&mlon=${encodeURIComponent(lon)}` +
        `#map=16/${encodeURIComponent(lat)}/${encodeURIComponent(lon)}`;

    const googleUrl =
        `https://www.google.com/maps/search/?api=1&query=` +
        encodeURIComponent(`${lat},${lon}`);

    const coordinateText =
        `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

    content.innerHTML = `
        <iframe
            class="location-map"
            loading="lazy"
            title="Photo GPS location"
            src="${mapUrl}">
        </iframe>

        <div class="location-bottom">

            <span class="coordinates">
                ${esc(coordinateText)}
            </span>

            <div class="location-links">

                <a
                    class="btn btn-outline"
                    href="${osmUrl}"
                    target="_blank"
                    rel="noopener">
                    OpenStreetMap ↗
                </a>

                <a
                    class="btn btn-outline"
                    href="${googleUrl}"
                    target="_blank"
                    rel="noopener">
                    Google Maps ↗
                </a>

            </div>

        </div>
    `;

    const copyTextValue =
        `Location\nLatitude: ${lat.toFixed(6)}\nLongitude: ${lon.toFixed(6)}`;

    $("copyLocation").dataset.copy = copyTextValue;

    return copyTextValue;
}


/* =========================================================
   PRIVACY
   ========================================================= */

function renderPrivacy(data) {

    const p = data.privacy || {};

    let items = [];

    if (Array.isArray(p.items)) {
        items = p.items;
    } else if (Array.isArray(p.identifiers)) {
        items = p.identifiers;
    } else if (Array.isArray(p.detected)) {
        items = p.detected;
    } else if (Array.isArray(p.personal_data)) {
        items = p.personal_data;
    }

    /*
     * Convert backend privacy records into clean label/value pairs.
     */
    const clean = [];

    for (const item of items) {

        if (
            item === null ||
            item === undefined
        ) {
            continue;
        }

        if (typeof item === "object") {

            const label =
                item.label ||
                item.name ||
                item.type ||
                "";

            const itemValue =
                item.value ??
                item.formatted ??
                item.raw ??
                item.description ??
                "";

            if (
                label &&
                itemValue !== "" &&
                itemValue !== null &&
                itemValue !== undefined
            ) {
                clean.push([
                    String(label),
                    plainValue(itemValue)
                ]);
            } else if (itemValue !== "") {
                clean.push([
                    "Metadata",
                    plainValue(itemValue)
                ]);
            }

        } else {

            const text = String(item);

            const separator = text.indexOf(":");

            if (separator > 0) {

                clean.push([
                    text.slice(0, separator).trim(),
                    text.slice(separator + 1).trim()
                ]);

            } else {

                clean.push([
                    "Identifier",
                    text
                ]);
            }
        }
    }


    /*
     * Some privacy-relevant information can also live in the
     * identifiers object rather than privacy.items.
     */
    if (
        data.identifiers &&
        typeof data.identifiers === "object"
    ) {

        for (const [key, raw] of Object.entries(data.identifiers)) {

            if (
                raw === null ||
                raw === undefined ||
                raw === ""
            ) {
                continue;
            }

            const exists = clean.some(
                ([label]) =>
                    label.toLowerCase() === key.toLowerCase()
            );

            if (!exists) {
                clean.push([
                    key,
                    plainValue(raw)
                ]);
            }
        }
    }


    /*
     * Add GPS to Privacy because GPS can reveal the location
     * where the photograph was taken.
     */
    const gps = getGPS(data);

    if (gps) {

        const alreadyHasGPS = clean.some(
            ([label]) =>
                label.toLowerCase().includes("gps") ||
                label.toLowerCase().includes("location")
        );

        if (!alreadyHasGPS) {
            clean.push([
                "GPS location",
                `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`
            ]);
        }
    }


    /*
     * Remove things that should now live elsewhere.
     *
     * Software -> Device
     * Date/time -> Capture
     */
    const filtered = clean.filter(([label]) => {

        const key = label.toLowerCase();

        return ![
            "software",
            "date",
            "date & time",
            "datetime",
            "date time",
            "capture date",
            "capture time"
        ].some(
            forbidden => key === forbidden
        );
    });


    /*
     * De-duplicate exact label/value combinations.
     */
    const unique = [];
    const seen = new Set();

    for (const [label, itemValue] of filtered) {

        const id =
            `${label.toLowerCase()}|${itemValue}`;

        if (seen.has(id)) {
            continue;
        }

        seen.add(id);
        unique.push([label, itemValue]);
    }


    const importantOrder = [
        "author",
        "artist",
        "creator",
        "copyright",
        "camera serial",
        "serial number",
        "lens serial",
        "owner",
        "gps location",
        "location"
    ];

    unique.sort((a, b) => {

        const aIndex =
            importantOrder.indexOf(a[0].toLowerCase());

        const bIndex =
            importantOrder.indexOf(b[0].toLowerCase());

        if (aIndex === -1 && bIndex === -1) {
            return 0;
        }

        if (aIndex === -1) {
            return 1;
        }

        if (bIndex === -1) {
            return -1;
        }

        return aIndex - bIndex;
    });


    const content = $("privacyContent");

    if (!unique.length) {

        content.innerHTML = `
            <div class="privacy-empty">
                No obvious privacy-sensitive identifiers were
                detected in the organized metadata.
                Check Raw metadata for the complete record.
            </div>
        `;

        $("copyPrivacy").dataset.copy = "";
        return "";
    }


    content.innerHTML = `
        <div class="privacy-list">

            ${unique.map(([label, itemValue]) => `
                <div class="privacy-row">
                    <span class="privacy-label">
                        ${esc(label)}
                    </span>

                    <span class="privacy-value">
                        ${esc(itemValue)}
                    </span>
                </div>
            `).join("")}

        </div>
    `;


    const copyValue = [
        "Privacy-sensitive data",
        ...unique.map(
            ([label, itemValue]) =>
                `${label}: ${itemValue}`
        )
    ].join("\n");

    $("copyPrivacy").dataset.copy = copyValue;

    return copyValue;
}


/* =========================================================
   FUJIFILM
   ========================================================= */

function renderFuji(data) {

    const f = data.fujifilm || {};

    const source =
        f.values ||
        f.fields ||
        f;

    const values = [];

    if (
        !source ||
        typeof source !== "object"
    ) {
        $("fujiContent").innerHTML = `
            <div class="fuji-empty">
                No Fujifilm-specific metadata was found.
            </div>
        `;

        $("fujiSection").style.display = "none";
        return "";
    }


    for (const [key, raw] of Object.entries(source)) {

        if (
            raw === null ||
            raw === undefined ||
            raw === ""
        ) {
            continue;
        }

        let itemValue = raw;

        if (typeof raw === "object") {

            itemValue =
                raw.value ??
                raw.description ??
                raw.raw ??
                "";

            if (
                raw.confidence &&
                itemValue !== ""
            ) {
                itemValue =
                    `${itemValue} · ${raw.confidence}`;
            }
        }

        if (
            itemValue === null ||
            itemValue === undefined ||
            itemValue === ""
        ) {
            continue;
        }

        values.push([
            key.replaceAll("_", " "),
            plainValue(itemValue)
        ]);
    }


    if (!values.length) {

        $("fujiSection").style.display = "none";
        return "";
    }


    $("fujiSection").style.display = "";

    $("fujiContent").innerHTML = `
        <div class="fuji-grid">

            ${values.slice(0, 24).map(([key, itemValue]) => `
                <div class="fuji-value">
                    <label>${esc(key)}</label>
                    <span>${esc(itemValue)}</span>
                </div>
            `).join("")}

        </div>
    `;


    const copyValue = rowsAsText(
        "Fujifilm data",
        values
    );

    $("copyFuji").dataset.copy = copyValue;

    return copyValue;
}


/* =========================================================
   RAW METADATA
   ========================================================= */

function renderRaw(data) {

    const raw = data.metadata || {};

    if (Array.isArray(raw)) {

        allMetadata = raw.map((item, index) => ({
            key:
                item.key ||
                item.name ||
                `Record ${index + 1}`,

            value:
                item.value ??
                item.formatted ??
                item.raw ??
                ""
        }));

    } else {

        allMetadata = Object.entries(raw).map(
            ([key, value]) => ({
                key,
                value
            })
        );
    }


    $("metadataCount").textContent =
        `${allMetadata.length} records`;

    $("metadataSearch").value = "";

    drawRaw("");
}


function drawRaw(query) {

    const q = String(query)
        .toLowerCase()
        .trim();

    const html = allMetadata
        .filter(item => {

            const rawValue =
                typeof item.value === "object"
                    ? JSON.stringify(item.value)
                    : String(item.value ?? "");

            return (
                `${item.key} ${rawValue}`
                    .toLowerCase()
                    .includes(q)
            );
        })
        .map(item => {

            const display =
                typeof item.value === "object"
                    ? JSON.stringify(item.value)
                    : String(item.value ?? "");

            return `
                <div class="raw-row">
                    <b>${esc(item.key)}</b>
                    <span>${esc(display)}</span>
                </div>
            `;
        })
        .join("");


    $("rawMetadata").innerHTML =
        html ||
        `
            <div class="raw-row">
                <span>No matching metadata.</span>
            </div>
        `;
}


/* =========================================================
   RESULTS
   ========================================================= */

function renderResults(data) {

    currentData = data;

    renderDevice(data);

    const exposureText =
        renderExposure(data);

    const captureText =
        renderCapture(data);

    const fileText =
        renderFile(data);

    const locationText =
        renderLocation(data);

    const privacyText =
        renderPrivacy(data);

    const fujiText =
        renderFuji(data);

    document
        .querySelector('[data-copy-section="exposure"]')
        .dataset.copy = exposureText;

    document
        .querySelector('[data-copy-section="capture"]')
        .dataset.copy = captureText;

    document
        .querySelector('[data-copy-section="file"]')
        .dataset.copy = fileText;

    renderRaw(data);
}


/* =========================================================
   FILE / PREVIEW
   ========================================================= */

function isHeicFile(file) {

    return (
        HEIC_TYPES.includes(file.type) ||
        /\.(heic|heif)$/i.test(file.name)
    );
}


function hasAcceptedExtension(file) {

    const extension =
        file.name
            .split(".")
            .pop()
            ?.toLowerCase();

    return ACCEPTED_EXTENSIONS.includes(extension);
}


function setPreviewSrc(url) {

    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
    }

    previewUrl = url;

    $("preview").src = url;
}


function setBusy(busy) {

    fileInput.disabled = busy;

    chooseButton?.classList.toggle(
        "disabled",
        busy
    );

    dropzone.classList.toggle(
        "busy",
        busy
    );
}


async function fetchWithTimeout(url, options) {

    const controller =
        new AbortController();

    const timeout =
        setTimeout(
            () => controller.abort(),
            REQUEST_TIMEOUT_MS
        );

    try {

        return await fetch(
            url,
            {
                ...options,
                signal: controller.signal
            }
        );

    } finally {

        clearTimeout(timeout);
    }
}


/* =========================================================
   ANALYZE
   ========================================================= */

async function analyze(file) {

    if (!file) {
        return;
    }

    if (!hasAcceptedExtension(file)) {

        uploadStatus.innerHTML = `
            <span class="error">
                ${esc(file.name)}
                isn't supported. Use JPEG, PNG, HEIC or HEIF.
            </span>
        `;

        return;
    }


    setBusy(true);

    uploadStatus.innerHTML = `
        <span class="spinner"></span>
        Analyzing ${esc(file.name)}…
    `;


    try {

        const form =
            new FormData();

        form.append("file", file);


        const response =
            await fetchWithTimeout(
                "/api/analyze",
                {
                    method: "POST",
                    body: form
                }
            );


        if (!response.ok) {

            throw new Error(
                await response.text() ||
                `HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        /*
         * Normal browser-supported images can be shown directly
         * from the selected local file.
         */
        if (!isHeicFile(file)) {

            setPreviewSrc(
                URL.createObjectURL(file)
            );

        } else {

            /*
             * HEIC/HEIF gets converted through the existing
             * local preview endpoint.
             */
            try {

                const previewForm =
                    new FormData();

                previewForm.append(
                    "file",
                    file
                );


                const previewResponse =
                    await fetchWithTimeout(
                        "/api/preview",
                        {
                            method: "POST",
                            body: previewForm
                        }
                    );


                if (previewResponse.ok) {

                    const blob =
                        await previewResponse.blob();

                    setPreviewSrc(
                        URL.createObjectURL(blob)
                    );
                }

            } catch {
                // Analysis itself still succeeds if preview fails.
            }
        }


        const fileData =
            data.file || {};

        const image =
            data.image || {};


        const filename =
            value(
                fileData,
                "name",
                "filename"
            ) || file.name;


        $("photoName").textContent =
            filename;

        $("copyFilename").dataset.copy =
            filename;


        if (
            image.width &&
            image.height
        ) {

            $("photoDimensions").textContent =
                `${image.width} × ${image.height}`;

        } else {

            $("photoDimensions").textContent =
                "";
        }


        renderResults(data);


        results.classList.remove(
            "hidden"
        );


        uploadStatus.textContent = "";


        results.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {

        const message =
            error.name === "AbortError"
                ? "The request timed out. Try again."
                : error.message;


        uploadStatus.innerHTML = `
            <span class="error">
                Analysis failed: ${esc(message)}
            </span>
        `;

    } finally {

        setBusy(false);
    }
}


/* =========================================================
   UPLOAD EVENTS
   ========================================================= */

fileInput.addEventListener(
    "change",
    () => {
        analyze(fileInput.files[0]);
    }
);


["dragenter", "dragover"].forEach(
    eventName => {

        dropzone.addEventListener(
            eventName,
            event => {

                event.preventDefault();

                dropzone.classList.add(
                    "dragging"
                );
            }
        );
    }
);


["dragleave", "drop"].forEach(
    eventName => {

        dropzone.addEventListener(
            eventName,
            event => {

                event.preventDefault();

                dropzone.classList.remove(
                    "dragging"
                );
            }
        );
    }
);


dropzone.addEventListener(
    "drop",
    event => {

        const file =
            event.dataTransfer.files[0];

        if (file) {
            analyze(file);
        }
    }
);


dropzone.addEventListener(
    "click",
    event => {

        if (
            event.target.closest(
                ".choose-button"
            )
        ) {
            return;
        }

        fileInput.click();
    }
);


dropzone.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" ||
            event.key === " "
        ) {

            event.preventDefault();

            fileInput.click();
        }
    }
);


["dragover", "drop"].forEach(
    eventName => {

        window.addEventListener(
            eventName,
            event => {
                event.preventDefault();
            }
        );
    }
);


/* =========================================================
   COPY EVENTS
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".copy-btn"
            );

        if (!button) {
            return;
        }

        const text =
            button.dataset.copy;

        if (!text) {
            return;
        }

        copyText(
            text,
            button
        );
    }
);


$("copyAllJson").addEventListener(
    "click",
    () => {

        if (!currentData) {
            return;
        }

        copyText(
            JSON.stringify(
                currentData,
                null,
                2
            ),
            $("copyAllJson")
        );
    }
);


/* =========================================================
   RAW SEARCH
   ========================================================= */

$("metadataSearch").addEventListener(
    "input",
    event => {
        drawRaw(event.target.value);
    }
);


/* =========================================================
   NEW PHOTO
   ========================================================= */

$("newPhoto").addEventListener(
    "click",
    () => {

        results.classList.add(
            "hidden"
        );

        fileInput.value = "";

        uploadStatus.textContent = "";

        if (previewUrl) {
            URL.revokeObjectURL(
                previewUrl
            );
            previewUrl = null;
        }

        $("preview").removeAttribute(
            "src"
        );

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }
);


/* =========================================================
   TABS
   ========================================================= */

const navTabs =
    document.querySelectorAll(
        ".nav-tab"
    );

const tabPanels =
    document.querySelectorAll(
        ".tab-panel"
    );


function setTab(name) {

    navTabs.forEach(button => {

        const active =
            button.dataset.tab === name;

        button.classList.toggle(
            "active",
            active
        );

        button.setAttribute(
            "aria-pressed",
            String(active)
        );
    });


    tabPanels.forEach(panel => {

        panel.hidden =
            panel.dataset.tabPanel !== name;
    });


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


navTabs.forEach(button => {

    button.addEventListener(
        "click",
        () => {
            setTab(
                button.dataset.tab
            );
        }
    );
});
