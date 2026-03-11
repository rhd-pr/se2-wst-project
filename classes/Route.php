<?php
require_once __DIR__ . '/AuditLog.php';

class Route {

    private PDO      $conn;
    private AuditLog $audit;

    public function __construct(PDO $conn) {
        $this->conn  = $conn;
        $this->audit = new AuditLog($conn);
    }

    // getAll()
    // Fetch all routes with origin/destination terminal names.
    // Returns each route WITHOUT points (lightweight for table).
    public function getAll(array $filters = []): array {
        $where  = ['1=1'];
        $params = [];

        if (!empty($filters['status'])) {
            $where[]           = 'r.status = :status';
            $params[':status'] = $filters['status'];
        }

        if (!empty($filters['route_type'])) {
            $where[]               = 'r.route_type = :route_type';
            $params[':route_type'] = $filters['route_type'];
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->conn->prepare("
            SELECT
                r.route_id,
                r.route_name,
                r.route_type,
                r.description,
                r.status,
                r.created_at,
                r.updated_at,
                origin.name        AS origin_name,
                origin.address     AS origin_address,
                dest.name          AS destination_name,
                dest.address       AS destination_address,
                r.origin_terminal_id,
                r.destination_terminal_id,
                cu.full_name       AS created_by_name,
                uu.full_name       AS updated_by_name
            FROM routes r
            LEFT JOIN access_points origin ON r.origin_terminal_id      = origin.access_point_id
            LEFT JOIN access_points dest   ON r.destination_terminal_id = dest.access_point_id
            LEFT JOIN users cu ON r.created_by = cu.user_id
            LEFT JOIN users uu ON r.updated_by = uu.user_id
            WHERE $whereClause
            ORDER BY r.created_at DESC
        ");

        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    // getById()
    // Fetch a single route with its full route_points array.
    // Used by the API GET ?id= and for edit pre-fill.
    public function getById(int $id): ?array {
        $stmt = $this->conn->prepare("
            SELECT
                r.route_id,
                r.route_name,
                r.route_type,
                r.description,
                r.status,
                r.created_at,
                r.updated_at,
                origin.name        AS origin_name,
                dest.name          AS destination_name,
                r.origin_terminal_id,
                r.destination_terminal_id,
                cu.full_name       AS created_by_name,
                uu.full_name       AS updated_by_name
            FROM routes r
            LEFT JOIN access_points origin ON r.origin_terminal_id      = origin.access_point_id
            LEFT JOIN access_points dest   ON r.destination_terminal_id = dest.access_point_id
            LEFT JOIN users cu ON r.created_by = cu.user_id
            LEFT JOIN users uu ON r.updated_by = uu.user_id
            WHERE r.route_id = :id
            LIMIT 1
        ");
        $stmt->execute([':id' => $id]);
        $route = $stmt->fetch();

        if (!$route) return null;

        // Attach ordered points
        $route['points'] = $this->getPoints($id);
        return $route;
    }

    // getAllWithPoints()
    // Fetch all routes each with their points array.
    // Used by the public map API to render polylines.
    public function getAllWithPoints(array $filters = []): array {
        $routes = $this->getAll($filters);

        foreach ($routes as &$route) {
            $route['points'] = $this->getPoints($route['route_id']);
        }

        return $routes;
    }

    // getPoints()
    // Returns ordered lat/lng pairs for a route.
    public function getPoints(int $routeId): array {
        $stmt = $this->conn->prepare("
            SELECT latitude, longitude, sequence_order
            FROM route_points
            WHERE route_id = :route_id
            ORDER BY sequence_order ASC
        ");
        $stmt->execute([':route_id' => $routeId]);
        return $stmt->fetchAll();
    }

    // getTerminals()
    // Returns all active transport access points for origin/destination dropdowns.
    public function create(array $data, array $points, int $userId): int {
        $stmt = $this->conn->prepare("
            INSERT INTO routes
                (route_name, route_type, origin_terminal_id, destination_terminal_id,
                 description, status, created_by, updated_by, created_at, updated_at)
            VALUES
                (:route_name, :route_type, :origin_terminal_id, :destination_terminal_id,
                 :description, :status, :created_by, :updated_by, NOW(), NOW())
        ");

        $stmt->execute([
            ':route_name'             => $data['route_name'],
            ':route_type'             => $data['route_type'],
            ':origin_terminal_id'     => $data['origin_terminal_id']      ?: null,
            ':destination_terminal_id'=> $data['destination_terminal_id'] ?: null,
            ':description'            => $data['description'] ?? null,
            ':status'                 => $data['status']      ?? 'active',
            ':created_by'             => $userId,
            ':updated_by'             => $userId,
        ]);

        $newId = (int) $this->conn->lastInsertId();

        // Save route points
        $this->savePoints($newId, $points);

        // Audit log
        $new = $this->getById($newId);
        $this->audit->log($userId, 'create', 'routes', $newId, null, $new);

        return $newId;
    }

    // update()
    // Update route data and replace all route_points.
    public function update(int $id, array $data, array $points, int $userId): bool {
        $old = $this->getById($id);
        if (!$old) return false;

        $stmt = $this->conn->prepare("
            UPDATE routes SET
                route_name              = :route_name,
                route_type              = :route_type,
                origin_terminal_id      = :origin_terminal_id,
                destination_terminal_id = :destination_terminal_id,
                description             = :description,
                status                  = :status,
                updated_by              = :updated_by,
                updated_at              = NOW()
            WHERE route_id = :id
        ");

        $result = $stmt->execute([
            ':route_name'             => $data['route_name'],
            ':route_type'             => $data['route_type'],
            ':origin_terminal_id'     => $data['origin_terminal_id']      ?: null,
            ':destination_terminal_id'=> $data['destination_terminal_id'] ?: null,
            ':description'            => $data['description'] ?? null,
            ':status'                 => $data['status']      ?? 'active',
            ':updated_by'             => $userId,
            ':id'                     => $id,
        ]);

        if ($result) {
            // Replace all points (delete old, insert new)
            $this->deletePoints($id);
            if (!empty($points)) {
                $this->savePoints($id, $points);
            }

            $new = $this->getById($id);
            $this->audit->log($userId, 'update', 'routes', $id, $old, $new);
        }

        return $result;
    }

    // delete()
    // Delete route — route_points cascade via FK ON DELETE CASCADE.
    public function delete(int $id, int $userId): bool {
        $old = $this->getById($id);
        if (!$old) return false;

        $stmt   = $this->conn->prepare("DELETE FROM routes WHERE route_id = :id");
        $result = $stmt->execute([':id' => $id]);

        if ($result) {
            $this->audit->log($userId, 'delete', 'routes', $id, $old, null);
        }

        return $result;
    }

    // savePoints()
    // Bulk-insert ordered route_points for a route.
    private function savePoints(int $routeId, array $points): void {
        if (empty($points)) return;

        $stmt = $this->conn->prepare("
            INSERT INTO route_points (route_id, latitude, longitude, sequence_order)
            VALUES (:route_id, :latitude, :longitude, :sequence_order)
        ");

        foreach ($points as $order => $point) {
            $stmt->execute([
                ':route_id'       => $routeId,
                ':latitude'       => $point[0] ?? $point['lat'],
                ':longitude'      => $point[1] ?? $point['lng'],
                ':sequence_order' => $order,
            ]);
        }
    }

    // deletePoints()
    // Remove all route_points for a route (used before re-inserting on update).
    private function deletePoints(int $routeId): void {
        $stmt = $this->conn->prepare("DELETE FROM route_points WHERE route_id = :route_id");
        $stmt->execute([':route_id' => $routeId]);
    }

    // getTerminals()
    // Returns all active transport access points for origin/destination dropdowns.
    public function getTerminals(): array {
        $stmt = $this->conn->query("
            SELECT access_point_id, name, sub_type, address
            FROM access_points
            WHERE category = 'transport'
              AND status   = 'active'
            ORDER BY name ASC
        ");
        return $stmt->fetchAll();
    }
}