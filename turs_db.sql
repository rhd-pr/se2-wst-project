-- ============================================================
-- TRANSPORT AND URBAN RESILIENCE SYSTEM (TURS)
-- Full Database Schema
-- MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS turs_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE turs_db;

-- ============================================================
-- TABLE: users
-- Stores admin and viewer accounts
-- ============================================================
CREATE TABLE users (
    user_id     INT PRIMARY KEY AUTO_INCREMENT,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,           -- store using password_hash()
    full_name   VARCHAR(100),
    email       VARCHAR(150) UNIQUE,
    role        ENUM('admin', 'viewer') DEFAULT 'viewer',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: access_points
-- Stores all terminals, emergency, and facility locations
-- category: transport   | sub_type: tricycle_terminal, jeepney_terminal,
--                                   bus_terminal, major_terminal
-- category: emergency   | sub_type: hospital, fire_station,
--                                   police_station, evacuation_center
-- category: facility    | sub_type: school, market,
--                                   barangay_hall, government_building
-- ============================================================
CREATE TABLE access_points (
    access_point_id INT PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(100) NOT NULL,
    category        ENUM('transport', 'emergency', 'facility') NOT NULL,
    sub_type        VARCHAR(50)  NOT NULL,
    latitude        DECIMAL(10, 7) NOT NULL,
    longitude       DECIMAL(10, 7) NOT NULL,
    address         VARCHAR(255),
    photo_url       VARCHAR(500),
    status          ENUM('active', 'inactive') DEFAULT 'active',
    created_by      INT NOT NULL,
    updated_by      INT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- ============================================================
-- TABLE: routes
-- Stores transport routes between two terminals
-- ============================================================
CREATE TABLE routes (
    route_id                INT PRIMARY KEY AUTO_INCREMENT,
    route_name              VARCHAR(100) NOT NULL,
    route_type              ENUM('bus', 'jeepney', 'tricycle', 'mixed') NOT NULL,
    origin_terminal_id      INT NOT NULL,
    destination_terminal_id INT NOT NULL,
    description             TEXT,
    status                  ENUM('active', 'suspended', 'affected') DEFAULT 'active',
    created_by              INT NOT NULL,
    updated_by              INT,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (origin_terminal_id)      REFERENCES access_points(access_point_id),
    FOREIGN KEY (destination_terminal_id) REFERENCES access_points(access_point_id),
    FOREIGN KEY (created_by)              REFERENCES users(user_id),
    FOREIGN KEY (updated_by)              REFERENCES users(user_id)
);

-- ============================================================
-- TABLE: route_points
-- Stores the ordered path coordinates of a route
-- Managed as part of the route (no separate audit needed)
-- ============================================================
CREATE TABLE route_points (
    point_id        INT PRIMARY KEY AUTO_INCREMENT,
    route_id        INT NOT NULL,
    latitude        DECIMAL(10, 7) NOT NULL,
    longitude       DECIMAL(10, 7) NOT NULL,
    sequence_order  INT NOT NULL,
    FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE: disaster_zones
-- Stores flood, accident, road closure, and other risk areas
-- Displayed as circles on the map using lat/lng + radius
-- ============================================================
CREATE TABLE disaster_zones (
    zone_id         INT PRIMARY KEY AUTO_INCREMENT,
    zone_name       VARCHAR(100) NOT NULL,
    zone_type       ENUM('flood', 'accident', 'road_closure', 'landslide', 'other') NOT NULL,
    severity        ENUM('low', 'moderate', 'high', 'critical') DEFAULT 'moderate',
    latitude        DECIMAL(10, 7) NOT NULL,
    longitude       DECIMAL(10, 7) NOT NULL,
    radius_meters   INT DEFAULT 100,
    description     TEXT,
    photo_url       VARCHAR(500),
    status          ENUM('active', 'resolved') DEFAULT 'active',
    created_by      INT NOT NULL,
    updated_by      INT,
    reported_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at     TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- ============================================================
-- TABLE: audit_logs
-- Tracks all create, update, and delete actions by admins
-- old_values and new_values store JSON snapshots of the record
-- ============================================================
CREATE TABLE audit_logs (
    log_id          INT PRIMARY KEY AUTO_INCREMENT,
    user_id         INT NOT NULL,
    action          ENUM('create', 'update', 'delete') NOT NULL,
    table_name      VARCHAR(50) NOT NULL,
    record_id       INT NOT NULL,
    old_values      JSON,
    new_values      JSON,
    performed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ============================================================
-- SAMPLE DATA
-- Default admin account (password: admin123)
-- Change this immediately after import
-- ============================================================
INSERT INTO users (username, password, full_name, email, role)
VALUES (
    'admin',
    '$2y$10$rjrvcMUmGIfWWEl0hAP8PuY366kQrtfDee/3Qim10ha9r6cHNNrri', -- admin123
    'System Administrator',
    'admin@turs.local',
    'admin'
);