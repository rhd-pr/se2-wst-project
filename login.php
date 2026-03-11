<?php
require_once 'classes/Database.php';
require_once 'classes/Auth.php';

// Start session early to check if already logged in
if (session_status() === PHP_SESSION_NONE) session_start();

$auth = new Auth();

// Already logged in — redirect to dashboard
if ($auth->isLoggedIn()) {
    header("Location: admin/dashboard.php");
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email    = trim($_POST['email']    ?? '');
    $password = trim($_POST['password'] ?? '');

    if ($auth->login($email, $password)) {
        header("Location: admin/dashboard.php");
        exit;
    } else {
        $error = "Invalid email or password. Please try again.";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In — TURS</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>

    <link rel="stylesheet" href="assets/css/login.css">
</head>
<body>

    <div class="login-layout">

        <!-- ── Left Panel ───────────────────────────────── -->
        <div class="login-panel">

            <!-- Map grid decoration -->
            <div class="login-grid" aria-hidden="true">
                <?php for ($i = 0; $i < 120; $i++): ?>
                    <div class="login-grid-cell"></div>
                <?php endfor; ?>
            </div>

            <!-- Floating map pins decoration -->
            <div class="login-pins" aria-hidden="true">
                <div class="login-pin login-pin-1"><i data-lucide="map-pin"></i></div>
                <div class="login-pin login-pin-2"><i data-lucide="shield-alert"></i></div>
                <div class="login-pin login-pin-3"><i data-lucide="route"></i></div>
                <div class="login-pin login-pin-4"><i data-lucide="map-pin"></i></div>
            </div>

            <div class="login-panel-content">
                <div class="login-panel-brand">
                    <div class="login-panel-logo">
                        <i data-lucide="map-pin"></i>
                    </div>
                    <span>TURS</span>
                </div>
                <h1 class="login-panel-title">Transport &amp;<br><em>Urban Resilience</em><br>System</h1>
                <p class="login-panel-desc">
                    A centralized platform for monitoring transport networks,
                    access points, and disaster risk zones across your locality.
                </p>
                <div class="login-panel-features">
                    <div class="login-feature">
                        <i data-lucide="map-pin"></i>
                        <span>Access Point Management</span>
                    </div>
                    <div class="login-feature">
                        <i data-lucide="route"></i>
                        <span>Transport Route Monitoring</span>
                    </div>
                    <div class="login-feature">
                        <i data-lucide="shield-alert"></i>
                        <span>Disaster Risk Zone Tracking</span>
                    </div>
                </div>
            </div>

            <div class="login-panel-footer">
                <a href="map.php">
                    <i data-lucide="globe"></i>
                    View Public Map
                </a>
            </div>

        </div>

        <!-- ── Right Panel — Form ────────────────────────── -->
        <div class="login-form-panel">

            <div class="login-form-wrap">

                <div class="login-form-header">
                    <h2>Administrator Sign In</h2>
                    <p>Enter your credentials to access the admin panel</p>
                </div>

                <?php if ($error): ?>
                    <div class="login-alert" id="loginAlert">
                        <i data-lucide="alert-circle"></i>
                        <span><?= htmlspecialchars($error) ?></span>
                    </div>
                <?php endif; ?>

                <form method="POST" action="login.php" id="loginForm" novalidate>

                    <div class="login-field" id="fieldEmail">
                        <label for="email">
                            <i data-lucide="mail"></i>
                            Email Address
                        </label>
                        <div class="login-input-wrap">
                            <input
                                type="email"
                                id="email"
                                name="email"
                                placeholder="yourname@example.com"
                                value="<?= htmlspecialchars($_POST['email'] ?? '') ?>"
                                autocomplete="email"
                                autofocus
                            >
                        </div>
                        <span class="login-field-error" id="emailError"></span>
                    </div>

                    <div class="login-field" id="fieldPassword">
                        <label for="password">
                            <i data-lucide="lock"></i>
                            Password
                        </label>
                        <div class="login-input-wrap">
                            <input
                                type="password"
                                id="password"
                                name="password"
                                placeholder="••••••••"
                                autocomplete="current-password"
                            >
                            <button type="button" class="login-toggle-pw" id="togglePassword" title="Show/hide password">
                                <i data-lucide="eye" id="pwIcon"></i>
                            </button>
                        </div>
                        <span class="login-field-error" id="passwordError"></span>
                    </div>

                    <button type="submit" class="login-btn" id="loginBtn">
                        <span class="login-btn-text">Sign In</span>
                        <span class="login-btn-icon">
                            <i data-lucide="arrow-right"></i>
                        </span>
                        <span class="login-btn-loader" id="loginLoader" aria-hidden="true"></span>
                    </button>

                </form>

                <div class="login-form-footer">
                    <a href="index.php">
                        <i data-lucide="map"></i>
                        Go to Landing Page
                    </a>
                </div>

            </div>

        </div>

    </div>

    <script src="assets/js/login.js"></script>
    <script>lucide.createIcons();</script>
</body>
</html>