<?php
// Suppress all PHP error output — errors must never corrupt JSON response
error_reporting(0);
ini_set('display_errors', '0');

// Catch fatal errors and return JSON instead of HTML
register_shutdown_function(function () {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (!headers_sent()) header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Server error: ' . $err['message'],
            'file'    => basename($err['file']),
            'line'    => $err['line'],
        ]);
    }
});

// Start session before any output
if (session_status() === PHP_SESSION_NONE) session_start();

require_once '../includes/db.php';
require_once '../classes/User.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache');

function jsonSuccess(array $data = []): void {
    echo json_encode(array_merge(['success' => true], $data)); exit;
}
function jsonError(string $msg, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $msg]); exit;
}
function requireAdmin(): array {
    require_once '../classes/Auth.php';
    $auth = new Auth();
    if (!$auth->isAdmin()) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized.']); exit;
    }
    return $auth->getUser();
}

$actor  = requireAdmin();
$method = $_SERVER['REQUEST_METHOD'];
$user   = new User($conn);

// ── GET ─────────────────────────────────────────────────────────
if ($method === 'GET') {
    if (!empty($_GET['id'])) {
        $row = $user->getById((int) $_GET['id']);
        if (!$row) jsonError('User not found.', 404);
        jsonSuccess(['user' => $row]);
    }

    $filters = [];
    if (!empty($_GET['search'])) $filters['search'] = $_GET['search'];

    jsonSuccess(['users' => $user->getAll($filters)]);
}

// ── POST (create) ────────────────────────────────────────────────
if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) jsonError('Invalid JSON.');

    if (empty($data['username']))  jsonError('Username is required.');
    if (empty($data['email']))     jsonError('Email is required.');
    if (empty($data['password']))  jsonError('Password is required.');
    if (strlen($data['password']) < 6) jsonError('Password must be at least 6 characters.');

    // Force role to admin — viewers are no longer a valid role
    $data['role'] = 'admin';

    try {
        $newId = $user->create($data, $actor['user_id']);
        $new   = $user->getById($newId);
        jsonSuccess(['message' => 'User created successfully.', 'user' => $new]);
    } catch (RuntimeException $e) {
        jsonError($e->getMessage());
    } catch (PDOException $e) {
        jsonError('Failed to create user.', 500);
    }
}

// ── PUT (update) ─────────────────────────────────────────────────
if ($method === 'PUT') {
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) jsonError('User ID is required.');

    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) jsonError('Invalid JSON.');

    if (empty($data['username']))  jsonError('Username is required.');
    if (empty($data['email']))     jsonError('Email is required.');
    if (!empty($data['password']) && strlen($data['password']) < 6) {
        jsonError('Password must be at least 6 characters.');
    }

    // Force role to admin
    $data['role'] = 'admin';

    try {
        $user->update($id, $data, $actor['user_id']);
        $updated = $user->getById($id);
        jsonSuccess(['message' => 'User updated successfully.', 'user' => $updated]);
    } catch (RuntimeException $e) {
        jsonError($e->getMessage());
    } catch (PDOException $e) {
        jsonError('Failed to update user.', 500);
    }
}

// ── DELETE ───────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) jsonError('User ID is required.');

    try {
        $user->delete($id, $actor['user_id']);
        jsonSuccess(['message' => 'User deleted successfully.']);
    } catch (RuntimeException $e) {
        jsonError($e->getMessage());
    } catch (PDOException $e) {
        jsonError('Failed to delete user.', 500);
    }
}

jsonError('Method not allowed.', 405);