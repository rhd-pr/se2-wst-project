<?php

require_once '../includes/db.php';
require_once '../classes/AccessPoint.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache');

$method = $_SERVER['REQUEST_METHOD'];

// Method override — allows POST to act as PUT (needed for FormData file uploads)
if ($method === 'POST' && !empty($_POST['_method']) && $_POST['_method'] === 'PUT') {
    $method = 'PUT_FORM'; // distinguish from JSON PUT
}

$ap     = new AccessPoint($conn);

// ── Helpers ─────────────────────────────────────────────────
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

// ── GET — fetch access points (public) ──────────────────────
if ($method === 'GET') {
    try {
        $filters = [];

        if (!empty($_GET['category'])) $filters['category'] = $_GET['category'];
        if (!empty($_GET['status']))   $filters['status']   = $_GET['status'];
        if (!empty($_GET['sub_type'])) $filters['sub_type'] = $_GET['sub_type'];
        if (!empty($_GET['search']))   $filters['search']   = $_GET['search'];

        // Single record by ID
        if (!empty($_GET['id'])) {
            $record = $ap->getById((int) $_GET['id']);
            if (!$record) jsonError('Access point not found.', 404);
            jsonSuccess(['access_point' => $record]);
        }

        $records = $ap->getAll($filters);
        jsonSuccess(['access_points' => $records]);

    } catch (PDOException $e) {
        jsonError('Failed to fetch access points.', 500);
    }
}

// ── POST — create access point (admin) ──────────────────────
if ($method === 'POST') {
    $user = requireAdmin();

    try {
        // Handle multipart/form-data (file upload possible)
        $data = [
            'name'        => trim($_POST['name']        ?? ''),
            'category'    => trim($_POST['category']    ?? ''),
            'sub_type'    => trim($_POST['sub_type']    ?? ''),
            'latitude'    => $_POST['latitude']          ?? null,
            'longitude'   => $_POST['longitude']         ?? null,
            'address'     => trim($_POST['address']     ?? ''),
            'description' => trim($_POST['description'] ?? ''),
            'status'      => trim($_POST['status']      ?? 'active'),
            'photo_url'   => null,
        ];

        // Validate required fields
        if (empty($data['name']))      jsonError('Name is required.');
        if (empty($data['category']))  jsonError('Category is required.');
        if (empty($data['sub_type']))  jsonError('Sub-type is required.');
        if ($data['latitude']  === null || $data['latitude']  === '') jsonError('Latitude is required.');
        if ($data['longitude'] === null || $data['longitude'] === '') jsonError('Longitude is required.');

        // Validate category
        $validCategories = ['transport', 'emergency', 'facility'];
        if (!in_array($data['category'], $validCategories, true)) {
            jsonError('Invalid category.');
        }

        // Validate sub_type belongs to category
        $subTypes = AccessPoint::getSubTypes();
        if (!in_array($data['sub_type'], $subTypes[$data['category']] ?? [], true)) {
            jsonError('Invalid sub-type for the selected category.');
        }

        // Photo upload (optional)
        if (!empty($_FILES['photo']) && $_FILES['photo']['error'] !== UPLOAD_ERR_NO_FILE) {
            $data['photo_url'] = $ap->uploadPhoto($_FILES['photo']);
        }

        $newId = $ap->create($data, $user['user_id']);
        $record = $ap->getById($newId);

        jsonSuccess([
            'message'      => 'Access point created successfully.',
            'access_point' => $record,
        ]);

    } catch (RuntimeException $e) {
        jsonError($e->getMessage());
    } catch (PDOException $e) {
        jsonError('Failed to create access point.', 500);
    }
}

// ── PUT — update access point (admin) ───────────────────────
if ($method === 'PUT') {
    $user = requireAdmin();

    try {
        // PUT requests send JSON body
        $body = json_decode(file_get_contents('php://input'), true);
        if (!$body) jsonError('Invalid request body.');

        $id = (int) ($body['access_point_id'] ?? $_GET['id'] ?? 0);
        if ($id <= 0) jsonError('Access point ID is required.');

        $existing = $ap->getById($id);
        if (!$existing) jsonError('Access point not found.', 404);

        $data = [
            'name'        => trim($body['name']        ?? ''),
            'category'    => trim($body['category']    ?? ''),
            'sub_type'    => trim($body['sub_type']    ?? ''),
            'latitude'    => $body['latitude']          ?? null,
            'longitude'   => $body['longitude']         ?? null,
            'address'     => trim($body['address']     ?? ''),
            'description' => trim($body['description'] ?? ''),
            'status'      => trim($body['status']      ?? 'active'),
            'photo_url'   => $body['photo_url']         ?? $existing['photo_url'],
        ];

        // Validate required fields
        if (empty($data['name']))     jsonError('Name is required.');
        if (empty($data['category'])) jsonError('Category is required.');
        if (empty($data['sub_type'])) jsonError('Sub-type is required.');
        if ($data['latitude']  === null) jsonError('Latitude is required.');
        if ($data['longitude'] === null) jsonError('Longitude is required.');

        $validCategories = ['transport', 'emergency', 'facility'];
        if (!in_array($data['category'], $validCategories, true)) {
            jsonError('Invalid category.');
        }

        $subTypes = AccessPoint::getSubTypes();
        if (!in_array($data['sub_type'], $subTypes[$data['category']] ?? [], true)) {
            jsonError('Invalid sub-type for the selected category.');
        }

        $ap->update($id, $data, $user['user_id']);
        $updated = $ap->getById($id);

        jsonSuccess([
            'message'      => 'Access point updated successfully.',
            'access_point' => $updated,
        ]);

    } catch (PDOException $e) {
        jsonError('Failed to update access point.', 500);
    }
}

// ── PUT_FORM — update via FormData with optional photo upload ─
if ($method === 'PUT_FORM') {
    $user = requireAdmin();

    try {
        $id = (int) ($_POST['access_point_id'] ?? 0);
        if ($id <= 0) jsonError('Access point ID is required.');

        $existing = $ap->getById($id);
        if (!$existing) jsonError('Access point not found.', 404);

        $data = [
            'name'        => trim($_POST['name']        ?? ''),
            'category'    => trim($_POST['category']    ?? ''),
            'sub_type'    => trim($_POST['sub_type']    ?? ''),
            'latitude'    => $_POST['latitude']          ?? null,
            'longitude'   => $_POST['longitude']         ?? null,
            'address'     => trim($_POST['address']     ?? ''),
            'description' => trim($_POST['description'] ?? ''),
            'status'      => trim($_POST['status']      ?? 'active'),
            'photo_url'   => $existing['photo_url'],
        ];

        // Validate required fields
        if (empty($data['name']))     jsonError('Name is required.');
        if (empty($data['category'])) jsonError('Category is required.');
        if (empty($data['sub_type'])) jsonError('Sub-type is required.');
        if ($data['latitude']  === null || $data['latitude']  === '') jsonError('Latitude is required.');
        if ($data['longitude'] === null || $data['longitude'] === '') jsonError('Longitude is required.');

        $validCategories = ['transport', 'emergency', 'facility'];
        if (!in_array($data['category'], $validCategories, true)) {
            jsonError('Invalid category.');
        }

        $subTypes = AccessPoint::getSubTypes();
        if (!in_array($data['sub_type'], $subTypes[$data['category']] ?? [], true)) {
            jsonError('Invalid sub-type for the selected category.');
        }

        // Handle photo upload (new photo replaces existing)
        if (!empty($_FILES['photo']) && $_FILES['photo']['error'] !== UPLOAD_ERR_NO_FILE) {
            // Delete old photo file if it exists
            if (!empty($existing['photo_url'])) {
                $oldPath = __DIR__ . '/../' . $existing['photo_url'];
                if (file_exists($oldPath)) @unlink($oldPath);
            }
            $data['photo_url'] = $ap->uploadPhoto($_FILES['photo']);
        }

        // Clear photo if requested (remove button was clicked)
        if (!empty($_POST['clear_photo'])) {
            if (!empty($existing['photo_url'])) {
                $oldPath = __DIR__ . '/../' . $existing['photo_url'];
                if (file_exists($oldPath)) @unlink($oldPath);
            }
            $data['photo_url'] = null;
        }

        $ap->update($id, $data, $user['user_id']);
        $updated = $ap->getById($id);

        jsonSuccess([
            'message'      => 'Access point updated successfully.',
            'access_point' => $updated,
        ]);

    } catch (RuntimeException $e) {
        jsonError($e->getMessage());
    } catch (PDOException $e) {
        jsonError('Failed to update access point.', 500);
    }
}

// ── DELETE — delete access point (admin) ────────────────────
if ($method === 'DELETE') {
    $user = requireAdmin();

    try {
        $id = (int) ($_GET['id'] ?? 0);
        if ($id <= 0) jsonError('Access point ID is required.');

        $existing = $ap->getById($id);
        if (!$existing) jsonError('Access point not found.', 404);

        $ap->delete($id, $user['user_id']);

        jsonSuccess(['message' => 'Access point deleted successfully.']);

    } catch (PDOException $e) {
        jsonError('Failed to delete access point.', 500);
    }
}

jsonError('Method not allowed.', 405);