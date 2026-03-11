<?php

class Database {
    private static $instance = null;
    private $conn;

    private function __construct() {
        $host     = 'localhost';
        $dbname   = 'turs_db';
        $username = 'root';
        $password = '';

        try {
            $this->conn = new PDO(
                "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
                $username,
                $password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
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