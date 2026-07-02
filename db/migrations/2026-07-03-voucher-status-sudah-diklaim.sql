-- Tambah status 'sudah_diklaim' ke enum vouchers.status — klaim voucher online
-- sekarang hanya bisa dilakukan sekali; setelah berhasil, status berubah dari
-- 'aktif' menjadi 'sudah_diklaim' sehingga percobaan klaim ulang ditolak.

ALTER TABLE vouchers
  MODIFY COLUMN status ENUM('belum_aktivasi','aktif','tidak_aktif','sudah_digunakan','sudah_diklaim')
    NOT NULL DEFAULT 'belum_aktivasi';
