<?php
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TURS — Transport and Urban Resilience System</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>

    <link rel="stylesheet" href="assets/css/landing.css">
</head>
<body>

    <!-- ── Navbar ──────────────────────────────────────────── -->
    <nav class="nav" id="navbar">
        <div class="nav-inner">
            <a href="index.php" class="nav-brand">
                <div class="nav-brand-icon">
                    <i data-lucide="map-pin"></i>
                </div>
                <span>TURS</span>
            </a>
            <div class="nav-actions">
                <a href="map.php" class="nav-link">
                    <i data-lucide="map"></i>
                    Public Map
                </a>
                <a href="login.php" class="nav-btn">
                    <i data-lucide="lock"></i>
                    Admin Login
                </a>
            </div>
        </div>
    </nav>

    <!-- ── Hero ────────────────────────────────────────────── -->
    <section class="hero">

        <!-- Background elements -->
        <div class="hero-bg" aria-hidden="true">
            <div class="hero-bg-grid"></div>
            <div class="hero-bg-glow"></div>
        </div>

        <!-- Floating decorative pins -->
        <div class="hero-deco" aria-hidden="true">
            <div class="deco-pin deco-pin-a">
                <i data-lucide="map-pin"></i>
            </div>
            <div class="deco-pin deco-pin-b">
                <i data-lucide="shield-alert"></i>
            </div>
            <div class="deco-pin deco-pin-c">
                <i data-lucide="route"></i>
            </div>
            <div class="deco-ring deco-ring-1"></div>
            <div class="deco-ring deco-ring-2"></div>
        </div>

        <div class="hero-body">

            <!-- Left: text content -->
            <div class="hero-content">
                <div class="hero-eyebrow">
                    <i data-lucide="shield-check"></i>
                    Local Government Unit — Urban Management System
                </div>

                <h1 class="hero-title">
                    Transport &amp;<br>
                    <em>Urban Resilience</em><br>
                    System
                </h1>

                <p class="hero-desc">
                    A centralized platform for monitoring public transport terminals,
                    managing access points, and tracking disaster risk zones across your locality.
                    Built for administrators. Accessible to all citizens.
                </p>

                <div class="hero-actions">
                    <a href="map.php" class="hero-btn-primary">
                        <i data-lucide="map"></i>
                        View Public Map
                    </a>
                    <a href="login.php" class="hero-btn-secondary">
                        <i data-lucide="lock"></i>
                        Admin Panel
                    </a>
                </div>
            </div>

            <!-- Right: image slot -->
            <div class="hero-image-slot">
                <<img src="assets/LP_image.jpg" alt="TURS System">
            </div>

        </div>

        <!-- Stats bar -->
        <div class="hero-stats" id="statsBar">
            <div class="hero-stat" id="statTerminals">
                <div class="hero-stat-icon">
                    <i data-lucide="map-pin"></i>
                </div>
                <div class="hero-stat-info">
                    <span class="hero-stat-value" id="valTerminals">—</span>
                    <span class="hero-stat-label">Transport Terminals</span>
                </div>
            </div>
            <div class="hero-stat-divider"></div>
            <div class="hero-stat" id="statEmergency">
                <div class="hero-stat-icon hero-stat-icon--emergency">
                    <i data-lucide="siren"></i>
                </div>
                <div class="hero-stat-info">
                    <span class="hero-stat-value" id="valEmergency">—</span>
                    <span class="hero-stat-label">Emergency Points</span>
                </div>
            </div>
            <div class="hero-stat-divider"></div>
            <div class="hero-stat" id="statFacilities">
                <div class="hero-stat-icon hero-stat-icon--facility">
                    <i data-lucide="building-2"></i>
                </div>
                <div class="hero-stat-info">
                    <span class="hero-stat-value" id="valFacilities">—</span>
                    <span class="hero-stat-label">Public Facilities</span>
                </div>
            </div>
            <div class="hero-stat-divider"></div>
            <div class="hero-stat" id="statRisk">
                <div class="hero-stat-icon hero-stat-icon--risk">
                    <i data-lucide="shield-alert"></i>
                </div>
                <div class="hero-stat-info">
                    <span class="hero-stat-value" id="valRisk">—</span>
                    <span class="hero-stat-label">Active Risk Areas</span>
                </div>
            </div>
        </div>

    </section>

    <!-- ── Features ────────────────────────────────────────── -->
    <section class="features">
        <div class="features-inner">

            <div class="section-label">
                <i data-lucide="layers"></i>
                What TURS Provides
            </div>
            <h2 class="section-title">Everything in one map</h2>
            <p class="section-desc">
                Designed for local government units to manage urban mobility
                and public safety through a single, unified interface.
            </p>

            <div class="features-grid">

                <div class="feature-card">
                    <div class="feature-icon feature-icon--blue">
                        <i data-lucide="map-pin"></i>
                    </div>
                    <h3>Transport Terminals</h3>
                    <p>View and manage bus terminals, jeepney terminals, tricycle terminals, and major transport hubs across the locality.</p>
                    <div class="feature-tags">
                        <span>Bus</span>
                        <span>Jeepney</span>
                        <span>Tricycle</span>
                        <span>Major Terminal</span>
                    </div>
                </div>

                <div class="feature-card">
                    <div class="feature-icon feature-icon--red">
                        <i data-lucide="siren"></i>
                    </div>
                    <h3>Emergency Access Points</h3>
                    <p>Quickly locate hospitals, fire stations, police stations, and evacuation centers during emergencies.</p>
                    <div class="feature-tags">
                        <span>Hospital</span>
                        <span>Fire Station</span>
                        <span>Police</span>
                        <span>Evacuation</span>
                    </div>
                </div>

                <div class="feature-card">
                    <div class="feature-icon feature-icon--green">
                        <i data-lucide="building-2"></i>
                    </div>
                    <h3>Public Facilities</h3>
                    <p>Access locations of schools, markets, barangay halls, and government buildings throughout the area.</p>
                    <div class="feature-tags">
                        <span>Schools</span>
                        <span>Markets</span>
                        <span>Barangay Halls</span>
                        <span>Gov't Buildings</span>
                    </div>
                </div>

                <div class="feature-card">
                    <div class="feature-icon feature-icon--orange">
                        <i data-lucide="shield-alert"></i>
                    </div>
                    <h3>Disaster Risk Zones</h3>
                    <p>Monitor active flood areas, accident sites, road closures, and landslide zones with severity indicators.</p>
                    <div class="feature-tags">
                        <span>Flood</span>
                        <span>Landslide</span>
                        <span>Road Closure</span>
                        <span>Accident</span>
                    </div>
                </div>

                <div class="feature-card">
                    <div class="feature-icon feature-icon--navy">
                        <i data-lucide="route"></i>
                    </div>
                    <h3>Transport Routes</h3>
                    <p>Visualize transport routes connecting terminals across the locality, with real-time status tracking.</p>
                    <div class="feature-tags">
                        <span>Active</span>
                        <span>Suspended</span>
                        <span>Affected</span>
                    </div>
                </div>

                <div class="feature-card">
                    <div class="feature-icon feature-icon--teal">
                        <i data-lucide="clipboard-list"></i>
                    </div>
                    <h3>Audit Trail</h3>
                    <p>Full audit logging of all administrative actions — who added, updated, or removed any record and when.</p>
                    <div class="feature-tags">
                        <span>Logged</span>
                        <span>Traceable</span>
                        <span>Admin Only</span>
                    </div>
                </div>

            </div>
        </div>
    </section>

    <!-- ── CTA ─────────────────────────────────────────────── -->
    <section class="cta">
        <div class="cta-inner">
            <div class="cta-icon">
                <i data-lucide="map"></i>
            </div>
            <h2>Ready to explore?</h2>
            <p>View the interactive public map to see transport terminals, access points, and active risk areas in your area.</p>
            <a href="map.php" class="hero-btn-primary">
                <i data-lucide="map"></i>
                Open Public Map
            </a>
        </div>
    </section>

    <!-- ── Footer ──────────────────────────────────────────── -->
    <footer class="footer">
        <div class="footer-inner">
            <div class="footer-brand">
                <div class="nav-brand-icon">
                    <i data-lucide="map-pin"></i>
                </div>
                <div>
                    <span class="footer-brand-name">TURS</span>
                    <span class="footer-brand-sub">Transport and Urban Resilience System</span>
                </div>
            </div>
            <div class="footer-links">
                <a href="map.php">
                    <i data-lucide="map"></i>
                    Public Map
                </a>
                <a href="login.php">
                    <i data-lucide="lock"></i>
                    Admin Login
                </a>
            </div>
            <div class="footer-copy">
                &copy; <?= date('Y') ?> Local Government Unit &mdash; All rights reserved
            </div>
        </div>
    </footer>

    <script src="assets/js/landing.js"></script>
    <script>lucide.createIcons();</script>

</body>
</html>