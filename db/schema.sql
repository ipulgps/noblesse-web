-- Noblesse Property — skema database (MySQL 8)
-- Jalankan: mysql -u root noblesse < db/schema.sql

CREATE DATABASE IF NOT EXISTS noblesse
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE noblesse;

-- ========== AUTENTIKASI ADMIN ==========
CREATE TABLE IF NOT EXISTS admin_users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(190)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('superadmin','editor') NOT NULL DEFAULT 'editor',
  last_login_at DATETIME      NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id          VARCHAR(64) PRIMARY KEY,
  user_id     INT NOT NULL,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== PENGATURAN UMUM (key-value) ==========
CREATE TABLE IF NOT EXISTS site_settings (
  `key`       VARCHAR(100) PRIMARY KEY,
  `value`     TEXT NULL,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== STATISTIK ==========
CREATE TABLE IF NOT EXISTS stats (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  value       INT NOT NULL,
  suffix      VARCHAR(8) NOT NULL DEFAULT '',
  label       VARCHAR(120) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TIMELINE TENTANG KAMI ==========
CREATE TABLE IF NOT EXISTS about_timeline (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  year_title  VARCHAR(160) NOT NULL,
  description VARCHAR(255) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== PROYEK ==========
CREATE TABLE IF NOT EXISTS projects (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(160) NOT NULL,
  location    VARCHAR(160) NOT NULL,
  price_label VARCHAR(60)  NOT NULL,
  badge       VARCHAR(40)  NULL,
  badge_style ENUM('gold','dark') NOT NULL DEFAULT 'gold',
  image_path  VARCHAR(255) NULL,
  description TEXT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== GALERI ==========
CREATE TABLE IF NOT EXISTS gallery_images (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  image_path  VARCHAR(255) NOT NULL,
  caption     VARCHAR(160) NULL,
  height_px   INT NOT NULL DEFAULT 300,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== FASILITAS ==========
CREATE TABLE IF NOT EXISTS facilities (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(120) NOT NULL,
  description VARCHAR(255) NOT NULL,
  icon_svg    TEXT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TITIK LOKASI / AKSES ==========
CREATE TABLE IF NOT EXISTS location_points (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  label       VARCHAR(120) NOT NULL,
  travel_time VARCHAR(40)  NOT NULL,
  icon_svg    TEXT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TIPE RUMAH / DENAH ==========
CREATE TABLE IF NOT EXISTS house_types (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(80)  NOT NULL,
  type_code     VARCHAR(20)  NOT NULL,
  building_area INT NOT NULL,
  land_area     INT NOT NULL,
  bedrooms      VARCHAR(10) NOT NULL,
  bathrooms     VARCHAR(10) NOT NULL,
  carport       VARCHAR(10) NOT NULL,
  floors        VARCHAR(40) NOT NULL,
  floorplan_img VARCHAR(255) NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TESTIMONI ==========
CREATE TABLE IF NOT EXISTS testimonials (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  quote       TEXT NOT NULL,
  author_name VARCHAR(120) NOT NULL,
  author_role VARCHAR(160) NULL,
  rating      TINYINT NOT NULL DEFAULT 5,
  photo_path  VARCHAR(255) NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== BANK REKANAN ==========
CREATE TABLE IF NOT EXISTS partner_banks (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(80) NOT NULL,
  logo_path   VARCHAR(255) NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== PROSPEK / LEADS ==========
CREATE TABLE IF NOT EXISTS leads (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(160) NOT NULL,
  whatsapp        VARCHAR(40)  NOT NULL,
  interested_type VARCHAR(120) NULL,
  message         TEXT NULL,
  source          VARCHAR(60) NOT NULL DEFAULT 'website_form',
  status          ENUM('baru','dihubungi','closing','batal') NOT NULL DEFAULT 'baru',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
