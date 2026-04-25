/* global Chart */

const statusText = document.getElementById("statusText");
const sensorInput = document.getElementById("sensorInput");
const analyzeSensorsBtn = document.getElementById("analyzeSensorsBtn");
const loadSampleSensorsBtn = document.getElementById("loadSampleSensorsBtn");
const analyzeRegionBtn = document.getElementById("analyzeRegionBtn");

const manualLatInput = document.getElementById("manualLatInput");
const manualLonInput = document.getElementById("manualLonInput");
const selectedAreaText = document.getElementById("selectedAreaText");

const weatherSnapshotEl = document.getElementById("weatherSnapshot");

const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

const classificationCard = document.getElementById("classificationCard");
const imageStatsEl = document.getElementById("imageStats");
const sensorStatsEl = document.getElementById("sensorStats");
const fusionCard = document.getElementById("fusionCard");
const reportSummaryEl = document.getElementById("reportSummary");
const pestStatsEl = document.getElementById("pestStatsEl");

const alertsListEl = document.getElementById("alertsList");
const recommendationsEl = document.getElementById("recommendations");

const fuseRiskBtn = document.getElementById("fuseRiskBtn");
const forecastBtn = document.getElementById("forecastBtn");
const generateReportBtn = document.getElementById("generateReportBtn");

const imageInput = document.getElementById("imageInput");
const analyzeImageBtn = document.getElementById("analyzeImageBtn");
const heatmapBox = document.getElementById("heatmapBox");

let latestImageResult = null;
let latestFieldAnalysis = null;
let latestSensorAnalysis = null;
let latestFusion = null;
let selectedArea = null;       // { lat, lon }
let selectedPolygonCoords = null;  // [[lon, lat], ...] GeoJSON ring (from map draw)


// ---------------- Navigation ----------------
function showPage(pageId) {
  pages.forEach((p) => p.classList.remove("active"));
  navItems.forEach((n) => n.classList.remove("active"));

  const targetPage = document.getElementById(`page-${pageId}`);
  const targetNav = document.querySelector(`.nav-item[data-page="${pageId}"]`);

  if (targetPage) targetPage.classList.add("active");
  if (targetNav) targetNav.classList.add("active");

  // Re-resize charts if they exist
  sensorChart?.resize();
  forecastChart?.resize();
}

navItems.forEach((btn) => {
  btn.addEventListener("click", () => showPage(btn.getAttribute("data-page")));
});

function setStatus(text) {
  statusText.textContent = text;
}

// ---------------- Charts ----------------
let sensorChart = null;
let forecastChart = null;

function renderSensorTrends(series) {
  const ctx = document.getElementById("sensorTrendsChart");
  const labels = series.t.map((x) => `R${x + 1}`);

  sensorChart?.destroy();
  sensorChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Soil Moisture (m³/m³)",
          data: series.soil_moisture,
          borderColor: "#2ECC71",
          backgroundColor: "#2ECC7133",
          tension: 0.3,
          yAxisID: "y", // Main axis (0..1)
        },
        {
          label: "Temperature (°C)",
          data: series.temperature,
          borderColor: "#3498DB",
          backgroundColor: "#3498DB33",
          tension: 0.3,
          yAxisID: "y1", // Secondary axis (0..50+)
        },
        {
          label: "Humidity (%)",
          data: series.humidity,
          borderColor: "#F1C40F",
          backgroundColor: "#F1C40F33",
          tension: 0.3,
          yAxisID: "y1", // Secondary axis (0..100)
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: "rgba(255,255,255,.85)", boxWidth: 12, padding: 15 } }
      },
      scales: {
        x: { ticks: { color: "rgba(255,255,255,.65)", maxTicksLimit: 12 }, grid: { display: false } },
        y: {
          type: "linear",
          display: true,
          position: "left",
          title: { display: true, text: "Soil Moisture", color: "rgba(255,255,255,.5)" },
          ticks: { color: "rgba(255,255,255,.65)" },
          grid: { color: "rgba(255,255,255,.06)" },
          suggestedMin: 0,
          suggestedMax: 0.6
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          title: { display: true, text: "Temp / Humidity", color: "rgba(255,255,255,.5)" },
          ticks: { color: "rgba(255,255,255,.65)" },
          grid: { drawOnChartArea: false }, // avoid double grid lines
          suggestedMin: 0,
          suggestedMax: 100
        }
      }
    }
  });
}

function renderForecast(forecast) {
  const ctx = document.getElementById("forecastChart");
  const horizon = forecast.stress_risk_future.length;
  const labels = Array.from({ length: horizon }, (_, i) => `+${i + 1}h`);

  forecastChart?.destroy();
  forecastChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Stress Risk (0..1)",
          data: forecast.stress_risk_future,
          borderColor: "rgba(255,92,124,.95)",
          backgroundColor: "rgba(255,92,124,.14)",
          tension: 0.25,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "rgba(255,255,255,.85)" } }
      },
      scales: {
        x: { ticks: { color: "rgba(255,255,255,.65)", maxTicksLimit: 8 }, grid: { color: "rgba(255,255,255,.06)" } },
        y: { ticks: { color: "rgba(255,255,255,.65)" }, grid: { color: "rgba(255,255,255,.06)" }, suggestedMin: 0, suggestedMax: 1 }
      }
    }
  });
}

// ---------------- Alerts UI ----------------
function renderFusionRisk(fusion) {
  latestFusion = fusion;

  const level = fusion.risk.level;
  const score = fusion.risk.score;
  const klass = level === "Healthy" ? "good" : level === "Moderate Risk" ? "warn" : "bad";

  fusionCard.classList.remove("good", "warn", "bad", "neutral");
  fusionCard.classList.add(klass);
  fusionCard.innerHTML = `
    <div style="font-size: 18px; margin-bottom: 6px;">Fused Risk: ${level}</div>
    <div style="color: rgba(255,255,255,.78); font-weight: 650;">Score: ${(score * 100).toFixed(1)}%</div>
  `;

  // Update weather stats panel if present in fusion result
  if (fusion.weather_stats) {
    const ws = fusion.weather_stats;
    imageStatsEl.innerHTML = `
      <div class="stat"><div class="k">Humidity mean</div><div class="v">${(ws.humidity_mean ?? 0).toFixed(1)}%</div></div>
      <div class="stat"><div class="k">Temperature mean</div><div class="v">${(ws.temperature_mean ?? 0).toFixed(1)}°C</div></div>
      <div class="stat"><div class="k">Humidity last</div><div class="v">${(ws.humidity_last ?? 0).toFixed(1)}%</div></div>
      <div class="stat"><div class="k">Risk score</div><div class="v">${Math.round((fusion.risk?.score ?? 0) * 100)}%</div></div>
    `;
  }

  reportSummaryEl.textContent = fusion.report_summary || "";

  // Alerts panel
  let alerts = fusion.alerts || [];

  // Integrate Pest-specific alerts if they exist
  if (fusion.pest_analysis && fusion.pest_analysis.alerts) {
    alerts = [...alerts, ...fusion.pest_analysis.alerts];
  }

  // Render Pest Stats if available
  if (fusion.pest_analysis && pestStatsEl) {
    const pa = fusion.pest_analysis;
    pestStatsEl.innerHTML = `
      <div style="font-size:12px; font-weight:700; color:rgba(255,255,255,.8); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
        <i class="fa-solid fa-bug"></i> AI Pest & Disease Analysis
      </div>
      <div class="stats" style="grid-template-columns: 1fr 1fr; gap: 8px;">
        <div class="stat"><div class="k">Pest Risk</div><div class="v">${Math.round(pa.pest_risk_score * 100)}%</div></div>
        <div class="stat"><div class="k">Fungal Risk</div><div class="v">${Math.round(pa.fungal_risk * 100)}%</div></div>
        <div class="stat"><div class="k">GDD (Base 10)</div><div class="v">${pa.gdd}</div></div>
        <div class="stat"><div class="k">Leaf Wetness</div><div class="v">${Math.round(pa.estimated_leaf_wetness * 100)}%</div></div>
      </div>
    `;
  } else if (pestStatsEl) {
    pestStatsEl.innerHTML = "";
  }

  if (!alerts.length) {
    alertsListEl.innerHTML = `<div class="muted">No alerts.</div>`;
    recommendationsEl.innerHTML = "";
    return;
  }

  alertsListEl.innerHTML = "";
  alerts.forEach((a) => {
    const div = document.createElement("div");
    div.className = `alert ${a.level}`;
    div.innerHTML = `
      <span class="badge"></span>
      <div class="msg">${a.message}</div>
    `;
    alertsListEl.appendChild(div);
  });

  // Simple recommendations derived from level
  let rec = [];
  if (level === "Healthy") rec = ["Maintain routine monitoring and avoid unnecessary interventions."];
  if (level === "Moderate Risk") rec = ["Increase scouting frequency and verify leaf wetness/humidity conditions."];
  if (level === "High Risk") rec = ["Plan targeted actions: irrigation adjustment and early disease/pest management."];

  recommendationsEl.innerHTML = rec.map((x) => `<div>• ${x}</div>`).join("");
}

// ── NDVI + Soil data rendering (AgroMonitoring) ──────────────────────────
function renderAgroData(data) {
  const ndvi   = data.ndvi_stats  || {};
  const soil   = data.soil_data   || {};
  const source = data.source      || "weather_only";

  const agroEl = document.getElementById("agroDataBox");
  if (!agroEl) return;

  const isAgro   = source === "agromonitoring";
  const hasNdvi  = isAgro && ndvi.mean !== undefined;
  const hasSoil  = isAgro && soil.soil_moisture !== undefined;

  const sourceBadge = isAgro
    ? `<span style="background:#1e6f4e;color:#7effc0;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">🛰️ SATELLITE</span>`
    : `<span style="background:#444;color:#aaa;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">🔄 SIMULATED</span>`;

  // NDVI colour: green(>0.5) → yellow(0.2-0.5) → red(<0.2)
  function ndviColor(v) {
    if (v > 0.50) return "#5ddf8a";
    if (v > 0.25) return "#f0c040";
    return "#ff5c7c";
  }

  const ndviHtml = hasNdvi
    ? `<div class="stat">
         <div class="k">NDVI mean</div>
         <div class="v" style="color:${ndviColor(ndvi.mean)}">${ndvi.mean.toFixed(3)}</div>
       </div>
       <div class="stat">
         <div class="k">NDVI range</div>
         <div class="v">${ndvi.min.toFixed(2)} – ${ndvi.max.toFixed(2)}</div>
       </div>
       <div class="stat">
         <div class="k">Valid pixels</div>
         <div class="v">${ndvi.valid_pixels_percent.toFixed(0)}%</div>
       </div>`
    : `<div class="stat"><div class="k">NDVI</div><div class="v muted">${
        isAgro ? "Awaiting satellite pass (retry in a few minutes)" : "Set AGROMONITORING_API_KEY to enable"
      }</div></div>`;

  const soilHtml = hasSoil
    ? `<div class="stat">
         <div class="k">Soil moisture</div>
         <div class="v">${soil.soil_moisture.toFixed(3)} m³/m³</div>
       </div>
       <div class="stat">
         <div class="k">Soil temp (surface)</div>
         <div class="v">${soil.soil_temp_surface_c.toFixed(1)} °C</div>
       </div>
       <div class="stat">
         <div class="k">Soil temp (10 cm)</div>
         <div class="v">${soil.soil_temp_10cm_c.toFixed(1)} °C</div>
       </div>`
    : `<div class="stat"><div class="k">Soil data</div><div class="v muted">${
        isAgro ? "Unavailable" : "Set AGROMONITORING_API_KEY to enable"
      }</div></div>`;

  agroEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
      <span style="font-weight:700;font-size:13px;">AgroMonitoring</span>
      ${sourceBadge}
    </div>
    <div class="stats" style="gap:8px;">
      ${ndviHtml}
      ${soilHtml}
    </div>
  `;
}

function setSelectedArea(lat, lon) {
  selectedArea = { lat: Number(lat), lon: Number(lon) };
  selectedAreaText.textContent = `Lat ${selectedArea.lat.toFixed(4)}, Lon ${selectedArea.lon.toFixed(4)}`;
}

/** Build a small ±0.05° bounding polygon around a point (for manual lat/lon). */
function makeBoundingPolygon(lat, lon, delta = 0.05) {
  return [
    [lon - delta, lat - delta],
    [lon + delta, lat - delta],
    [lon + delta, lat + delta],
    [lon - delta, lat + delta],
    [lon - delta, lat - delta], // closed
  ];
}

function getSelectedCoords() {
  if (selectedArea && isFinite(selectedArea.lat) && isFinite(selectedArea.lon)) return selectedArea;

  const lat = parseFloat(manualLatInput?.value || "");
  const lon = parseFloat(manualLonInput?.value || "");
  if (isFinite(lat) && isFinite(lon)) return { lat, lon };

  return null;
}

function computePillClass(level) {
  if (level === "Healthy") return "good";
  if (level === "Moderate Risk") return "warn";
  return "bad";
}

// ── Primary analysis endpoint (AgroMonitoring / weather fallback) ──────────
async function checkFieldRisk({ lat, lon, horizon = 12 }) {
  setStatus("Fetching AgroMonitoring data...");

  // Use stored polygon from map drawing; or auto-generate from lat/lon.
  const polyCoords = selectedPolygonCoords || makeBoundingPolygon(lat, lon);

  const payload = { lat, lon, horizon, polygon_coords: polyCoords };

  let res;
  try {
    res = await fetch("/api/analyze-field", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (_) {
    setStatus("Network error — check backend is running.");
    return;
  }

  if (!res.ok) {
    setStatus("Field analysis failed.");
    return;
  }

  const data = await res.json();
  latestFieldAnalysis = data; // Cache for fusion/prediction

  // ── Classification pill ─────────────────────────────────────────────────
  const level = data.risk?.level || "Healthy";
  classificationCard.classList.remove("good", "warn", "bad", "neutral");
  classificationCard.classList.add(computePillClass(level));
  classificationCard.textContent = level;

  // ── Weather stats panel ─────────────────────────────────────────────────
  const s = data.weather_stats || {};
  imageStatsEl.innerHTML = `
    <div class="stat"><div class="k">Humidity mean</div><div class="v">${(s.humidity_mean ?? 0).toFixed(1)}%</div></div>
    <div class="stat"><div class="k">Temperature mean</div><div class="v">${(s.temperature_mean ?? 0).toFixed(1)}°C</div></div>
    <div class="stat"><div class="k">Humidity last</div><div class="v">${(s.humidity_last ?? 0).toFixed(1)}%</div></div>
    <div class="stat"><div class="k">Risk score</div><div class="v">${Math.round((data.risk?.score ?? 0) * 100)}%</div></div>
  `;

  // ── Weather snapshot text ───────────────────────────────────────────────
  if (weatherSnapshotEl) {
    const summary = data.report_summary || "";
    const drivers = data.weather_drivers || [];
    weatherSnapshotEl.innerHTML = `
      <div style="margin-bottom:8px;font-weight:750;">${level} area risk</div>
      <div class="muted" style="font-size:13px;margin-bottom:8px;">${summary}</div>
      ${
        drivers.length
          ? `<div style="font-size:13px;">${drivers.map((d) => `<div>• ${d}</div>`).join("")}</div>`
          : ""
      }
    `;
  }

  // ── AgroMonitoring NDVI + soil panel ───────────────────────────────────
  renderAgroData(data);

  // ── Satellite Imagery Heatmap ──────────────────────────────────────────
  if (data.imagery_url) {
    heatmapBox.innerHTML = `
      <div style="font-size:14px; font-weight:700; color:#2ecc71; margin-bottom:10px; display:flex; align-items:center; gap:8px;">
        <i class="fa-solid fa-layer-group"></i> AgroMonitoring Satellite NDVI
      </div>
      <img src="${data.imagery_url}" style="width: 100%; border-radius: 8px; box-shadow: 0 8px 16px rgba(0,0,0,0.3); border: 2px solid rgba(46, 204, 113, 0.3);" />
      <div class="muted" style="font-size:11px; margin-top:6px; display:flex; justify-content:space-between;">
        <span>Source: Sentinel-2 Multi-Spectral</span>
        <span>${new Date().toLocaleDateString()}</span>
      </div>
    `;
  } else if (data.source === "agromonitoring") {
    heatmapBox.innerHTML = `
      <div style="padding:40px 20px; text-align:center; color:rgba(255,255,255,0.6);">
        <i class="fa-solid fa-satellite fa-bounce fa-2xl" style="color:#2ecc71; margin-bottom:20px;"></i>
        <div style="font-weight:600; font-size:15px; margin-bottom:8px;">Connecting to AgroMonitoring...</div>
        <p style="font-size:12px; margin:0;">Polygons are newly registered. Searching historical clear satellite passes (6-month horizon)...</p>
      </div>
    `;
  }

  // ── Risk + alerts + forecast ────────────────────────────────────────────
  renderFusionRisk(data);
  if (data.forecast) renderForecast(data.forecast);

  const src = data.source || "";
  const srcLabel = src === "agromonitoring" ? "🛰️ AgroMonitoring" : "🌤️ Weather-only";
  setStatus(`Analysis complete — ${srcLabel}`);

  // ── Auto-Navigate to Result Page ───────────────────────────────────────
  setTimeout(() => showPage("result"), 800);

  return data;
}


function initMap() {
  // If API key isn't configured, Google Maps won't be available.
  if (!window.google || !google.maps) {
    if (selectedAreaText) selectedAreaText.textContent = "Google Maps not configured. Use manual fallback.";
    return;
  }

  const mapEl = document.getElementById("map");
  if (!mapEl) return;

  const map = new google.maps.Map(mapEl, {
    center: { lat: 37.7749, lng: -122.4194 },
    zoom: 11,
    mapTypeControl: false,
    streetViewControl: false
  });

  // One selection at a time.
  let overlay = null;

  const drawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: google.maps.drawing.OverlayType.RECTANGLE,
    drawingControl: true,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_CENTER,
      drawingModes: ["rectangle"]
    },
    rectangleOptions: {
      fillColor: "#5AA7FF",
      fillOpacity: 0.15,
      strokeWeight: 2,
      clickable: false,
      editable: false,
      draggable: true
    }
  });

  drawingManager.setMap(map);

  google.maps.event.addListener(drawingManager, "overlaycomplete", (e) => {
    if (overlay) overlay.setMap(null);
    overlay = e.overlay;

    const bounds = overlay.getBounds();
    const center = bounds?.getCenter?.();
    if (!center) return;

    setSelectedArea(center.lat(), center.lng());

    // ── Capture GeoJSON polygon coords from the drawn rectangle ──────────
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    // GeoJSON order: [longitude, latitude], ring must be closed
    selectedPolygonCoords = [
      [sw.lng(), sw.lat()],
      [ne.lng(), sw.lat()],
      [ne.lng(), ne.lat()],
      [sw.lng(), ne.lat()],
      [sw.lng(), sw.lat()],
    ];
  });
}

async function analyzeSensors() {
  const file = sensorInput.files?.[0];
  if (!file) {
    setStatus("Select a CSV file first.");
    return;
  }

  setStatus("Analyzing sensors...");
  const fd = new FormData();
  fd.append("csv", file);

  const res = await fetch("/api/analyze-sensors", { method: "POST", body: fd });
  if (!res.ok) {
    setStatus("Sensor analysis failed.");
    return;
  }
  const data = await res.json();
  latestSensorAnalysis = data;

  renderSensorTrends(data.series);

  const s = data.sensor_stats;
  sensorStatsEl.innerHTML = `
    <div class="stat"><div class="k">Soil moisture mean</div><div class="v">${s.soil_moisture_mean.toFixed(3)}</div></div>
    <div class="stat"><div class="k">Temperature mean</div><div class="v">${s.temperature_mean.toFixed(2)}</div></div>
    <div class="stat"><div class="k">Humidity mean</div><div class="v">${s.humidity_mean.toFixed(1)}</div></div>
    <div class="stat"><div class="k">Humidity last</div><div class="v">${s.humidity_last.toFixed(1)}</div></div>
  `;

  setStatus("Sensor analysis complete.");
}

async function loadSampleSensors() {
  setStatus("Loading sample sensor data...");
  try {
    const res = await fetch("/api/sample-sensors");
    if (!res.ok) throw new Error("Failed to fetch sample data");
    
    const data = await res.json();
    latestSensorAnalysis = data;

    renderSensorTrends(data.series);

    const s = data.sensor_stats;
    sensorStatsEl.innerHTML = `
      <div class="stat"><div class="k">Soil moisture mean</div><div class="v">${s.soil_moisture_mean.toFixed(3)}</div></div>
      <div class="stat"><div class="k">Temperature mean</div><div class="v">${s.temperature_mean.toFixed(2)}</div></div>
      <div class="stat"><div class="k">Humidity mean</div><div class="v">${s.humidity_mean.toFixed(1)}</div></div>
      <div class="stat"><div class="k">Humidity last</div><div class="v">${s.humidity_last.toFixed(1)}</div></div>
    `;

    setStatus("Sample data loaded.");
  } catch (err) {
    setStatus("Error loading sample: " + err.message);
  }
}

// ── Image Analysis ────────────────────────────────────────────────────────
async function analyzeImage() {
  const file = imageInput?.files?.[0];
  if (!file) {
    setStatus("Select an image file first.");
    return;
  }

  setStatus("Analyzing image...");
  const fd = new FormData();
  fd.append("image", file);

  let res;
  try {
    res = await fetch("/api/analyze-image", { method: "POST", body: fd });
  } catch (_) {
    setStatus("Network error — check backend is running.");
    return;
  }

  if (!res.ok) {
    setStatus("Image analysis failed.");
    return;
  }

  const data = await res.json();
  latestImageResult = data;

  // Render classification pill
  const label = data.image_risk?.risk_label || "Healthy";
  classificationCard.classList.remove("good", "warn", "bad", "neutral");
  classificationCard.classList.add(computePillClass(label));
  classificationCard.textContent = label;

  // Render NDVI stats
  const st = data.ndvi_stats || {};
  const adv = data.advanced_indices || {};
  imageStatsEl.innerHTML = `
    <div class="stat"><div class="k">NDVI mean</div><div class="v">${(st.mean ?? 0).toFixed(3)}</div></div>
    <div class="stat"><div class="k">EVI (Biomass)</div><div class="v">${(adv.evi ?? 0).toFixed(3)}</div></div>
    <div class="stat"><div class="k">NDWI (Water)</div><div class="v">${(adv.ndwi ?? 0).toFixed(3)}</div></div>
    <div class="stat"><div class="k">Classification</div><div class="v">${data.classification || "Unknown"}</div></div>
  `;

  // Render SVG Heatmap
  if (data.processed_heatmap_svg_b64) {
    heatmapBox.innerHTML = `
      <div style="font-size:13px; font-weight:600; margin-bottom:8px;"><i class="fa-solid fa-map"></i> Generated NDVI Heatmap</div>
      <img src="data:image/svg+xml;base64,${data.processed_heatmap_svg_b64}" style="max-width: 100%; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);" />
    `;
  }

  setStatus("Image analysis complete.");
}

function buildSeriesPayloadFromSensorAnalysis(sensorAnalysis) {
  const s = sensorAnalysis.series;
  const len = s.t.length;
  const series = [];
  for (let i = 0; i < len; i++) {
    series.push({
      soil_moisture: s.soil_moisture[i],
      temperature: s.temperature[i],
      humidity: s.humidity[i]
    });
  }
  return series;
}

async function fuseRisk() {
  if (!latestFieldAnalysis) {
    setStatus("Run 'Check Area Risk' on the map first.");
    return;
  }
  
  setStatus("Fusing satellite + telemetry data...");
  const payload = {
    field_analysis: latestFieldAnalysis,
    sensor_analysis: latestSensorAnalysis || {}
  };

  try {
    const res = await fetch("/api/fuse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Fusion failed");

    renderFusionRisk(data);
    setStatus("Soil-First Fusion Complete.");
  } catch (err) {
    setStatus("Fusion Error: " + err.message);
  }
}

async function forecastFutureStress() {
  if (!latestFieldAnalysis) {
    setStatus("Run 'Check Area Risk' first to get weather forecast.");
    return;
  }

  setStatus("Generating 24h stress forecast...");
  try {
    const res = await fetch("/api/predict-stress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field_analysis: latestFieldAnalysis, horizon: 24 })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Prediction failed");

    renderForecast(data.forecast);
    setStatus("24h Stress Forecast Updated.");
  } catch (err) {
    setStatus("Forecast Error: " + err.message);
  }
}

async function generateFieldReport() {
  if (!latestFusion) {
    setStatus("Run 'Fuse Result' first to generate a complete report.");
    return;
  }

  setStatus("Generating printable field report...");
  const payload = {
    fusion_analysis: latestFusion,
    advanced_indices: latestImageResult?.advanced_indices || {}
  };

  try {
    const res = await fetch("/api/render-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error("Report generation failed.");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setStatus("Report generated successfully.");
  } catch (err) {
    setStatus("Report Error: " + err.message);
  }
}

async function startFieldAnalysis() {
  const coords = getSelectedCoords();
  if (!coords) {
    setStatus("Select a region on the map first.");
    return;
  }
  // Use map polygon if present, else auto-bounding box.
  const payload = {
    ...coords,
    horizon: 24,
    polygon_coords: selectedPolygonCoords || makeBoundingPolygon(coords.lat, coords.lon)
  };
  await checkFieldRisk(payload);
}

// ---------------- Wire buttons ----------------
analyzeRegionBtn.addEventListener("click", () => startFieldAnalysis());
analyzeSensorsBtn.addEventListener("click", () => analyzeSensors());
loadSampleSensorsBtn?.addEventListener("click", () => loadSampleSensors());
fuseRiskBtn.addEventListener("click", () => fuseRisk());
forecastBtn.addEventListener("click", () => forecastFutureStress());
generateReportBtn?.addEventListener("click", () => generateFieldReport());
analyzeImageBtn?.addEventListener("click", () => analyzeImage());

// Needed for Google Maps callback.
window.initMap = initMap;
