<?php

require_once __DIR__ . '/Database.php';

class Auth {

    private PDO $conn;

    public function __construct() {
        $this->conn = Database::getInstance()->getConnection();
    }

    // login()
    // Validates credentials and starts a session on success.
    // Returns true on success, false on failure.
    public function login(string $email, string $password): bool {
        if (empty($email) || empty($password)) {
            return false;
        }

        $stmt = $this->conn->prepare("
            SELECT user_id, username, password, full_name, email, role
            FROM users
            WHERE email = :email
            LIMIT 1
        ");
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch();

        if (!$user) {
            return false;
        }

        if (!password_verify($password, $user['password'])) {
            return false;
        }

        // Start session and store user data
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        session_regenerate_id(true); // prevent session fixation

        $_SESSION['user_id']   = $user['user_id'];
        $_SESSION['username']  = $user['username'];
        $_SESSION['full_name'] = $user['full_name'];
        $_SESSION['email']     = $user['email'];
        $_SESSION['role']      = $user['role'];
        $_SESSION['logged_in'] = true;

        return true;
    }

    // logout()
    // Destroys the session and redirects to login page.
    public function logout(string $redirect = '../login.php'): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $_SESSION = [];

        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(), '',
                time() - 42000,
                $params["path"],
                $params["domain"],
                $params["secure"],
                $params["httponly"]
            );
        }

        session_destroy();

        header("Location: $redirect");
        exit;
    }

    // isLoggedIn()
    // Returns true if a valid session exists.
    public function isLoggedIn(): bool {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        return isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
    }

    // isAdmin()
    // Returns true if the logged-in user has the admin role.
    public function isAdmin(): bool {
        return $this->isLoggedIn() && ($_SESSION['role'] ?? '') === 'admin';
    }

    // getUser()
    // Returns the current session user data as an array.
    // Returns null if not logged in.
    public function getUser(): ?array {
        if (!$this->isLoggedIn()) {
            return null;
        }

        return [
            'user_id'   => $_SESSION['user_id'],
            'username'  => $_SESSION['username'],
            'full_name' => $_SESSION['full_name'],
            'email'     => $_SESSION['email'],
            'role'      => $_SESSION['role'],
        ];
    }

    // requireLogin()
    // Redirects to login if not logged in.
    // Call this at the top of any protected page.
    public function requireLogin(string $redirect = '../login.php'): void {
        if (!$this->isLoggedIn()) {
            header("Location: $redirect");
            exit;
        }
    }

    // requireAdmin()
    // Redirects to login if not an admin.
    public function requireAdmin(string $redirect = '../login.php'): void {
        if (!$this->isAdmin()) {
            header("Location: $redirect");
            exit;
        }
    }
}