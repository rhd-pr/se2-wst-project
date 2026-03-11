<?php
require_once __DIR__ . '/AuditLog.php';

class AccessPoint {

    private PDO      $conn;
    private AuditLog $audit;

    // Photo upload config
    const UPLOAD_DIR      = __DIR__ . '/../assets/uploads/photos/';
    const UPLOAD_URL_BASE = 'assets/uploads/photos/';
    const MAX_FILE_SIZE   = 5 * 1024 * 1024; // 5 MB
    const ALLOWED_TYPES   = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    public function __construct(PDO $conn) {
        $this->conn  = $conn;
        $this->audit = new AuditLog($conn);
    }

    // getAll()
    // Returns all access points, optionally filtered.
    public function getAll(array $filters = []): array {
        $where  = ['1=1'];
        $params = [];

        if (!empty($filters['category'])) {
            $where[]             = 'ap.category = :category';
            $params[':category'] = $filters['category'];
        }

        if (!empty($filters['status'])) {
            $where[]           = 'ap.status = :status';
            $params[':status'] = $filters['status'];
        }

        if (!empty($filters['sub_type'])) {
            $where[]             = 'ap.sub_type = :sub_type';
            $params[':sub_type'] = $filters['sub_type'];
        }

        if (!empty($filters['search'])) {
            $where[]            = '(ap.name LIKE :search OR ap.address LIKE :search)';
            $params[':search']  = '%' . $filters['search'] . '%';
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->conn->prepare("
            SELECT
                ap.access_point_id,
                ap.name,
                ap.category,
                ap.sub_type,
                ap.latitude,
                ap.longitude,
                ap.address,
                ap.description,
                ap.photo_url,
                ap.status,
                ap.created_at,
                ap.updated_at,
                c.full_name  AS created_by_name,
                u.full_name  AS updated_by_name
            FROM access_points ap
            LEFT JOIN users c ON ap.created_by = c.user_id
            LEFT JOIN users u ON ap.updated_by = u.user_id
            WHERE $whereClause
            ORDER BY ap.created_at DESC
        ");

        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    // getById()
    // Returns a single access point record.
    public function getById(int $id): ?array {
        $stmt = $this->conn->prepare("
            SELECT
                ap.*,
                c.full_name AS created_by_name,
                u.full_name AS updated_by_name
            FROM access_points ap
            LEFT JOIN users c ON ap.created_by = c.user_id
            LEFT JOIN users u ON ap.updated_by = u.user_id
            WHERE ap.access_point_id = :id
            LIMIT 1
        ");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    // create()
    // Creates a new access point and logs the creation.   
    public function create(array $data, int $userId): int {
        $stmt = $this->conn->prepare("
            INSERT INTO access_points
                (name, category, sub_type, latitude, longitude, address, description, photo_url, status, created_by, updated_by, created_at, updated_at)
            VALUES
                (:name, :category, :sub_type, :latitude, :longitude, :address, :description, :photo_url, :status, :created_by, :updated_by, NOW(), NOW())
        ");

        $stmt->execute([
            ':name'        => $data['name'],
            ':category'    => $data['category'],
            ':sub_type'    => $data['sub_type'],
            ':latitude'    => $data['latitude'],
            ':longitude'   => $data['longitude'],
            ':address'     => $data['address']      ?? null,
            ':description' => $data['description']  ?? null,
            ':photo_url'   => $data['photo_url']    ?? null,
            ':status'      => $data['status']       ?? 'active',
            ':created_by'  => $userId,
            ':updated_by'  => $userId,
        ]);

        $newId = (int) $this->conn->lastInsertId();

        // Audit log — fetch the created record as the "new" snapshot
        $new = $this->getById($newId);
        $this->audit->log($userId, 'create', 'access_points', $newId, null, $new);

        return $newId;
    }

    // update()
    // Updates an access point and logs old → new.
    public function update(int $id, array $data, int $userId): bool {
        // Capture old state before change
        $old = $this->getById($id);
        if (!$old) return false;

        $stmt = $this->conn->prepare("
            UPDATE access_points SET
                name        = :name,
                category    = :category,
                sub_type    = :sub_type,
                latitude    = :latitude,
                longitude   = :longitude,
                address     = :address,
                description = :description,
                photo_url   = :photo_url,
                status      = :status,
                updated_by  = :updated_by,
                updated_at  = NOW()
            WHERE access_point_id = :id
        ");

        $result = $stmt->execute([
            ':name'        => $data['name'],
            ':category'    => $data['category'],
            ':sub_type'    => $data['sub_type'],
            ':latitude'    => $data['latitude'],
            ':longitude'   => $data['longitude'],
            ':address'     => $data['address']      ?? null,
            ':description' => $data['description']  ?? null,
            ':photo_url'   => $data['photo_url']    ?? $old['photo_url'],
            ':status'      => $data['status']       ?? 'active',
            ':updated_by'  => $userId,
            ':id'          => $id,
        ]);

        if ($result) {
            $new = $this->getById($id);
            $this->audit->log($userId, 'update', 'access_points', $id, $old, $new);
        }

        return $result;
    }

    // delete()
    // Deletes an access point and logs the old snapshot.
    public function delete(int $id, int $userId): bool {
        $old = $this->getById($id);
        if (!$old) return false;

        $stmt = $this->conn->prepare("
            DELETE FROM access_points WHERE access_point_id = :id
        ");
        $result = $stmt->execute([':id' => $id]);

        if ($result) {
            // Delete associated photo file if it exists
            if (!empty($old['photo_url'])) {
                $filePath = __DIR__ . '/../' . $old['photo_url'];
                if (file_exists($filePath)) {
                    @unlink($filePath);
                }
            }
            $this->audit->log($userId, 'delete', 'access_points', $id, $old, null);
        }

        return $result;
    }

    public function uploadPhoto(array $file): string {
        // Ensure upload directory exists
        if (!is_dir(self::UPLOAD_DIR)) {
            mkdir(self::UPLOAD_DIR, 0755, true);
        }

        // Validate upload error
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new RuntimeException('File upload failed with error code: ' . $file['error']);
        }

        // Validate file size
        if ($file['size'] > self::MAX_FILE_SIZE) {
            throw new RuntimeException('File exceeds the 5 MB size limit.');
        }

        // Validate MIME type from actual file content (not just extension)
        $finfo    = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);

        if (!in_array($mimeType, self::ALLOWED_TYPES, true)) {
            throw new RuntimeException('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
        }

        // Generate unique filename
        $ext      = match ($mimeType) {
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


    public static function getSubTypes(): array {
        return [
            'transport' => [
                'tricycle_terminal',
                'jeepney_terminal',
                'bus_terminal',
                'major_terminal',
            ],
            'emergency' => [
                'hospital',
                'fire_station',
                'police_station',
                'evacuation_center',
            ],
            'facility' => [
                'school',
                'market',
                'barangay_hall',
                'government_building',
            ],
        ];
    }
}