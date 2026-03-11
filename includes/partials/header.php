<?php
$page_title = $page_title ?? 'TURS';
$extra_css   = $extra_css  ?? [];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($page_title) ?> — TURS</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <!-- Lucide Icons (SVG icon library) -->
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>

    <!-- Global Styles -->
    <link rel="stylesheet" href="<?= $base_path ?? '' ?>assets/css/global.css">

    <!-- Page-specific CSS -->
    <?php foreach ($extra_css as $css): ?>
        <link rel="stylesheet" href="<?= $base_path ?? '' ?>assets/css/<?= htmlspecialchars($css) ?>">
    <?php endforeach; ?>

    <!-- Extra head tags (e.g. Leaflet CSS) -->
    <?php if (!empty($extra_head)) echo $extra_head; ?>
</head>
<body>
<div class="admin-shell">

    <?php require_once __DIR__ . '/sidebar.php'; ?>

    <div class="admin-main">

        <!-- ── Top Bar ─────────────────────────────────────── -->
        <header class="topbar">
            <div class="topbar-left">
                <button class="sidebar-toggle" id="sidebarToggle" title="Toggle sidebar">
                    <i data-lucide="menu"></i>
                </button>
                <nav class="breadcrumb" aria-label="Breadcrumb">
                    <span class="breadcrumb-item">
                        <i data-lucide="home"></i>
                        <a href="<?= $base_path ?? '' ?>admin/dashboard.php">Home</a>
                    </span>
                    <?php if (!empty($breadcrumb)): ?>
                        <?php foreach ($breadcrumb as $label => $url): ?>
                            <span class="breadcrumb-sep">
                                <i data-lucide="chevron-right"></i>
                            </span>
                            <span class="breadcrumb-item">
                                <?php if ($url): ?>
                                    <a href="<?= htmlspecialchars($url) ?>"><?= htmlspecialchars($label) ?></a>
                                <?php else: ?>
                                    <span><?= htmlspecialchars($label) ?></span>
                                <?php endif; ?>
                            </span>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </nav>
            </div>

            <div class="topbar-right">
                <div class="topbar-user">
                    <div class="topbar-user-avatar">
                        <i data-lucide="user"></i>
                    </div>
                    <div class="topbar-user-info">
                        <span class="topbar-user-name">
                            <?= htmlspecialchars($_SESSION['full_name'] ?? 'Admin') ?>
                        </span>
                        <span class="topbar-user-role">
                            <?= htmlspecialchars(ucfirst($_SESSION['role'] ?? 'admin')) ?>
                        </span>
                    </div>
                    <button type="button" class="topbar-logout" id="logoutBtn" title="Logout">
                        <i data-lucide="log-out"></i>
                    </button>
                </div>
            </div>
        </header>

        <!-- ── Page Content Starts Here ────────────────────── -->
        <main class="admin-content">