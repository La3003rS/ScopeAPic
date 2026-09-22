const $ = (id) =>
    document.getElementById(id);


const dropZone = $("dropZone");
const fileInput = $("fileInput");
const loading = $("loading");
const results = $("results");

let currentMetadata = [];
let currentFile = null;


/* =========================================================
   UPLOAD
========================================================= */

dropZone.addEventListener(
    "click",
    () => fileInput.click()
);


fileInput.addEventListener(
    "change",
    () => {

        const file =
            fileInput.files[0];

        if (file) {
            analyzeFile(file);
        }

    }
);


dropZone.addEventListener(
    "dragover",
    event => {

        event.preventDefault();

        dropZone.classList.add(
            "active"
        );

    }
);


dropZone.addEventListener(
    "dragleave",
    () => {

        dropZone.classList.remove(
            "active"
        );

    }
);


dropZone.addEventListener(
    "drop",
    event => {

        event.preventDefault();

        dropZone.classList.remove(
            "active"
        );

        const file =
            event.dataTransfer.files[0];

        if (file) {
            analyzeFile(file);
        }

    }
);


$("analyzeAnother").addEventListener(
    "click",
    () => {

        results.classList.add(
            "hidden"
        );

        fileInput.value = "";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }
);


/* =========================================================
   ANALYSIS
========================================================= */

async function analyzeFile(file) {

    currentFile = file;

    loading.classList.remove(
        "hidden"
    );

    results.classList.add(
        "hidden"
    );

    const form =
        new FormData();

    form.append(
        "file",
        file
    );


    try {

        const response =
            await fetch(
                "/api/analyze",
                {
                    method: "POST",
                    body: form
                }
            );


        if (!response.ok) {

            throw new Error(
                `Analysis failed (${response.status})`
            );

        }


        const data =
            await response.json();


        await renderReport(
            data,
            file
        );


    } catch (error) {

        console.error(error);

        alert(
            "ScopeAPic could not analyze this image.\n\n" +
            error.message
        );

    } finally {

        loading.classList.add(
            "hidden"
        );

    }

}


/* =========================================================
   REPORT
========================================================= */

async function renderReport(
    data,
    file
) {

    currentMetadata =
        data.metadata || [];


    $("resultFilename")
        .textContent =
            data.file?.filename ||
            file.name;


    $("metadataCount")
        .textContent =
            data.metadata_count ||
            currentMetadata.length ||
            0;


    await renderPreview(
        data,
        file
    );


    renderOverview(data);
    renderCamera(data);
    renderCapture(data);
    renderLocation(data);
    renderIdentifiers(data);
    renderSettings(data);
    renderFile(data);
    renderPrivacy(data);
    renderRawMetadata();


    results.classList.remove(
        "hidden"
    );


    results.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


/* =========================================================
   PREVIEW
========================================================= */

async function renderPreview(
    data,
    file
) {

    const type =
        (
            file.type ||
            ""
        ).toLowerCase();


    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    const isHEIC =
        type.includes("heic") ||
        type.includes("heif") ||
        extension === "heic" ||
        extension === "heif";


    if (!isHEIC) {

        $("previewImage").src =
            URL.createObjectURL(
                file
            );

        return;
    }


    /*
       Browsers differ in HEIC support.

       Ask ScopeAPic for a temporary JPEG
       rendering of the analyzed original.
    */

    const form =
        new FormData();

    form.append(
        "file",
        file
    );


    const response =
        await fetch(
            "/api/preview",
            {
                method: "POST",
                body: form
            }
        );


    if (!response.ok) {

        $("previewImage")
            .removeAttribute("src");

        return;
    }


    const blob =
        await response.blob();


    $("previewImage").src =
        URL.createObjectURL(blob);

}


/* =========================================================
   OVERVIEW
========================================================= */

function renderOverview(data) {

    const file =
        data.file || {};

    const facts = [];


    addFact(
        facts,
        "FORMAT",
        file.format
    );


    if (
        file.width &&
        file.height
    ) {

        addFact(
            facts,
            "DIMENSIONS",
            `${file.width} × ${file.height}`
        );

    }


    if (file.megapixels) {

        addFact(
            facts,
            "MEGAPIXELS",
            `${file.megapixels} MP`
        );

    }


    if (file.size_bytes) {

        addFact(
            facts,
            "FILE SIZE",
            formatBytes(
                file.size_bytes
            )
        );

    }


    if (file.aspect_ratio) {

        addFact(
            facts,
            "ASPECT",
            file.aspect_ratio
        );

    }


    $("overviewFacts").innerHTML =
        facts.map(
            ([label, value]) => `
                <div>
                    <span>
                        ${escapeHtml(label)}
                    </span>

                    <strong>
                        ${escapeHtml(value)}
                    </strong>
                </div>
            `
        ).join("");

}


/* =========================================================
   CAMERA
========================================================= */

function renderCamera(data) {

    const camera =
        data.camera || {};

    const exposure =
        data.exposure || {};

    const rows = [];


    addRow(
        rows,
        "Manufacturer",
        camera.make
    );


    addRow(
        rows,
        "Camera",
        camera.model
    );


    addRow(
        rows,
        "Lens",
        camera.lens
    );


    addRow(
        rows,
        "Lens manufacturer",
        camera.lens_make
    );


    addRow(
        rows,
        "Focal length",
        unit(
            exposure.focal_length,
            "mm"
        )
    );


    addRow(
        rows,
        "35mm equivalent",
        unit(
            exposure.focal_length_35mm,
            "mm"
        )
    );


    $("cameraData").innerHTML =
        rows.map(
            renderRow
        ).join("");

}


/* =========================================================
   CAPTURE
========================================================= */

function renderCapture(data) {

    const exposure =
        data.exposure || {};

    const capture =
        data.capture || {};

    const rows = [];


    addRow(
        rows,
        "Date",
        capture.date_time_original
    );


    addRow(
        rows,
        "Timezone",
        capture.offset_time_original
    );


    addRow(
        rows,
        "Sub-second",
        capture.subsec_time_original
    );


    addRow(
        rows,
        "Shutter",
        exposure.shutter_speed
    );


    addRow(
        rows,
        "Aperture",
        exposure.aperture
    );


    addRow(
        rows,
        "ISO",
        exposure.iso
    );


    addRow(
        rows,
        "Exposure bias",
        exposure.exposure_bias
    );


    addRow(
        rows,
        "Metering",
        meteringName(
            exposure.metering_mode
        )
    );


    addRow(
        rows,
        "Flash",
        flashName(
            exposure.flash
        )
    );


    $("captureData").innerHTML =
        rows.map(
            renderRow
        ).join("");

}


/* =========================================================
   LOCATION
========================================================= */

function renderLocation(data) {

    const panel =
        $("locationPanel");

    const location =
        data.location ||
        data.gps;


    if (
        !location ||
        location.latitude === undefined ||
        location.longitude === undefined
    ) {

        panel.classList.add(
            "hidden"
        );

        return;
    }


    const latitude =
        Number(
            location.latitude
        );

    const longitude =
        Number(
            location.longitude
        );


    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {

        panel.classList.add(
            "hidden"
        );

        return;
    }


    panel.classList.remove(
        "hidden"
    );


    const rows = [];


    addRow(
        rows,
        "Latitude",
        formatCoordinate(
            latitude,
            "lat"
        )
    );


    addRow(
        rows,
        "Longitude",
        formatCoordinate(
            longitude,
            "lon"
        )
    );


    if (
        location.altitude !== null &&
        location.altitude !== undefined
    ) {

        addRow(
            rows,
            "Altitude",
            `${location.altitude} m`
        );

    }


    if (
        location.direction !== null &&
        location.direction !== undefined
    ) {

        addRow(
            rows,
            "Image direction",
            `${location.direction}°`
        );

    }


    $("locationData").innerHTML =
        rows.map(
            renderRow
        ).join("");


    /*
       OpenStreetMap map.

       GPS is only sent to the map provider
       when the user actually has GPS data.
    */

    const delta = 0.015;


    $("mapFrame").src =
        "https://www.openstreetmap.org/export/embed.html" +
        `?bbox=${longitude - delta}%2C${latitude - delta}%2C` +
        `${longitude + delta}%2C${latitude + delta}` +
        `&layer=mapnik` +
        `&marker=${latitude}%2C${longitude}`;

}


/* =========================================================
   IDENTIFIERS
========================================================= */

function renderIdentifiers(data) {

    const panel =
        $("identifiersPanel");

    const values = [];

    const identifiers =
        data.identifiers || {};


    addIdentifier(
        values,
        "Camera serial",
        identifiers.camera_serial
    );


    addIdentifier(
        values,
        "Lens serial",
        identifiers.lens_serial
    );


    addIdentifier(
        values,
        "Author",
        identifiers.artist
    );


    addIdentifier(
        values,
        "Copyright",
        identifiers.copyright
    );


    addIdentifier(
        values,
        "Software",
        data.camera?.software
    );


    if (!values.length) {

        panel.classList.add(
            "hidden"
        );

        return;
    }


    panel.classList.remove(
        "hidden"
    );


    $("identifierData").innerHTML =
        values.map(
            item => `
                <div class="identifier">

                    <span>
                        ${escapeHtml(item.label)}
                    </span>

                    <strong>
                        ${escapeHtml(item.value)}
                    </strong>

                </div>
            `
        ).join("");

}


/* =========================================================
   CAMERA SETTINGS
========================================================= */

function renderSettings(data) {

    const panel =
        $("settingsPanel");

    const values = [];


    const names = [
        "WhiteBalance",
        "FocusMode",
        "AFMode",
        "ShutterType",
        "FilmMode",
        "DynamicRange",
        "DynamicRangeSetting",
        "LensModulationOptimizer",
        "GrainEffectRoughness",
        "GrainEffectSize",
        "ColorChromeEffect",
        "ColorChromeFXBlue",
        "ImageStabilization",
        "Sharpness",
        "Contrast",
        "Saturation",
        "NoiseReduction",
        "HighISONoiseReduction",
        "FlickerReduction",
        "SceneRecognition",
        "Macro",
        "SlowSync"
    ];


    names.forEach(
        name => {

            const item =
                findFujifilm(
                    data,
                    name
                );


            if (
                !item ||
                item.interpreted_value === null ||
                item.interpreted_value === undefined
            ) {
                return;
            }


            values.push({
                label: pretty(name),

                value:
                    displayValue(
                        item.interpreted_value
                    ),

                confidence:
                    item.confidence
            });

        }
    );


    /*
       Also add useful standard EXIF settings.
    */

    addSetting(
        values,
        "Exposure program",
        exposureProgram(
            data.exposure?.exposure_program
        )
    );


    addSetting(
        values,
        "Exposure mode",
        exposureMode(
            data.exposure?.exposure_mode
        )
    );


    addSetting(
        values,
        "Maximum aperture",
        data.exposure?.max_aperture
    );


    if (!values.length) {

        panel.classList.add(
            "hidden"
        );

        return;
    }


    panel.classList.remove(
        "hidden"
    );


    $("settingsData").innerHTML =
        values.map(
            item => `
                <div class="setting">

                    <span>
                        ${escapeHtml(item.label)}
                    </span>

                    <strong>
                        ${escapeHtml(item.value)}
                    </strong>

                    ${
                        item.confidence
                        ? `
                            <small>
                                ${escapeHtml(
                                    item.confidence
                                )}
                            </small>
                        `
                        : ""
                    }

                </div>
            `
        ).join("");

}


/* =========================================================
   FILE
========================================================= */

function renderFile(data) {

    const panel =
        $("filePanel");

    const file =
        data.file || {};

    const values = [];


    addSetting(
        values,
        "Filename",
        file.filename
    );


    addSetting(
        values,
        "Format",
        file.format
    );


    addSetting(
        values,
        "Dimensions",
        file.width &&
        file.height
            ? `${file.width} × ${file.height}`
            : null
    );


    addSetting(
        values,
        "Megapixels",
        file.megapixels
            ? `${file.megapixels} MP`
            : null
    );


    addSetting(
        values,
        "File size",
        file.size_bytes
            ? formatBytes(
                file.size_bytes
            )
            : null
    );


    addSetting(
        values,
        "Aspect ratio",
        file.aspect_ratio
    );


    addSetting(
        values,
        "Color space",
        colorSpace(
            data.image?.color_space
        )
    );


    addSetting(
        values,
        "Orientation",
        orientation(
            data.image?.orientation
        )
    );


    addSetting(
        values,
        "Image mode",
        file.mode
    );


    if (!values.length) {

        panel.classList.add(
            "hidden"
        );

        return;
    }


    panel.classList.remove(
        "hidden"
    );


    $("fileData").innerHTML =
        values.map(
            item => `
                <div class="setting">

                    <span>
                        ${escapeHtml(item.label)}
                    </span>

                    <strong>
                        ${escapeHtml(item.value)}
                    </strong>

                </div>
            `
        ).join("");

}


/* =========================================================
   PRIVACY
========================================================= */

function renderPrivacy(data) {

    const panel =
        $("privacyPanel");

    const privacy =
        data.privacy || {};


    const checks = [
        [
            "GPS location",
            privacy.gps_present
        ],

        [
            "Camera serial number",
            privacy.camera_serial_present
        ],

        [
            "Lens serial number",
            privacy.lens_serial_present
        ],

        [
            "Author information",
            privacy.artist_present
        ],

        [
            "Copyright information",
            privacy.copyright_present
        ],

        [
            "Software information",
            privacy.software_present
        ]
    ];


    panel.classList.remove(
        "hidden"
    );


    $("privacyData").innerHTML =
        checks.map(
            ([label, present]) => `

                <div class="
                    privacy-item
                    ${present ? "warning" : "neutral"}
                ">

                    <span class="privacy-dot"></span>

                    <div>

                        <strong>
                            ${escapeHtml(label)}
                        </strong>

                        <small>
                            ${
                                present
                                ? "Detected"
                                : "Not detected"
                            }
                        </small>

                    </div>

                </div>

            `
        ).join("");

}


/* =========================================================
   RAW METADATA
========================================================= */

function renderRawMetadata() {

    $("rawCount").textContent =
        `${currentMetadata.length} fields`;


    renderRawRows(
        currentMetadata
    );

}


function renderRawRows(
    metadataList
) {

    $("rawRows").innerHTML =
        metadataList.map(
            item => {

                const value =
                    typeof item.value === "object"
                    ? JSON.stringify(
                        item.value
                    )
                    : String(
                        item.value ?? ""
                    );


                return `
                    <div class="raw-row">

                        <span>
                            ${escapeHtml(
                                item.section || ""
                            )}
                        </span>

                        <strong>
                            ${escapeHtml(
                                item.name || ""
                            )}
                        </strong>

                        <p>
                            ${escapeHtml(value)}
                        </p>

                    </div>
                `;

            }
        ).join("");

}


$("rawToggle").addEventListener(
    "click",
    () => {

        $("rawMetadata")
            .classList.toggle(
                "hidden"
            );

    }
);


$("rawSearch").addEventListener(
    "input",
    event => {

        const query =
            event.target.value
                .trim()
                .toLowerCase();


        if (!query) {

            renderRawRows(
                currentMetadata
            );

            return;
        }


        const filtered =
            currentMetadata.filter(
                item =>
                    JSON.stringify(item)
                        .toLowerCase()
                        .includes(query)
            );


        renderRawRows(
            filtered
        );

    }
);


/* =========================================================
   HELPERS
========================================================= */

function addRow(
    rows,
    label,
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return;
    }


    rows.push({
        label,
        value:
            displayValue(value)
    });

}


function addFact(
    facts,
    label,
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return;
    }


    facts.push([
        label,
        displayValue(value)
    ]);

}


function addIdentifier(
    values,
    label,
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return;
    }


    values.push({
        label,
        value:
            displayValue(value)
    });

}


function addSetting(
    values,
    label,
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return;
    }


    values.push({
        label,
        value:
            displayValue(value)
    });

}


function renderRow(row) {

    return `
        <div class="intel-row">

            <span>
                ${escapeHtml(
                    row.label
                )}
            </span>

            <strong>
                ${escapeHtml(
                    row.value
                )}
            </strong>

        </div>
    `;

}


function metadata(
    data,
    name
) {

    const item =
        (data.metadata || [])
            .find(
                entry =>
                    entry.name === name
            );


    return item
        ? item.value
        : null;

}


function findFujifilm(
    data,
    name
) {

    return (
        data.fujifilm?.metadata || []
    ).find(
        item =>
            item.name === name
    );

}


function displayValue(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    if (
        typeof value === "object"
    ) {

        if (
            value.description
        ) {
            return String(
                value.description
            );
        }


        return JSON.stringify(
            value
        );

    }


    return String(value);

}


function unit(
    value,
    suffix
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }


    return `${value} ${suffix}`;

}


function pretty(value) {

    return String(value)
        .replace(
            /([a-z])([A-Z])/g,
            "$1 $2"
        )
        .replaceAll(
            "_",
            " "
        );

}


function formatCoordinate(
    value,
    type
) {

    const direction =
        type === "lat"
            ? value >= 0
                ? "N"
                : "S"
            : value >= 0
                ? "E"
                : "W";


    return `${Math.abs(value).toFixed(6)}° ${direction}`;

}


function orientation(value) {

    const number =
        Number(value);


    const names = {
        1: "Normal",
        2: "Mirrored horizontal",
        3: "Rotated 180°",
        4: "Mirrored vertical",
        5: "Mirrored + 90°",
        6: "Rotated 90°",
        7: "Mirrored + 270°",
        8: "Rotated 270°"
    };


    return names[number] ||
        displayValue(value);

}


function colorSpace(value) {

    const number =
        Number(value);


    const names = {
        1: "sRGB",
        2: "Adobe RGB"
    };


    return names[number] ||
        displayValue(value);

}


function meteringName(value) {

    const names = {
        0: "Unknown",
        1: "Average",
        2: "Center-weighted",
        3: "Spot",
        4: "Multi-spot",
        5: "Pattern",
        6: "Partial"
    };


    return names[Number(value)] ||
        displayValue(value);

}


function flashName(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }


    const number =
        Number(value);


    if (number === 0) {
        return "No flash";
    }


    return `Flash data (${number})`;

}


function exposureProgram(value) {

    const names = {
        0: "Not defined",
        1: "Manual",
        2: "Program AE",
        3: "Aperture priority",
        4: "Shutter priority",
        5: "Creative",
        6: "Action",
        7: "Portrait",
        8: "Landscape"
    };


    return names[Number(value)] ||
        displayValue(value);

}


function exposureMode(value) {

    const names = {
        0: "Auto",
        1: "Manual",
        2: "Auto bracket"
    };


    return names[Number(value)] ||
        displayValue(value);

}


function formatBytes(bytes) {

    const number =
        Number(bytes);


    if (
        !Number.isFinite(number)
    ) {
        return String(bytes);
    }


    if (number < 1024)
        return `${number} B`;


    if (
        number <
        1024 ** 2
    )
        return `${(
            number / 1024
        ).toFixed(1)} KB`;


    if (
        number <
        1024 ** 3
    )
        return `${(
            number / 1024 ** 2
        ).toFixed(2)} MB`;


    return `${(
        number / 1024 ** 3
    ).toFixed(2)} GB`;

}


function escapeHtml(value) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}
