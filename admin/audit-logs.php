<?php
require_once '../includes/auth.php';

$page_title  = 'Audit Logs';
$active_page = 'audit-logs';
$base_path   = '../';
$breadcrumb  = ['System' => null, 'Audit Logs' => null];
$extra_css   = ['admin/audit-logs.css'];
$extra_js    = ['admin/audit-logs.js'];
$extra_head  = '';
$extra_js_head = '';

require_once '../includes/partials/header.php';
?>

<!-- ── Page Header ──────────────────────────────────────────── -->
<div class="page-header">
    <div>
        <h1>Audit Logs</h1>
        <p>A full record of every create, update, and delete action performed in TURS.</p>
    </div>
    <button class="btn btn-outline btn-sm" id="exportCsvBtn">
        <i data-lucide="download"></i>
        Export CSV
    </button>
</div>

<!-- ── Filter Bar ────────────────────────────────────────────── -->
<div class="card al-filters-card">
    <div class="al-filters">
        <div class="al-filter-group">
            <label>Action</label>
            <div class="al-filter-btns" id="filterAction">
                <button class="al-filter-btn active" data-value="">All</button>
                <button class="al-filter-btn" data-value="create">
                    <i data-lucide="plus-circle"></i> Create
                </button>
                <button class="al-filter-btn" data-value="update">
                    <i data-lucide="pencil"></i> Update
                </button>
                <button class="al-filter-btn" data-value="delete">
                    <i data-lucide="trash-2"></i> Delete
                </button>
            </div>
        </div>
        <div class="al-filter-group">
            <label>Table</label>
            <select id="filterTable" class="al-filter-select">
                <option value="">All Tables</option>
                <option value="access_points">Access Points</option>
                <option value="routes">Routes</option>
                <option value="disaster_zones">Risk Areas</option>
                <option value="users">Users</option>
            </select>
        </div>
        <div class="al-filter-search">
            <i data-lucide="search"></i>
            <input type="text" id="searchInput" placeholder="Search by user…">
        </div>
    </div>
</div>

<!-- ── Audit Log Table ───────────────────────────────────────── -->
<div class="card">
    <div class="card-header">
        <h3><i data-lucide="clipboard-list"></i> All Log Entries</h3>
        <span class="al-count-badge" id="countBadge">—</span>
    </div>
    <div class="card-body no-pad">
        <div class="table-wrap">
            <table id="auditTable">
                <thead>
                    <tr>
                        <th style="width:160px;">When</th>
                        <th>User</th>
                        <th style="width:90px;">Action</th>
                        <th style="width:130px;">Table</th>
                        <th style="width:80px;">Record</th>
                        <th style="width:80px;">Details</th>
                    </tr>
                </thead>
                <tbody id="auditTableBody">
                    <tr><td colspan="6">
                        <div class="al-loading">
                            <i data-lucide="loader"></i> Loading audit log…
                        </div>
                    </td></tr>
                </tbody>
            </table>
        </div>
        <div class="al-pagination" id="auditPagination"></div>
    </div>
</div>

<!-- ══ DIFF MODAL ══════════════════════════════════════════════ -->
<div class="modal-backdrop" id="diffModal" role="dialog" aria-modal="true">
    <div class="modal al-diff-modal">
        <div class="modal-header">
            <h3>
                <i data-lucide="file-diff"></i>
                Change Details
            </h3>
            <button class="modal-close" id="diffModalClose"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body" id="diffModalBody">
            <!-- populated by JS -->
        </div>
    </div>
</div>

<?php require_once '../includes/partials/footer.php'; ?>