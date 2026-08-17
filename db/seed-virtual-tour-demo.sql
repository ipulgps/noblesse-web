-- Seed demo: mengaitkan 13 foto 360° placeholder (static/tours/*.png) ke project
-- pertama (Rajendra Hills) supaya /tur-virtual/[slug] punya sesuatu untuk ditampilkan
-- sebelum foto 360° asli tersedia. Jalankan sekali; aman diulang (DELETE dulu).

DELETE FROM virtual_tour_nodes WHERE project_id = (SELECT id FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t);

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'interior', 'teras', 'Teras & Carport', '/tours/vr-teras.png', 50, 88,
  '[{"to":"tamu","yaw":10},{"to":"mandi","yaw":190}]', NULL, NULL, NULL, NULL, 0, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'interior', 'tamu', 'Ruang Tamu', '/tours/vr-tamu.png', 50, 62,
  '[{"to":"teras","yaw":190},{"to":"tidur","yaw":60}]',
  'Sofa Premium', 'Sofa kulit asli dengan rangka kayu jati solid, dipilih untuk kenyamanan dan daya tahan.', '25deg', '-6deg', 1, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'interior', 'tidur', 'Kamar Tidur Utama', '/tours/vr-tidur.png', 26, 34,
  '[{"to":"tamu","yaw":240},{"to":"dapur","yaw":340}]', NULL, NULL, NULL, NULL, 2, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'interior', 'dapur', 'Dapur', '/tours/vr-dapur.png', 74, 34,
  '[{"to":"tidur","yaw":160},{"to":"mandi","yaw":80}]',
  'Kitchen Set', 'Meja granit impor dan kabinet custom, dirancang untuk dapur modern yang fungsional.', '-35deg', '-8deg', 3, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'interior', 'mandi', 'Kamar Mandi', '/tours/vr-mandi.png', 80, 70,
  '[{"to":"dapur","yaw":260},{"to":"teras","yaw":10}]', NULL, NULL, NULL, NULL, 4, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'streetview', 'gerbang', 'Gerbang Utama', '/tours/street-01-gerbang.png', 8, 88,
  '[{"to":"pos","yaw":0}]', NULL, NULL, NULL, NULL, 0, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'streetview', 'pos', 'Pos Keamanan', '/tours/street-02-pos.png', 20, 80,
  '[{"to":"gerbang","yaw":180},{"to":"taman","yaw":8}]', NULL, NULL, NULL, NULL, 1, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'streetview', 'taman', 'Taman Depan Kawasan', '/tours/street-03-taman.png', 33, 70,
  '[{"to":"pos","yaw":185},{"to":"boulevard","yaw":355}]',
  'Taman Tematik', 'Taman seluas 500m² dengan area duduk dan lanskap hijau di pintu masuk kawasan.', '40deg', '-4deg', 2, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'streetview', 'boulevard', 'Jalan Boulevard', '/tours/street-04-boulevard.png', 47, 76,
  '[{"to":"taman","yaw":175},{"to":"persimpangan","yaw":12}]', NULL, NULL, NULL, NULL, 3, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'streetview', 'persimpangan', 'Persimpangan Blok A', '/tours/street-05-persimpangan.png', 58, 58,
  '[{"to":"boulevard","yaw":190},{"to":"blokc","yaw":350}]', NULL, NULL, NULL, NULL, 4, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'streetview', 'blokc', 'Jalan Blok C', '/tours/street-06-blokc.png', 67, 42,
  '[{"to":"persimpangan","yaw":170},{"to":"playground","yaw":15}]', NULL, NULL, NULL, NULL, 5, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'streetview', 'playground', 'Playground', '/tours/street-07-playground.png', 75, 27,
  '[{"to":"blokc","yaw":195},{"to":"rumah","yaw":2}]',
  'Area Bermain Anak', 'Playground dengan permukaan karet aman dan wahana ramah anak.', '-20deg', '-5deg', 6, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'streetview', 'rumah', 'Depan Rumah', '/tours/street-08-rumah.png', 85, 12,
  '[{"to":"playground","yaw":180}]', NULL, NULL, NULL, NULL, 7, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;
