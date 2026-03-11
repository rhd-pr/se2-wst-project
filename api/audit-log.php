<?php
if (session_status() === PHP_SESSION_NONE) session_start();

require_once '../includes/db.php';
require_once '../classes/Auth.php';
require_once '../classes/AuditLog.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache');

// Admin only
$auth = new Auth();
if (!$auth->isAdmin()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$auditLog = new AuditLog($conn);

$page    = max(1, (int) ($_GET['page']     ?? 1));
$perPage = min(100, max(5, (int) ($_GET['per_page'] ?? 20)));
$action  = trim($_GET['action'] ?? '');
$table   = trim($_GET['table']  ?? '');
$userId  = (int) ($_GET['user_id'] ?? 0);

try {
    $result = $auditLog->getAll($page, $perPage, $action, $table, $userId);
    echo json_encode(array_merge(['success' => true], $result));
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to fetch audit log.']);
}