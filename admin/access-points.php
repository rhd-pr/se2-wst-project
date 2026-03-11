<?php

require_once '../includes/auth.php';

$page_title  = 'Access Points';
$active_page = 'access-points';
$base_path   = '../';
$breadcrumb  = ['Manage' => null, 'Access Points' => null];
$extra_css   = ['admin/access-points.css'];
$extra_js    = ['admin/access-points.js'];
$extra_head  = '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">';
$extra_js_head = '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>';

require_once '../includes/partials/header.php';
?>

<!-- ── Page Header ──────────────────────────────────────────── -->
<div class="page-header">
    <div class="page-header-left">
        <h1>Access Points</h1>
        <p>Manage transport terminals, emergency points, and public facilities.</p>
    </div>
</div>

<!-- ── Filters ──────────────────────────────────────────────── -->
<div class="card ap-filters-card">
    <div class="ap-filters">
        <div class="ap-filter-group">
            <label>Category</label>
            <div class="ap-filter-btns" id="filterCategory">
                <button class="ap-filter-btn active" data-value="">All</button>
                <button class="ap-filter-btn" data-value="transport">
                    <i data-lucide="map-pin"></i> Transport
                </button>
                <button class="ap-filter-btn" data-value="emergency">
                    <i data-lucide="siren"></i> Emergency
                </button>
                <button class="ap-filter-btn" data-value="facility">
                    <i data-lucide="building-2"></i> Facility
                </button>
            </div>
        </div>
        <div class="ap-filter-group">
            <label>Status</label>
            <div class="ap-filter-btns" id="filterStatus">
                <button class="ap-filter-btn active" data-value="">All</button>
                <button class="ap-filter-btn" data-value="active">Active</button>
                <button class="ap-filter-btn" data-value="inactive">Inactive</button>
            </div>
        </div>
        <div class="ap-filter-search">
            <i data-lucide="search"></i>
            <input type="text" id="searchInput" placeholder="Search by name or address…">
        </div>
    </div>
</div>

<!-- ── Table ────────────────────────────────────────────────── -->
<div class="card">
    <div class="card-header">
        <h3>
            <i data-lucide="list"></i>
            All Access Points
        </h3>
        <span class="ap-count-badge" id="countBadge">—</span>
    </div>
    <div class="card-body no-pad">
        <div class="table-wrap">
            <table class="table" id="apTable">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Sub-type</th>
                        <th>Address</th>
                        <th>Status</th>
                        <th>Added By</th>
                        <th style="width:100px;">Actions</th>
                    </tr>
                </thead>
                <tbody id="apTableBody">
                    <tr class="table-loading-row">
                        <td colspan="7">
                            <div class="table-loading">
                                <i data-lucide="loader"></i>
                                Loading access points…
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- ── Map Draw Section ──────────────────────────────────────── -->
<div class="card ap-map-card">
    <div class="card-header">
        <div class="ap-map-header-left">
            <h3>
                <i data-lucide="map-pin"></i>
                Map — Drop a Pin to Add
            </h3>
            <p class="ap-map-hint">Click anywhere on the map to place a new access point</p>
        </div>
        <div class="ap-map-actions" id="mapActions" style="display:none;">
            <span class="ap-pin-coords" id="pinCoords"></span>
            <button class="btn btn-outline btn-sm" id="cancelPinBtn">
                <i data-lucide="x"></i> Cancel
            </button>
            <button class="btn btn-primary btn-sm" id="savePinBtn">
                <i data-lucide="save"></i> Save Location
            </button>
        </div>
    </div>
    <div class="ap-map-wrap">
        <div id="apMap"></div>
        <div class="ap-map-cursor-hint" id="cursorHint">
            <i data-lucide="mouse-pointer-click"></i>
            Click to place pin
        </div>
    </div>
</div>

<!-- ══ ADD / EDIT MODAL ═══════════════════════════════════════ -->
<div class="modal-backdrop" id="apModal" role="dialog" aria-modal="true" aria-labelledby="apModalTitle">
    <div class="modal">

        <div class="modal-header">
            <h3 id="apModalTitle">
                <i data-lucide="map-pin"></i>
                <span id="apModalTitleText">Add Access Point</span>
            </h3>
            <button class="modal-close" id="apModalClose" aria-label="Close">
                <i data-lucide="x"></i>
            </button>
        </div>

        <form id="apForm" enctype="multipart/form-data">
            <input type="hidden" id="apId" name="access_point_id">
            <input type="hidden" id="apLat" name="latitude">
            <input type="hidden" id="apLng" name="longitude">

            <div class="modal-body">

                <!-- Name -->
                <div class="form-group">
                    <label for="apName">Name <span class="req">*</span></label>
                    <input type="text" id="apName" name="name" placeholder="e.g. Iriga City Bus Terminal">
                    <span class="form-error" id="errName"></span>
                </div>

                <!-- Category + Sub-type -->
                <div class="form-row">
                    <div class="form-group">
                        <label for="apCategory">Category <span class="req">*</span></label>
                        <select id="apCategory" name="category">
                            <option value="">— Select —</option>
                            <option value="transport">Transport</option>
                            <option value="emergency">Emergency</option>
                            <option value="facility">Facility</option>
                        </select>
                        <span class="form-error" id="errCategory"></span>
                    </div>
                    <div class="form-group">
                        <label for="apSubType">Sub-type <span class="req">*</span></label>
                        <select id="apSubType" name="sub_type" disabled>
                            <option value="">— Select category first —</option>
                        </select>
                        <span class="form-error" id="errSubType"></span>
                    </div>
                </div>

                <!-- Address -->
                <div class="form-group">
                    <label for="apAddress">Address</label>
                    <input type="text" id="apAddress" name="address" placeholder="e.g. Brgy. San Roque, Iriga City">
                </div>

                <!-- Description -->
                <div class="form-group">
                    <label for="apDescription">Description <span class="form-hint">(Optional)</span></label>
                    <textarea id="apDescription" name="description" rows="3" placeholder="Brief description of this access point…"></textarea>
                </div>

                <!-- Status -->
                <div class="form-group">
                    <label for="apStatus">Status <span class="req">*</span></label>
                    <select id="apStatus" name="status">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                <!-- Coordinates (read-only display) -->
                <div class="form-row">
                    <div class="form-group">
                        <label>Latitude</label>
                        <input type="text" id="apLatDisplay" readonly class="input-readonly" placeholder="Set by map pin">
                    </div>
                    <div class="form-group">
                        <label>Longitude</label>
                        <input type="text" id="apLngDisplay" readonly class="input-readonly" placeholder="Set by map pin">
                    </div>
                </div>

                <!-- Photo -->
                <div class="form-group">
                    <label>Photo <span class="form-hint">(Optional · Max 5 MB · JPG/PNG/WebP)</span></label>
                    <div class="ap-photo-wrap" id="photoWrap">
                        <div class="ap-photo-existing" id="photoExisting" style="display:none;">
                            <img id="photoExistingImg" src="" alt="Current photo">
                            <button type="button" class="ap-photo-remove" id="removePhotoBtn">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                        <label class="ap-photo-drop" id="photoDrop" for="apPhoto">
                            <i data-lucide="image-plus"></i>
                            <span>Click or drag to upload</span>
                        </label>
                        <input type="file" id="apPhoto" name="photo" accept="image/*" style="display:none;">
                        <div class="ap-photo-preview" id="photoPreviewNew" style="display:none;">
                            <img id="photoPreviewImg" src="" alt="Preview">
                            <button type="button" class="ap-photo-remove" id="removeNewPhotoBtn">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                    </div>
                    <span class="form-error" id="errPhoto"></span>
                </div>

            </div><!-- .modal-body -->

            <div class="modal-footer">
                <button type="button" class="btn btn-outline" id="apModalCancel">Cancel</button>
                <button type="submit" class="btn btn-primary" id="apSubmitBtn">
                    <i data-lucide="save"></i>
                    <span id="apSubmitText">Add Access Point</span>
                </button>
            </div>

        </form>
    </div>
</div>

<!-- ══ DELETE CONFIRM MODAL ══════════════════════════════════ -->
<div class="modal-backdrop" id="deleteModal" role="dialog" aria-modal="true">
    <div class="modal modal-sm">
        <div class="modal-header">
            <h3><i data-lucide="trash-2"></i> Delete Access Point</h3>
            <button class="modal-close" id="deleteModalClose"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
            <div class="logout-modal-body">
                <div class="logout-modal-icon">
                    <i data-lucide="trash-2"></i>
                </div>
                <p>Delete <strong id="deleteItemName">this access point</strong>?</p>
                <span>This action cannot be undone. The marker will be removed from the map.</span>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="deleteCancelBtn">Cancel</button>
            <button type="button" class="btn btn-danger-solid" id="deleteConfirmBtn">
                <i data-lucide="trash-2"></i> Delete
            </button>
        </div>
    </div>
</div>

<?php require_once '../includes/partials/footer.php'; ?>