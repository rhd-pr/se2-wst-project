document.addEventListener('DOMContentLoaded', () => {

    // ── State ───────────────────────────────────────────────────
    let currentPage  = 1;
    let totalPages   = 1;
    let totalRecords = 0;
    const PER_PAGE   = 25;

    let filterAction = '';
    let filterTable  = '';
    let searchQ      = '';

    // ── DOM refs ────────────────────────────────────────────────
    const tbody      = document.getElementById('auditTableBody');
    const countBadge = document.getElementById('countBadge');
    const pagination = document.getElementById('auditPagination');
    const searchInput= document.getElementById('searchInput');

    const diffModal      = document.getElementById('diffModal');
    const diffModalClose = document.getElementById('diffModalClose');
    const diffModalBody  = document.getElementById('diffModalBody');

    // ── Toast ───────────────────────────────────────────────────
    function showToast(msg, type = 'info') {
        const t = document.createElement('div');
        t.style.cssText = `position:fixed;bottom:20px;right:20px;z-index:9999;padding:10px 16px;
            border-radius:6px;font-size:.875rem;font-weight:500;
            box-shadow:0 4px 12px rgba(0,0,0,.15);
            background:${type==='danger'?'#C0392B':'#1A3A5C'};color:#fff;`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3200);
    }

    // ── Relative time ───────────────────────────────────────────
    function relativeTime(dateStr) {
        const d   = new Date(dateStr);
        const sec = Math.floor((Date.now() - d) / 1000);
        if (sec < 60)    return 'just now';
        if (sec < 3600)  return Math.floor(sec / 60) + 'm ago';
        if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
        if (sec < 604800)return Math.floor(sec / 86400) + 'd ago';
        return d.toLocaleDateString('en-PH', {year:'numeric',month:'short',day:'numeric'});
    }

    function formatDateTime(dateStr) {
        return new Date(dateStr).toLocaleString('en-PH', {
            year:'numeric', month:'short', day:'numeric',
            hour:'2-digit', minute:'2-digit'
        });
    }

    function tableLabel(t) {
        return { access_points:'Access Points', routes:'Routes', disaster_zones:'Risk Areas', users:'Users' }[t] || t;
    }

    // ── Fetch & render ──────────────────────────────────────────
    async function loadLogs() {
        tbody.innerHTML = `<tr><td colspan="6">
            <div class="al-loading"><i data-lucide="loader"></i> Loading…</div>
        </td></tr>`;
        lucide.createIcons();

        const params = new URLSearchParams({
            page:     currentPage,
            per_page: PER_PAGE,
        });
        if (filterAction) params.set('action', filterAction);
        if (filterTable)  params.set('table',  filterTable);

        try {
            const res  = await fetch('../api/audit-log.php?' + params.toString());
            const data = await res.json();

            if (!data.success) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--clr-text-muted);">
                    Failed to load audit logs.
                </td></tr>`;
                return;
            }

            totalRecords = data.total || 0;
            totalPages   = data.total_pages || 1;

            // Client-side search filter (by user name)
            let logs = data.logs || [];
            if (searchQ) {
                const q = searchQ.toLowerCase();
                logs = logs.filter(l =>
                    (l.full_name || '').toLowerCase().includes(q) ||
                    (l.username  || '').toLowerCase().includes(q)
                );
            }

            countBadge.textContent = totalRecords.toLocaleString() + ' entr' + (totalRecords === 1 ? 'y' : 'ies');

            if (logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6">
                    <div class="empty-state">
                        <i data-lucide="clipboard-list"></i>
                        <p>No log entries found.</p>
                    </div>
                </td></tr>`;
                renderPagination();
                lucide.createIcons();
                return;
            }

            const badgeClass = { create:'al-badge-create', update:'al-badge-update', delete:'al-badge-delete' };
            const hasChanges = log => !!(log.old_values || log.new_values);

            tbody.innerHTML = logs.map(log => `
                <tr>
                    <td>
                        <div class="al-time">${formatDateTime(log.performed_at)}</div>
                        <div class="al-time-rel">${relativeTime(log.performed_at)}</div>
                    </td>
                    <td>
                        <span style="font-weight:500;">${log.full_name || log.username}</span>
                        <div class="td-muted" style="font-size:.775rem;">${log.username}</div>
                    </td>
                    <td>
                        <span class="badge ${badgeClass[log.action] || ''}">${log.action}</span>
                    </td>
                    <td class="td-muted">${tableLabel(log.table_name)}</td>
                    <td class="td-muted">#${log.record_id}</td>
                    <td>
                        ${hasChanges(log)
                            ? `<button class="al-diff-btn"
                                    data-old='${log.old_values || "null"}'
                                    data-new='${log.new_values || "null"}'
                                    data-action="${log.action}">
                                    <i data-lucide="file-diff"></i> View
                               </button>`
                            : '<span class="td-muted">—</span>'
                        }
                    </td>
                </tr>`).join('');

            renderPagination();
            lucide.createIcons();
            bindDiffBtns();

        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--clr-text-muted);">
                Network error loading logs.
            </td></tr>`;
            console.error('Audit log error:', e);
        }
    }

    // ── Pagination ──────────────────────────────────────────────
    function renderPagination() {
        if (!pagination) return;

        const start = totalRecords === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1;
        const end   = Math.min(currentPage * PER_PAGE, totalRecords);

        let btns = '';

        // Prev
        btns += `<button class="al-page-btn" id="pgPrev" ${currentPage <= 1 ? 'disabled' : ''}>
            <i data-lucide="chevron-left"></i>
        </button>`;

        // Page numbers
        const delta = 2;
        let pages = [];
        for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
            pages.push(i);
        }
        if (pages[0] > 1) {
            btns += `<button class="al-page-btn" data-page="1">1</button>`;
            if (pages[0] > 2) btns += `<span style="padding:0 4px;color:var(--clr-text-light);">…</span>`;
        }
        pages.forEach(p => {
            btns += `<button class="al-page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
        });
        if (pages[pages.length - 1] < totalPages) {
            if (pages[pages.length - 1] < totalPages - 1) btns += `<span style="padding:0 4px;color:var(--clr-text-light);">…</span>`;
            btns += `<button class="al-page-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next
        btns += `<button class="al-page-btn" id="pgNext" ${currentPage >= totalPages ? 'disabled' : ''}>
            <i data-lucide="chevron-right"></i>
        </button>`;

        pagination.innerHTML = `
            <span class="al-pagination-info">
                Showing ${start}–${end} of ${totalRecords.toLocaleString()}
            </span>
            <div class="al-pagination-btns">${btns}</div>`;

        lucide.createIcons();

        pagination.querySelector('#pgPrev')?.addEventListener('click', () => {
            if (currentPage > 1) { currentPage--; loadLogs(); }
        });
        pagination.querySelector('#pgNext')?.addEventListener('click', () => {
            if (currentPage < totalPages) { currentPage++; loadLogs(); }
        });
        pagination.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                currentPage = parseInt(btn.dataset.page);
                loadLogs();
            });
        });
    }

    // ── Diff modal ──────────────────────────────────────────────
    const SKIP_FIELDS = ['password', 'created_at', 'updated_at', 'reported_at', 'resolved_at',
                         'created_by', 'updated_by', 'old_values', 'new_values'];

    function bindDiffBtns() {
        tbody.querySelectorAll('.al-diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                let oldVals = null, newVals = null;
                try { oldVals = JSON.parse(btn.dataset.old); } catch {}
                try { newVals = JSON.parse(btn.dataset.new); } catch {}
                const action = btn.dataset.action;
                openDiff(oldVals, newVals, action);
            });
        });
    }

    function openDiff(oldVals, newVals, action) {
        const allKeys = new Set([
            ...Object.keys(oldVals || {}),
            ...Object.keys(newVals || {}),
        ].filter(k => !SKIP_FIELDS.includes(k)));

        if (allKeys.size === 0) {
            diffModalBody.innerHTML = '<div class="al-diff-empty">No field data available.</div>';
        } else if (action === 'create') {
            // Show new values only
            const rows = [...allKeys].map(k => {
                const val = newVals?.[k];
                if (val === null || val === undefined || val === '') return '';
                return `<tr>
                    <td class="al-diff-field">${k.replace(/_/g, ' ')}</td>
                    <td class="al-diff-new">${String(val)}</td>
                </tr>`;
            }).filter(Boolean).join('');

            diffModalBody.innerHTML = `
                <div class="al-diff-section-label">Created with values</div>
                <table class="al-diff-table">
                    <thead><tr><th>Field</th><th>Value</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="2" class="al-diff-empty">No data.</td></tr>'}</tbody>
                </table>`;

        } else if (action === 'delete') {
            // Show old values only
            const rows = [...allKeys].map(k => {
                const val = oldVals?.[k];
                if (val === null || val === undefined || val === '') return '';
                return `<tr>
                    <td class="al-diff-field">${k.replace(/_/g, ' ')}</td>
                    <td class="al-diff-old">${String(val)}</td>
                </tr>`;
            }).filter(Boolean).join('');

            diffModalBody.innerHTML = `
                <div class="al-diff-section-label">Deleted record snapshot</div>
                <table class="al-diff-table">
                    <thead><tr><th>Field</th><th>Value</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="2" class="al-diff-empty">No data.</td></tr>'}</tbody>
                </table>`;

        } else {
            // Update — show changed fields only
            const changed = [];
            const unchanged = [];

            [...allKeys].forEach(k => {
                const o = String(oldVals?.[k] ?? '');
                const n = String(newVals?.[k] ?? '');
                if (o !== n) changed.push({ k, o, n });
                else unchanged.push({ k, v: o });
            });

            let html = '';

            if (changed.length > 0) {
                html += `<div class="al-diff-section-label">Changed fields (${changed.length})</div>
                    <table class="al-diff-table">
                        <thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead>
                        <tbody>
                            ${changed.map(({ k, o, n }) => `
                                <tr>
                                    <td class="al-diff-field">${k.replace(/_/g, ' ')}</td>
                                    <td class="al-diff-old">${o || '—'}</td>
                                    <td class="al-diff-new">${n || '—'}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>`;
            }

            if (unchanged.length > 0 && changed.length > 0) {
                html += `<div class="al-diff-section-label" style="margin-top:12px;">Unchanged fields</div>
                    <table class="al-diff-table">
                        <thead><tr><th>Field</th><th colspan="2">Value</th></tr></thead>
                        <tbody>
                            ${unchanged.map(({ k, v }) => `
                                <tr>
                                    <td class="al-diff-field">${k.replace(/_/g, ' ')}</td>
                                    <td colspan="2" class="al-diff-same">${v || '—'}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>`;
            }

            if (changed.length === 0) {
                html = '<div class="al-diff-empty">No field changes detected.</div>';
            }

            diffModalBody.innerHTML = html;
        }

        diffModal.classList.add('active');
    }

    function closeDiff() { diffModal.classList.remove('active'); }
    diffModalClose?.addEventListener('click', closeDiff);
    diffModal?.addEventListener('click', e => { if (e.target === diffModal) closeDiff(); });

    // ── Filter buttons ──────────────────────────────────────────
    document.getElementById('filterAction')?.querySelectorAll('.al-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#filterAction .al-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterAction = btn.dataset.value;
            currentPage  = 1;
            loadLogs();
        });
    });

    document.getElementById('filterTable')?.addEventListener('change', e => {
        filterTable = e.target.value;
        currentPage = 1;
        loadLogs();
    });

    let searchTimer;
    searchInput?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            searchQ = searchInput.value.trim();
            loadLogs();
        }, 300);
    });

    // ── Export CSV ──────────────────────────────────────────────
    document.getElementById('exportCsvBtn')?.addEventListener('click', async () => {
        try {
            const params = new URLSearchParams({ page: 1, per_page: 1000 });
            if (filterAction) params.set('action', filterAction);
            if (filterTable)  params.set('table',  filterTable);

            const res  = await fetch('../api/audit-log.php?' + params.toString());
            const data = await res.json();
            if (!data.success) return;

            const rows = [['Log ID','When','User','Username','Action','Table','Record ID']];
            (data.logs || []).forEach(l => {
                rows.push([
                    l.log_id,
                    l.performed_at,
                    l.full_name || '',
                    l.username,
                    l.action,
                    l.table_name,
                    l.record_id,
                ]);
            });

            const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `turs-audit-log-${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('CSV export error:', e);
        }
    });

    // ── Escape ──────────────────────────────────────────────────
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeDiff();
    });

    // ── Boot ────────────────────────────────────────────────────
    loadLogs();

});