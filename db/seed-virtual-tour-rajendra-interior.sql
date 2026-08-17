-- Update titik tur interior (VR) untuk project Rajendra Hills memakai foto asli
-- di static/images/tours/rajendra-hills/*.jpg (bukan lagi placeholder /tours/vr-*.png).
-- Titik: Carport, Ruang Tengah, Kamar Depan, Kamar Belakang, Kamar Mandi,
--        Tampak Belakang, Tampak Samping.
-- Jalankan sekali; aman diulang (DELETE dulu, hanya tour_type='interior').

DELETE FROM virtual_tour_nodes
WHERE tour_type = 'interior'
  AND project_id = (SELECT id FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t);

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'interior', 'carport', 'Carport', '/images/tours/rajendra-hills/carport.jpg', 50, 88,
  '[{"to":"ruang-tengah","yaw":10},{"to":"tampak-depan-samping","yaw":190}]', NULL, NULL, NULL, NULL, 0, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'interior', 'ruang-tengah', 'Ruang Tengah', '/images/tours/rajendra-hills/ruang-tengah.jpg', 50, 62,
  '[{"to":"carport","yaw":190},{"to":"kamar-depan","yaw":60},{"to":"kamar-belakang","yaw":300}]', NULL, NULL, NULL, NULL, 1, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'interior', 'kamar-depan', 'Kamar Depan', '/images/tours/rajendra-hills/kamar-depan.jpg', 26, 34,
  '[{"to":"ruang-tengah","yaw":240}]', NULL, NULL, NULL, NULL, 2, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'interior', 'kamar-belakang', 'Kamar Belakang', '/images/tours/rajendra-hills/kamar-belakang.jpg', 74, 34,
  '[{"to":"ruang-tengah","yaw":120},{"to":"kamar-mandi","yaw":80}]', NULL, NULL, NULL, NULL, 3, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'interior', 'kamar-mandi', 'Kamar Mandi', '/images/tours/rajendra-hills/wc.jpg', 80, 70,
  '[{"to":"kamar-belakang","yaw":260}]', NULL, NULL, NULL, NULL, 4, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'interior', 'tampak-belakang', 'Tampak Belakang', '/images/tours/rajendra-hills/tampak-belakang.jpg', 65, 12,
  '[{"to":"tampak-depan-samping","yaw":180}]', NULL, NULL, NULL, NULL, 5, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;

INSERT INTO virtual_tour_nodes
  (project_id, tour_type, node_key, name, image_path, map_x, map_y, links_json, marker_title, marker_desc, marker_yaw, marker_pitch, sort_order, is_active)
SELECT id, 'interior', 'tampak-depan-samping', 'Tampak Samping', '/images/tours/rajendra-hills/tampak-samping.jpg', 35, 12,
  '[{"to":"carport","yaw":10},{"to":"tampak-belakang","yaw":0}]', NULL, NULL, NULL, NULL, 6, 1
FROM (SELECT id FROM projects ORDER BY sort_order, id LIMIT 1) t;
