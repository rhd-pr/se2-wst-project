document.addEventListener('DOMContentLoaded', function() {

    // ── Map mode ─────────────────────────────────────────────────
    var MODE_IDLE      = 'idle';
    var MODE_DRAWING   = 'drawing';
    var MODE_ZONE_EDIT = 'zone_edit';
    var mapMode        = MODE_IDLE;

    // ── State ────────────────────────────────────────────────────
    var allZones        = [];
    var editingId       = null;       // details modal
    var zoneEditingId   = null;       // map geometry edit
    var resolveTargetId = null;
    var deleteTargetId  = null;
    var allCircles      = {};         // zone_id → L.circle
    var clearPhotoFlag  = false;
    var filters         = { type: '', status: '', search: '' };

    // Draw state (MODE_DRAWING)
    var drawActive      = false;      // mousedown is held
    var drawCenter      = null;
    var drawCircle      = null;
    var drawRadius      = 0;
    var pendingCenter   = null;
    var pendingRadius   = null;

    // Zone-edit state (MODE_ZONE_EDIT)
    var zeCircle        = null;       // the editable L.circle (clone of permanent one)
    var zeCenterMarker  = null;       // draggable center
    var zeEdgeMarker    = null;       // draggable radius handle
    var zeCenter        = null;       // [lat, lng]
    var zeRadius        = 0;          // metres
    var zeSaving        = false;

    var SEVERITY_COLORS = {
        low:      '#F1C40F',
        moderate: '#E67E22',
        high:     '#E74C3C',
        critical: '#7B0000'
    };

    // ── DOM refs ─────────────────────────────────────────────────
    var raTableBody          = document.getElementById('raTableBody');
    var raCountBadge         = document.getElementById('raCountBadge');
    var raSearchInput        = document.getElementById('raSearchInput');
    var raMapTitle           = document.getElementById('raMapTitle');
    var raMapHint            = document.getElementById('raMapHint');
    var raStartDrawBtn       = document.getElementById('raStartDrawBtn');
    var raCancelDrawBtn      = document.getElementById('raCancelDrawBtn');
    var raSaveZoneBtn        = document.getElementById('raSaveZoneBtn');
    var raCancelZoneEditBtn  = document.getElementById('raCancelZoneEditBtn');
    var raDoneZoneEditBtn    = document.getElementById('raDoneZoneEditBtn');
    var raDrawStatus         = document.getElementById('raDrawStatus');
    var raDrawStatusText     = document.getElementById('raDrawStatusText');
    var raRadiusBadge        = document.getElementById('raRadiusBadge');
    var raModal              = document.getElementById('raModal');
    var raModalClose         = document.getElementById('raModalClose');
    var raModalCancel        = document.getElementById('raModalCancel');
    var raModalTitleText     = document.getElementById('raModalTitleText');
    var raForm               = document.getElementById('raForm');
    var raId                 = document.getElementById('raId');
    var raLat                = document.getElementById('raLat');
    var raLng                = document.getElementById('raLng');
    var raRadiusInput        = document.getElementById('raRadius');
    var raName               = document.getElementById('raName');
    var raType               = document.getElementById('raType');
    var raSeverity           = document.getElementById('raSeverity');
    var raDescription        = document.getElementById('raDescription');
    var raLocationText       = document.getElementById('raLocationText');
    var raRadiusText         = document.getElementById('raRadiusText');
    var raLocationRow        = document.getElementById('raLocationRow');
    var raSubmitBtn          = document.getElementById('raSubmitBtn');
    var raSubmitLabel        = document.getElementById('raSubmitLabel');
    var raPhoto              = document.getElementById('raPhoto');
    var raPhotoDrop          = document.getElementById('raPhotoDrop');
    var raPhotoExisting      = document.getElementById('raPhotoExisting');
    var raPhotoExistingImg   = document.getElementById('raPhotoExistingImg');
    var raRemovePhotoBtn     = document.getElementById('raRemovePhotoBtn');
    var raPhotoPreviewNew    = document.getElementById('raPhotoPreviewNew');
    var raPhotoPreviewImg    = document.getElementById('raPhotoPreviewImg');
    var raRemoveNewPhotoBtn  = document.getElementById('raRemoveNewPhotoBtn');
    var raResolveModal       = document.getElementById('raResolveModal');
    var raResolveClose       = document.getElementById('raResolveClose');
    var raResolveCancel      = document.getElementById('raResolveCancel');
    var raResolveConfirm     = document.getElementById('raResolveConfirm');
    var raResolveName        = document.getElementById('raResolveName');
    var raDeleteModal        = document.getElementById('raDeleteModal');
    var raDeleteClose        = document.getElementById('raDeleteClose');
    var raDeleteCancel       = document.getElementById('raDeleteCancel');
    var raDeleteConfirm      = document.getElementById('raDeleteConfirm');
    var raDeleteName         = document.getElementById('raDeleteName');

    // Guard
    var required = {
        raTableBody:raTableBody, raCountBadge:raCountBadge, raSearchInput:raSearchInput,
        raMapTitle:raMapTitle, raMapHint:raMapHint,
        raStartDrawBtn:raStartDrawBtn, raCancelDrawBtn:raCancelDrawBtn,
        raSaveZoneBtn:raSaveZoneBtn, raCancelZoneEditBtn:raCancelZoneEditBtn,
        raDoneZoneEditBtn:raDoneZoneEditBtn,
        raDrawStatus:raDrawStatus, raDrawStatusText:raDrawStatusText, raRadiusBadge:raRadiusBadge,
        raModal:raModal, raModalClose:raModalClose, raModalCancel:raModalCancel,
        raModalTitleText:raModalTitleText, raForm:raForm,
        raId:raId, raLat:raLat, raLng:raLng, raRadiusInput:raRadiusInput,
        raName:raName, raType:raType, raSeverity:raSeverity, raDescription:raDescription,
        raLocationText:raLocationText, raRadiusText:raRadiusText, raLocationRow:raLocationRow,
        raSubmitBtn:raSubmitBtn, raSubmitLabel:raSubmitLabel,
        raPhoto:raPhoto, raPhotoDrop:raPhotoDrop,
        raPhotoExisting:raPhotoExisting, raPhotoExistingImg:raPhotoExistingImg,
        raRemovePhotoBtn:raRemovePhotoBtn, raPhotoPreviewNew:raPhotoPreviewNew,
        raPhotoPreviewImg:raPhotoPreviewImg, raRemoveNewPhotoBtn:raRemoveNewPhotoBtn,
        raResolveModal:raResolveModal, raResolveClose:raResolveClose,
        raResolveCancel:raResolveCancel, raResolveConfirm:raResolveConfirm, raResolveName:raResolveName,
        raDeleteModal:raDeleteModal, raDeleteClose:raDeleteClose,
        raDeleteCancel:raDeleteCancel, raDeleteConfirm:raDeleteConfirm, raDeleteName:raDeleteName
    };
    var missing = [];
    for (var k in required) { if (!required[k]) missing.push(k); }
    if (missing.length) { console.error('[risk-areas.js] Missing elements:', missing.join(', ')); return; }

    // ── Leaflet map ──────────────────────────────────────────────
    var map = L.map('raMap', { center: [13.1800, 123.5950], zoom: 13, zoomControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
    }).addTo(map);

    // ── Load all zones ───────────────────────────────────────────
    function loadAll() {
        fetch('../api/risk-areas.php?all=1')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.success) throw new Error(data.message);
                allZones = data.zones;
                allZones.forEach(drawZoneOnMap);
                renderTable();
            })
            .catch(function() {
                raTableBody.innerHTML = '<tr><td colspan="7"><div class="table-empty">Failed to load risk areas.</div></td></tr>';
            });
    }

    // ── Permanent circles ────────────────────────────────────────
    function drawZoneOnMap(zone) {
        if (allCircles[zone.zone_id]) allCircles[zone.zone_id].remove();
        if (zone.status === 'resolved') return;

        var color = SEVERITY_COLORS[zone.severity] || '#E74C3C';
        var circle = L.circle(
            [parseFloat(zone.latitude), parseFloat(zone.longitude)],
            { radius: parseFloat(zone.radius_meters), color: color, weight: 2, opacity: 0.9, fillColor: color, fillOpacity: 0.18 }
        );
        circle.bindTooltip(zone.zone_name + ' (' + typeLabel(zone.zone_type) + ' · ' + cap(zone.severity) + ')', { sticky: true });
        circle.on('click', (function(id) { return function() { openEditDetailsModal(id); }; })(zone.zone_id));
        circle.addTo(map);
        allCircles[zone.zone_id] = circle;
    }

    function removeZoneFromMap(id) {
        if (allCircles[id]) { allCircles[id].remove(); delete allCircles[id]; }
    }

    function highlightCircle(id) {
        var c = allCircles[id]; if (!c) return;
        c.setStyle({ weight: 4, fillOpacity: 0.35 });
        map.flyTo(c.getLatLng(), Math.max(map.getZoom(), 14), { duration: 0.6 });
        setTimeout(function() { if (allCircles[id]) allCircles[id].setStyle({ weight: 2, fillOpacity: 0.18 }); }, 2500);
    }

    // ── Render table ─────────────────────────────────────────────
    function renderTable() {
        var rows = allZones.filter(function(z) {
            if (filters.type   && z.zone_type !== filters.type)   return false;
            if (filters.status && z.status    !== filters.status) return false;
            if (filters.search && z.zone_name.toLowerCase().indexOf(filters.search.toLowerCase()) === -1) return false;
            return true;
        });

        raCountBadge.textContent = rows.length + ' record' + (rows.length !== 1 ? 's' : '');

        if (!rows.length) {
            raTableBody.innerHTML = '<tr><td colspan="7"><div class="table-empty"><i data-lucide="search-x"></i> No risk areas found.</div></td></tr>';
            lucide.createIcons(); return;
        }

        raTableBody.innerHTML = rows.map(function(z) {
            var isResolved = z.status === 'resolved';
            var rowClass   = isResolved ? ' class="ra-row-resolved"' : '';
            var reported   = z.reported_at ? z.reported_at.substring(0, 10) : '\u2014';

            // Edit zone on map: disabled for resolved zones (no circle on map)
            var editZoneBtn = isResolved
                ? '<button class="btn btn-icon btn-sm" disabled title="Resolved — no map circle" style="opacity:.3"><i data-lucide="move"></i></button>'
                : '<button class="btn btn-icon btn-sm ra-btn-move" data-action="edit-zone" data-id="' + z.zone_id + '" title="Edit Zone on Map"><i data-lucide="move"></i></button>';

            var resolveBtn = isResolved
                ? '<button class="btn btn-icon btn-sm" disabled title="Already resolved" style="opacity:.3"><i data-lucide="circle-check"></i></button>'
                : '<button class="btn btn-icon btn-sm btn-resolve" data-action="resolve" data-id="' + z.zone_id + '" title="Resolve"><i data-lucide="circle-check"></i></button>';

            return '<tr data-id="' + z.zone_id + '"' + rowClass + '>'
                + '<td><strong>' + esc(z.zone_name) + '</strong></td>'
                + '<td><span class="badge badge-' + z.zone_type + '">' + typeLabel(z.zone_type) + '</span></td>'
                + '<td><span class="badge badge-' + z.severity + '">' + cap(z.severity) + '</span></td>'
                + '<td style="font-size:.825rem;color:var(--clr-text-muted)">' + Math.round(z.radius_meters) + ' m</td>'
                + '<td><span class="badge badge-' + z.status + '">' + cap(z.status) + '</span></td>'
                + '<td style="font-size:.8rem;color:var(--clr-text-muted)">' + reported + '</td>'
                + '<td><div class="table-actions">'
                + '<button class="btn btn-icon btn-sm" data-action="edit-details" data-id="' + z.zone_id + '" title="Edit Details"><i data-lucide="pencil"></i></button>'
                + editZoneBtn
                + resolveBtn
                + '<button class="btn btn-icon btn-sm btn-danger" data-action="delete" data-id="' + z.zone_id + '" title="Delete"><i data-lucide="trash-2"></i></button>'
                + '</div></td></tr>';
        }).join('');

        lucide.createIcons();
    }

    // ── Table delegation ─────────────────────────────────────────
    raTableBody.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-action]'); if (!btn) return;
        var id  = parseInt(btn.dataset.id, 10);
        if (btn.dataset.action === 'edit-details') openEditDetailsModal(id);
        if (btn.dataset.action === 'edit-zone')    startZoneEdit(id);
        if (btn.dataset.action === 'resolve')      openResolveModal(id);
        if (btn.dataset.action === 'delete')       openDeleteModal(id);
    });

    // ── Filters ──────────────────────────────────────────────────
    document.getElementById('raFilterType').addEventListener('click', function(e) {
        var btn = e.target.closest('.ra-filter-btn'); if (!btn) return;
        document.querySelectorAll('#raFilterType .ra-filter-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active'); filters.type = btn.dataset.value; renderTable();
    });
    document.getElementById('raFilterStatus').addEventListener('click', function(e) {
        var btn = e.target.closest('.ra-filter-btn'); if (!btn) return;
        document.querySelectorAll('#raFilterStatus .ra-filter-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active'); filters.status = btn.dataset.value; renderTable();
    });
    var searchTimer;
    raSearchInput.addEventListener('input', function() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function() { filters.search = raSearchInput.value.trim(); renderTable(); }, 250);
    });

    // ════════════════════════════════════════════════════════════
    // MODE: DRAWING
    // Activated by "Draw Zone" button. Mousedown+drag draws circle.
    // Pan is re-enabled as soon as user exits draw mode.
    // ════════════════════════════════════════════════════════════

    raStartDrawBtn.addEventListener('click', function() {
        if (mapMode !== MODE_IDLE) return;
        enterDrawMode();
    });

    function enterDrawMode() {
        mapMode = MODE_DRAWING;
        map.getContainer().style.cursor = 'crosshair';

        raStartDrawBtn.style.display      = 'none';
        raCancelDrawBtn.style.display     = 'inline-flex';
        raSaveZoneBtn.style.display       = 'none';
        raCancelZoneEditBtn.style.display = 'none';
        raDoneZoneEditBtn.style.display   = 'none';

        raDrawStatus.style.display    = 'flex';
        raDrawStatusText.textContent  = 'Click and drag on the map to draw a circle. Release to confirm.';
        raDrawStatus.classList.remove('warning');

        raMapTitle.textContent = 'Drawing New Zone';
        raMapHint.textContent  = '';
        lucide.createIcons();
    }

    function exitDrawMode(keepCircle) {
        mapMode = MODE_IDLE;
        drawActive = false;
        map.dragging.enable();
        map.getContainer().style.cursor = '';

        if (!keepCircle) {
            if (drawCircle) { drawCircle.remove(); drawCircle = null; }
            drawCenter = null; drawRadius = 0; pendingCenter = null; pendingRadius = null;
        }

        raStartDrawBtn.style.display  = 'inline-flex';
        raCancelDrawBtn.style.display = 'none';
        raSaveZoneBtn.style.display   = 'none';
        raRadiusBadge.style.display   = 'none';
        raDrawStatus.style.display    = 'none';
        resetMapHeader();
        lucide.createIcons();
    }

    raCancelDrawBtn.addEventListener('click', function() { exitDrawMode(false); });

    raSaveZoneBtn.addEventListener('click', function() {
        if (!pendingCenter || !pendingRadius) return;
        openAddModal();
    });

    // Draw: mousedown → mousemove → mouseup
    map.on('mousedown', function(e) {
        if (mapMode !== MODE_DRAWING) return;
        drawActive  = true;
        drawCenter  = [e.latlng.lat, e.latlng.lng];
        drawRadius  = 0;

        map.dragging.disable();
        if (drawCircle) { drawCircle.remove(); drawCircle = null; }
        pendingCenter = null; pendingRadius = null;
        raSaveZoneBtn.style.display = 'none';

        drawCircle = L.circle(drawCenter, {
            radius: 1, color: '#E74C3C', weight: 2, opacity: 0.85,
            fillColor: '#E74C3C', fillOpacity: 0.18, dashArray: '6 4'
        }).addTo(map);

        raDrawStatusText.textContent = 'Drag to set the size of the zone. Release to confirm.';
        raDrawStatus.classList.remove('warning');
        raRadiusBadge.style.display  = 'none';
        L.DomEvent.stop(e);
    });

    map.on('mousemove', function(e) {
        if (mapMode !== MODE_DRAWING || !drawActive || !drawCircle) return;
        drawRadius = L.latLng(drawCenter[0], drawCenter[1]).distanceTo(e.latlng);
        if (drawRadius < 1) drawRadius = 1;
        drawCircle.setRadius(drawRadius);
        raRadiusBadge.style.display = 'block';
        raRadiusBadge.textContent   = formatRadius(drawRadius);
    });

    document.addEventListener('mouseup', function() {
        if (mapMode !== MODE_DRAWING || !drawActive) return;
        drawActive = false;
        map.dragging.enable();

        if (drawRadius < 50) {
            if (drawCircle) { drawCircle.remove(); drawCircle = null; }
            raDrawStatusText.textContent = 'Circle too small — drag further to create a valid zone.';
            raDrawStatus.classList.add('warning');
            raRadiusBadge.style.display  = 'none';
            return;
        }

        drawCircle.setStyle({ dashArray: null, opacity: 0.9 });
        pendingCenter = drawCenter;
        pendingRadius = Math.round(drawRadius);

        raSaveZoneBtn.style.display   = 'inline-flex';
        raRadiusBadge.style.display   = 'none';
        raDrawStatusText.textContent  = 'Circle drawn \u2014 ' + formatRadius(pendingRadius) + '. Click \u201cSave Zone\u201d to add details.';
        raDrawStatus.classList.remove('warning');
    });

    // ════════════════════════════════════════════════════════════
    // MODE: ZONE_EDIT
    // Draggable center marker + draggable edge handle to resize.
    // Permanent circle is hidden; a working copy is shown instead.
    // "Done Editing" saves geometry to server.
    // ════════════════════════════════════════════════════════════

    function startZoneEdit(id) {
        var zone = findZone(id); if (!zone) return;

        // If already editing something else, cancel it first
        if (mapMode === MODE_ZONE_EDIT) stopZoneEdit(false);
        if (mapMode === MODE_DRAWING)   exitDrawMode(false);

        mapMode       = MODE_ZONE_EDIT;
        zoneEditingId = id;
        zeCenter      = [parseFloat(zone.latitude), parseFloat(zone.longitude)];
        zeRadius      = parseFloat(zone.radius_meters);

        // Dim the permanent circle
        if (allCircles[id]) allCircles[id].setStyle({ opacity: 0.15, fillOpacity: 0.05 });

        // Create editable working copy
        var color = SEVERITY_COLORS[zone.severity] || '#E74C3C';
        zeCircle = L.circle(zeCenter, {
            radius: zeRadius, color: color, weight: 2.5, opacity: 0.95,
            fillColor: color, fillOpacity: 0.22, dashArray: '6 3'
        }).addTo(map);

        buildZoneEditHandles();
        map.flyTo(zeCircle.getLatLng(), Math.max(map.getZoom(), 14), { duration: 0.5 });

        // Toolbar
        raStartDrawBtn.style.display      = 'none';
        raCancelDrawBtn.style.display     = 'none';
        raSaveZoneBtn.style.display       = 'none';
        raCancelZoneEditBtn.style.display = 'inline-flex';
        raDoneZoneEditBtn.style.display   = 'inline-flex';

        raDrawStatus.style.display   = 'flex';
        raDrawStatusText.textContent = 'Drag the center marker to move the zone. Drag the edge marker to resize it.';
        raDrawStatus.classList.remove('warning');

        raMapTitle.textContent = 'Editing Zone \u2014 ' + esc(zone.zone_name);
        raMapHint.textContent  = 'Move or resize. Click \u201cDone Editing\u201d to save changes.';
        lucide.createIcons();
    }

    function buildZoneEditHandles() {
        if (zeCenterMarker) { zeCenterMarker.remove(); zeCenterMarker = null; }
        if (zeEdgeMarker)   { zeEdgeMarker.remove();   zeEdgeMarker   = null; }

        // ── Center marker (crosshair icon)
        var centerIcon = L.divIcon({
            className: '',
            html: '<div class="ze-handle ze-center"></div>',
            iconSize: [18, 18], iconAnchor: [9, 9]
        });
        zeCenterMarker = L.marker(zeCenter, { icon: centerIcon, draggable: true, zIndexOffset: 300 });
        zeCenterMarker.on('drag', function(e) {
            zeCenter = [e.target.getLatLng().lat, e.target.getLatLng().lng];
            zeCircle.setLatLng(zeCenter);
            updateEdgeMarkerPosition();
        });
        zeCenterMarker.addTo(map);

        // ── Edge marker (radius handle — placed due East of center)
        updateEdgeMarkerPosition();
    }

    function updateEdgeMarkerPosition() {
        // Place edge handle due East of center at current zeRadius
        var edgeLatlng = L.latLng(zeCenter[0], zeCenter[1])
            .toBounds(zeRadius * 2)   // bounds with full diameter
            .getEast
            ? getEastPoint(zeCenter, zeRadius)
            : getEastPoint(zeCenter, zeRadius);

        if (zeEdgeMarker) {
            zeEdgeMarker.setLatLng(edgeLatlng);
            return;
        }

        var edgeIcon = L.divIcon({
            className: '',
            html: '<div class="ze-handle ze-edge"></div>',
            iconSize: [14, 14], iconAnchor: [7, 7]
        });
        zeEdgeMarker = L.marker(edgeLatlng, { icon: edgeIcon, draggable: true, zIndexOffset: 300 });
        zeEdgeMarker.on('drag', function(e) {
            var center = L.latLng(zeCenter[0], zeCenter[1]);
            zeRadius   = center.distanceTo(e.target.getLatLng());
            if (zeRadius < 50) zeRadius = 50;
            zeCircle.setRadius(zeRadius);
            // Keep edge marker on circle boundary
            e.target.setLatLng(getEastPoint(zeCenter, zeRadius));
            // Update status text with live radius
            raDrawStatusText.textContent = 'Radius: ' + formatRadius(zeRadius) + '  \u2014  Drag the center marker to move.';
        });
        zeEdgeMarker.addTo(map);
    }

    // Returns the latlng point due East from center at distance r metres
    function getEastPoint(center, r) {
        var lat  = center[0];
        var lng  = center[1];
        var dLng = (r / 1000) / (111.320 * Math.cos(lat * Math.PI / 180));
        return L.latLng(lat, lng + dLng);
    }

    function stopZoneEdit(restoreOpacity) {
        if (zeCircle)        { zeCircle.remove();        zeCircle        = null; }
        if (zeCenterMarker)  { zeCenterMarker.remove();  zeCenterMarker  = null; }
        if (zeEdgeMarker)    { zeEdgeMarker.remove();    zeEdgeMarker    = null; }

        if (restoreOpacity !== false && zoneEditingId && allCircles[zoneEditingId]) {
            allCircles[zoneEditingId].setStyle({ opacity: 0.9, fillOpacity: 0.18 });
        }

        zoneEditingId = null; zeCenter = null; zeRadius = 0; zeSaving = false;
        mapMode       = MODE_IDLE;

        raStartDrawBtn.style.display      = 'inline-flex';
        raCancelZoneEditBtn.style.display = 'none';
        raDoneZoneEditBtn.style.display   = 'none';
        raDrawStatus.style.display        = 'none';
        resetMapHeader();
        lucide.createIcons();
    }

    raCancelZoneEditBtn.addEventListener('click', function() {
        stopZoneEdit(true);
    });

    raDoneZoneEditBtn.addEventListener('click', function() {
        if (zeSaving) return;
        if (!zoneEditingId || !zeCenter || zeRadius < 50) {
            showToast('Invalid zone geometry.', 'error'); return;
        }

        var savingId = zoneEditingId;
        var zone = findZone(savingId); if (!zone) return;

        zeSaving = true;
        raDoneZoneEditBtn.disabled  = true;
        raDoneZoneEditBtn.innerHTML = '<svg style="animation:ra-spin .7s linear infinite;width:13px;height:13px;vertical-align:middle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg> Saving\u2026';

        var payload = {
            zone_id:        savingId,
            zone_name:      zone.zone_name,
            zone_type:      zone.zone_type,
            severity:       zone.severity,
            latitude:       zeCenter[0],
            longitude:      zeCenter[1],
            radius_meters:  Math.round(zeRadius),
            description:    zone.description || '',
            status:         zone.status,
            photo_url:      zone.photo_url || null
        };

        fetch('../api/risk-areas.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (!data.success) throw new Error(data.message);
            for (var i = 0; i < allZones.length; i++) {
                if (allZones[i].zone_id === savingId) { allZones[i] = data.zone; break; }
            }
            removeZoneFromMap(savingId);
            stopZoneEdit(false);
            drawZoneOnMap(data.zone);
            renderTable();
            showToast('Zone location updated.', 'success');
        })
        .catch(function(err) {
            showToast(err.message || 'Failed to save zone.', 'error');
            if (allCircles[savingId]) allCircles[savingId].setStyle({ opacity: 0.9, fillOpacity: 0.18 });
        })
        .finally(function() {
            zeSaving = false;
            raDoneZoneEditBtn.disabled  = false;
            raDoneZoneEditBtn.innerHTML = '<i data-lucide="check"></i> Done Editing';
            lucide.createIcons();
        });
    });

    // ════════════════════════════════════════════════════════════
    // MODALS: Add / Edit Details
    // ════════════════════════════════════════════════════════════

    function openAddModal() {
        editingId = null;
        raModalTitleText.textContent = 'Report Risk Area';
        raSubmitLabel.textContent    = 'Report Zone';
        raSubmitBtn.dataset.label    = 'Report Zone';

        raForm.reset();
        raLat.value         = pendingCenter[0];
        raLng.value         = pendingCenter[1];
        raRadiusInput.value = pendingRadius;

        clearPhotoFlag = false;
        resetPhotoUI();
        updateLocationDisplay(pendingCenter[0], pendingCenter[1], pendingRadius);
        clearErrors();

        raModal.classList.add('active');
        lucide.createIcons();
        setTimeout(function() { raName.focus(); }, 50);
    }

    function openEditDetailsModal(id) {
        var zone = findZone(id); if (!zone) return;

        editingId = id;
        raModalTitleText.textContent = 'Edit Zone Details';
        raSubmitLabel.textContent    = 'Save Changes';
        raSubmitBtn.dataset.label    = 'Save Changes';

        raId.value          = zone.zone_id;
        raLat.value         = zone.latitude;
        raLng.value         = zone.longitude;
        raRadiusInput.value = zone.radius_meters;

        raName.value        = zone.zone_name;
        raType.value        = zone.zone_type;
        raSeverity.value    = zone.severity;
        raDescription.value = zone.description || '';

        updateLocationDisplay(zone.latitude, zone.longitude, zone.radius_meters);
        clearPhotoFlag = false;
        resetPhotoUI();

        if (zone.photo_url) {
            raPhotoExistingImg.src        = '../' + zone.photo_url;
            raPhotoExisting.style.display = 'block';
            raPhotoDrop.style.display     = 'none';
        }

        clearErrors();
        highlightCircle(id);

        raModal.classList.add('active');
        lucide.createIcons();
        setTimeout(function() { raName.focus(); }, 50);
    }

    function openResolveModal(id) {
        var zone = findZone(id); if (!zone) return;
        resolveTargetId = id;
        raResolveName.textContent = zone.zone_name;
        raResolveModal.classList.add('active');
        lucide.createIcons();
    }

    function openDeleteModal(id) {
        var zone = findZone(id); if (!zone) return;
        deleteTargetId = id;
        raDeleteName.textContent = zone.zone_name;
        raDeleteModal.classList.add('active');
        lucide.createIcons();
    }

    // ── Location display
    function updateLocationDisplay(lat, lng, radius) {
        raLocationText.textContent = parseFloat(lat).toFixed(5) + ', ' + parseFloat(lng).toFixed(5);
        raRadiusText.textContent   = formatRadius(radius);
        raLocationRow.querySelectorAll('.ra-location-info').forEach(function(el) { el.classList.add('has-location'); });
    }

    // ── Photo UI
    function resetPhotoUI() {
        raPhotoExisting.style.display   = 'none';
        raPhotoPreviewNew.style.display = 'none';
        raPhotoDrop.style.display       = 'flex';
        raPhotoExistingImg.src          = '';
        raPhotoPreviewImg.src           = '';
        raPhoto.value                   = '';
        clearPhotoFlag                  = false;
    }

    raPhoto.addEventListener('change', function() {
        if (!this.files || !this.files[0]) return;
        var reader = new FileReader();
        reader.onload = function(e) {
            raPhotoPreviewImg.src           = e.target.result;
            raPhotoPreviewNew.style.display = 'block';
            raPhotoDrop.style.display       = 'none';
            raPhotoExisting.style.display   = 'none';
        };
        reader.readAsDataURL(this.files[0]);
    });

    raPhotoDrop.addEventListener('dragover',  function(e) { e.preventDefault(); this.classList.add('drag-over'); });
    raPhotoDrop.addEventListener('dragleave', function()  { this.classList.remove('drag-over'); });
    raPhotoDrop.addEventListener('drop', function(e) {
        e.preventDefault(); this.classList.remove('drag-over');
        var file = e.dataTransfer.files[0]; if (!file) return;
        var dt = new DataTransfer(); dt.items.add(file); raPhoto.files = dt.files;
        raPhoto.dispatchEvent(new Event('change'));
    });

    raRemovePhotoBtn.addEventListener('click', function() {
        raPhotoExisting.style.display = 'none';
        raPhotoDrop.style.display     = 'flex';
        clearPhotoFlag = true;
        lucide.createIcons();
    });

    raRemoveNewPhotoBtn.addEventListener('click', function() {
        raPhotoPreviewNew.style.display = 'none';
        raPhotoDrop.style.display       = 'flex';
        raPhoto.value                   = '';
        lucide.createIcons();
    });

    // ── Form submit
    raForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!validateForm()) return;

        var isEdit = editingId !== null;
        setLoading(true);

        var fd = new FormData(raForm);
        if (isEdit) { fd.append('_method', 'PUT'); fd.append('zone_id', editingId); }
        if (clearPhotoFlag) fd.append('clear_photo', '1');
        if (!raPhoto.files || !raPhoto.files.length) fd.delete('photo');

        fetch('../api/risk-areas.php', { method: 'POST', body: fd })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.success) throw new Error(data.message);

                if (isEdit) {
                    for (var i = 0; i < allZones.length; i++) {
                        if (allZones[i].zone_id === editingId) { allZones[i] = data.zone; break; }
                    }
                    removeZoneFromMap(editingId);
                    drawZoneOnMap(data.zone);
                } else {
                    allZones.unshift(data.zone);
                    // Discard draw preview, draw permanent circle
                    if (drawCircle) { drawCircle.remove(); drawCircle = null; }
                    drawZoneOnMap(data.zone);
                    exitDrawMode(true); // exits draw mode, keepCircle=true (already removed above)
                }

                renderTable();
                closeRaModal();
                resetMapHeader();
                showToast(isEdit ? 'Risk area updated.' : 'Risk area reported.', 'success');
            })
            .catch(function(err) { showToast(err.message || 'An error occurred.', 'error'); })
            .finally(function() { setLoading(false); });
    });

    // ── Resolve confirm
    raResolveConfirm.addEventListener('click', function() {
        if (!resolveTargetId) return;
        raResolveConfirm.disabled = true;
        var targetId = resolveTargetId;
        fetch('../api/risk-areas.php?id=' + targetId, { method: 'PATCH' })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.success) throw new Error(data.message);
                for (var i = 0; i < allZones.length; i++) {
                    if (allZones[i].zone_id === targetId) { allZones[i] = data.zone; break; }
                }
                removeZoneFromMap(targetId);
                renderTable();
                closeResolveModal();
                showToast('Zone marked as resolved.', 'success');
            })
            .catch(function(err) { showToast(err.message || 'Failed to resolve.', 'error'); })
            .finally(function() { raResolveConfirm.disabled = false; });
    });

    // ── Delete confirm
    raDeleteConfirm.addEventListener('click', function() {
        if (!deleteTargetId) return;
        raDeleteConfirm.disabled = true;
        var targetId = deleteTargetId;
        fetch('../api/risk-areas.php?id=' + targetId, { method: 'DELETE' })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.success) throw new Error(data.message);
                allZones = allZones.filter(function(z) { return z.zone_id !== targetId; });
                removeZoneFromMap(targetId);
                renderTable();
                closeDeleteModal();
                showToast('Risk area deleted.', 'success');
            })
            .catch(function(err) { showToast(err.message || 'Failed to delete.', 'error'); })
            .finally(function() { raDeleteConfirm.disabled = false; });
    });

    // ── Validation
    function validateForm() {
        clearErrors(); var ok = true;
        if (!raName.value.trim()) { showError('raErrName',     'Zone name is required.');  ok = false; }
        if (!raType.value)        { showError('raErrType',     'Zone type is required.');  ok = false; }
        if (!raSeverity.value)    { showError('raErrSeverity', 'Severity is required.');   ok = false; }
        if (!raLat.value || !raLng.value) {
            showToast('Draw the zone on the map first.', 'error'); ok = false;
        }
        return ok;
    }
    function showError(id, msg) { var el = document.getElementById(id); if (el) el.textContent = msg; }
    function clearErrors() {
        ['raErrName','raErrType','raErrSeverity','raErrPhoto'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.textContent = '';
        });
    }

    function setLoading(on) {
        raSubmitBtn.disabled = on;
        if (on) {
            raSubmitBtn.innerHTML = '<svg style="animation:ra-spin .7s linear infinite;width:14px;height:14px;vertical-align:middle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg> Saving\u2026';
        } else {
            raSubmitBtn.innerHTML = '<i data-lucide="save"></i> <span id="raSubmitLabel">' + (raSubmitBtn.dataset.label || 'Save') + '</span>';
            raSubmitLabel = document.getElementById('raSubmitLabel');
            lucide.createIcons();
        }
    }

    // ── Close modals
    raModalClose.addEventListener('click',   closeRaModal);
    raModalCancel.addEventListener('click',  closeRaModal);
    raModal.addEventListener('click', function(e) { if (e.target === raModal) closeRaModal(); });

    raResolveClose.addEventListener('click',  closeResolveModal);
    raResolveCancel.addEventListener('click', closeResolveModal);
    raResolveModal.addEventListener('click', function(e) { if (e.target === raResolveModal) closeResolveModal(); });

    raDeleteClose.addEventListener('click',  closeDeleteModal);
    raDeleteCancel.addEventListener('click', closeDeleteModal);
    raDeleteModal.addEventListener('click', function(e) { if (e.target === raDeleteModal) closeDeleteModal(); });

    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Escape') return;
        if (raModal.classList.contains('active'))        closeRaModal();
        if (raResolveModal.classList.contains('active')) closeResolveModal();
        if (raDeleteModal.classList.contains('active'))  closeDeleteModal();
    });

    function closeRaModal() {
        raModal.classList.remove('active');
        editingId = null;
        resetPhotoUI();
        raLocationRow.querySelectorAll('.ra-location-info').forEach(function(el) { el.classList.remove('has-location'); });
        // If we came from add mode, leave draw mode clean
        if (mapMode === MODE_DRAWING && pendingCenter) {
            // Keep the drawn circle visible so user can re-save if they want
        }
        lucide.createIcons();
    }
    function closeResolveModal() { raResolveModal.classList.remove('active'); resolveTargetId = null; }
    function closeDeleteModal()  { raDeleteModal.classList.remove('active');  deleteTargetId  = null; }

    // ── Helpers
    function resetMapHeader() {
        raMapTitle.textContent = 'Map \u2014 Draw a Risk Zone';
        raMapHint.textContent  = 'Pan and zoom freely. Click \u201cDraw Zone\u201d to start placing a risk circle.';
    }

    function findZone(id) {
        for (var i = 0; i < allZones.length; i++) { if (allZones[i].zone_id === id) return allZones[i]; }
        return null;
    }

    function formatRadius(m) {
        m = Math.round(m);
        return m >= 1000 ? (m / 1000).toFixed(1) + ' km' : m + ' m';
    }

    function typeLabel(t) {
        var labels = { flood:'Flood', landslide:'Landslide', accident:'Accident', road_closure:'Road Closure', other:'Other' };
        return labels[t] || cap(t);
    }

    function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

    function showToast(msg, type) {
        type = type || 'success';
        var ex = document.getElementById('raToast'); if (ex) ex.remove();
        var t  = document.createElement('div');
        t.id   = 'raToast';
        t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:8px;font-size:.875rem;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:ra-toast .25s ease;background:' + (type === 'success' ? '#1A3A5C' : '#C0392B') + ';color:#fff;';
        t.innerHTML = '<i data-lucide="' + (type === 'success' ? 'check-circle' : 'alert-circle') + '" style="width:15px;height:15px;flex-shrink:0"></i> ' + msg;
        document.body.appendChild(t); lucide.createIcons();
        setTimeout(function() { t.style.transition='opacity .25s,transform .25s'; t.style.opacity='0'; t.style.transform='translateY(8px)'; setTimeout(function() { t.remove(); }, 260); }, 3000);
    }

    loadAll();
});