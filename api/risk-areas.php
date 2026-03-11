<?php

require_once '../includes/db.php';
require_once '../classes/RiskArea.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache');

$method = $_SERVER['REQUEST_METHOD'];

// Method override for FormData PUT
if ($method === 'POST' && !empty($_POST['_method']) && $_POST['_method'] === 'PUT') {
    $method = 'PUT_FORM';
}

$ra = new RiskArea($conn);

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

// ── GET ──────────────────────────────────────────────────────
if ($method === 'GET') {
    try {
        // Single record
        if (!empty($_GET['id'])) {
            $zone = $ra->getById((int) $_GET['id']);
            if (!$zone) jsonError('Risk area not found.', 404);
            jsonSuccess(['zone' => $zone]);
        }

        $filters = [];
        if (!empty($_GET['zone_type'])) $filters['zone_type'] = $_GET['zone_type'];
        if (!empty($_GET['severity']))  $filters['severity']  = $_GET['severity'];
        if (!empty($_GET['status']))    $filters['status']    = $_GET['status'];
        if (!empty($_GET['search']))    $filters['search']    = $_GET['search'];

        // Public map: only active zones
        if (empty($_GET['all'])) {
            $filters['status'] = 'active';
        }

        $zones = $ra->getAll($filters);
        jsonSuccess(['zones' => $zones]);

    } catch (PDOException $e) {
        jsonError('Failed to fetch risk areas.', 500);
    }
}

// ── POST — create zone ────────────────────────────────────────
if ($method === 'POST') {
    $user = requireAdmin();

    try {
        $data = [
            'zone_name'     => trim($_POST['zone_name']     ?? ''),
            'zone_type'     => trim($_POST['zone_type']     ?? ''),
            'severity'      => trim($_POST['severity']      ?? ''),
            'latitude'      => $_POST['latitude']            ?? null,
            'longitude'     => $_POST['longitude']           ?? null,
            'radius_meters' => (int) ($_POST['radius_meters'] ?? 100),
            'description'   => trim($_POST['description']   ?? ''),
            'status'        => trim($_POST['status']        ?? 'active'),
            'photo_url'     => null,
        ];

        if (empty($data['zone_name']))                        jsonError('Zone name is required.');
        if (empty($data['zone_type']))                        jsonError('Zone type is required.');
        if (empty($data['severity']))                         jsonError('Severity is required.');
        if ($data['latitude']  === null || $data['latitude']  === '') jsonError('Location is required. Click on the map.');
        if ($data['longitude'] === null || $data['longitude'] === '') jsonError('Location is required. Click on the map.');
        if ($data['radius_meters'] < 50 || $data['radius_meters'] > 50000) jsonError('Radius must be between 50 and 50,000 meters.');

        $validTypes = array_keys(RiskArea::getZoneTypes());
        if (!in_array($data['zone_type'], $validTypes, true)) jsonError('Invalid zone type.');

        $validSeverities = array_keys(RiskArea::getSeverityLevels());
        if (!in_array($data['severity'], $validSeverities, true)) jsonError('Invalid severity level.');

        if (!empty($_FILES['photo']) && $_FILES['photo']['error'] !== UPLOAD_ERR_NO_FILE) {
            $data['photo_url'] = $ra->uploadPhoto($_FILES['photo']);
        }

        $newId = $ra->create($data, $user['user_id']);
        $zone  = $ra->getById($newId);

        jsonSuccess(['message' => 'Risk area created successfully.', 'zone' => $zone]);

    } catch (RuntimeException $e) {
        jsonError($e->getMessage());
    } catch (PDOException $e) {
        jsonError('Failed to create risk area.', 500);
    }
}

// ── PUT — update zone (JSON) ──────────────────────────────────
if ($method === 'PUT') {
    $user = requireAdmin();

    try {
        $body = json_decode(file_get_contents('php://input'), true);
        if (!$body) jsonError('Invalid request body.');

        $id = (int) ($body['zone_id'] ?? $_GET['id'] ?? 0);
        if ($id <= 0) jsonError('Zone ID is required.');

        $existing = $ra->getById($id);
        if (!$existing) jsonError('Risk area not found.', 404);

        $data = [
            'zone_name'     => trim($body['zone_name']     ?? ''),
            'zone_type'     => trim($body['zone_type']     ?? ''),
            'severity'      => trim($body['severity']      ?? ''),
            'latitude'      => $body['latitude']            ?? $existing['latitude'],
            'longitude'     => $body['longitude']           ?? $existing['longitude'],
            'radius_meters' => (int) ($body['radius_meters'] ?? $existing['radius_meters']),
            'description'   => trim($body['description']   ?? ''),
            'status'        => trim($body['status']        ?? $existing['status']),
            'photo_url'     => $body['photo_url']           ?? $existing['photo_url'],
        ];

        if (empty($data['zone_name']))  jsonError('Zone name is required.');
        if (empty($data['zone_type']))  jsonError('Zone type is required.');
        if (empty($data['severity']))   jsonError('Severity is required.');

        $validTypes = array_keys(RiskArea::getZoneTypes());
        if (!in_array($data['zone_type'], $validTypes, true)) jsonError('Invalid zone type.');

        $validSeverities = array_keys(RiskArea::getSeverityLevels());
        if (!in_array($data['severity'], $validSeverities, true)) jsonError('Invalid severity level.');

        $ra->update($id, $data, $user['user_id']);
        $updated = $ra->getById($id);

        jsonSuccess(['message' => 'Risk area updated successfully.', 'zone' => $updated]);

    } catch (PDOException $e) {
        jsonError('Failed to update risk area.', 500);
    }
}

// ── PUT_FORM — update with optional photo ─────────────────────
if ($method === 'PUT_FORM') {
    $user = requireAdmin();

    try {
        $id = (int) ($_POST['zone_id'] ?? 0);
        if ($id <= 0) jsonError('Zone ID is required.');

        $existing = $ra->getById($id);
        if (!$existing) jsonError('Risk area not found.', 404);

        $data = [
            'zone_name'     => trim($_POST['zone_name']     ?? ''),
            'zone_type'     => trim($_POST['zone_type']     ?? ''),
            'severity'      => trim($_POST['severity']      ?? ''),
            'latitude'      => $_POST['latitude']            ?? $existing['latitude'],
            'longitude'     => $_POST['longitude']           ?? $existing['longitude'],
            'radius_meters' => (int) ($_POST['radius_meters'] ?? $existing['radius_meters']),
            'description'   => trim($_POST['description']   ?? ''),
            'status'        => trim($_POST['status']        ?? $existing['status']),
            'photo_url'     => $existing['photo_url'],
        ];

        if (empty($data['zone_name']))  jsonError('Zone name is required.');
        if (empty($data['zone_type']))  jsonError('Zone type is required.');
        if (empty($data['severity']))   jsonError('Severity is required.');

        $validTypes = array_keys(RiskArea::getZoneTypes());
        if (!in_array($data['zone_type'], $validTypes, true)) jsonError('Invalid zone type.');

        $validSeverities = array_keys(RiskArea::getSeverityLevels());
        if (!in_array($data['severity'], $validSeverities, true)) jsonError('Invalid severity level.');

        if (!empty($_FILES['photo']) && $_FILES['photo']['error'] !== UPLOAD_ERR_NO_FILE) {
            if (!empty($existing['photo_url'])) {
                $oldPath = __DIR__ . '/../' . $existing['photo_url'];
                if (file_exists($oldPath)) @unlink($oldPath);
            }
            $data['photo_url'] = $ra->uploadPhoto($_FILES['photo']);
        }

        if (!empty($_POST['clear_photo'])) {
            if (!empty($existing['photo_url'])) {
                $oldPath = __DIR__ . '/../' . $existing['photo_url'];
                if (file_exists($oldPath)) @unlink($oldPath);
            }
            $data['photo_url'] = null;
        }

        $ra->update($id, $data, $user['user_id']);
        $updated = $ra->getById($id);

        jsonSuccess(['message' => 'Risk area updated successfully.', 'zone' => $updated]);

    } catch (RuntimeException $e) {
        jsonError($e->getMessage());
    } catch (PDOException $e) {
        jsonError('Failed to update risk area.', 500);
    }
}

// ── PATCH — resolve zone ──────────────────────────────────────
if ($method === 'PATCH') {
    $user = requireAdmin();

    try {
        $id = (int) ($_GET['id'] ?? 0);
        if ($id <= 0) jsonError('Zone ID is required.');

        $existing = $ra->getById($id);
        if (!$existing) jsonError('Risk area not found.', 404);

        $ra->resolve($id, $user['user_id']);
        $updated = $ra->getById($id);

        jsonSuccess(['message' => 'Zone marked as resolved.', 'zone' => $updated]);

    } catch (PDOException $e) {
        jsonError('Failed to resolve zone.', 500);
    }
}

// ── DELETE — permanently delete zone ─────────────────────────
if ($method === 'DELETE') {
    $user = requireAdmin();

    try {
        $id = (int) ($_GET['id'] ?? 0);
        if ($id <= 0) jsonError('Zone ID is required.');

        $existing = $ra->getById($id);
        if (!$existing) jsonError('Risk area not found.', 404);

        $ra->delete($id, $user['user_id']);

        jsonSuccess(['message' => 'Risk area deleted successfully.']);

    } catch (PDOException $e) {
        jsonError('Failed to delete risk area.', 500);
    }
}

jsonError('Method not allowed.', 405);