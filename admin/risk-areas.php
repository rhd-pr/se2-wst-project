<?php
require_once '../includes/auth.php';

$page_title    = 'Risk Areas';
$active_page   = 'risk-areas';
$base_path     = '../';
$breadcrumb    = ['Manage' => null, 'Risk Areas' => null];
$extra_css     = ['admin/risk-areas.css'];
$extra_js      = ['admin/risk-areas.js'];
$extra_head    = '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">';
$extra_js_head = '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>';

require_once '../includes/partials/header.php';
?>

<!-- ── Page Header ──────────────────────────────────────────── -->
<div class="page-header">
    <div class="page-header-left">
        <h1>Risk Areas</h1>
        <p>Report and manage disaster zones, road closures, and hazard areas.</p>
    </div>
</div>

<!-- ── Filters ──────────────────────────────────────────────── -->
<div class="card ra-filters-card">
    <div class="ra-filters">
        <div class="ra-filter-group">
            <label>Type</label>
            <div class="ra-filter-btns" id="raFilterType">
                <button class="ra-filter-btn active" data-value="">All</button>
                <button class="ra-filter-btn" data-value="flood"><i data-lucide="waves"></i> Flood</button>
                <button class="ra-filter-btn" data-value="landslide"><i data-lucide="mountain"></i> Landslide</button>
                <button class="ra-filter-btn" data-value="accident"><i data-lucide="car-crash"></i> Accident</button>
                <button class="ra-filter-btn" data-value="road_closure"><i data-lucide="octagon-x"></i> Road Closure</button>
                <button class="ra-filter-btn" data-value="other"><i data-lucide="circle-alert"></i> Other</button>
            </div>
        </div>
        <div class="ra-filter-group">
            <label>Status</label>
            <div class="ra-filter-btns" id="raFilterStatus">
                <button class="ra-filter-btn active" data-value="">All</button>
                <button class="ra-filter-btn" data-value="active">Active</button>
                <button class="ra-filter-btn" data-value="resolved">Resolved</button>
            </div>
        </div>
        <div class="ra-filter-search">
            <i data-lucide="search"></i>
            <input type="text" id="raSearchInput" placeholder="Search by name…">
        </div>
    </div>
</div>

<!-- ── Table ────────────────────────────────────────────────── -->
<div class="card">
    <div class="card-header">
        <h3><i data-lucide="triangle-alert"></i> All Risk Areas</h3>
        <span class="ra-count-badge" id="raCountBadge">—</span>
    </div>
    <div class="card-body no-pad">
        <div class="table-wrap">
            <table class="table" id="raTable">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Severity</th>
                        <th>Radius</th>
                        <th>Status</th>
                        <th>Reported</th>
                        <th style="width:130px;">Actions</th>
                    </tr>
                </thead>
                <tbody id="raTableBody">
                    <tr>
                        <td colspan="7">
                            <div class="table-loading">
                                <i data-lucide="loader"></i> Loading risk areas…
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- ── Map ──────────────────────────────────────────────────── -->
<div class="card ra-map-card">
    <div class="card-header">
        <div class="ra-map-header-left">
            <h3><i data-lucide="map-pin"></i> <span id="raMapTitle">Map — Draw a Risk Zone</span></h3>
            <p class="ra-map-hint" id="raMapHint">Pan and zoom freely. Click "Draw Zone" to start placing a risk circle.</p>
        </div>
        <div class="ra-map-toolbar" id="raMapToolbar">
            <!-- Default: Draw button visible -->
            <button class="btn btn-primary btn-sm" id="raStartDrawBtn">
                <i data-lucide="pencil-line"></i> Draw Zone
            </button>
            <!-- While drawing -->
            <button class="btn btn-outline btn-sm" id="raCancelDrawBtn" style="display:none;">
                <i data-lucide="x"></i> Cancel
            </button>
            <button class="btn btn-sm ra-btn-save" id="raSaveZoneBtn" style="display:none;">
                <i data-lucide="save"></i> Save Zone
            </button>
            <!-- While editing zone on map -->
            <button class="btn btn-outline btn-sm" id="raCancelZoneEditBtn" style="display:none;">
                <i data-lucide="x"></i> Cancel
            </button>
            <button class="btn btn-sm ra-btn-save" id="raDoneZoneEditBtn" style="display:none;">
                <i data-lucide="check"></i> Done Editing
            </button>
        </div>
    </div>
    <div class="ra-draw-status" id="raDrawStatus" style="display:none;">
        <i data-lucide="info"></i>
        <span id="raDrawStatusText"></span>
    </div>
    <div class="ra-map-wrap">
        <div id="raMap"></div>
        <div class="ra-radius-badge" id="raRadiusBadge" style="display:none;"></div>
    </div>
</div>

<!-- ══ ADD / EDIT MODAL ═══════════════════════════════════════ -->
<div class="modal-backdrop" id="raModal" role="dialog" aria-modal="true">
    <div class="modal">
        <div class="modal-header">
            <h3>
                <i data-lucide="triangle-alert"></i>
                <span id="raModalTitleText">Report Risk Area</span>
            </h3>
            <button class="modal-close" id="raModalClose"><i data-lucide="x"></i></button>
        </div>

        <form id="raForm" enctype="multipart/form-data">
            <input type="hidden" id="raId"     name="zone_id">
            <input type="hidden" id="raLat"    name="latitude">
            <input type="hidden" id="raLng"    name="longitude">
            <input type="hidden" id="raRadius" name="radius_meters">

            <div class="modal-body">

                <!-- Zone Name -->
                <div class="form-group">
                    <label for="raName">Zone Name <span class="req">*</span></label>
                    <input type="text" id="raName" name="zone_name" placeholder="e.g. Mayon Avenue Flood Zone">
                    <span class="form-error" id="raErrName"></span>
                </div>

                <!-- Type + Severity -->
                <div class="form-row">
                    <div class="form-group">
                        <label for="raType">Zone Type <span class="req">*</span></label>
                        <select id="raType" name="zone_type">
                            <option value="">— Select —</option>
                            <option value="flood">Flood</option>
                            <option value="landslide">Landslide</option>
                            <option value="accident">Accident</option>
                            <option value="road_closure">Road Closure</option>
                            <option value="other">Other</option>
                        </select>
                        <span class="form-error" id="raErrType"></span>
                    </div>
                    <div class="form-group">
                        <label for="raSeverity">Severity <span class="req">*</span></label>
                        <select id="raSeverity" name="severity">
                            <option value="">— Select —</option>
                            <option value="low">Low</option>
                            <option value="moderate">Moderate</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                        <span class="form-error" id="raErrSeverity"></span>
                    </div>
                </div>

                <!-- Location summary (read-only) -->
                <div class="ra-location-row" id="raLocationRow">
                    <div class="ra-location-info">
                        <i data-lucide="map-pin"></i>
                        <span id="raLocationText">No location set</span>
                    </div>
                    <div class="ra-location-info">
                        <i data-lucide="circle-dashed"></i>
                        <span id="raRadiusText">— m radius</span>
                    </div>
                </div>

                <!-- Description -->
                <div class="form-group">
                    <label for="raDescription">Description</label>
                    <textarea id="raDescription" name="description" rows="3" placeholder="Details about this risk zone…"></textarea>
                </div>

                <!-- Photo -->
                <div class="form-group">
                    <label>Photo <span class="form-hint">(Optional · Max 5 MB · JPG/PNG/WebP)</span></label>
                    <div class="ra-photo-wrap" id="raPhotoWrap">
                        <div class="ra-photo-existing" id="raPhotoExisting" style="display:none;">
                            <img id="raPhotoExistingImg" src="" alt="Current photo">
                            <button type="button" class="ra-photo-remove" id="raRemovePhotoBtn">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                        <label class="ra-photo-drop" id="raPhotoDrop" for="raPhoto">
                            <i data-lucide="image-plus"></i>
                            <span>Click or drag to upload</span>
                        </label>
                        <input type="file" id="raPhoto" name="photo" accept="image/*" style="display:none;">
                        <div class="ra-photo-preview" id="raPhotoPreviewNew" style="display:none;">
                            <img id="raPhotoPreviewImg" src="" alt="Preview">
                            <button type="button" class="ra-photo-remove" id="raRemoveNewPhotoBtn">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                    </div>
                    <span class="form-error" id="raErrPhoto"></span>
                </div>

            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-outline" id="raModalCancel">Cancel</button>
                <button type="submit" class="btn btn-primary" id="raSubmitBtn">
                    <i data-lucide="save"></i>
                    <span id="raSubmitLabel">Report Zone</span>
                </button>
            </div>
        </form>
    </div>
</div>

<!-- ══ RESOLVE MODAL ══════════════════════════════════════════ -->
<div class="modal-backdrop" id="raResolveModal" role="dialog" aria-modal="true">
    <div class="modal modal-sm">
        <div class="modal-header">
            <h3><i data-lucide="circle-check"></i> Resolve Zone</h3>
            <button class="modal-close" id="raResolveClose"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
            <div class="logout-modal-body">
                <div class="logout-modal-icon ra-resolve-icon"><i data-lucide="circle-check"></i></div>
                <p>Mark <strong id="raResolveName">this zone</strong> as resolved?</p>
                <span>The zone will be removed from the public map. It will remain in the admin table as resolved and cannot be reactivated.</span>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="raResolveCancel">Cancel</button>
            <button type="button" class="btn btn-success-solid" id="raResolveConfirm">
                <i data-lucide="circle-check"></i> Mark Resolved
            </button>
        </div>
    </div>
</div>

<!-- ══ DELETE MODAL ══════════════════════════════════════════ -->
<div class="modal-backdrop" id="raDeleteModal" role="dialog" aria-modal="true">
    <div class="modal modal-sm">
        <div class="modal-header">
            <h3><i data-lucide="trash-2"></i> Delete Zone</h3>
            <button class="modal-close" id="raDeleteClose"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
            <div class="logout-modal-body">
                <div class="logout-modal-icon"><i data-lucide="trash-2"></i></div>
                <p>Delete <strong id="raDeleteName">this zone</strong>?</p>
                <span>This will permanently remove the zone. This cannot be undone.</span>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="raDeleteCancel">Cancel</button>
            <button type="button" class="btn btn-danger-solid" id="raDeleteConfirm">
                <i data-lucide="trash-2"></i> Delete
            </button>
        </div>
    </div>
</div>

<?php require_once '../includes/partials/footer.php'; ?>