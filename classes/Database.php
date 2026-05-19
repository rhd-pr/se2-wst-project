<?php

class Database {
    private static $instance = null;
    private $conn;

    private function __construct() {
        $host     = 'sql112.infinityfree.com';
        $dbname   = 'if0_41866066_turs_db';
        $username = 'if0_41866066';
        $password = 'Cfa5tM2qIMt';

        // Force PHP to use Philippine Time
        date_default_timezone_set('Asia/Manila');

        try {
            $this->conn = new PDO(
                "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
                $username,
                $password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            // Force MySQL session to use Philippine Time (UTC+8)
            $this->conn->exec("SET time_zone = '+08:00'");
        } catch (PDOException $e) {
            die("Database connection failed: " . $e->getMessage());
        }
    }

    // Prevent cloning of the instance
    private function __clone() {}

    // Get the single instance
    public static function getInstance(): Database {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    // Return the PDO connection
    public function getConnection(): PDO {
        return $this->conn;
    }
}