<?php
require_once '../includes/auth.php';

$page_title    = 'Routes';
$active_page   = 'routes';
$base_path     = '../';
$breadcrumb    = ['Manage' => null, 'Routes' => null];
$extra_css     = ['admin/routes.css'];
$extra_js      = ['admin/routes.js'];
$extra_head    = '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css">';
$extra_js_head = '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js"></script>';

require_once '../includes/partials/header.php';
?>

<!-- ── Page Header ──────────────────────────────────────────── -->
<div class="page-header">
    <div class="page-header-left">
        <h1>Routes</h1>
        <p>Draw and manage transport routes between terminals on the map.</p>
    </div>
</div>

<!-- ── Filters ──────────────────────────────────────────────── -->
<div class="card rt-filters-card">
    <div class="rt-filters">
        <div class="rt-filter-group">
            <label>Type</label>
            <div class="rt-filter-btns" id="filterType">
                <button class="rt-filter-btn active" data-value="">All</button>
                <button class="rt-filter-btn" data-value="bus">Bus</button>
                <button class="rt-filter-btn" data-value="jeepney">Jeepney</button>
                <button class="rt-filter-btn" data-value="tricycle">Tricycle</button>
                <button class="rt-filter-btn" data-value="mixed">Mixed</button>
            </div>
        </div>
        <div class="rt-filter-group">
            <label>Status</label>
            <div class="rt-filter-btns" id="filterStatus">
                <button class="rt-filter-btn active" data-value="">All</button>
                <button class="rt-filter-btn" data-value="active">Active</button>
                <button class="rt-filter-btn" data-value="suspended">Suspended</button>
                <button class="rt-filter-btn" data-value="affected">Affected</button>
            </div>
        </div>
        <div class="rt-filter-search">
            <i data-lucide="search"></i>
            <input type="text" id="rtSearchInput" placeholder="Search by name…">
        </div>
    </div>
</div>

<!-- ── Table ────────────────────────────────────────────────── -->
<div class="card">
    <div class="card-header">
        <h3><i data-lucide="list"></i> All Routes</h3>
        <span class="rt-count-badge" id="rtCountBadge">—</span>
    </div>
    <div class="card-body no-pad">
        <div class="table-wrap">
            <table class="table" id="rtTable">
                <thead>
                    <tr>
                        <th>Route Name</th>
                        <th>Type</th>
                        <th>Origin</th>
                        <th>Destination</th>
                        <th>Status</th>
                        <th>Points</th>
                        <th style="width:120px;">Actions</th>
                    </tr>
                </thead>
                <tbody id="rtTableBody">
                    <tr>
                        <td colspan="7">
                            <div class="table-loading">
                                <i data-lucide="loader"></i> Loading routes…
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- ── Map ──────────────────────────────────────────────────── -->
<div class="card rt-map-card">
    <div class="card-header">
        <div class="rt-map-header-left">
            <h3><i data-lucide="route"></i> <span id="rtMapTitle">Map — Draw a Route</span></h3>
            <p class="rt-map-hint" id="rtMapHint">Use the draw tool to trace a polyline on the map, then save it as a route</p>
        </div>
        <div class="rt-draw-toolbar" id="rtDrawToolbar">
            <!-- New route toolbar -->
            <button class="btn btn-primary btn-sm" id="startDrawBtn">
                <i data-lucide="pencil-line"></i> Draw Route
            </button>
            <button class="btn btn-outline btn-sm" id="cancelDrawBtn" style="display:none;">
                <i data-lucide="x"></i> Cancel
            </button>
            <button class="btn btn-sm rt-btn-save" id="saveDrawBtn" style="display:none;">
                <i data-lucide="save"></i> Save Route
            </button>
            <!-- Edit path toolbar (shown when editing a path) -->
            <button class="btn btn-outline btn-sm" id="exitPathEditBtn" style="display:none;">
                <i data-lucide="check"></i> Done Editing
            </button>
        </div>
    </div>
    <div class="rt-draw-status" id="rtDrawStatus" style="display:none;">
        <i data-lucide="info"></i>
        <span id="rtDrawStatusText"></span>
    </div>
    <div class="rt-map-wrap">
        <div id="rtMap"></div>
    </div>
</div>

<!-- ══ ADD / EDIT DETAILS MODAL ══════════════════════════════ -->
<div class="modal-backdrop" id="rtModal" role="dialog" aria-modal="true">
    <div class="modal">
        <div class="modal-header">
            <h3>
                <i data-lucide="route"></i>
                <span id="rtModalTitleText">Add Route</span>
            </h3>
            <button class="modal-close" id="rtModalClose"><i data-lucide="x"></i></button>
        </div>

        <form id="rtForm">
            <div class="modal-body">

                <!-- Route Name -->
                <div class="form-group">
                    <label for="rtName">Route Name <span class="req">*</span></label>
                    <input type="text" id="rtName" name="route_name" placeholder="e.g. Iriga–Nabua via Highway">
                    <span class="form-error" id="rtErrName"></span>
                </div>

                <!-- Type + Status -->
                <div class="form-row">
                    <div class="form-group">
                        <label for="rtType">Route Type <span class="req">*</span></label>
                        <select id="rtType" name="route_type">
                            <option value="">— Select —</option>
                            <option value="bus">Bus</option>
                            <option value="jeepney">Jeepney</option>
                            <option value="tricycle">Tricycle</option>
                            <option value="mixed">Mixed</option>
                        </select>
                        <span class="form-error" id="rtErrType"></span>
                    </div>
                    <div class="form-group">
                        <label for="rtStatus">Status <span class="req">*</span></label>
                        <select id="rtStatus" name="status">
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="affected">Affected</option>
                        </select>
                    </div>
                </div>

                <!-- Origin + Destination -->
                <div class="form-row">
                    <div class="form-group">
                        <label for="rtOrigin">Origin Terminal</label>
                        <select id="rtOrigin" name="origin_terminal_id">
                            <option value="">— None —</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="rtDestination">Destination Terminal</label>
                        <select id="rtDestination" name="destination_terminal_id">
                            <option value="">— None —</option>
                        </select>
                    </div>
                </div>

                <!-- Description -->
                <div class="form-group">
                    <label for="rtDescription">Description</label>
                    <textarea id="rtDescription" name="description" rows="3" placeholder="Optional notes about this route…"></textarea>
                </div>

                <!-- Points info (add mode only) -->
                <div class="rt-points-info" id="rtPointsInfo">
                    <i data-lucide="map-pin"></i>
                    <span id="rtPointsCount">0 points drawn</span>
                </div>

            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-outline" id="rtModalCancel">Cancel</button>
                <button type="submit" class="btn btn-primary" id="rtSubmitBtn">
                    <i data-lucide="save"></i>
                    <span id="rtSubmitLabel">Add Route</span>
                </button>
            </div>
        </form>
    </div>
</div>

<!-- ══ DELETE MODAL ══════════════════════════════════════════ -->
<div class="modal-backdrop" id="rtDeleteModal" role="dialog" aria-modal="true">
    <div class="modal modal-sm">
        <div class="modal-header">
            <h3><i data-lucide="trash-2"></i> Delete Route</h3>
            <button class="modal-close" id="rtDeleteClose"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
            <div class="logout-modal-body">
                <div class="logout-modal-icon"><i data-lucide="trash-2"></i></div>
                <p>Delete <strong id="rtDeleteName">this route</strong>?</p>
                <span>This will remove the route and all its path points. This cannot be undone.</span>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="rtDeleteCancel">Cancel</button>
            <button type="button" class="btn btn-danger-solid" id="rtDeleteConfirm">
                <i data-lucide="trash-2"></i> Delete
            </button>
        </div>
    </div>
</div>

<?php require_once '../includes/partials/footer.php'; ?>