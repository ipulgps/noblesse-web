# Panduan Deploy ke VPS — Noblesse Property

Aplikasi: **SvelteKit (adapter-node) + MySQL**. Panduan ini memakai VPS Linux
(Ubuntu 22.04/24.04), **Nginx** sebagai reverse proxy, **PM2** untuk menjaga
proses Node tetap hidup, dan **Let's Encrypt** untuk HTTPS.

Asumsi: Anda punya VPS dengan akses `root`/sudo, dan sebuah domain
(mis. `noblessegroup.id`) yang sudah diarahkan (A record) ke IP VPS.

---

## Ringkasan alur

```
[ Pengunjung ] → HTTPS → [ Nginx :443 ] → proxy → [ Node app :3000 (PM2) ] → [ MySQL :3306 ]
```

---

## 0. Persiapan di komputer lokal (sekali)

Pastikan build produksi jalan:

```bash
npm install
npm run build        # menghasilkan folder build/ (adapter-node)
```

Commit kode ke Git (GitHub/GitLab) — cara termudah memindahkan ke VPS.
Pastikan `.env`, `node_modules`, `build`, `.svelte-kit` TIDAK ikut ter-commit
(sudah diatur di `.gitignore`).

---

## 1. Siapkan VPS — paket dasar

SSH ke VPS, lalu:

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 22 LTS (lewat NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Git, Nginx, dan MySQL
sudo apt install -y git nginx mysql-server

# PM2 (process manager) global
sudo npm install -g pm2

node -v   # pastikan v22.x
```

---

## 2. Siapkan database MySQL

```bash
sudo mysql
```

Di dalam prompt MySQL, buat database + user khusus (JANGAN pakai root untuk app):

```sql
CREATE DATABASE noblesse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'noblesse'@'localhost' IDENTIFIED BY 'GANTI_PASSWORD_KUAT';
GRANT ALL PRIVILEGES ON noblesse.* TO 'noblesse'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Amankan instalasi MySQL (set password root, dll):

```bash
sudo mysql_secure_installation
```

---

## 3. Ambil kode ke VPS

```bash
cd /var/www
sudo git clone https://github.com/USER/REPO.git noblesse
sudo chown -R $USER:$USER /var/www/noblesse
cd /var/www/noblesse/noblesse-property      # masuk ke folder app
```

> Jika struktur repo Anda menaruh app di subfolder `noblesse-property`,
> sesuaikan path di atas. Semua perintah berikut dijalankan dari folder app.

---

## 4. Buat file .env produksi di VPS

```bash
nano .env
```

Isi (sesuaikan):

```
DATABASE_URL="mysql://noblesse:GANTI_PASSWORD_KUAT@127.0.0.1:3306/noblesse"
SESSION_SECRET="STRING_ACAK_SANGAT_PANJANG_DAN_UNIK"
ORIGIN="https://noblessegroup.id"
PORT=3000
```

- `ORIGIN` **wajib** untuk adapter-node agar proteksi CSRF & cookie bekerja benar
  di belakang proxy. Isi dengan URL publik (https) situs Anda.
- `SESSION_SECRET`: buat acak, mis. `openssl rand -hex 32`.

Amankan agar tidak terbaca user lain:

```bash
chmod 600 .env
```

---

## 5. Install dependency, buat skema, seed, & build

```bash
npm install

# Buat tabel (skema)
mysql -u noblesse -p noblesse < db/schema.sql

# Isi data awal (opsional, dari array hardcoded → DB)
npm run db:seed

# Buat akun admin (GANTI email & password!)
npm run db:create-admin admin@noblesse.id "PASSWORD_ADMIN_KUAT" "Administrator" superadmin

# Build produksi
npm run build
```

> `npm run db:*` butuh Node 22 (memakai `--env-file=.env`) — sudah terpenuhi.

---

## 6. Folder upload yang persisten

File yang diunggah admin masuk ke `static/uploads/`. Saat build, isinya tetap
disalin ke output, tapi agar **tidak hilang saat deploy ulang**, pastikan folder
ini ada dan permissionnya benar:

```bash
mkdir -p static/uploads
# adapter-node menyajikan file dari folder ini; biarkan di tempatnya
```

> Catatan: dengan adapter-node, file statis disajikan dari `build/client/`.
> File upload baru tetap ditulis ke `static/uploads/` (lihat
> `api/admin/upload`), jadi pastikan proses Node punya izin tulis ke sana,
> dan folder ini ikut di-backup. Untuk skala besar, pindahkan ke object storage
> (S3/R2) — lihat bagian "Catatan lanjutan".

---

## 7. Jalankan dengan PM2

Proyek sudah menyertakan **`ecosystem.config.cjs`** (konfigurasi PM2). Cukup:

```bash
mkdir -p logs                       # folder log yang dipakai config

pm2 start ecosystem.config.cjs      # jalankan aplikasi

# Simpan daftar proses & aktifkan auto-start saat VPS reboot
pm2 save
pm2 startup     # jalankan perintah yang ditampilkannya (sekali)

pm2 status
pm2 logs noblesse   # cek log bila perlu
```

Config tersebut sudah mengatur: nama proses `noblesse`, memuat `.env`
(`--env-file`), auto-restart saat crash, restart bila memori > 400M, dan
menulis log ke `logs/`. Port default `3000` (ubah lewat `.env` bila perlu).

Uji lokal di VPS:

```bash
curl -I http://127.0.0.1:3000      # harus 200
```

---

## 8. Nginx sebagai reverse proxy

```bash
sudo nano /etc/nginx/sites-available/noblesse
```

Isi:

```nginx
server {
    listen 80;
    server_name noblessegroup.id;

    client_max_body_size 6M;   # cukup untuk upload gambar (maks 5MB)

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Aktifkan & reload:

```bash
sudo ln -s /etc/nginx/sites-available/noblesse /etc/nginx/sites-enabled/
sudo nginx -t          # tes konfigurasi
sudo systemctl reload nginx
```

Sekarang `http://noblessegroup.id` sudah bisa diakses.

---

## 9. HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d noblessegroup.id
```

Certbot mengubah Nginx ke HTTPS otomatis & memasang auto-renew. Pastikan
`ORIGIN` di `.env` memakai `https://`.

---

## 10. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

> Jangan buka port 3000 / 3306 ke publik — keduanya hanya diakses lokal.

---

## ✅ Selesai

Buka `https://noblessegroup.id` (situs) dan
`https://noblessegroup.id/admin/login` (admin).

---

## Cara update aplikasi (deploy ulang)

```bash
cd /var/www/noblesse/noblesse-property
git pull
npm install
npm run build
pm2 restart ecosystem.config.cjs    # atau: pm2 restart noblesse
```

Jika ada perubahan skema DB, jalankan migrasinya sebelum restart
(mis. `mysql -u noblesse -p noblesse < db/perubahan.sql`).

---

## Checklist keamanan produksi (WAJIB)

- [ ] Password admin **bukan** `admin123` → set lewat `npm run db:create-admin`.
- [ ] `SESSION_SECRET` acak & panjang (`openssl rand -hex 32`).
- [ ] User MySQL khusus (`noblesse`), bukan `root`.
- [ ] `.env` permission `600`, tidak ter-commit.
- [ ] HTTPS aktif; `ORIGIN` memakai `https://`.
- [ ] Firewall (ufw) aktif; hanya 80/443 & SSH terbuka.
- [ ] Backup DB terjadwal (lihat di bawah).

---

## Backup database (cron harian)

```bash
sudo crontab -e
```

Tambah baris (backup tiap jam 02:00, simpan 7 hari terakhir):

```
0 2 * * * mysqldump -u noblesse -pPASSWORD noblesse | gzip > /var/backups/noblesse-$(date +\%F).sql.gz && find /var/backups -name 'noblesse-*.sql.gz' -mtime +7 -delete
```

---

## Catatan lanjutan (opsional)

- **Upload ke object storage**: untuk multi-server atau agar file aman dari
  kehilangan, ganti penyimpanan `static/uploads/` ke S3/Cloudflare R2 dan simpan
  URL-nya di kolom `*_path`. Endpoint `api/admin/upload` tinggal diarahkan ke
  bucket.
- **Rate-limit multi-instance**: `src/lib/server/rate-limit.ts` berbasis memori
  (per-proses). Jika menjalankan >1 instance PM2 (cluster), pindahkan ke Redis.
- **Zona waktu**: pastikan zona waktu VPS & MySQL sesuai (mis. `Asia/Jakarta`)
  agar tanggal prospek tampil benar.
- **Monitoring**: `pm2 monit` untuk pantau realtime; `pm2 logs noblesse` untuk log.
