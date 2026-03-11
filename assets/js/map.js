document.addEventListener('DOMContentLoaded', () => {

    const MAP_CENTER = [13.1800, 123.5950];
    const MAP_ZOOM   = 14;

    const COLORS = {
        transport: '#1A6FA8', emergency: '#C0392B', facility: '#2E8B57',
        routes: { bus:'#1A6FA8', jeepney:'#C0392B', tricycle:'#2E8B57', mixed:'#D4780A' },
        severity: { low:'#F1C40F', moderate:'#E67E22', high:'#E74C3C', critical:'#7B0000' },
    };

    // ── Init map ────────────────────────────────────────────────
    const map = L.map('map', { center: MAP_CENTER, zoom: MAP_ZOOM, zoomControl: false });
    L.control.zoom({ position: 'topleft' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
    }).addTo(map);

    const layers = {
        transport: L.layerGroup().addTo(map),
        emergency: L.layerGroup().addTo(map),
        facility:  L.layerGroup().addTo(map),
        routes:    L.layerGroup().addTo(map),
        risk:      L.layerGroup().addTo(map),
    };

    const rawData = { accessPoints: [], routes: [], zones: [] };
    const activeFilters = { routeType: '', severity: '' };

    // ── Marker icons ────────────────────────────────────────────
    function makeIcon(color, innerSvg) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
            <filter id="ds${color.replace('#','')}"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.28)"/></filter>
            <path d="M16 2C9.4 2 4 7.4 4 14c0 9.5 12 24 12 24S28 23.5 28 14C28 7.4 22.6 2 16 2z"
                  fill="${color}" filter="url(#ds${color.replace('#','')})"/>
            <circle cx="16" cy="14" r="7.5" fill="white" opacity="0.92"/>
            <g transform="translate(10,8)">${innerSvg}</g></svg>`;
        return L.divIcon({ html: `<div>${svg}</div>`, className:'', iconSize:[32,40], iconAnchor:[16,40], popupAnchor:[0,-40] });
    }

    const markerIcons = {
        transport: makeIcon(COLORS.transport, `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${COLORS.transport}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`),
        emergency: makeIcon(COLORS.emergency, `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${COLORS.emergency}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 19H5c-1 0-2-.9-2-2V7c0-1.1.9-2 2-2h3m8 0h3c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2h-3M9 3h6v18H9z"/></svg>`),
        facility:  makeIcon(COLORS.facility,  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${COLORS.facility}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/></svg>`),
    };

    // ── Popup builders ──────────────────────────────────────────
    function apPopup(ap) {
        const color = COLORS[ap.category] || COLORS.transport;
        const sub   = (ap.sub_type||'').replace(/_/g,' ');
        const addr  = ap.address ? `<div class="map-popup-addr"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>${ap.address}</div>` : '';
        return `<div class="map-popup">
            <span class="map-popup-category" style="background:${color}18;color:${color};">${ap.category}</span>
            <div class="map-popup-title">${ap.name}</div>
            <div class="map-popup-sub">${sub}</div>${addr}
            <button class="map-popup-btn" onclick="openDrawer(${ap.access_point_id},'access_point')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>View Details
            </button></div>`;
    }

    function zonePopup(z) {
        const color = COLORS.severity[z.severity] || COLORS.severity.high;
        return `<div class="map-popup">
            <span class="map-popup-category" style="background:${color}18;color:${color};">Risk Area</span>
            <div class="map-popup-title">${z.zone_name}</div>
            <div class="map-popup-sub">${(z.zone_type||'').replace(/_/g,' ')} · ${z.severity} severity</div>
            <button class="map-popup-btn" onclick="openDrawer(${z.zone_id},'risk_area')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>View Details
            </button></div>`;
    }

    // ── Load data ───────────────────────────────────────────────
    async function loadAccessPoints() {
        const res  = await fetch('api/access-points.php');
        const data = await res.json();
        if (!data.success) return;
        rawData.accessPoints = data.access_points || [];
        rawData.accessPoints.forEach(ap => {
            const m = L.marker([parseFloat(ap.latitude), parseFloat(ap.longitude)], { icon: markerIcons[ap.category] || markerIcons.transport })
                .bindPopup(apPopup(ap), { maxWidth:280 });
            layers[ap.category]?.addLayer(m);
        });
        const c = { transport:0, emergency:0, facility:0 };
        rawData.accessPoints.forEach(ap => { if (c[ap.category] !== undefined) c[ap.category]++; });
        setEl('sumTerminals', c.transport);
        setEl('sumEmergency', c.emergency);
        setEl('sumFacilities', c.facility);
    }

    async function loadRoutes() {
        const res  = await fetch('api/routes.php');
        const data = await res.json();
        if (!data.success) return;
        rawData.routes = data.routes || [];
        setEl('sumRoutes', rawData.routes.length);
        renderRoutes();
    }

    function renderRoutes() {
        layers.routes.clearLayers();
        rawData.routes.forEach(r => {
            if (!r.points || r.points.length < 2) return;
            if (activeFilters.routeType && r.route_type !== activeFilters.routeType) return;
            const color  = COLORS.routes[r.route_type] || COLORS.routes.mixed;
            const dashed = r.status !== 'active';
            const line   = L.polyline(r.points.map(p => [parseFloat(p.latitude), parseFloat(p.longitude)]), {
                color, weight:4.5, opacity: dashed ? 0.45 : 0.85, dashArray: dashed ? '9,7' : null,
            });
            line.bindPopup(`<div class="map-popup">
                <span class="map-popup-category" style="background:${color}18;color:${color};">${r.route_type}</span>
                <div class="map-popup-title">${r.route_name}</div>
                <div class="map-popup-sub">${r.origin_name||'—'} → ${r.destination_name||'—'} · ${r.status}</div>
                <button class="map-popup-btn" onclick="openDrawer(${r.route_id},'route')">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>View Details
                </button>
            </div>`);
            layers.routes.addLayer(line);
        });
    }

    async function loadRiskAreas() {
        const res  = await fetch('api/risk-areas.php');
        const data = await res.json();
        if (!data?.success) return;
        rawData.zones = Array.isArray(data.zones) ? data.zones : [];
        renderRiskAreas();
    }

    function renderRiskAreas() {
        layers.risk.clearLayers();
        const filtered = rawData.zones.filter(z => !activeFilters.severity || z.severity === activeFilters.severity);
        setEl('sumRisk', filtered.length);
        filtered.forEach(z => {
            const color  = COLORS.severity[z.severity] || COLORS.severity.high;
            const circle = L.circle([parseFloat(z.latitude), parseFloat(z.longitude)], {
                radius: parseFloat(z.radius_meters), color, weight:2.5, opacity:0.9,
                fillColor: color, fillOpacity:0.16,
            });
            circle.bindPopup(zonePopup(z), { maxWidth:280 });
            layers.risk.addLayer(circle);
        });
    }

    // ── Detail Modal ────────────────────────────────────────────
    const backdrop   = document.getElementById('detailBackdrop');
    const modalBody  = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');
    const modalSub   = document.getElementById('modalSub');
    const modalIcon  = document.getElementById('modalIcon');
    const modalClose = document.getElementById('modalClose');

    const ICON_PATHS = {
        'map-pin':    '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
        'siren':      '<path d="M8 19H5c-1 0-2-.9-2-2V7c0-1.1.9-2 2-2h3m8 0h3c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2h-3M9 3h6v18H9z"/>',
        'building-2': '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>',
        'shield':     '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
        'route':      '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    };

    function makeSvg(pathKey, color, size=17) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"
            fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${ICON_PATHS[pathKey]||ICON_PATHS['map-pin']}</svg>`;
    }

    window.openDrawer = function(id, type) {
        const dataset = type === 'access_point' ? rawData.accessPoints
                      : type === 'route'        ? rawData.routes
                      : rawData.zones;
        const item    = dataset.find(i => parseInt(i.access_point_id || i.route_id || i.zone_id) === parseInt(id));
        if (!item) return;

        const isRisk  = type === 'risk_area';
        const isRoute = type === 'route';
        const name    = item.name || item.route_name || item.zone_name;
        const subType = isRoute
            ? `${item.route_type} route`
            : (item.sub_type || item.zone_type || '').replace(/_/g,' ');
        const cat     = item.category || 'risk';
        const color   = isRoute  ? (COLORS.routes[item.route_type]||COLORS.routes.mixed)
                      : isRisk   ? (COLORS.severity[item.severity]||'#E67E22')
                      : (COLORS[cat]||COLORS.transport);
        const iconKey = isRoute ? 'route'
                      : cat==='emergency' ? 'siren'
                      : cat==='facility'  ? 'building-2'
                      : isRisk            ? 'shield'
                      : 'map-pin';
        const mapsUrl = isRoute ? null
            : `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;

        modalTitle.textContent      = name;
        modalSub.textContent        = subType;
        modalIcon.style.background  = `${color}18`;
        modalIcon.innerHTML         = makeSvg(iconKey, color);

        const photo = item.photo_url
            ? `<img src="${item.photo_url}" alt="${esc(name)}" class="detail-photo"
                    onclick="openLightbox('${item.photo_url}','${esc(name)}')"
                    onerror="this.style.display='none'">`
            : '';

        const statusBadge = isRisk
            ? `<span class="detail-badge" style="background:${color}20;color:${color};">${item.severity} severity</span>`
            : `<span class="detail-badge" style="background:${item.status==='active'?'#E8F5EE':item.status==='suspended'?'#FEF3E2':'#EEF1F6'};color:${item.status==='active'?'#2E8B57':item.status==='suspended'?'#D4780A':'#5A6A7A'};">${item.status}</span>`;

        const routeExtra = isRoute ? `
            <div class="detail-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span class="detail-row-label">Origin</span>
                <span class="detail-row-value">${esc(item.origin_name||'—')}</span>
            </div>
            <div class="detail-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span class="detail-row-label">Destination</span>
                <span class="detail-row-value">${esc(item.destination_name||'—')}</span>
            </div>
            ${item.description ? `<div class="detail-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span class="detail-row-label">Description</span>
                <span class="detail-row-value">${esc(item.description)}</span>
            </div>` : ''}` : '';

        modalBody.innerHTML = `
            ${photo}
            <div class="detail-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                <span class="detail-row-label">Status</span>
                <span class="detail-row-value">${statusBadge}</span>
            </div>
            ${routeExtra}
            ${item.address ? `<div class="detail-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <span class="detail-row-label">Address</span>
                <span class="detail-row-value">${esc(item.address)}</span>
            </div>` : ''}
            ${!isRoute && item.description ? `<div class="detail-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span class="detail-row-label">Details</span>
                <span class="detail-row-value">${esc(item.description)}</span>
            </div>` : ''}
            ${isRisk ? `
            <div class="detail-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span class="detail-row-label">Reported</span>
                <span class="detail-row-value">${formatDate(item.reported_at)}</span>
            </div>
            <div class="detail-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                <span class="detail-row-label">Affects</span>
                <span class="detail-row-value">${item.radius_meters}m radius</span>
            </div>` : ''}
            ${!isRoute ? `<a class="detail-directions-btn" href="${mapsUrl}" target="_blank" rel="noopener">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                Get Directions
            </a>` : ''}`;

        backdrop.classList.add('open');
        lucide.createIcons();
    };

    function closeModal() { backdrop.classList.remove('open'); }

    modalClose?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeLightbox(); } });

    // ── Lightbox ────────────────────────────────────────────────
    const lightbox      = document.getElementById('mapLightbox');
    const lightboxImg   = document.getElementById('lightboxImg');
    const lightboxClose = document.getElementById('lightboxClose');

    window.openLightbox = function(src, alt) {
        lightboxImg.src = src;
        lightboxImg.alt = alt || '';
        lightbox.classList.add('open');
    };

    function closeLightbox() { lightbox.classList.remove('open'); }

    lightboxClose?.addEventListener('click', closeLightbox);
    lightbox?.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

    // ── Collapsible panels ──────────────────────────────────────
    function setupPanel(toggleId, bodyId, chevronId) {
        const toggle  = document.getElementById(toggleId);
        const body    = document.getElementById(bodyId);
        const chevron = document.getElementById(chevronId);
        if (!toggle) return;
        toggle.addEventListener('click', () => {
            const collapsed = body.classList.toggle('collapsed');
            chevron.classList.toggle('collapsed', collapsed);
        });
    }
    setupPanel('legendToggle', 'legendBody', 'legendChevron');
    setupPanel('filterToggle', 'filterBody', 'filterChevron');

    // ── Layer checkboxes ────────────────────────────────────────
    document.querySelectorAll('.filter-layer-cb').forEach(cb => {
        cb.addEventListener('change', () => {
            cb.checked ? map.addLayer(layers[cb.dataset.layer]) : map.removeLayer(layers[cb.dataset.layer]);
        });
    });

    // ── Route type filter ───────────────────────────────────────
    document.querySelectorAll('#filterRouteType .filter-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#filterRouteType .filter-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilters.routeType = btn.dataset.value;
            renderRoutes();
        });
    });

    // ── Severity filter ─────────────────────────────────────────
    document.querySelectorAll('#filterSeverity .filter-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#filterSeverity .filter-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilters.severity = btn.dataset.value;
            renderRiskAreas();
        });
    });

    // ── Reset ───────────────────────────────────────────────────
    document.getElementById('filterResetBtn')?.addEventListener('click', () => {
        document.querySelectorAll('.filter-layer-cb').forEach(cb => { cb.checked = true; map.addLayer(layers[cb.dataset.layer]); });
        document.querySelectorAll('#filterRouteType .filter-chip').forEach((b,i) => b.classList.toggle('active', i===0));
        document.querySelectorAll('#filterSeverity .filter-chip').forEach((b,i) => b.classList.toggle('active', i===0));
        activeFilters.routeType = '';
        activeFilters.severity  = '';
        renderRoutes();
        renderRiskAreas();
    });

    // ── Search ──────────────────────────────────────────────────
    const searchInput   = document.getElementById('mapSearchInput');
    const searchResults = document.getElementById('mapSearchResults');
    const searchClear   = document.getElementById('mapSearchClear');
    let   searchTimer;

    searchInput?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const q = searchInput.value.trim();
        searchClear.style.display = q ? '' : 'none';
        if (!q) { searchResults.style.display = 'none'; return; }
        searchTimer = setTimeout(() => runSearch(q), 180);
    });

    searchClear?.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.style.display = 'none';
        searchResults.style.display = 'none';
        searchInput.focus();
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.map-search-wrap')) searchResults.style.display = 'none';
    });

    function runSearch(q) {
        const lq = q.toLowerCase();
        const groups = [];

        const aps = rawData.accessPoints.filter(ap =>
            ap.name?.toLowerCase().includes(lq) || ap.sub_type?.toLowerCase().includes(lq) || ap.address?.toLowerCase().includes(lq)
        ).slice(0, 6);
        if (aps.length) groups.push({ label:'Access Points', items: aps.map(ap => ({
            html: `<span class="search-result-dot" style="background:${COLORS[ap.category]};"></span>
                   <span class="search-result-name">${hi(ap.name,lq)}</span>
                   <span class="search-result-sub">${(ap.sub_type||'').replace(/_/g,' ')}</span>`,
            fn: () => { map.setView([parseFloat(ap.latitude), parseFloat(ap.longitude)], 17); openDrawer(ap.access_point_id,'access_point'); clearSearch(); }
        }))});

        const routes = rawData.routes.filter(r =>
            r.route_name?.toLowerCase().includes(lq) || r.route_type?.toLowerCase().includes(lq) ||
            r.origin?.toLowerCase().includes(lq) || r.destination?.toLowerCase().includes(lq)
        ).slice(0, 4);
        if (routes.length) groups.push({ label:'Routes', items: routes.map(r => {
            const color = COLORS.routes[r.route_type]||COLORS.routes.mixed;
            const mid   = r.points?.[Math.floor((r.points.length||1)/2)];
            return {
                html: `<span class="search-result-line" style="background:${color};"></span>
                       <span class="search-result-name">${hi(r.route_name,lq)}</span>
                       <span class="search-result-sub">${r.route_type}</span>`,
                fn: () => { if (mid) map.setView([parseFloat(mid.latitude),parseFloat(mid.longitude)],15); clearSearch(); }
            };
        })});

        const zones = rawData.zones.filter(z =>
            z.zone_name?.toLowerCase().includes(lq) || z.zone_type?.toLowerCase().includes(lq) || z.severity?.toLowerCase().includes(lq)
        ).slice(0, 4);
        if (zones.length) groups.push({ label:'Risk Areas', items: zones.map(z => {
            const color = COLORS.severity[z.severity]||COLORS.severity.high;
            return {
                html: `<span class="search-result-dot" style="background:${color};"></span>
                       <span class="search-result-name">${hi(z.zone_name,lq)}</span>
                       <span class="search-result-sub">${z.severity}</span>`,
                fn: () => { map.setView([parseFloat(z.latitude),parseFloat(z.longitude)],16); openDrawer(z.zone_id,'risk_area'); clearSearch(); }
            };
        })});

        if (!groups.length) {
            searchResults.innerHTML = `<div class="search-no-results">No results for "<strong>${esc(q)}</strong>"</div>`;
        } else {
            searchResults.innerHTML = groups.map(g =>
                `<div class="search-result-group-label">${g.label}</div>` +
                g.items.map((it,i) =>
                    `<div class="search-result-item" data-g="${esc(g.label)}" data-i="${i}">${it.html}</div>`
                ).join('')
            ).join('');
            groups.forEach(g => g.items.forEach((it,i) => {
                searchResults.querySelector(`[data-g="${esc(g.label)}"][data-i="${i}"]`)?.addEventListener('click', it.fn);
            }));
        }
        searchResults.style.display = 'block';
    }

    function clearSearch() { searchInput.value=''; searchClear.style.display='none'; searchResults.style.display='none'; }
    function hi(text, q) { return esc(text||'').replace(new RegExp(`(${escRe(q)})`,'gi'),'<mark style="background:#FFF3B0;border-radius:2px;padding:0 1px;">$1</mark>'); }
    function esc(s)   { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

    // ── Helpers ─────────────────────────────────────────────────
    function setEl(id,v) { const el=document.getElementById(id); if(el) el.textContent=v; }
    function formatDate(s) { if(!s) return '—'; return new Date(s).toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'}); }

    // ── Boot ────────────────────────────────────────────────────
    const mapLoading = document.getElementById('mapLoading');
    Promise.all([loadAccessPoints(), loadRoutes(), loadRiskAreas()])
        .catch(e => console.error('Map load error:', e))
        .finally(() => {
            mapLoading.classList.add('hidden');
            setTimeout(() => mapLoading.remove(), 300);
            lucide.createIcons();
        });
});