CREATE DATABASE IF NOT EXISTS devicewatch_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE devicewatch_test;

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  type          VARCHAR(50)  NOT NULL,
  address       VARCHAR(255) NOT NULL,
  location      VARCHAR(100) NOT NULL,
  status        ENUM('online', 'offline', 'warning') NOT NULL DEFAULT 'online',
  status_set_at DATETIME NULL,
  remarks       TEXT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_devices_status (status)
);