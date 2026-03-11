document.addEventListener('DOMContentLoaded', function() {

    // ── State
    var allRecords     = [];
    var editingId      = null;
    var pendingPin     = null;
    var pendingMarker  = null;
    var markers        = {};
    var deleteTargetId = null;
    var filters        = { category: '', status: '', search: '' };

    var SUB_TYPES = {
        transport: [
            { value: 'tricycle_terminal',  label: 'Tricycle Terminal' },
            { value: 'jeepney_terminal',   label: 'Jeepney Terminal' },
            { value: 'bus_terminal',       label: 'Bus Terminal' },
            { value: 'major_terminal',     label: 'Major Terminal' }
        ],
        emergency: [
            { value: 'hospital',           label: 'Hospital' },
            { value: 'fire_station',       label: 'Fire Station' },
            { value: 'police_station',     label: 'Police Station' },
            { value: 'evacuation_center',  label: 'Evacuation Center' }
        ],
        facility: [
            { value: 'school',             label: 'School' },
            { value: 'market',             label: 'Market' },
            { value: 'barangay_hall',      label: 'Barangay Hall' },
            { value: 'government_building',label: 'Government Building' }
        ]
    };

    var COLORS = { transport: '#1A6FA8', emergency: '#C0392B', facility: '#2E8B57' };

    // ── DOM refs (names match PHP IDs exactly)
    var apTableBody       = document.getElementById('apTableBody');
    var countBadge        = document.getElementById('countBadge');
    var searchInput       = document.getElementById('searchInput');
    var mapActions        = document.getElementById('mapActions');
    var pinCoords         = document.getElementById('pinCoords');
    var cancelPinBtn      = document.getElementById('cancelPinBtn');
    var savePinBtn        = document.getElementById('savePinBtn');
    var cursorHint        = document.getElementById('cursorHint');
    var apModal           = document.getElementById('apModal');
    var apModalClose      = document.getElementById('apModalClose');
    var apModalCancel     = document.getElementById('apModalCancel');
    var apModalTitleText  = document.getElementById('apModalTitleText');
    var apForm            = document.getElementById('apForm');
    var apId              = document.getElementById('apId');
    var apLat             = document.getElementById('apLat');
    var apLng             = document.getElementById('apLng');
    var apLatDisplay      = document.getElementById('apLatDisplay');
    var apLngDisplay      = document.getElementById('apLngDisplay');
    var apName            = document.getElementById('apName');
    var apCategory        = document.getElementById('apCategory');
    var apSubType         = document.getElementById('apSubType');
    var apAddress         = document.getElementById('apAddress');
    var apDescription     = document.getElementById('apDescription');
    var apStatus          = document.getElementById('apStatus');
    var apSubmitBtn       = document.getElementById('apSubmitBtn');
    var apPhoto           = document.getElementById('apPhoto');
    var photoDrop         = document.getElementById('photoDrop');
    var photoExisting     = document.getElementById('photoExisting');
    var photoExistingImg  = document.getElementById('photoExistingImg');
    var removePhotoBtn    = document.getElementById('removePhotoBtn');
    var photoPreviewNew   = document.getElementById('photoPreviewNew');
    var photoPreviewImg   = document.getElementById('photoPreviewImg');
    var removeNewPhotoBtn = document.getElementById('removeNewPhotoBtn');
    var deleteModal       = document.getElementById('deleteModal');
    var deleteModalClose  = document.getElementById('deleteModalClose');
    var deleteCancelBtn   = document.getElementById('deleteCancelBtn');
    var deleteConfirmBtn  = document.getElementById('deleteConfirmBtn');
    var deleteItemName    = document.getElementById('deleteItemName');

    // ── Guard: log missing elements and stop
    var missing = [];
    var required = {
        apTableBody:apTableBody, countBadge:countBadge, searchInput:searchInput,
        mapActions:mapActions, pinCoords:pinCoords, cancelPinBtn:cancelPinBtn,
        savePinBtn:savePinBtn, cursorHint:cursorHint, apModal:apModal,
        apModalClose:apModalClose, apModalCancel:apModalCancel,
        apModalTitleText:apModalTitleText, apForm:apForm, apId:apId,
        apLat:apLat, apLng:apLng, apLatDisplay:apLatDisplay, apLngDisplay:apLngDisplay,
        apName:apName, apCategory:apCategory, apSubType:apSubType,
        apAddress:apAddress, apDescription:apDescription, apStatus:apStatus, apSubmitBtn:apSubmitBtn,
        apPhoto:apPhoto, photoDrop:photoDrop,
        photoExisting:photoExisting, photoExistingImg:photoExistingImg,
        removePhotoBtn:removePhotoBtn, photoPreviewNew:photoPreviewNew,
        photoPreviewImg:photoPreviewImg, removeNewPhotoBtn:removeNewPhotoBtn,
        deleteModal:deleteModal, deleteModalClose:deleteModalClose,
        deleteCancelBtn:deleteCancelBtn, deleteConfirmBtn:deleteConfirmBtn,
        deleteItemName:deleteItemName
    };
    for (var k in required) {
        if (!required[k]) missing.push(k);
    }
    if (missing.length) {
        console.error('[access-points.js] Missing elements:', missing.join(', '));
        return;
    }

    // ── Leaflet
    var map = L.map('apMap', { center: [13.1800, 123.5950], zoom: 14, zoomControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
    }).addTo(map);

    function makeIcon(color, isTemp) {
        return L.divIcon({
            html: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="34" viewBox="0 0 28 34" style="opacity:' + (isTemp ? 0.6 : 1) + '"><path d="M14 2C8.477 2 4 6.477 4 12c0 7.732 10 20 10 20s10-12.268 10-20C24 6.477 19.523 2 14 2z" fill="' + color + '"/><circle cx="14" cy="12" r="5" fill="white" opacity="0.9"/></svg>',
            className: '', iconSize: [28,34], iconAnchor: [14,34], popupAnchor: [0,-36]
        });
    }

    // ── Load
    function loadAll() {
        fetch('../api/access-points.php')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.success) throw new Error(data.message);
                allRecords = data.access_points;
                allRecords.forEach(addMarker);
                renderTable();
            })
            .catch(function(e) {
                apTableBody.innerHTML = '<tr><td colspan="7"><div class="table-empty">Failed to load access points.</div></td></tr>';
                console.error('[access-points.js] loadAll:', e);
            });
    }

    function addMarker(ap) {
        if (markers[ap.access_point_id]) markers[ap.access_point_id].remove();
        var m = L.marker([ap.latitude, ap.longitude], { icon: makeIcon(COLORS[ap.category] || '#1A6FA8') });
        m.bindTooltip(ap.name, { permanent: false, direction: 'top', offset: [0,-30] });
        m.on('click', (function(id) { return function() { openEditModal(id); }; })(ap.access_point_id));
        m.addTo(map);
        markers[ap.access_point_id] = m;
    }

    function removeMarker(id) {
        if (markers[id]) { markers[id].remove(); delete markers[id]; }
    }

    // ── Table
    function renderTable() {
        var rows = allRecords.filter(function(ap) {
            if (filters.category && ap.category !== filters.category) return false;
            if (filters.status   && ap.status   !== filters.status)   return false;
            if (filters.search) {
                var q = filters.search.toLowerCase();
                if (ap.name.toLowerCase().indexOf(q) === -1 && (ap.address||'').toLowerCase().indexOf(q) === -1) return false;
            }
            return true;
        });

        countBadge.textContent = rows.length + ' record' + (rows.length !== 1 ? 's' : '');

        if (!rows.length) {
            apTableBody.innerHTML = '<tr><td colspan="7"><div class="table-empty"><i data-lucide="search-x"></i> No access points found.</div></td></tr>';
            lucide.createIcons();
            return;
        }

        apTableBody.innerHTML = rows.map(function(ap) {
            return '<tr data-id="' + ap.access_point_id + '">'
                + '<td><strong>' + esc(ap.name) + '</strong></td>'
                + '<td><span class="badge badge-' + ap.category + '">' + cap(ap.category) + '</span></td>'
                + '<td>' + fmtSub(ap.sub_type) + '</td>'
                + '<td style="color:var(--clr-text-muted);font-size:.825rem">' + (ap.address ? esc(ap.address) : '&mdash;') + '</td>'
                + '<td><span class="badge badge-' + ap.status + '">' + cap(ap.status) + '</span></td>'
                + '<td style="font-size:.8rem;color:var(--clr-text-muted)">' + (ap.created_by_name ? esc(ap.created_by_name) : '&mdash;') + '</td>'
                + '<td><div class="table-actions">'
                + '<button class="btn btn-icon btn-sm" data-action="edit" data-id="' + ap.access_point_id + '" title="Edit"><i data-lucide="pencil"></i></button>'
                + '<button class="btn btn-icon btn-sm btn-danger" data-action="delete" data-id="' + ap.access_point_id + '" title="Delete"><i data-lucide="trash-2"></i></button>'
                + '</div></td></tr>';
        }).join('');

        lucide.createIcons();
    }

    apTableBody.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var id = parseInt(btn.dataset.id, 10);
        if (btn.dataset.action === 'edit')   openEditModal(id);
        if (btn.dataset.action === 'delete') openDeleteModal(id);
    });

    // ── Filters
    document.getElementById('filterCategory').addEventListener('click', function(e) {
        var btn = e.target.closest('.ap-filter-btn');
        if (!btn) return;
        document.querySelectorAll('#filterCategory .ap-filter-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        filters.category = btn.dataset.value;
        renderTable();
    });

    document.getElementById('filterStatus').addEventListener('click', function(e) {
        var btn = e.target.closest('.ap-filter-btn');
        if (!btn) return;
        document.querySelectorAll('#filterStatus .ap-filter-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        filters.status = btn.dataset.value;
        renderTable();
    });

    var searchTimer;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function() { filters.search = searchInput.value.trim(); renderTable(); }, 250);
    });

    // ── Map pin
    map.on('click', function(e) {
        if (editingId !== null) return;
        var lat = e.latlng.lat, lng = e.latlng.lng;
        if (pendingMarker) pendingMarker.remove();
        pendingPin    = { lat: lat.toFixed(7), lng: lng.toFixed(7) };
        pendingMarker = L.marker([lat, lng], { icon: makeIcon('#888888', true) }).addTo(map);
        pendingMarker.bindTooltip('New pin — click Save Location', { permanent: true, direction: 'top', offset: [0,-30] }).openTooltip();
        pinCoords.textContent    = pendingPin.lat + ', ' + pendingPin.lng;
        mapActions.style.display = 'flex';
        cursorHint.classList.add('hidden');
    });

    cancelPinBtn.addEventListener('click', cancelPin);
    savePinBtn.addEventListener('click', function() { if (pendingPin) openAddModal(pendingPin.lat, pendingPin.lng); });

    function cancelPin() {
        if (pendingMarker) { pendingMarker.remove(); pendingMarker = null; }
        pendingPin = null;
        mapActions.style.display = 'none';
        cursorHint.classList.remove('hidden');
    }

    // ── Sub-types
    apCategory.addEventListener('change', function() { populateSubTypes(apCategory.value, ''); });

    function populateSubTypes(category, selected) {
        apSubType.innerHTML = '';
        if (!category || !SUB_TYPES[category]) {
            apSubType.innerHTML = '<option value="">— Select category first —</option>';
            apSubType.disabled  = true;
            return;
        }
        apSubType.disabled = false;
        apSubType.innerHTML = '<option value="">— Select sub-type —</option>';
        SUB_TYPES[category].forEach(function(st) {
            var o = document.createElement('option');
            o.value = st.value; o.textContent = st.label;
            if (st.value === selected) o.selected = true;
            apSubType.appendChild(o);
        });
    }

    // ── Open ADD
    function openAddModal(lat, lng) {
        editingId = null;
        apModalTitleText.textContent = 'Add Access Point';
        apSubmitBtn.dataset.label    = 'Add Access Point';
        apForm.reset();
        apId.value = ''; apLat.value = lat; apLng.value = lng;
        apLatDisplay.value = lat; apLngDisplay.value = lng;
        populateSubTypes('', '');
        resetPhotoUI();
        clearErrors();
        apModal.classList.add('active');
        lucide.createIcons();
        setTimeout(function() { apName.focus(); }, 50);
    }

    // ── Open EDIT
    function openEditModal(id) {
        var ap = null;
        for (var i = 0; i < allRecords.length; i++) {
            if (allRecords[i].access_point_id === id) { ap = allRecords[i]; break; }
        }
        if (!ap) return;

        editingId = id;
        apModalTitleText.textContent = 'Edit Access Point';
        apSubmitBtn.dataset.label    = 'Save Changes';

        apId.value = ap.access_point_id;
        apLat.value = ap.latitude; apLng.value = ap.longitude;
        apLatDisplay.value = ap.latitude; apLngDisplay.value = ap.longitude;
        apName.value        = ap.name;
        apCategory.value    = ap.category;
        apAddress.value     = ap.address     || '';
        apDescription.value = ap.description || '';
        apStatus.value      = ap.status;

        populateSubTypes(ap.category, ap.sub_type);
        clearErrors();
        resetPhotoUI();

        if (ap.photo_url) {
            photoExisting.style.display  = 'block';
            photoExistingImg.src         = '../' + ap.photo_url;
            photoDrop.style.display      = 'none';
        }

        if (markers[id]) {
            map.setView([ap.latitude, ap.longitude], 16, { animate: true });
            var el = markers[id].getElement();
            if (el) { el.classList.remove('marker-highlight'); void el.offsetWidth; el.classList.add('marker-highlight'); }
        }

        apModal.classList.add('active');
        lucide.createIcons();
        setTimeout(function() { apName.focus(); }, 50);
    }

    // ── Open DELETE
    function openDeleteModal(id) {
        var ap = null;
        for (var i = 0; i < allRecords.length; i++) {
            if (allRecords[i].access_point_id === id) { ap = allRecords[i]; break; }
        }
        if (!ap) return;
        deleteTargetId = id;
        deleteItemName.textContent = ap.name;
        deleteModal.classList.add('active');
        lucide.createIcons();
    }

    // ── Close
    apModalClose.addEventListener('click',  closeApModal);
    apModalCancel.addEventListener('click', closeApModal);
    apModal.addEventListener('click', function(e) { if (e.target === apModal) closeApModal(); });
    deleteModalClose.addEventListener('click',  closeDeleteModal);
    deleteCancelBtn.addEventListener('click',   closeDeleteModal);
    deleteModal.addEventListener('click', function(e) { if (e.target === deleteModal) closeDeleteModal(); });
    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Escape') return;
        if (apModal.classList.contains('active'))     closeApModal();
        if (deleteModal.classList.contains('active')) closeDeleteModal();
    });

    function closeApModal() {
        apModal.classList.remove('active');
        if (editingId === null && pendingPin) cancelPin();
        editingId = null;
    }
    function closeDeleteModal() {
        deleteModal.classList.remove('active');
        deleteTargetId = null;
    }

    // ── Photo UI
    function resetPhotoUI() {
        apPhoto.value = '';
        photoExisting.style.display   = 'none';
        photoPreviewNew.style.display = 'none';
        photoDrop.style.display       = 'flex';
        var cp = document.getElementById('clearPhoto');
        if (cp) cp.remove();
    }

    apPhoto.addEventListener('change', function() { if (apPhoto.files[0]) showNewPreview(apPhoto.files[0]); });
    photoDrop.addEventListener('dragover',  function(e) { e.preventDefault(); photoDrop.classList.add('drag-over'); });
    photoDrop.addEventListener('dragleave', function()  { photoDrop.classList.remove('drag-over'); });
    photoDrop.addEventListener('drop', function(e) {
        e.preventDefault(); photoDrop.classList.remove('drag-over');
        var f = e.dataTransfer.files[0];
        if (f && f.type.indexOf('image/') === 0) {
            var dt = new DataTransfer(); dt.items.add(f); apPhoto.files = dt.files;
            showNewPreview(f);
        }
    });

    function showNewPreview(file) {
        var reader = new FileReader();
        reader.onload = function(ev) {
            photoPreviewImg.src = ev.target.result;
            photoPreviewNew.style.display = 'block';
            photoDrop.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    removeNewPhotoBtn.addEventListener('click', function() {
        apPhoto.value = ''; photoPreviewNew.style.display = 'none'; photoDrop.style.display = 'flex';
    });
    removePhotoBtn.addEventListener('click', function() {
        photoExisting.style.display = 'none'; photoDrop.style.display = 'flex';
        if (!document.getElementById('clearPhoto')) {
            var inp = document.createElement('input');
            inp.type = 'hidden'; inp.name = 'clear_photo'; inp.id = 'clearPhoto'; inp.value = '1';
            apForm.appendChild(inp);
        }
    });

    // ── Submit
    apForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!validateForm()) return;
        var isEdit = editingId !== null;
        setLoading(true);
        var fd = new FormData(apForm);
        if (isEdit) {
            fd.set('_method', 'PUT');
            fd.set('access_point_id', editingId);
            if (document.getElementById('clearPhoto')) fd.set('clear_photo', '1');
        }
        var capturedEditingId = editingId;
        fetch('../api/access-points.php', { method: 'POST', body: fd })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.success) throw new Error(data.message);
                if (isEdit) {
                    for (var i = 0; i < allRecords.length; i++) {
                        if (allRecords[i].access_point_id === capturedEditingId) { allRecords[i] = data.access_point; break; }
                    }
                    removeMarker(capturedEditingId);
                    addMarker(data.access_point);
                    showToast('Access point updated.', 'success');
                } else {
                    allRecords.unshift(data.access_point);
                    addMarker(data.access_point);
                    pendingPin = null; pendingMarker = null;
                    mapActions.style.display = 'none';
                    cursorHint.classList.remove('hidden');
                    showToast('Access point added.', 'success');
                }
                renderTable();
                closeApModal();
            })
            .catch(function(err) { showToast(err.message || 'An error occurred.', 'error'); })
            .finally(function() { setLoading(false); });
    });

    function setLoading(on) {
        apSubmitBtn.disabled = on;
        if (on) {
            apSubmitBtn.innerHTML = '<svg style="animation:ap-spin .7s linear infinite;width:14px;height:14px;vertical-align:middle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg> Saving\u2026';
        } else {
            apSubmitBtn.innerHTML = '<i data-lucide="save"></i> ' + (apSubmitBtn.dataset.label || 'Save');
            lucide.createIcons();
        }
    }

    // ── Delete confirm
    deleteConfirmBtn.addEventListener('click', function() {
        if (!deleteTargetId) return;
        deleteConfirmBtn.disabled = true;
        var targetId = deleteTargetId;
        fetch('../api/access-points.php?id=' + targetId, { method: 'DELETE' })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.success) throw new Error(data.message);
                allRecords = allRecords.filter(function(r) { return r.access_point_id !== targetId; });
                removeMarker(targetId);
                renderTable();
                closeDeleteModal();
                showToast('Access point deleted.', 'success');
            })
            .catch(function(err) { showToast(err.message || 'Failed to delete.', 'error'); })
            .finally(function() { deleteConfirmBtn.disabled = false; });
    });

    // ── Validation
    function validateForm() {
        clearErrors();
        var ok = true;
        if (!apName.value.trim())         { showError('errName',     'Name is required.');     ok = false; }
        if (!apCategory.value)            { showError('errCategory', 'Category is required.'); ok = false; }
        if (!apSubType.value)             { showError('errSubType',  'Sub-type is required.'); ok = false; }
        if (!apLat.value || !apLng.value) { showToast('Drop a pin on the map first.', 'error'); ok = false; }
        return ok;
    }
    function showError(id, msg) { var el = document.getElementById(id); if (el) el.textContent = msg; }
    function clearErrors() {
        ['errName','errCategory','errSubType','errPhoto'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.textContent = '';
        });
    }

    // ── Toast
    function showToast(msg, type) {
        type = type || 'success';
        var ex = document.getElementById('apToast'); if (ex) ex.remove();
        var t = document.createElement('div');
        t.id = 'apToast';
        t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:8px;font-size:.875rem;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:ap-toast .25s ease;background:' + (type === 'success' ? '#1A3A5C' : '#C0392B') + ';color:#fff;';
        t.innerHTML = '<i data-lucide="' + (type === 'success' ? 'check-circle' : 'alert-circle') + '" style="width:15px;height:15px;flex-shrink:0"></i> ' + msg;
        document.body.appendChild(t);
        lucide.createIcons();
        setTimeout(function() {
            t.style.transition = 'opacity .25s,transform .25s';
            t.style.opacity = '0'; t.style.transform = 'translateY(8px)';
            setTimeout(function() { t.remove(); }, 260);
        }, 3000);
    }

    function esc(s)    { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function cap(s)    { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
    function fmtSub(s) { return s ? s.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}) : '\u2014'; }

    var sty = document.createElement('style');
    sty.textContent = '@keyframes ap-spin{to{transform:rotate(360deg)}}@keyframes ap-toast{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(sty);

    loadAll();
});