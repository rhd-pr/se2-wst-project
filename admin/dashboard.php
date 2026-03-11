<?php
require_once '../includes/auth.php';

$page_title    = 'Dashboard';
$active_page   = 'dashboard';
$base_path     = '../';
$breadcrumb    = ['Dashboard' => null];
$extra_css     = ['admin/dashboard.css'];
$extra_js      = ['admin/dashboard.js'];
$extra_head    = '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">';
$extra_js_head = '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>';

require_once '../includes/partials/header.php';
?>

<!-- ── Page Header ──────────────────────────────────────────── -->
<div class="page-header">
    <div class="dash-page-header-row">
        <div>
            <h1>Dashboard</h1>
            <p>Overview of TURS — transport infrastructure, routes, and active risk zones.</p>
        </div>
        <div class="dash-header-actions">
            <span class="dash-timestamp" id="lastUpdated"></span>
            <button class="btn btn-outline btn-sm" id="refreshBtn">
                <i data-lucide="refresh-cw"></i> Refresh
            </button>
        </div>
    </div>
</div>

<!-- ── Stat Cards ────────────────────────────────────────────── -->
<div class="dash-stat-grid">

    <div class="dash-stat-card dash-stat-transport">
        <div class="dash-stat-icon"><i data-lucide="map-pin"></i></div>
        <div class="dash-stat-body">
            <div class="dash-stat-value" id="statAccessPoints">—</div>
            <div class="dash-stat-label">Total Access Points</div>
            <div class="dash-stat-sub" id="statAccessPointsSub"></div>
        </div>
        <a href="access-points.php" class="dash-stat-arrow" title="Manage">
            <i data-lucide="arrow-right"></i>
        </a>
    </div>

    <div class="dash-stat-card dash-stat-routes">
        <div class="dash-stat-icon"><i data-lucide="route"></i></div>
        <div class="dash-stat-body">
            <div class="dash-stat-value" id="statRoutes">—</div>
            <div class="dash-stat-label">Active Routes</div>
            <div class="dash-stat-sub" id="statRoutesSub"></div>
        </div>
        <a href="routes.php" class="dash-stat-arrow" title="Manage">
            <i data-lucide="arrow-right"></i>
        </a>
    </div>

    <div class="dash-stat-card dash-stat-risk" id="statRiskCard">
        <div class="dash-stat-icon"><i data-lucide="shield-alert"></i></div>
        <div class="dash-stat-body">
            <div class="dash-stat-value" id="statRisk">—</div>
            <div class="dash-stat-label">Active Risk Zones</div>
            <div class="dash-stat-sub" id="statRiskSub"></div>
        </div>
        <a href="risk-areas.php" class="dash-stat-arrow" title="Manage">
            <i data-lucide="arrow-right"></i>
        </a>
    </div>

</div>

<!-- ── Main Content Grid ─────────────────────────────────────── -->
<div class="dash-main-grid">

    <!-- Left: Map + Risk zones -->
    <div class="dash-col-left">

        <!-- Mini Map -->
        <div class="card dash-map-card">
            <div class="card-header">
                <h3><i data-lucide="map"></i> Live Map Overview</h3>
                <div class="dash-layer-toggles" id="dashLayerToggles">
                    <button class="dash-layer-btn active" data-layer="transport" title="Transport Terminals">
                        <i data-lucide="map-pin"></i>
                    </button>
                    <button class="dash-layer-btn active" data-layer="emergency" title="Emergency Points">
                        <i data-lucide="siren"></i>
                    </button>
                    <button class="dash-layer-btn active" data-layer="facility" title="Facilities">
                        <i data-lucide="building-2"></i>
                    </button>
                    <button class="dash-layer-btn active" data-layer="routes" title="Routes">
                        <i data-lucide="route"></i>
                    </button>
                    <button class="dash-layer-btn active" data-layer="risk" title="Risk Zones">
                        <i data-lucide="shield-alert"></i>
                    </button>
                </div>
            </div>
            <div class="dash-map-wrap">
                <div id="dashMap"></div>
                <div class="dash-map-spinner" id="dashMapLoading">
                    <i data-lucide="loader"></i> Loading…
                </div>
            </div>
            <div class="dash-map-footer">
                <a href="../map.php" target="_blank" class="dash-open-map-link">
                    <i data-lucide="external-link"></i>
                    Open full public map
                </a>
            </div>
        </div>

        <!-- Active Risk Zones -->
        <div class="card">
            <div class="card-header">
                <h3><i data-lucide="shield-alert"></i> Active Risk Zones</h3>
                <a href="risk-areas.php" class="btn btn-outline btn-sm">
                    <i data-lucide="settings-2"></i> Manage
                </a>
            </div>
            <div class="card-body no-pad" id="dashRiskList">
                <div class="dash-loading-row"><i data-lucide="loader"></i> Loading…</div>
            </div>
        </div>

    </div>

    <!-- Right: Access Points breakdown + Route breakdown -->
    <div class="dash-col-right">

        <!-- Access Points Breakdown -->
        <div class="card">
            <div class="card-header">
                <h3><i data-lucide="map-pin"></i> Access Points Breakdown</h3>
                <a href="access-points.php" class="btn btn-outline btn-sm">
                    <i data-lucide="arrow-right"></i> View All
                </a>
            </div>
            <div class="card-body" id="dashAccessPointBreakdown">
                <div class="dash-loading-row"><i data-lucide="loader"></i> Loading…</div>
            </div>
        </div>

        <!-- Route Breakdown -->
        <div class="card">
            <div class="card-header">
                <h3><i data-lucide="bar-chart-2"></i> Route Breakdown</h3>
                <a href="routes.php" class="btn btn-outline btn-sm">
                    <i data-lucide="arrow-right"></i> View All
                </a>
            </div>
            <div class="card-body" id="dashRouteBreakdown">
                <div class="dash-loading-row"><i data-lucide="loader"></i> Loading…</div>
            </div>
        </div>

        <!-- Risk Zone Breakdown -->
        <div class="card">
            <div class="card-header">
                <h3><i data-lucide="shield-alert"></i> Risk Zone Breakdown</h3>
                <a href="risk-areas.php" class="btn btn-outline btn-sm">
                    <i data-lucide="arrow-right"></i> View All
                </a>
            </div>
            <div class="card-body" id="dashRiskBreakdown">
                <div class="dash-loading-row"><i data-lucide="loader"></i> Loading…</div>
            </div>
        </div>

    </div>

</div><!-- .dash-main-grid -->

<!-- ── Recent Activity (full width, bottom) ─────────────────── -->
<div class="card dash-activity-card dash-activity-full">
    <div class="card-header">
        <h3><i data-lucide="activity"></i> Recent Activity</h3>
        <a href="audit-logs.php" class="btn btn-outline btn-sm">
            <i data-lucide="clipboard-list"></i> Full Log
        </a>
    </div>
    <div class="card-body no-pad" id="dashActivity">
        <div class="dash-loading-row"><i data-lucide="loader"></i> Loading…</div>
    </div>
</div>

<?php require_once '../includes/partials/footer.php'; ?>