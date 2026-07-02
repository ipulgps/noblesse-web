-- Tambah nominal, lokasi penukaran, posisi teks expired ke voucher_templates,
-- dan tanggal expired ke vouchers. Jalankan sekali terhadap database yang sudah ada
-- (db/schema.sql sudah diupdate juga untuk instalasi baru).

ALTER TABLE voucher_templates
  ADD COLUMN amount INT NOT NULL DEFAULT 0 AFTER text_color,
  ADD COLUMN redeem_location VARCHAR(255) NOT NULL DEFAULT '' AFTER amount,
  ADD COLUMN expired_x INT NOT NULL DEFAULT 0 AFTER redeem_location,
  ADD COLUMN expired_y INT NOT NULL DEFAULT 0 AFTER expired_x,
  ADD COLUMN expired_font_size INT NOT NULL DEFAULT 24 AFTER expired_y,
  ADD COLUMN expired_text_color VARCHAR(20) NOT NULL DEFAULT '#000000' AFTER expired_font_size;

ALTER TABLE vouchers
  ADD COLUMN expired_at DATETIME NULL AFTER status;
