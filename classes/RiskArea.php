<?php
require_once __DIR__ . '/AuditLog.php';

class RiskArea {

    private PDO      $conn;
    private AuditLog $audit;

    // Photo upload config (shared directory with access points)
    const UPLOAD_DIR      = __DIR__ . '/../assets/uploads/photos/';
    const UPLOAD_URL_BASE = 'assets/uploads/photos/';
    const MAX_FILE_SIZE   = 5 * 1024 * 1024; // 5 MB
    const ALLOWED_TYPES   = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    public function __construct(PDO $conn) {
        $this->conn  = $conn;
        $this->audit = new AuditLog($conn);
    }

    // getAll()
    // Returns all disaster zones, optionally filtered.
    // Excludes resolved zones from public map but returns all for admin.
    public function getAll(array $filters = []): array {
        $where  = ['1=1'];
        $params = [];

        if (!empty($filters['zone_type'])) {
            $where[]             = 'dz.zone_type = :zone_type';
            $params[':zone_type'] = $filters['zone_type'];
        }

        if (!empty($filters['severity'])) {
            $where[]             = 'dz.severity = :severity';
            $params[':severity'] = $filters['severity'];
        }

        if (!empty($filters['status'])) {
            $where[]           = 'dz.status = :status';
            $params[':status'] = $filters['status'];
        }

        if (!empty($filters['search'])) {
            $where[]           = '(dz.zone_name LIKE :search OR dz.description LIKE :search)';
            $params[':search'] = '%' . $filters['search'] . '%';
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->conn->prepare("
            SELECT
                dz.zone_id,
                dz.zone_name,
                dz.zone_type,
                dz.severity,
                dz.latitude,
                dz.longitude,
                dz.radius_meters,
                dz.description,
                dz.photo_url,
                dz.status,
                dz.reported_at,
                dz.resolved_at,
                c.full_name AS created_by_name,
                u.full_name AS updated_by_name
            FROM disaster_zones dz
            LEFT JOIN users c ON dz.created_by = c.user_id
            LEFT JOIN users u ON dz.updated_by = u.user_id
            WHERE $whereClause
            ORDER BY dz.reported_at DESC
        ");

        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    // getById()
    // Returns a single disaster zone record.
    public function getById(int $id): ?array {
        $stmt = $this->conn->prepare("
            SELECT
                dz.*,
                c.full_name AS created_by_name,
                u.full_name AS updated_by_name
            FROM disaster_zones dz
            LEFT JOIN users c ON dz.created_by = c.user_id
            LEFT JOIN users u ON dz.updated_by = u.user_id
            WHERE dz.zone_id = :id
            LIMIT 1
        ");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    // create()
    // Creates a new disaster zone and logs the creation.
    public function create(array $data, int $userId): int {
        $stmt = $this->conn->prepare("
            INSERT INTO disaster_zones
                (zone_name, zone_type, severity, latitude, longitude,
                 radius_meters, description, photo_url, status,
                 created_by, updated_by, reported_at)
            VALUES
                (:zone_name, :zone_type, :severity, :latitude, :longitude,
                 :radius_meters, :description, :photo_url, :status,
                 :created_by, :updated_by, NOW())
        ");

        $stmt->execute([
            ':zone_name'     => $data['zone_name'],
            ':zone_type'     => $data['zone_type'],
            ':severity'      => $data['severity'],
            ':latitude'      => $data['latitude'],
            ':longitude'     => $data['longitude'],
            ':radius_meters' => $data['radius_meters'] ?? 100,
            ':description'   => $data['description']   ?? null,
            ':photo_url'     => $data['photo_url']     ?? null,
            ':status'        => $data['status']        ?? 'active',
            ':created_by'    => $userId,
            ':updated_by'    => $userId,
        ]);

        $newId = (int) $this->conn->lastInsertId();

        $new = $this->getById($newId);
        $this->audit->log($userId, 'create', 'disaster_zones', $newId, null, $new);

        return $newId;
    }

    // update()
    // Updates a disaster zone and logs old → new.
    // Does NOT change resolved_at — use resolve() for that.
    public function update(int $id, array $data, int $userId): bool {
        $old = $this->getById($id);
        if (!$old) return false;

        $stmt = $this->conn->prepare("
            UPDATE disaster_zones SET
                zone_name     = :zone_name,
                zone_type     = :zone_type,
                severity      = :severity,
                latitude      = :latitude,
                longitude     = :longitude,
                radius_meters = :radius_meters,
                description   = :description,
                photo_url     = :photo_url,
                status        = :status,
                updated_by    = :updated_by
            WHERE zone_id = :id
        ");

        $result = $stmt->execute([
            ':zone_name'     => $data['zone_name'],
            ':zone_type'     => $data['zone_type'],
            ':severity'      => $data['severity'],
            ':latitude'      => $data['latitude'],
            ':longitude'     => $data['longitude'],
            ':radius_meters' => $data['radius_meters'] ?? $old['radius_meters'],
            ':description'   => $data['description']   ?? null,
            ':photo_url'     => $data['photo_url']     ?? $old['photo_url'],
            ':status'        => $data['status']        ?? $old['status'],
            ':updated_by'    => $userId,
            ':id'            => $id,
        ]);

        if ($result) {
            $new = $this->getById($id);
            $this->audit->log($userId, 'update', 'disaster_zones', $id, $old, $new);
        }

        return $result;
    }

    // resolve()
    // Marks a zone as resolved and stamps resolved_at = NOW().
    // Resolved zones are hidden from the public map but kept in admin.
    public function resolve(int $id, int $userId): bool {
        $old = $this->getById($id);
        if (!$old) return false;
        if ($old['status'] === 'resolved') return true; // already resolved

        $stmt = $this->conn->prepare("
            UPDATE disaster_zones SET
                status      = 'resolved',
                resolved_at = NOW(),
                updated_by  = :updated_by
            WHERE zone_id = :id
        ");

        $result = $stmt->execute([':updated_by' => $userId, ':id' => $id]);

        if ($result) {
            $new = $this->getById($id);
            $this->audit->log($userId, 'update', 'disaster_zones', $id, $old, $new);
        }

        return $result;
    }

    // delete()
    // Permanently deletes a disaster zone and logs the old snapshot.
    // Also removes any associated photo file from disk.
    public function delete(int $id, int $userId): bool {
        $old = $this->getById($id);
        if (!$old) return false;

        $stmt = $this->conn->prepare("
            DELETE FROM disaster_zones WHERE zone_id = :id
        ");
        $result = $stmt->execute([':id' => $id]);

        if ($result) {
            if (!empty($old['photo_url'])) {
                $filePath = __DIR__ . '/../' . $old['photo_url'];
                if (file_exists($filePath)) {
                    @unlink($filePath);
                }
            }
            $this->audit->log($userId, 'delete', 'disaster_zones', $id, $old, null);
        }

        return $result;
    }

    // uploadPhoto()
    // Handles photo file upload from $_FILES.
    // Returns the relative URL string on success, or throws.
    public function uploadPhoto(array $file): string {
        if (!is_dir(self::UPLOAD_DIR)) {
            mkdir(self::UPLOAD_DIR, 0755, true);
        }

        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new RuntimeException('File upload failed with error code: ' . $file['error']);
        }

        if ($file['size'] > self::MAX_FILE_SIZE) {
            throw new RuntimeException('File exceeds the 5 MB size limit.');
        }

        $finfo    = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);

        if (!in_array($mimeType, self::ALLOWED_TYPES, true)) {
            throw new RuntimeException('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
        }

        $ext = match ($mimeType) {
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
            'image/gif'  => 'gif',
            default      => 'jpg',
        };
        $filename = bin2hex(random_bytes(12)) . '.' . $ext;
        $destPath = self::UPLOAD_DIR . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            throw new RuntimeException('Failed to save uploaded file.');
        }

        return self::UPLOAD_URL_BASE . $filename;
    }

    // getZoneTypes()
    // Returns valid zone_type values with display labels.
    public static function getZoneTypes(): array {
        return [
            'flood'         => 'Flood',
            'landslide'     => 'Landslide',
            'accident'      => 'Accident',
            'road_closure'  => 'Road Closure',
            'other'         => 'Other',
        ];
    }

    // getSeverityLevels()
    // Returns valid severity values with display labels.
    public static function getSeverityLevels(): array {
        return [
            'low'      => 'Low',
            'moderate' => 'Moderate',
            'high'     => 'High',
            'critical' => 'Critical',
        ];
    }
}