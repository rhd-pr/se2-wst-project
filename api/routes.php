<?php
require_once '../includes/db.php';
require_once '../classes/Route.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache');

$method = $_SERVER['REQUEST_METHOD'];
$route  = new Route($conn);

// ── Helpers ──────────────────────────────────────────────────
function jsonSuccess(array $data = []): void {
    echo json_encode(array_merge(['success' => true], $data));
    exit;
}

function jsonError(string $message, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

function requireAdmin(): array {
    require_once '../classes/Auth.php';
    $auth = new Auth();
    if (!$auth->isAdmin()) {
        jsonError('Unauthorized. Admin access required.', 401);
    }
    return $auth->getUser();
}

function validateRouteData(array $data): void {
    if (empty($data['route_name']))  jsonError('Route name is required.');
    if (empty($data['route_type']))  jsonError('Route type is required.');

    $validTypes = ['bus', 'jeepney', 'tricycle', 'mixed'];
    if (!in_array($data['route_type'], $validTypes, true)) {
        jsonError('Invalid route type. Must be: bus, jeepney, tricycle, or mixed.');
    }

    $validStatuses = ['active', 'suspended', 'affected'];
    if (!empty($data['status']) && !in_array($data['status'], $validStatuses, true)) {
        jsonError('Invalid status. Must be: active, suspended, or affected.');
    }
}

// ── GET — fetch routes (public) ───────────────────────────────
if ($method === 'GET') {
    try {
        $filters = [];
        if (!empty($_GET['status']))     $filters['status']     = $_GET['status'];
        if (!empty($_GET['route_type'])) $filters['route_type'] = $_GET['route_type'];

        // Single route with points by ID
        if (!empty($_GET['id'])) {
            $record = $route->getById((int) $_GET['id']);
            if (!$record) jsonError('Route not found.', 404);
            jsonSuccess(['route' => $record]);
        }

        // Terminals list — for origin/destination dropdowns
        if (isset($_GET['terminals'])) {
            $terminals = $route->getTerminals();
            jsonSuccess(['terminals' => $terminals]);
        }

        // All routes with points (for map rendering)
        $records = $route->getAllWithPoints($filters);
        jsonSuccess(['routes' => $records]);

    } catch (PDOException $e) {
        jsonError('Failed to fetch routes.', 500);
    }
}

// ── POST — create route (admin) ───────────────────────────────
if ($method === 'POST') {
    $user = requireAdmin();

    try {
        $body = json_decode(file_get_contents('php://input'), true);
        if (!$body) jsonError('Invalid JSON body.');

        validateRouteData($body);

        // Points array: [ [lat, lng], ... ] or [ {lat, lng}, ... ]
        $points = $body['points'] ?? [];
        if (count($points) < 2) {
            jsonError('A route must have at least 2 points.');
        }

        $data = [
            'route_name'             => trim($body['route_name']),
            'route_type'             => $body['route_type'],
            'origin_terminal_id'     => $body['origin_terminal_id']      ?? null,
            'destination_terminal_id'=> $body['destination_terminal_id'] ?? null,
            'description'            => trim($body['description'] ?? ''),
            'status'                 => $body['status'] ?? 'active',
        ];

        $newId  = $route->create($data, $points, $user['user_id']);
        $record = $route->getById($newId);

        jsonSuccess([
            'message' => 'Route created successfully.',
            'route'   => $record,
        ]);

    } catch (PDOException $e) {
        jsonError('Failed to create route.', 500);
    }
}

// ── PUT — update route (admin) ────────────────────────────────
if ($method === 'PUT') {
    $user = requireAdmin();

    try {
        $body = json_decode(file_get_contents('php://input'), true);
        if (!$body) jsonError('Invalid JSON body.');

        $id = (int) ($body['route_id'] ?? $_GET['id'] ?? 0);
        if ($id <= 0) jsonError('Route ID is required.');

        $existing = $route->getById($id);
        if (!$existing) jsonError('Route not found.', 404);

        validateRouteData($body);

        $points = $body['points'] ?? [];
        if (count($points) < 2) {
            jsonError('A route must have at least 2 points.');
        }

        $data = [
            'route_name'             => trim($body['route_name']),
            'route_type'             => $body['route_type'],
            'origin_terminal_id'     => $body['origin_terminal_id']      ?? null,
            'destination_terminal_id'=> $body['destination_terminal_id'] ?? null,
            'description'            => trim($body['description'] ?? ''),
            'status'                 => $body['status'] ?? 'active',
        ];

        $route->update($id, $data, $points, $user['user_id']);
        $updated = $route->getById($id);

        jsonSuccess([
            'message' => 'Route updated successfully.',
            'route'   => $updated,
        ]);

    } catch (PDOException $e) {
        jsonError('Failed to update route.', 500);
    }
}

// ── DELETE — delete route (admin) ────────────────────────────
if ($method === 'DELETE') {
    $user = requireAdmin();

    try {
        $id = (int) ($_GET['id'] ?? 0);
        if ($id <= 0) jsonError('Route ID is required.');

        $existing = $route->getById($id);
        if (!$existing) jsonError('Route not found.', 404);

        $route->delete($id, $user['user_id']);

        jsonSuccess(['message' => 'Route deleted successfully.']);

    } catch (PDOException $e) {
        jsonError('Failed to delete route.', 500);
    }
}

jsonError('Method not allowed.', 405);