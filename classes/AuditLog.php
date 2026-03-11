<?php
class AuditLog {

    private PDO $conn;

    public function __construct(PDO $conn) {
        $this->conn = $conn;
    }

    public function log(
        int    $userId,
        string $action,
        string $table,
        int    $recordId,
        ?array $old = null,
        ?array $new = null
    ): void {

        $stmt = $this->conn->prepare("
            INSERT INTO audit_logs
                (user_id, action, table_name, record_id, old_values, new_values, performed_at)
            VALUES
                (:user_id, :action, :table_name, :record_id, :old_values, :new_values, NOW())
        ");

        $stmt->execute([
            ':user_id'    => $userId,
            ':action'     => $action,
            ':table_name' => $table,
            ':record_id'  => $recordId,
            ':old_values' => $old !== null ? json_encode($old) : null,
            ':new_values' => $new !== null ? json_encode($new) : null,
        ]);
    }

    // getRecent()
    // Fetch the N most recent log entries, joined with user name.
    // Used by dashboard and audit log viewer.
    public function getRecent(int $limit = 20): array {
        $stmt = $this->conn->prepare("
            SELECT
                al.log_id,
                al.action,
                al.table_name,
                al.record_id,
                al.old_values,
                al.new_values,
                al.performed_at,
                u.user_id,
                u.full_name,
                u.username
            FROM audit_logs al
            JOIN users u ON al.user_id = u.user_id
            ORDER BY al.performed_at DESC
            LIMIT :limit
        ");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    // getAll()
    // Paginated fetch with optional filters.
    // Used by the Audit Logs admin page.
    public function getAll(
        int    $page    = 1,
        int    $perPage = 30,
        string $action  = '',
        string $table   = '',
        int    $userId  = 0
    ): array {

        $offset = ($page - 1) * $perPage;
        $where  = ['1=1'];
        $params = [];

        if ($action) {
            $where[]          = 'al.action = :action';
            $params[':action'] = $action;
        }

        if ($table) {
            $where[]         = 'al.table_name = :table_name';
            $params[':table_name'] = $table;
        }

        if ($userId > 0) {
            $where[]          = 'al.user_id = :user_id';
            $params[':user_id'] = $userId;
        }

        $whereClause = implode(' AND ', $where);

        // Total count for pagination
        $countStmt = $this->conn->prepare("
            SELECT COUNT(*) AS total
            FROM audit_logs al
            WHERE $whereClause
        ");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch()['total'];

        // Paginated rows
        $params[':limit']  = $perPage;
        $params[':offset'] = $offset;

        $stmt = $this->conn->prepare("
            SELECT
                al.log_id,
                al.action,
                al.table_name,
                al.record_id,
                al.old_values,
                al.new_values,
                al.performed_at,
                u.user_id,
                u.full_name,
                u.username
            FROM audit_logs al
            JOIN users u ON al.user_id = u.user_id
            WHERE $whereClause
            ORDER BY al.performed_at DESC
            LIMIT :limit OFFSET :offset
        ");

        foreach ($params as $key => $value) {
            if ($key === ':limit' || $key === ':offset') {
                $stmt->bindValue($key, $value, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($key, $value);
            }
        }

        $stmt->execute();

        return [
            'logs'       => $stmt->fetchAll(),
            'total'      => $total,
            'page'       => $page,
            'per_page'   => $perPage,
            'total_pages'=> (int) ceil($total / $perPage),
        ];
    }
}