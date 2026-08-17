-- Arah pandang awal kamera 360° per titik tur (yaw, derajat 0-360).
-- NULL = belum diatur -> viewer mulai dari horizon depan (yaw 0), perilaku lama.
-- Dipakai sebagai defaultYaw node di Photo Sphere Viewer (lihat VirtualTour.svelte).

ALTER TABLE virtual_tour_nodes
  ADD COLUMN initial_yaw INT NULL AFTER map_y;
