<?php
require_once '../includes/db.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache');

try {

    // ── Total transport terminals ───────────────────────────
    $stmt = $conn->query("
        SELECT COUNT(*) AS total
        FROM access_points
        WHERE category = 'transport'
          AND status = 'active'
    ");
    $total_terminals = (int) $stmt->fetch()['total'];

    // ── Total emergency access points ───────────────────────
    $stmt = $conn->query("
        SELECT COUNT(*) AS total
        FROM access_points
        WHERE category = 'emergency'
          AND status = 'active'
    ");
    $total_emergency = (int) $stmt->fetch()['total'];

    // ── Total public facilities ─────────────────────────────
    $stmt = $conn->query("
        SELECT COUNT(*) AS total
        FROM access_points
        WHERE category = 'facility'
          AND status = 'active'
    ");
    $total_facilities = (int) $stmt->fetch()['total'];

    // ── Active risk areas ───────────────────────────────────
    $stmt = $conn->query("
        SELECT COUNT(*) AS total
        FROM disaster_zones
        WHERE status = 'active'
    ");
    $active_risk_areas = (int) $stmt->fetch()['total'];

    // ── Total routes ────────────────────────────────────────
    $stmt = $conn->query("
        SELECT COUNT(*) AS total
        FROM routes
        WHERE status = 'active'
    ");
    $total_routes = (int) $stmt->fetch()['total'];

    // ── Route status breakdown ──────────────────────────────
    $stmt = $conn->query("
        SELECT status, COUNT(*) AS total
        FROM routes
        GROUP BY status
    ");
    $route_breakdown = [];
    foreach ($stmt->fetchAll() as $row) {
        $route_breakdown[$row['status']] = (int) $row['total'];
    }

    // ── Risk area type breakdown ────────────────────────────
    $stmt = $conn->query("
        SELECT zone_type, COUNT(*) AS total
        FROM disaster_zones
        WHERE status = 'active'
        GROUP BY zone_type
    ");
    $risk_breakdown = [];
    foreach ($stmt->fetchAll() as $row) {
        $risk_breakdown[$row['zone_type']] = (int) $row['total'];
    }

    // ── Recent audit log entries (last 10) ──────────────────
    $stmt = $conn->query("
        SELECT
            al.log_id,
            al.action,
            al.table_name,
            al.record_id,
            al.performed_at,
            u.full_name,
            u.username
        FROM audit_logs al
        JOIN users u ON al.user_id = u.user_id
        ORDER BY al.performed_at DESC
        LIMIT 10
    ");
    $recent_activity = $stmt->fetchAll();

    // ── Build response ──────────────────────────────────────
    echo json_encode([
        'success'             => true,
        'total_access_points' => $total_terminals + $total_emergency + $total_facilities,
        'total_terminals'     => $total_terminals,
        'total_emergency'     => $total_emergency,
        'total_facilities'    => $total_facilities,
        'active_risk_areas'   => $active_risk_areas,
        'total_routes'        => $total_routes,
        'route_breakdown'     => $route_breakdown,
        'risk_breakdown'      => $risk_breakdown,
        'recent_activity'     => $recent_activity,
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch summary data.',
    ]);
}