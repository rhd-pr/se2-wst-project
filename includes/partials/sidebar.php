<?php
$active_page = $active_page ?? '';
?>

<aside class="sidebar" id="sidebar">

    <!-- ── Brand ─────────────────────────────────────────── -->
    <div class="sidebar-brand">
        <div class="sidebar-brand-icon">
            <i data-lucide="map-pin"></i>
        </div>
        <div class="sidebar-brand-text">
            <span class="sidebar-brand-name">TURS</span>
            <span class="sidebar-brand-sub">Urban Resilience System</span>
        </div>
    </div>

    <!-- ── Navigation ────────────────────────────────────── -->
    <nav class="sidebar-nav">

        <div class="sidebar-section-label">Main</div>

        <a href="<?= $base_path ?? '' ?>admin/dashboard.php"
           class="sidebar-link <?= $active_page === 'dashboard' ? 'active' : '' ?>">
            <i data-lucide="layout-dashboard"></i>
            <span>Dashboard</span>
        </a>

        <div class="sidebar-section-label">Manage</div>

        <a href="<?= $base_path ?? '' ?>admin/access-points.php"
           class="sidebar-link <?= $active_page === 'access-points' ? 'active' : '' ?>">
            <i data-lucide="map-pin"></i>
            <span>Access Points</span>
        </a>

        <a href="<?= $base_path ?? '' ?>admin/routes.php"
           class="sidebar-link <?= $active_page === 'routes' ? 'active' : '' ?>">
            <i data-lucide="route"></i>
            <span>Routes</span>
        </a>

        <a href="<?= $base_path ?? '' ?>admin/risk-areas.php"
           class="sidebar-link <?= $active_page === 'risk-areas' ? 'active' : '' ?>">
            <i data-lucide="shield-alert"></i>
            <span>Risk Areas</span>
        </a>

        <div class="sidebar-section-label">System</div>

        <a href="<?= $base_path ?? '' ?>admin/users.php"
           class="sidebar-link <?= $active_page === 'users' ? 'active' : '' ?>">
            <i data-lucide="users"></i>
            <span>Users</span>
        </a>

        <a href="<?= $base_path ?? '' ?>admin/audit-logs.php"
           class="sidebar-link <?= $active_page === 'audit-logs' ? 'active' : '' ?>">
            <i data-lucide="clipboard-list"></i>
            <span>Audit Logs</span>
        </a>

    </nav>

    <!-- ── Sidebar Footer ────────────────────────────────── -->
    <div class="sidebar-footer">
        <a href="<?= $base_path ?? '' ?>map.php" target="_blank" class="sidebar-link sidebar-link-footer">
            <i data-lucide="globe"></i>
            <span>Public Map</span>
            <i data-lucide="external-link" class="sidebar-link-ext"></i>
        </a>
        <button type="button" class="sidebar-link sidebar-link-footer sidebar-link-logout" id="sidebarLogoutBtn">
            <i data-lucide="log-out"></i>
            <span>Logout</span>
        </button>
    </div>

</aside>