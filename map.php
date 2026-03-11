<?php?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Public Map — TURS</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
    <link rel="stylesheet" href="assets/css/map.css">
</head>
<body>

<!-- ── Top Bar ──────────────────────────────────────────────── -->
<header class="map-topbar">
    <a href="index.php" class="map-brand">
        <div class="map-brand-icon"><i data-lucide="map-pin"></i></div>
        <div class="map-brand-text">
            <span class="map-brand-name">TURS</span>
            <span class="map-brand-sub">Transport &amp; Urban Resilience</span>
        </div>
    </a>

    <div class="map-search-wrap">
        <div class="map-search-box" id="mapSearchBox">
            <i data-lucide="search" class="map-search-icon"></i>
            <input type="text" id="mapSearchInput" class="map-search-input"
                   placeholder="Search terminals, routes, risk areas…" autocomplete="off">
            <button class="map-search-clear" id="mapSearchClear" style="display:none;">
                <i data-lucide="x"></i>
            </button>
        </div>
        <div class="map-search-results" id="mapSearchResults" style="display:none;"></div>
    </div>

    <div class="map-topbar-right">
        <a href="index.php" class="map-nav-link"><i data-lucide="home"></i><span>Home</span></a>
        <a href="login.php" class="map-nav-link map-nav-link--admin"><i data-lucide="lock"></i><span>Admin</span></a>
    </div>
</header>

<!-- ── Full-screen map ──────────────────────────────────────── -->
<div id="map"></div>

<!-- ── Overview Bar (top-right, below topbar) ───────────────── -->
<div class="map-overview-bar" id="mapOverviewBar">
    <div class="map-overview-stat">
        <span class="map-overview-value" id="sumTerminals">—</span>
        <span class="map-overview-label" style="color:#1A6FA8;">Terminals</span>
    </div>
    <div class="map-overview-sep"></div>
    <div class="map-overview-stat">
        <span class="map-overview-value" id="sumEmergency">—</span>
        <span class="map-overview-label" style="color:#C0392B;">Emergency</span>
    </div>
    <div class="map-overview-sep"></div>
    <div class="map-overview-stat">
        <span class="map-overview-value" id="sumFacilities">—</span>
        <span class="map-overview-label" style="color:#2E8B57;">Facilities</span>
    </div>
    <div class="map-overview-sep"></div>
    <div class="map-overview-stat">
        <span class="map-overview-value" id="sumRisk">—</span>
        <span class="map-overview-label" style="color:#D4780A;">Risk Areas</span>
    </div>
    <div class="map-overview-sep"></div>
    <div class="map-overview-stat">
        <span class="map-overview-value" id="sumRoutes">—</span>
        <span class="map-overview-label" style="color:#1A3A5C;">Routes</span>
    </div>
</div>

<!-- ── Lightbox ─────────────────────────────────────────────────── -->
<div class="map-lightbox" id="mapLightbox">
    <button class="map-lightbox-close" id="lightboxClose"><i data-lucide="x"></i></button>
    <img class="map-lightbox-img" id="lightboxImg" src="" alt="">
</div>

<!-- ── Detail Modal ───────────────────────────────────────────── -->
<div class="map-modal-backdrop" id="detailBackdrop">
    <div class="map-modal" id="detailModal" role="dialog" aria-modal="true">
        <div class="map-modal-header">
            <div class="map-modal-header-left">
                <div class="map-modal-icon" id="modalIcon"></div>
                <div>
                    <div class="map-modal-title" id="modalTitle">Details</div>
                    <div class="map-modal-sub" id="modalSub"></div>
                </div>
            </div>
            <button class="map-modal-close" id="modalClose"><i data-lucide="x"></i></button>
        </div>
        <div class="map-modal-body" id="modalBody"></div>
    </div>
</div>

<!-- ── Legend Panel (bottom-left) ───────────────────────────── -->
<div class="map-panel map-legend" id="legendPanel">
    <button class="map-panel-header" id="legendToggle">
        <div class="map-panel-header-left"><i data-lucide="layers"></i><span>Legend</span></div>
        <i data-lucide="chevron-up" class="map-panel-chevron" id="legendChevron"></i>
    </button>
    <div class="map-panel-body" id="legendBody">
        <div class="legend-group">
            <div class="legend-group-label">Access Points</div>
            <div class="legend-item"><span class="legend-dot" style="background:#1A6FA8;"></span>Transport Terminal</div>
            <div class="legend-item"><span class="legend-dot" style="background:#C0392B;"></span>Emergency Point</div>
            <div class="legend-item"><span class="legend-dot" style="background:#2E8B57;"></span>Public Facility</div>
        </div>
        <div class="legend-divider"></div>
        <div class="legend-group">
            <div class="legend-group-label">Routes</div>
            <div class="legend-item"><span class="legend-line" style="background:#1A6FA8;"></span>Bus</div>
            <div class="legend-item"><span class="legend-line" style="background:#C0392B;"></span>Jeepney</div>
            <div class="legend-item"><span class="legend-line" style="background:#2E8B57;"></span>Tricycle</div>
            <div class="legend-item"><span class="legend-line" style="background:#D4780A;"></span>Mixed</div>
            <div class="legend-item"><span class="legend-line legend-line--dashed"></span>Suspended / Affected</div>
        </div>
        <div class="legend-divider"></div>
        <div class="legend-group">
            <div class="legend-group-label">Risk Severity</div>
            <div class="legend-item"><span class="legend-circle" style="border-color:#F1C40F;background:#F1C40F22;"></span>Low</div>
            <div class="legend-item"><span class="legend-circle" style="border-color:#E67E22;background:#E67E2222;"></span>Moderate</div>
            <div class="legend-item"><span class="legend-circle" style="border-color:#E74C3C;background:#E74C3C22;"></span>High</div>
            <div class="legend-item"><span class="legend-circle" style="border-color:#7B0000;background:#7B000022;"></span>Critical</div>
        </div>
    </div>
</div>

<!-- ── Filter Panel (bottom-right) ──────────────────────────── -->
<div class="map-panel map-filter-panel" id="filterPanel">
    <button class="map-panel-header" id="filterToggle">
        <div class="map-panel-header-left"><i data-lucide="sliders-horizontal"></i><span>Filters &amp; Layers</span></div>
        <i data-lucide="chevron-up" class="map-panel-chevron" id="filterChevron"></i>
    </button>
    <div class="map-panel-body" id="filterBody">
        <div class="filter-group-label">Layers</div>
        <div class="filter-layer-list">
            <label class="filter-toggle-row">
                <input type="checkbox" class="filter-layer-cb" data-layer="transport" checked>
                <span class="filter-toggle-track"></span>
                <span class="filter-dot" style="background:#1A6FA8;"></span>
                <span>Terminals</span>
            </label>
            <label class="filter-toggle-row">
                <input type="checkbox" class="filter-layer-cb" data-layer="emergency" checked>
                <span class="filter-toggle-track"></span>
                <span class="filter-dot" style="background:#C0392B;"></span>
                <span>Emergency</span>
            </label>
            <label class="filter-toggle-row">
                <input type="checkbox" class="filter-layer-cb" data-layer="facility" checked>
                <span class="filter-toggle-track"></span>
                <span class="filter-dot" style="background:#2E8B57;"></span>
                <span>Facilities</span>
            </label>
            <label class="filter-toggle-row">
                <input type="checkbox" class="filter-layer-cb" data-layer="routes" checked>
                <span class="filter-toggle-track"></span>
                <span class="filter-dot" style="background:#1A6FA8;border-radius:2px;width:16px;height:4px;"></span>
                <span>Routes</span>
            </label>
            <label class="filter-toggle-row">
                <input type="checkbox" class="filter-layer-cb" data-layer="risk" checked>
                <span class="filter-toggle-track"></span>
                <span class="filter-dot" style="background:#E67E22;"></span>
                <span>Risk Areas</span>
            </label>
        </div>
        <div class="filter-divider"></div>
        <div class="filter-group-label">Route Type</div>
        <div class="filter-chip-group" id="filterRouteType">
            <button class="filter-chip active" data-value="">All</button>
            <button class="filter-chip" data-value="bus">Bus</button>
            <button class="filter-chip" data-value="jeepney">Jeepney</button>
            <button class="filter-chip" data-value="tricycle">Tricycle</button>
            <button class="filter-chip" data-value="mixed">Mixed</button>
        </div>
        <div class="filter-divider"></div>
        <div class="filter-group-label">Risk Severity</div>
        <div class="filter-chip-group" id="filterSeverity">
            <button class="filter-chip active" data-value="">All</button>
            <button class="filter-chip" data-value="low">Low</button>
            <button class="filter-chip" data-value="moderate">Moderate</button>
            <button class="filter-chip" data-value="high">High</button>
            <button class="filter-chip" data-value="critical">Critical</button>
        </div>
        <div class="filter-divider"></div>
        <button class="filter-reset-btn" id="filterResetBtn">
            <i data-lucide="rotate-ccw"></i> Reset All Filters
        </button>
    </div>
</div>

<!-- Loading overlay -->
<div class="map-loading" id="mapLoading">
    <div class="map-loading-inner">
        <i data-lucide="map"></i>
        <span>Loading map data…</span>
    </div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="assets/js/map.js"></script>
<script>lucide.createIcons();</script>
</body>
</html>