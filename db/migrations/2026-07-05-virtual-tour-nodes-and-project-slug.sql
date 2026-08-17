-- Menambahkan URL publik per-project (slug) dan tabel titik tur virtual 360°
-- (interior + streetview) per-project, dipakai oleh /tur-virtual/[slug].

ALTER TABLE projects
  ADD COLUMN slug VARCHAR(160) NULL AFTER name;

-- Isi slug awal dari nama project yang sudah ada (lowercase, spasi/simbol -> '-').
UPDATE projects
SET slug = LOWER(
  TRIM(BOTH '-' FROM
    REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-'), '-+', '-')
  )
)
WHERE slug IS NULL;

-- Pastikan slug unik walau ada nama project yang mirip/sama.
UPDATE projects p
JOIN (
  SELECT id, slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) AS rn
  FROM projects
) ranked ON ranked.id = p.id AND ranked.rn > 1
SET p.slug = CONCAT(p.slug, '-', p.id);

ALTER TABLE projects
  MODIFY COLUMN slug VARCHAR(160) NOT NULL,
  ADD UNIQUE KEY projects_slug_unique (slug);

CREATE TABLE IF NOT EXISTS virtual_tour_nodes (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  project_id   INT NOT NULL,
  tour_type    ENUM('interior','streetview') NOT NULL,
  node_key     VARCHAR(60)  NOT NULL,
  name         VARCHAR(120) NOT NULL,
  image_path   VARCHAR(255) NOT NULL,
  map_x        INT NOT NULL DEFAULT 50,
  map_y        INT NOT NULL DEFAULT 50,
  links_json   TEXT NULL,
  marker_title VARCHAR(120) NULL,
  marker_desc  VARCHAR(500) NULL,
  marker_yaw   VARCHAR(20)  NULL,
  marker_pitch VARCHAR(20)  NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY virtual_tour_nodes_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
