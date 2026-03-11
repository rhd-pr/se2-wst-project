<?php
require_once __DIR__ . '/AuditLog.php';

class User {

    private PDO      $conn;
    private AuditLog $audit;

    public function __construct(PDO $conn) {
        $this->conn  = $conn;
        $this->audit = new AuditLog($conn);
    }

    // getAll()
    // Returns all users, optionally filtered by role or search.
    // Passwords are never returned.
    public function getAll(array $filters = []): array {
        $where  = ['1=1'];
        $params = [];

        if (!empty($filters['role'])) {
            $where[]        = 'role = :role';
            $params[':role'] = $filters['role'];
        }

        if (!empty($filters['search'])) {
            $where[]           = '(username LIKE :search OR full_name LIKE :search OR email LIKE :search)';
            $params[':search'] = '%' . $filters['search'] . '%';
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->conn->prepare("
            SELECT
                user_id,
                username,
                full_name,
                email,
                role,
                created_at
            FROM users
            WHERE $whereClause
            ORDER BY created_at DESC
        ");

        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    // getById()
    // Returns a single user (no password).
    public function getById(int $id): ?array {
        $stmt = $this->conn->prepare("
            SELECT user_id, username, full_name, email, role, created_at
            FROM users
            WHERE user_id = :id
            LIMIT 1
        ");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    // create()
    // Inserts a new user with a hashed password.
    // Returns the new user_id, or throws on duplicate email/username.
    public function create(array $data, int $actorId): int {
        // Pre-check uniqueness for a cleaner error message
        if ($this->emailExists($data['email'])) {
            throw new RuntimeException('A user with that email already exists.');
        }
        if ($this->usernameExists($data['username'])) {
            throw new RuntimeException('A user with that username already exists.');
        }

        $hash = password_hash($data['password'], PASSWORD_BCRYPT);

        $stmt = $this->conn->prepare("
            INSERT INTO users (username, password, full_name, email, role, created_at)
            VALUES (:username, :password, :full_name, :email, :role, NOW())
        ");

        $stmt->execute([
            ':username'  => $data['username'],
            ':password'  => $hash,
            ':full_name' => $data['full_name'] ?? null,
            ':email'     => $data['email'],
            ':role'      => $data['role'] ?? 'viewer',
        ]);

        $newId = (int) $this->conn->lastInsertId();
        $new   = $this->getById($newId);
        $this->audit->log($actorId, 'create', 'users', $newId, null, $new);

        return $newId;
    }

    // update()
    // Updates user details. If 'password' key is present and non-empty,
    // re-hashes and updates it too. Otherwise password is unchanged.
    public function update(int $id, array $data, int $actorId): bool {
        $old = $this->getById($id);
        if (!$old) return false;

        // Uniqueness checks (exclude self)
        if (!empty($data['email']) && $data['email'] !== $old['email']) {
            if ($this->emailExists($data['email'], $id)) {
                throw new RuntimeException('That email is already in use by another account.');
            }
        }
        if (!empty($data['username']) && $data['username'] !== $old['username']) {
            if ($this->usernameExists($data['username'], $id)) {
                throw new RuntimeException('That username is already taken.');
            }
        }

        // Build update dynamically — only update password if provided
        $fields = [
            'username  = :username',
            'full_name = :full_name',
            'email     = :email',
            'role      = :role',
        ];
        $params = [
            ':username'  => $data['username']  ?? $old['username'],
            ':full_name' => $data['full_name'] ?? $old['full_name'],
            ':email'     => $data['email']     ?? $old['email'],
            ':role'      => $data['role']      ?? $old['role'],
            ':id'        => $id,
        ];

        if (!empty($data['password'])) {
            $fields[]            = 'password = :password';
            $params[':password'] = password_hash($data['password'], PASSWORD_BCRYPT);
        }

        $stmt = $this->conn->prepare("
            UPDATE users SET " . implode(', ', $fields) . "
            WHERE user_id = :id
        ");

        $result = $stmt->execute($params);

        if ($result) {
            $new = $this->getById($id);
            $this->audit->log($actorId, 'update', 'users', $id, $old, $new);
        }

        return $result;
    }

    // delete()
    // Hard-deletes a user. Blocks self-delete.
    public function delete(int $id, int $actorId): bool {
        if ($id === $actorId) {
            throw new RuntimeException('You cannot delete your own account.');
        }

        $old = $this->getById($id);
        if (!$old) return false;

        $stmt = $this->conn->prepare("DELETE FROM users WHERE user_id = :id");
        $result = $stmt->execute([':id' => $id]);

        if ($result) {
            $this->audit->log($actorId, 'delete', 'users', $id, $old, null);
        }

        return $result;
    }

    // emailExists() / usernameExists()
    // Uniqueness helpers. Pass $excludeId to ignore a specific user (for edits).
    public function emailExists(string $email, int $excludeId = 0): bool {
        $stmt = $this->conn->prepare("
            SELECT COUNT(*) FROM users
            WHERE email = :email AND user_id != :exclude
        ");
        $stmt->execute([':email' => $email, ':exclude' => $excludeId]);
        return (int) $stmt->fetchColumn() > 0;
    }

    public function usernameExists(string $username, int $excludeId = 0): bool {
        $stmt = $this->conn->prepare("
            SELECT COUNT(*) FROM users
            WHERE username = :username AND user_id != :exclude
        ");
        $stmt->execute([':username' => $username, ':exclude' => $excludeId]);
        return (int) $stmt->fetchColumn() > 0;
    }

    // count()
    // Returns total user count. Used by dashboard stat cards.
    public function count(): int {
        return (int) $this->conn->query("SELECT COUNT(*) FROM users")->fetchColumn();
    }
}