document.addEventListener('DOMContentLoaded', function() {

    // ── State
    var allRoutes       = [];
    var terminals       = [];
    var editingId       = null;
    var pathEditingId   = null;
    var deleteTargetId  = null;
    var drawnPoints     = [];
    var drawnLayer      = null;
    var allPolylines    = {};
    var isDrawing       = false;

    var pathEditPoints  = [];
    var pathEditLine    = null;
    var pathEditMarkers = [];
    var pathEditSaving  = false;

    var filters = { type: '', status: '', search: '' };
    var ROUTE_COLORS = { bus:'#1A6FA8', jeepney:'#C0392B', tricycle:'#2E8B57', mixed:'#8E44AD' };

    // ── DOM refs
    var rtTableBody      = document.getElementById('rtTableBody');
    var rtCountBadge     = document.getElementById('rtCountBadge');
    var rtSearchInput    = document.getElementById('rtSearchInput');
    var startDrawBtn     = document.getElementById('startDrawBtn');
    var cancelDrawBtn    = document.getElementById('cancelDrawBtn');
    var saveDrawBtn      = document.getElementById('saveDrawBtn');
    var exitPathEditBtn  = document.getElementById('exitPathEditBtn');
    var rtDrawStatus     = document.getElementById('rtDrawStatus');
    var rtDrawStatusText = document.getElementById('rtDrawStatusText');
    var rtMapTitle       = document.getElementById('rtMapTitle');
    var rtMapHint        = document.getElementById('rtMapHint');
    var rtModal          = document.getElementById('rtModal');
    var rtModalClose     = document.getElementById('rtModalClose');
    var rtModalCancel    = document.getElementById('rtModalCancel');
    var rtModalTitleText = document.getElementById('rtModalTitleText');
    var rtForm           = document.getElementById('rtForm');
    var rtName           = document.getElementById('rtName');
    var rtType           = document.getElementById('rtType');
    var rtStatus         = document.getElementById('rtStatus');
    var rtOrigin         = document.getElementById('rtOrigin');
    var rtDestination    = document.getElementById('rtDestination');
    var rtDescription    = document.getElementById('rtDescription');
    var rtPointsInfo     = document.getElementById('rtPointsInfo');
    var rtPointsCount    = document.getElementById('rtPointsCount');
    var rtSubmitBtn      = document.getElementById('rtSubmitBtn');
    var rtSubmitLabel    = document.getElementById('rtSubmitLabel');
    var rtDeleteModal    = document.getElementById('rtDeleteModal');
    var rtDeleteClose    = document.getElementById('rtDeleteClose');
    var rtDeleteCancel   = document.getElementById('rtDeleteCancel');
    var rtDeleteConfirm  = document.getElementById('rtDeleteConfirm');
    var rtDeleteName     = document.getElementById('rtDeleteName');

    // ── Guard
    var required = {
        rtTableBody:rtTableBody, rtCountBadge:rtCountBadge, rtSearchInput:rtSearchInput,
        startDrawBtn:startDrawBtn, cancelDrawBtn:cancelDrawBtn, saveDrawBtn:saveDrawBtn,
        exitPathEditBtn:exitPathEditBtn, rtDrawStatus:rtDrawStatus, rtDrawStatusText:rtDrawStatusText,
        rtMapTitle:rtMapTitle, rtMapHint:rtMapHint,
        rtModal:rtModal, rtModalClose:rtModalClose, rtModalCancel:rtModalCancel,
        rtModalTitleText:rtModalTitleText, rtForm:rtForm,
        rtName:rtName, rtType:rtType, rtStatus:rtStatus,
        rtOrigin:rtOrigin, rtDestination:rtDestination, rtDescription:rtDescription,
        rtPointsInfo:rtPointsInfo, rtPointsCount:rtPointsCount,
        rtSubmitBtn:rtSubmitBtn, rtSubmitLabel:rtSubmitLabel,
        rtDeleteModal:rtDeleteModal, rtDeleteClose:rtDeleteClose,
        rtDeleteCancel:rtDeleteCancel, rtDeleteConfirm:rtDeleteConfirm, rtDeleteName:rtDeleteName
    };
    var missing = [];
    for (var k in required) { if (!required[k]) missing.push(k); }
    if (missing.length) { console.error('[routes.js] Missing elements:', missing.join(', ')); return; }

    // ── Leaflet map
    var map = L.map('rtMap', { center: [13.1800, 123.5950], zoom: 13, zoomControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
    }).addTo(map);

    var drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    var drawControl = new L.Control.Draw({
        draw: {
            polyline: { shapeOptions: { color: '#1A6FA8', weight: 4, opacity: 0.85 }, showLength: false },
            polygon: false, rectangle: false, circle: false, circlemarker: false, marker: false
        },
        edit: { featureGroup: drawnItems, remove: false }
    });
    map.addControl(drawControl);

    var dlToolbar = document.querySelector('.leaflet-draw-toolbar');
    if (dlToolbar) dlToolbar.style.display = 'none';
    var dlActions = document.querySelector('.leaflet-draw-actions');
    if (dlActions) dlActions.style.display = 'none';

    var legend = L.control({ position: 'bottomleft' });
    legend.onAdd = function() {
        var div = L.DomUtil.create('div', 'rt-legend');
        div.innerHTML = '<div class="rt-legend-title">Route Types</div>'
            + '<div class="rt-legend-item"><div class="rt-legend-line" style="background:#1A6FA8"></div>Bus</div>'
            + '<div class="rt-legend-item"><div class="rt-legend-line" style="background:#C0392B"></div>Jeepney</div>'
            + '<div class="rt-legend-item"><div class="rt-legend-line" style="background:#2E8B57"></div>Tricycle</div>'
            + '<div class="rt-legend-item"><div class="rt-legend-line" style="background:#8E44AD"></div>Mixed</div>'
            + '<div class="rt-legend-item" style="margin-top:6px"><div class="rt-legend-line dashed" style="color:#999"></div>Suspended/Affected</div>';
        return div;
    };
    legend.addTo(map);

    // ── Load data
    function loadAll() {
        Promise.all([
            fetch('../api/routes.php').then(function(r) { return r.json(); }),
            fetch('../api/routes.php?terminals').then(function(r) { return r.json(); })
        ]).then(function(results) {
            var routeData = results[0], terminalData = results[1];
            if (!routeData.success) throw new Error(routeData.message);
            allRoutes = routeData.routes;
            allRoutes.forEach(drawRouteOnMap);
            renderTable();
            if (terminalData.success) { terminals = terminalData.terminals; populateTerminalDropdowns(); }
        }).catch(function(e) {
            rtTableBody.innerHTML = '<tr><td colspan="7"><div class="table-empty">Failed to load routes.</div></td></tr>';
        });
    }

    function populateTerminalDropdowns() {
        var opts = '<option value="">— None —</option>';
        terminals.forEach(function(t) { opts += '<option value="' + t.access_point_id + '">' + esc(t.name) + '</option>'; });
        rtOrigin.innerHTML = opts;
        rtDestination.innerHTML = opts;
    }

    // ── Draw routes on map
    function drawRouteOnMap(route) {
        if (!route.points || route.points.length < 2) return;
        if (allPolylines[route.route_id]) allPolylines[route.route_id].remove();
        var color = ROUTE_COLORS[route.route_type] || '#1A6FA8';
        var isDashed = (route.status === 'suspended' || route.status === 'affected');
        var latlngs = route.points.map(function(p) { return [parseFloat(p.latitude), parseFloat(p.longitude)]; });
        var opts = { color: color, weight: 4, opacity: 0.85 };
        if (isDashed) { opts.dashArray = '8, 8'; opts.opacity = 0.65; }
        var poly = L.polyline(latlngs, opts);
        poly.bindTooltip(route.route_name + ' (' + cap(route.route_type) + ')', { sticky: true });
        poly.on('click', (function(id) { return function() { openEditDetailsModal(id); }; })(route.route_id));
        poly.addTo(map);
        allPolylines[route.route_id] = poly;
    }

    function removeRouteFromMap(id) {
        if (allPolylines[id]) { allPolylines[id].remove(); delete allPolylines[id]; }
    }

    // ── Render table
    function renderTable() {
        var rows = allRoutes.filter(function(r) {
            if (filters.type   && r.route_type !== filters.type)   return false;
            if (filters.status && r.status     !== filters.status) return false;
            if (filters.search && r.route_name.toLowerCase().indexOf(filters.search.toLowerCase()) === -1) return false;
            return true;
        });
        rtCountBadge.textContent = rows.length + ' record' + (rows.length !== 1 ? 's' : '');
        if (!rows.length) {
            rtTableBody.innerHTML = '<tr><td colspan="7"><div class="table-empty"><i data-lucide="search-x"></i> No routes found.</div></td></tr>';
            lucide.createIcons(); return;
        }
        rtTableBody.innerHTML = rows.map(function(r) {
            var pts = (r.points && r.points.length) ? r.points.length : 0;
            return '<tr data-id="' + r.route_id + '">'
                + '<td><strong>' + esc(r.route_name) + '</strong></td>'
                + '<td><span class="badge badge-' + r.route_type + '">' + cap(r.route_type) + '</span></td>'
                + '<td style="font-size:.825rem;color:var(--clr-text-muted)">' + (r.origin_name ? esc(r.origin_name) : '&mdash;') + '</td>'
                + '<td style="font-size:.825rem;color:var(--clr-text-muted)">' + (r.destination_name ? esc(r.destination_name) : '&mdash;') + '</td>'
                + '<td><span class="badge badge-' + r.status + '">' + cap(r.status) + '</span></td>'
                + '<td style="font-size:.8rem;color:var(--clr-text-muted)">' + pts + ' pts</td>'
                + '<td><div class="table-actions">'
                + '<button class="btn btn-icon btn-sm" data-action="edit-details" data-id="' + r.route_id + '" title="Edit Details"><i data-lucide="pencil"></i></button>'
                + '<button class="btn btn-icon btn-sm rt-btn-path" data-action="edit-path" data-id="' + r.route_id + '" title="Edit Path"><i data-lucide="route"></i></button>'
                + '<button class="btn btn-icon btn-sm btn-danger" data-action="delete" data-id="' + r.route_id + '" title="Delete"><i data-lucide="trash-2"></i></button>'
                + '</div></td></tr>';
        }).join('');
        lucide.createIcons();
    }

    // ── Table delegation
    rtTableBody.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var id = parseInt(btn.dataset.id, 10);
        if (btn.dataset.action === 'edit-details') openEditDetailsModal(id);
        if (btn.dataset.action === 'edit-path')    openPathEdit(id);
        if (btn.dataset.action === 'delete')       openDeleteModal(id);
    });

    // ── Filters
    document.getElementById('filterType').addEventListener('click', function(e) {
        var btn = e.target.closest('.rt-filter-btn'); if (!btn) return;
        document.querySelectorAll('#filterType .rt-filter-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active'); filters.type = btn.dataset.value; renderTable();
    });
    document.getElementById('filterStatus').addEventListener('click', function(e) {
        var btn = e.target.closest('.rt-filter-btn'); if (!btn) return;
        document.querySelectorAll('#filterStatus .rt-filter-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active'); filters.status = btn.dataset.value; renderTable();
    });
    var searchTimer;
    rtSearchInput.addEventListener('input', function() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function() { filters.search = rtSearchInput.value.trim(); renderTable(); }, 250);
    });

    // ── New-route drawing
    startDrawBtn.addEventListener('click', startNewDraw);
    cancelDrawBtn.addEventListener('click', function() { stopNewDraw(true); resetMapHeader(); });
    saveDrawBtn.addEventListener('click', function() {
        if (drawnPoints.length < 2) { showToast('Draw at least 2 points to create a route.', 'error'); return; }
        openAddModal();
    });

    function startNewDraw() {
        isDrawing = true; drawnPoints = [];
        if (drawnLayer) { drawnLayer.remove(); drawnLayer = null; }
        rtMapTitle.textContent = 'Drawing New Route';
        rtMapHint.textContent  = '';
        startDrawBtn.style.display   = 'none';
        cancelDrawBtn.style.display  = 'inline-flex';
        saveDrawBtn.style.display    = 'none';
        exitPathEditBtn.style.display = 'none';
        rtDrawStatus.style.display   = 'flex';
        rtDrawStatusText.textContent = 'Click on the map to add points. Double-click to finish.';
        map.getContainer().style.cursor = 'crosshair';
        var d = new L.Draw.Polyline(map, { shapeOptions: { color: '#1A6FA8', weight: 4, opacity: 0.85 } });
        d.enable(); map._activeDrawer = d;
    }

    function stopNewDraw(cancel) {
        isDrawing = false;
        if (map._activeDrawer) { map._activeDrawer.disable(); map._activeDrawer = null; }
        map.getContainer().style.cursor = '';
        if (cancel) { drawnPoints = []; if (drawnLayer) { drawnLayer.remove(); drawnLayer = null; } }
        startDrawBtn.style.display  = 'inline-flex';
        cancelDrawBtn.style.display = 'none';
        saveDrawBtn.style.display   = 'none';
        rtDrawStatus.style.display  = 'none';
    }

    map.on(L.Draw.Event.CREATED, function(e) {
        if (drawnLayer) drawnLayer.remove();
        drawnLayer = e.layer; drawnLayer.addTo(map);
        var latlngs = drawnLayer.getLatLngs();
        drawnPoints = latlngs.map(function(ll) { return [ll.lat, ll.lng]; });
        map.getContainer().style.cursor = ''; isDrawing = false;
        startDrawBtn.style.display   = 'none';
        cancelDrawBtn.style.display  = 'inline-flex';
        saveDrawBtn.style.display    = 'inline-flex';
        rtDrawStatusText.textContent = drawnPoints.length + ' points drawn. Click "Save Route" to continue.';
        rtDrawStatus.style.display   = 'flex';
        updatePointsInfo(drawnPoints.length);
    });

    // ── Path Edit mode
    function openPathEdit(id) {
        var route = null;
        for (var i = 0; i < allRoutes.length; i++) { if (allRoutes[i].route_id === id) { route = allRoutes[i]; break; } }
        if (!route) return;

        if (rtModal.classList.contains('active')) closeRtModal();
        if (isDrawing) stopNewDraw(true);
        if (pathEditingId !== null) stopPathEdit(false);

        pathEditingId = id;

        fetch('../api/routes.php?id=' + id)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.success || !data.route.points) { showToast('Could not load route points.', 'error'); pathEditingId = null; return; }
                pathEditPoints = data.route.points.map(function(p) { return [parseFloat(p.latitude), parseFloat(p.longitude)]; });
                if (allPolylines[id]) allPolylines[id].setStyle({ opacity: 0.15 });
                buildPathEditLayer();
                map.fitBounds(pathEditLine.getBounds(), { padding: [40, 40] });
                rtMapTitle.textContent  = 'Editing Path — ' + esc(route.route_name);
                rtMapHint.textContent   = 'Drag a point to move it  \u2022  Click map to add a point to the end  \u2022  Right-click a point to remove it';
                startDrawBtn.style.display    = 'none';
                cancelDrawBtn.style.display   = 'none';
                saveDrawBtn.style.display     = 'none';
                exitPathEditBtn.style.display = 'inline-flex';
                rtDrawStatus.style.display    = 'none';
            })
            .catch(function() { showToast('Failed to load route.', 'error'); pathEditingId = null; });
    }

    function buildPathEditLayer() {
        clearPathEditLayer();
        pathEditLine = L.polyline(pathEditPoints, { color: '#1A6FA8', weight: 4, opacity: 0.9 });
        pathEditLine.addTo(map);
        for (var i = 0; i < pathEditPoints.length; i++) { addPathMarker(i); }
    }

    function addPathMarker(idx) {
        var isFirst = (idx === 0);
        var isLast  = (idx === pathEditPoints.length - 1);
        var cls = 'rt-pt-handle' + (isFirst ? ' rt-pt-first' : isLast ? ' rt-pt-last' : '');
        var icon = L.divIcon({ className: '', html: '<div class="' + cls + '"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
        var marker = L.marker(pathEditPoints[idx], { icon: icon, draggable: true, zIndexOffset: 200 });
        marker._ptIndex = idx;
        marker.on('drag', (function(i) { return function(e) {
            var ll = e.target.getLatLng();
            pathEditPoints[i] = [ll.lat, ll.lng];
            pathEditLine.setLatLngs(pathEditPoints);
        }; })(idx));
        marker.on('contextmenu', (function(i) { return function(e) {
            L.DomEvent.stopPropagation(e);
            if (pathEditPoints.length <= 2) { showToast('A route must have at least 2 points.', 'error'); return; }
            pathEditPoints.splice(i, 1);
            buildPathEditLayer();
        }; })(idx));
        marker.addTo(map);
        pathEditMarkers.push(marker);
    }

    function clearPathEditLayer() {
        if (pathEditLine) { pathEditLine.remove(); pathEditLine = null; }
        pathEditMarkers.forEach(function(m) { m.remove(); });
        pathEditMarkers = [];
    }

    function onMapClickAppend(e) {
        if (e.originalEvent && e.originalEvent.target && e.originalEvent.target.closest('.rt-pt-handle')) return;
        pathEditPoints.push([e.latlng.lat, e.latlng.lng]);
        buildPathEditLayer();
    }

    function stopPathEdit(restoreOpacity) {
        map.off('click', onMapClickAppend);
        clearPathEditLayer();
        if (restoreOpacity !== false && pathEditingId !== null && allPolylines[pathEditingId]) {
            allPolylines[pathEditingId].setStyle({ opacity: 0.85 });
        }
        pathEditingId = null; pathEditPoints = [];
        resetMapHeader();
    }

    // "Done Editing" saves path to server
    exitPathEditBtn.addEventListener('click', function() {
        if (pathEditSaving) return;
        if (pathEditPoints.length < 2) { showToast('A route must have at least 2 points.', 'error'); return; }

        var savingId = pathEditingId;
        var route = null;
        for (var i = 0; i < allRoutes.length; i++) { if (allRoutes[i].route_id === savingId) { route = allRoutes[i]; break; } }

        pathEditSaving = true;
        exitPathEditBtn.disabled = true;
        exitPathEditBtn.innerHTML = '<svg style="animation:rt-spin .7s linear infinite;width:13px;height:13px;vertical-align:middle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg> Saving\u2026';

        var payload = {
            route_id: savingId,
            route_name: route.route_name, route_type: route.route_type, status: route.status,
            origin_terminal_id: route.origin_terminal_id || null,
            destination_terminal_id: route.destination_terminal_id || null,
            description: route.description || '',
            points: pathEditPoints
        };

        fetch('../api/routes.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.success) throw new Error(data.message);
                for (var i = 0; i < allRoutes.length; i++) { if (allRoutes[i].route_id === savingId) { allRoutes[i] = data.route; break; } }
                removeRouteFromMap(savingId);
                stopPathEdit(false);
                drawRouteOnMap(data.route);
                renderTable();
                showToast('Route path saved.', 'success');
            })
            .catch(function(err) {
                showToast(err.message || 'Failed to save path.', 'error');
                if (allPolylines[savingId]) allPolylines[savingId].setStyle({ opacity: 0.85 });
            })
            .finally(function() {
                pathEditSaving = false;
                exitPathEditBtn.disabled  = false;
                exitPathEditBtn.style.display = 'none';
                exitPathEditBtn.innerHTML = '<i data-lucide="check"></i> Done Editing';
                lucide.createIcons();
            });
    });

    // Enable map click append only while in path edit mode
    map.on('click', function(e) { if (pathEditingId !== null) onMapClickAppend(e); });

    function resetMapHeader() {
        rtMapTitle.textContent = 'Map \u2014 Draw a Route';
        rtMapHint.textContent  = 'Use the draw tool to trace a polyline on the map, then save it as a route';
        startDrawBtn.style.display    = 'inline-flex';
        startDrawBtn.innerHTML        = '<i data-lucide="pencil-line"></i> Draw Route';
        cancelDrawBtn.style.display   = 'none';
        saveDrawBtn.style.display     = 'none';
        exitPathEditBtn.style.display = 'none';
        rtDrawStatus.style.display    = 'none';
        lucide.createIcons();
    }

    // ── Open ADD modal
    function openAddModal() {
        editingId = null;
        rtModalTitleText.textContent = 'Add Route';
        rtSubmitLabel.textContent    = 'Add Route';
        rtSubmitBtn.dataset.label    = 'Add Route';
        rtPointsInfo.style.display   = 'flex';
        rtForm.reset(); populateTerminalDropdowns();
        updatePointsInfo(drawnPoints.length); clearErrors();
        rtModal.classList.add('active'); lucide.createIcons();
        setTimeout(function() { rtName.focus(); }, 50);
    }

    // ── Open EDIT DETAILS modal
    function openEditDetailsModal(id) {
        var route = null;
        for (var i = 0; i < allRoutes.length; i++) { if (allRoutes[i].route_id === id) { route = allRoutes[i]; break; } }
        if (!route) return;

        editingId = id;
        rtModalTitleText.textContent = 'Edit Route Details';
        rtSubmitLabel.textContent    = 'Save Changes';
        rtSubmitBtn.dataset.label    = 'Save Changes';
        rtPointsInfo.style.display   = 'none';

        rtName.value        = route.route_name;
        rtType.value        = route.route_type;
        rtStatus.value      = route.status;
        rtDescription.value = route.description || '';

        populateTerminalDropdowns();
        setTimeout(function() {
            rtOrigin.value      = route.origin_terminal_id      || '';
            rtDestination.value = route.destination_terminal_id || '';
        }, 0);

        // Fetch points silently so they are included in save payload unchanged
        fetch('../api/routes.php?id=' + id)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.success && data.route.points) {
                    drawnPoints = data.route.points.map(function(p) { return [parseFloat(p.latitude), parseFloat(p.longitude)]; });
                }
            });

        clearErrors();
        rtModal.classList.add('active'); lucide.createIcons();
        setTimeout(function() { rtName.focus(); }, 50);
    }

    // ── Open DELETE modal
    function openDeleteModal(id) {
        var route = null;
        for (var i = 0; i < allRoutes.length; i++) { if (allRoutes[i].route_id === id) { route = allRoutes[i]; break; } }
        if (!route) return;
        deleteTargetId = id; rtDeleteName.textContent = route.route_name;
        rtDeleteModal.classList.add('active'); lucide.createIcons();
    }

    function updatePointsInfo(count) {
        rtPointsCount.textContent = count + ' point' + (count !== 1 ? 's' : '') + ' drawn';
        rtPointsInfo.classList.toggle('has-points', count >= 2);
    }

    // ── Close modals
    rtModalClose.addEventListener('click',  closeRtModal);
    rtModalCancel.addEventListener('click', closeRtModal);
    rtModal.addEventListener('click', function(e) { if (e.target === rtModal) closeRtModal(); });
    rtDeleteClose.addEventListener('click',  closeDeleteModal);
    rtDeleteCancel.addEventListener('click', closeDeleteModal);
    rtDeleteModal.addEventListener('click', function(e) { if (e.target === rtDeleteModal) closeDeleteModal(); });
    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Escape') return;
        if (rtModal.classList.contains('active'))       closeRtModal();
        if (rtDeleteModal.classList.contains('active')) closeDeleteModal();
    });

    function closeRtModal() {
        rtModal.classList.remove('active');
        editingId = null;
        if (!pathEditingId) {
            drawnPoints = [];
            if (drawnLayer) { drawnLayer.remove(); drawnLayer = null; }
            resetMapHeader();
        }
        rtPointsInfo.style.display = 'flex';
        lucide.createIcons();
    }

    function closeDeleteModal() { rtDeleteModal.classList.remove('active'); deleteTargetId = null; }

    // ── Form submit
    rtForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!validateForm()) return;
        var isEdit = editingId !== null;
        setLoading(true);
        var payload = {
            route_name: rtName.value.trim(), route_type: rtType.value, status: rtStatus.value,
            origin_terminal_id: rtOrigin.value || null,
            destination_terminal_id: rtDestination.value || null,
            description: rtDescription.value.trim(), points: drawnPoints
        };
        if (isEdit) payload.route_id = editingId;
        var capturedId = editingId;
        fetch('../api/routes.php', { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.success) throw new Error(data.message);
                if (isEdit) {
                    for (var i = 0; i < allRoutes.length; i++) { if (allRoutes[i].route_id === capturedId) { allRoutes[i] = data.route; break; } }
                    removeRouteFromMap(capturedId);
                } else {
                    allRoutes.unshift(data.route);
                    if (drawnLayer) { drawnLayer.remove(); drawnLayer = null; }
                    drawnPoints = []; stopNewDraw(false);
                }
                drawRouteOnMap(data.route); renderTable(); closeRtModal(); resetMapHeader();
                showToast(isEdit ? 'Route updated.' : 'Route added.', 'success');
            })
            .catch(function(err) { showToast(err.message || 'An error occurred.', 'error'); })
            .finally(function() { setLoading(false); });
    });

    function setLoading(on) {
        rtSubmitBtn.disabled = on;
        if (on) {
            rtSubmitBtn.innerHTML = '<svg style="animation:rt-spin .7s linear infinite;width:14px;height:14px;vertical-align:middle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg> Saving\u2026';
        } else {
            rtSubmitBtn.innerHTML = '<i data-lucide="save"></i> <span id="rtSubmitLabel">' + (rtSubmitBtn.dataset.label || 'Save') + '</span>';
            rtSubmitLabel = document.getElementById('rtSubmitLabel'); lucide.createIcons();
        }
    }

    // ── Delete confirm
    rtDeleteConfirm.addEventListener('click', function() {
        if (!deleteTargetId) return;
        rtDeleteConfirm.disabled = true;
        var targetId = deleteTargetId;
        fetch('../api/routes.php?id=' + targetId, { method: 'DELETE' })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.success) throw new Error(data.message);
                allRoutes = allRoutes.filter(function(r) { return r.route_id !== targetId; });
                removeRouteFromMap(targetId); renderTable(); closeDeleteModal();
                showToast('Route deleted.', 'success');
            })
            .catch(function(err) { showToast(err.message || 'Failed to delete.', 'error'); })
            .finally(function() { rtDeleteConfirm.disabled = false; });
    });

    // ── Validation
    function validateForm() {
        clearErrors(); var ok = true;
        if (!rtName.value.trim()) { showError('rtErrName', 'Route name is required.'); ok = false; }
        if (!rtType.value)        { showError('rtErrType', 'Route type is required.'); ok = false; }
        if (drawnPoints.length < 2) { showToast('This route has no path. Use the "Edit Path" button to draw one first.', 'error'); ok = false; }
        return ok;
    }
    function showError(id, msg) { var el = document.getElementById(id); if (el) el.textContent = msg; }
    function clearErrors() { ['rtErrName','rtErrType'].forEach(function(id) { var el = document.getElementById(id); if (el) el.textContent = ''; }); }

    // ── Toast
    function showToast(msg, type) {
        type = type || 'success';
        var ex = document.getElementById('rtToast'); if (ex) ex.remove();
        var t = document.createElement('div');
        t.id = 'rtToast';
        t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:8px;font-size:.875rem;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:rt-toast .25s ease;background:' + (type === 'success' ? '#1A3A5C' : '#C0392B') + ';color:#fff;';
        t.innerHTML = '<i data-lucide="' + (type === 'success' ? 'check-circle' : 'alert-circle') + '" style="width:15px;height:15px;flex-shrink:0"></i> ' + msg;
        document.body.appendChild(t); lucide.createIcons();
        setTimeout(function() { t.style.transition='opacity .25s,transform .25s'; t.style.opacity='0'; t.style.transform='translateY(8px)'; setTimeout(function() { t.remove(); }, 260); }, 3000);
    }

    function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

    var sty = document.createElement('style');
    sty.textContent = '@keyframes rt-spin{to{transform:rotate(360deg)}}@keyframes rt-toast{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(sty);

    loadAll();
});