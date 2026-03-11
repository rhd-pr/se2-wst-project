document.addEventListener('DOMContentLoaded', () => {

    // ── Colour constants (match map.js / risk-areas.js) ────────
    const COLORS = {
        transport: '#1A6FA8',
        emergency: '#C0392B',
        facility:  '#2E8B57',
        severity: {
            low:      '#F1C40F',
            moderate: '#E67E22',
            high:     '#E74C3C',
            critical: '#7B0000',
        },
        routes: {
            bus:      '#1A6FA8',
            jeepney:  '#C0392B',
            tricycle: '#2E8B57',
            mixed:    '#D4780A',
        }
    };

    const MAP_CENTER = [13.1800, 123.5950];

    // ── Timestamp ───────────────────────────────────────────────
    function setTimestamp() {
        const el = document.getElementById('lastUpdated');
        if (!el) return;
        el.textContent = 'Updated ' + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    }

    // ── Toast ───────────────────────────────────────────────────
    function showToast(msg, type = 'info') {
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.textContent = msg;
        t.style.cssText = `
            position:fixed;bottom:20px;right:20px;z-index:9999;
            padding:10px 16px;border-radius:6px;font-size:0.875rem;font-weight:500;
            box-shadow:0 4px 12px rgba(0,0,0,.15);animation:fadeSlideIn .2s ease;
            background:${type==='success'?'#2E8B57':type==='danger'?'#C0392B':'#1A3A5C'};
            color:#fff;
        `;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

    // ── Relative time ───────────────────────────────────────────
    function relativeTime(dateStr) {
        const d   = new Date(dateStr);
        const now = new Date();
        const sec = Math.floor((now - d) / 1000);
        if (sec < 60)   return 'just now';
        if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
        if (sec < 86400)return Math.floor(sec / 3600) + 'h ago';
        if (sec < 604800)return Math.floor(sec / 86400) + 'd ago';
        return d.toLocaleDateString();
    }

    // ── Table display labels ────────────────────────────────────
    function tableLabel(t) {
        return { access_points:'Access Point', routes:'Route', disaster_zones:'Risk Zone' }[t] || t;
    }

    // ────────────────────────────────────────────────────────────
    // SECTION 1 — Stat cards + Route breakdown (map-summary API)
    // ────────────────────────────────────────────────────────────
    async function loadSummary() {
        try {
            const res  = await fetch('../api/map-summary.php');
            const data = await res.json();
            if (!data.success) return;

            // Total Access Points (all combined)
            const t = data.total_terminals  ?? 0;
            const e = data.total_emergency  ?? 0;
            const f = data.total_facilities ?? 0;
            document.getElementById('statAccessPoints').textContent = data.total_access_points ?? (t + e + f);
            document.getElementById('statAccessPointsSub').textContent =
                `${t} terminals · ${e} emergency · ${f} facilities`;

            // Routes
            document.getElementById('statRoutes').textContent = data.total_routes ?? 0;
            const rb  = data.route_breakdown || {};
            const sus = rb.suspended || 0;
            const aff = rb.affected  || 0;
            const routeSub = [];
            if (sus) routeSub.push(sus + ' suspended');
            if (aff) routeSub.push(aff + ' affected');
            document.getElementById('statRoutesSub').textContent =
                routeSub.length ? routeSub.join(' · ') : 'All active';

            // Risk
            const riskCount = data.active_risk_areas ?? 0;
            document.getElementById('statRisk').textContent = riskCount;
            const riskCard = document.getElementById('statRiskCard');
            if (riskCount > 0) {
                riskCard.classList.add('has-risk');
                document.getElementById('statRiskSub').textContent =
                    riskCount + ' zone' + (riskCount > 1 ? 's' : '') + ' need attention';
            } else {
                document.getElementById('statRiskSub').textContent = 'No active alerts';
            }

            // Render all three breakdowns
            renderAccessPointBreakdown(t, e, f);
            renderRouteBreakdown(data.route_breakdown || {}, data.total_routes || 0);
            renderRiskZoneBreakdown(data.risk_breakdown || {});

        } catch (e) {
            console.error('Failed to load summary:', e);
        }
    }

    function renderAccessPointBreakdown(terminals, emergency, facilities) {
        const el = document.getElementById('dashAccessPointBreakdown');
        if (!el) return;
        const total = terminals + emergency + facilities;
        const items = [
            { label: 'Terminals', count: terminals, color: COLORS.transport },
            { label: 'Emergency', count: emergency, color: COLORS.emergency },
            { label: 'Facility',  count: facilities, color: COLORS.facility  },
        ];
        if (total === 0) {
            el.innerHTML = '<div class="dash-route-empty">No access points recorded yet.</div>';
            return;
        }
        el.innerHTML = items.map(item => {
            const pct = Math.round((item.count / total) * 100);
            return `
                <div class="dash-route-stat">
                    <span class="dash-route-stat-label">${item.label}</span>
                    <div class="dash-route-bar-wrap">
                        <div class="dash-route-bar" style="width:${pct}%;background:${item.color};"></div>
                    </div>
                    <span class="dash-route-stat-count">${item.count}</span>
                </div>`;
        }).join('');
    }

    function renderRouteBreakdown(rb, total) {
        const el = document.getElementById('dashRouteBreakdown');
        if (!el) return;

        const statuses = [
            { key: 'active',    label: 'Active',    cls: 'dash-route-bar-active'    },
            { key: 'suspended', label: 'Suspended', cls: 'dash-route-bar-suspended' },
            { key: 'affected',  label: 'Affected',  cls: 'dash-route-bar-affected'  },
        ];

        if (total === 0) {
            el.innerHTML = '<div class="dash-route-empty">No routes recorded yet.</div>';
            return;
        }

        el.innerHTML = statuses.map(s => {
            const count = rb[s.key] || 0;
            const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
            return `
                <div class="dash-route-stat">
                    <span class="dash-route-stat-label">${s.label}</span>
                    <div class="dash-route-bar-wrap">
                        <div class="dash-route-bar ${s.cls}" style="width:${pct}%"></div>
                    </div>
                    <span class="dash-route-stat-count">${count}</span>
                </div>`;
        }).join('');

        lucide.createIcons();
    }

    function renderRiskZoneBreakdown(rb) {
        const el = document.getElementById('dashRiskBreakdown');
        if (!el) return;

        const ZONE_COLORS = {
            flood:        '#1A6FA8',
            landslide:    '#D4780A',
            accident:     '#C0392B',
            road_closure: '#7B0000',
            other:        '#5A6A7A',
        };

        const total = Object.values(rb).reduce((s, v) => s + v, 0);

        if (total === 0) {
            el.innerHTML = '<div class="dash-route-empty">No active risk zones.</div>';
            return;
        }

        const items = [
            { key: 'flood',        label: 'Flood'        },
            { key: 'landslide',    label: 'Landslide'    },
            { key: 'accident',     label: 'Accident'     },
            { key: 'road_closure', label: 'Road Closure' },
            { key: 'other',        label: 'Other'        },
        ].filter(item => (rb[item.key] || 0) > 0);

        el.innerHTML = items.map(item => {
            const count = rb[item.key] || 0;
            const pct   = Math.round((count / total) * 100);
            const color = ZONE_COLORS[item.key] || ZONE_COLORS.other;
            return `
                <div class="dash-route-stat">
                    <span class="dash-route-stat-label">${item.label}</span>
                    <div class="dash-route-bar-wrap">
                        <div class="dash-route-bar" style="width:${pct}%;background:${color};"></div>
                    </div>
                    <span class="dash-route-stat-count">${count}</span>
                </div>`;
        }).join('');
    }

    // ────────────────────────────────────────────────────────────
    // SECTION 2 — Mini Map
    // ────────────────────────────────────────────────────────────
    const map = L.map('dashMap', {
        center: MAP_CENTER,
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
    }).addTo(map);

    // Layer groups
    const layers = {
        transport: L.layerGroup().addTo(map),
        emergency: L.layerGroup().addTo(map),
        facility:  L.layerGroup().addTo(map),
        routes:    L.layerGroup().addTo(map),
        risk:      L.layerGroup().addTo(map),
    };

    // SVG pin icon builder (matches map.js)
    function makeIcon(color) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
            <ellipse cx="12" cy="30" rx="5" ry="2" fill="rgba(0,0,0,0.2)"/>
            <path d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 23 9 23s9-16.25 9-23c0-4.97-4.03-9-9-9z"
                fill="${color}" stroke="#fff" stroke-width="1.5"/>
            <circle cx="12" cy="9" r="4" fill="#fff" opacity="0.9"/>
        </svg>`;
        return L.divIcon({
            html: svg, className: '',
            iconSize: [24, 32], iconAnchor: [12, 32], popupAnchor: [0, -32]
        });
    }

    async function loadMapAccessPoints() {
        try {
            const res  = await fetch('../api/access-points.php');
            const data = await res.json();
            if (!data.success || !Array.isArray(data.access_points)) return;
            data.access_points.forEach(ap => {
                if (ap.status !== 'active') return;
                const color = COLORS[ap.category] || COLORS.transport;
                const marker = L.marker(
                    [parseFloat(ap.latitude), parseFloat(ap.longitude)],
                    { icon: makeIcon(color) }
                );
                marker.bindTooltip(ap.name, { sticky: true });
                layers[ap.category]?.addLayer(marker);
            });
        } catch (e) { console.error('Map AP error:', e); }
    }

    async function loadMapRoutes() {
        try {
            const res  = await fetch('../api/routes.php');
            const data = await res.json();
            if (!data.success || !Array.isArray(data.routes)) return;
            data.routes.forEach(route => {
                if (!Array.isArray(route.points) || route.points.length < 2) return;
                const color  = COLORS.routes[route.route_type] || '#1A6FA8';
                const coords = route.points.map(p => [parseFloat(p.latitude), parseFloat(p.longitude)]);
                const line   = L.polyline(coords, {
                    color,
                    weight: route.status === 'active' ? 4 : 3,
                    opacity: route.status === 'active' ? 0.85 : 0.45,
                    dashArray: route.status === 'active' ? null : '8 6',
                });
                line.bindTooltip(route.route_name + ' (' + route.route_type + ')', { sticky: true });
                layers.routes.addLayer(line);
            });
        } catch (e) { console.error('Map routes error:', e); }
    }

    async function loadMapRiskAreas() {
        try {
            const res  = await fetch('../api/risk-areas.php');
            const data = await res.json();
            const zones = Array.isArray(data?.zones) ? data.zones : [];
            zones.forEach(zone => {
                const color  = COLORS.severity[zone.severity] || COLORS.severity.high;
                const circle = L.circle(
                    [parseFloat(zone.latitude), parseFloat(zone.longitude)],
                    {
                        radius: parseFloat(zone.radius_meters),
                        color, weight: 2, opacity: 0.9,
                        fillColor: color, fillOpacity: 0.18,
                    }
                );
                circle.bindTooltip(zone.zone_name + ' — ' + zone.severity, { sticky: true });
                layers.risk.addLayer(circle);
            });
        } catch (e) { console.error('Map risk error:', e); }
    }

    const dashMapLoading = document.getElementById('dashMapLoading');

    Promise.all([
        loadMapAccessPoints(),
        loadMapRoutes(),
        loadMapRiskAreas(),
    ]).finally(() => {
        dashMapLoading?.classList.add('hidden');
        lucide.createIcons();
    });

    // Layer toggle buttons
    document.querySelectorAll('.dash-layer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const key   = btn.dataset.layer;
            const layer = layers[key];
            if (!layer) return;
            const isActive = btn.classList.toggle('active');
            isActive ? map.addLayer(layer) : map.removeLayer(layer);
        });
    });

    // ────────────────────────────────────────────────────────────
    // SECTION 3 — Active Risk Zones panel
    // ────────────────────────────────────────────────────────────
    async function loadRiskPanel() {
        const el = document.getElementById('dashRiskList');
        if (!el) return;
        try {
            const res  = await fetch('../api/risk-areas.php');
            const data = await res.json();
            const zones = Array.isArray(data?.zones) ? data.zones : [];

            if (zones.length === 0) {
                el.innerHTML = `
                    <div class="dash-risk-empty">
                        <i data-lucide="check-circle"></i>
                        No active risk zones
                    </div>`;
                lucide.createIcons();
                return;
            }

            el.innerHTML = zones.map(zone => {
                const color   = COLORS.severity[zone.severity] || COLORS.severity.high;
                const typeStr = (zone.zone_type || '').replace(/_/g, ' ');
                const reported = relativeTime(zone.reported_at);
                return `
                    <div class="dash-risk-item">
                        <div class="dash-risk-dot" style="background:${color};"></div>
                        <div class="dash-risk-info">
                            <div class="dash-risk-name">${zone.zone_name}</div>
                            <div class="dash-risk-meta">${typeStr} · ${reported}</div>
                        </div>
                        <span class="dash-risk-badge"
                              style="background:${color}22;color:${color};">
                            ${zone.severity}
                        </span>
                    </div>`;
            }).join('');

            lucide.createIcons();
        } catch (e) {
            el.innerHTML = '<div class="dash-risk-empty">Failed to load risk zones.</div>';
            console.error('Risk panel error:', e);
        }
    }

    // ────────────────────────────────────────────────────────────
    // SECTION 4 — Recent Activity Feed
    // ────────────────────────────────────────────────────────────
    async function loadActivity() {
        const el = document.getElementById('dashActivity');
        if (!el) return;
        try {
            const res  = await fetch('../api/map-summary.php');
            const data = await res.json();
            const logs = Array.isArray(data.recent_activity) ? data.recent_activity : [];

            if (logs.length === 0) {
                el.innerHTML = '<div class="dash-activity-empty">No activity recorded yet.</div>';
                return;
            }

            const iconMap = {
                create: { cls: 'dash-activity-icon-create', icon: 'plus-circle' },
                update: { cls: 'dash-activity-icon-update', icon: 'pencil'      },
                delete: { cls: 'dash-activity-icon-delete', icon: 'trash-2'     },
            };

            el.innerHTML = logs.map(log => {
                const meta  = iconMap[log.action] || iconMap.update;
                const when  = relativeTime(log.performed_at);
                const table = tableLabel(log.table_name);
                const verb  = { create:'added a', update:'updated a', delete:'deleted a' }[log.action] || log.action;
                return `
                    <div class="dash-activity-item">
                        <div class="dash-activity-icon ${meta.cls}">
                            <i data-lucide="${meta.icon}"></i>
                        </div>
                        <div class="dash-activity-body">
                            <div class="dash-activity-text">
                                <strong>${log.full_name || log.username}</strong>
                                ${verb}
                                <span class="dash-activity-table">${table} #${log.record_id}</span>
                            </div>
                            <div class="dash-activity-time">${when}</div>
                        </div>
                    </div>`;
            }).join('');

            lucide.createIcons();
        } catch (e) {
            el.innerHTML = '<div class="dash-activity-empty">Failed to load activity.</div>';
            console.error('Activity feed error:', e);
        }
    }

    // ────────────────────────────────────────────────────────────
    // SECTION 5 — Refresh button
    // ────────────────────────────────────────────────────────────
    function refreshAll() {
        loadSummary();
        loadRiskPanel();
        loadActivity();
        setTimestamp();
    }

    document.getElementById('refreshBtn')?.addEventListener('click', () => {
        refreshAll();
        showToast('Dashboard refreshed', 'info');
    });

    // ── Boot ────────────────────────────────────────────────────
    loadSummary();
    loadRiskPanel();
    loadActivity();
    setTimestamp();

});