# Handoff: Noblesse Virtual Tour (Tur 3D · Tur VR · Streetview Lokasi)

## Overview
Fitur "Tur Virtual" untuk Noblesse Property: satu panel dengan 3 mode —
1. **Tur 3D Rumah** — placeholder (model masih dibuat di SketchUp).
2. **Tur VR Interior** — jelajahi 5 ruangan rumah Tipe 45 dalam foto 360°, berpindah ruangan lewat anak panah/rail/denah skematik.
3. **Streetview Menuju Lokasi** — jalur 8 titik foto 360° dari gerbang utama kawasan menuju rumah, dengan mekanisme yang sama seperti Tur VR.

## Ini bukan HTML untuk disalin — ini sudah source code Svelte
Berbeda dari handoff biasa: file di paket ini **bukan** prototipe HTML yang perlu diterjemahkan ulang.
`VirtualTour.svelte` sudah ditulis langsung sebagai **Svelte 5 (runes) + Tailwind CSS 4**, mengikuti
pola yang sama dengan komponen lain di proyek Anda (`ProjectsTable.svelte`): script tag polos,
kelas Tailwind untuk styling, komentar header berisi cara pakai. Tugas developer di sini murni
**instalasi + integrasi**, bukan recreate dari nol.

## Fidelity
High-fidelity — warna, tipografi, dan interaksi final. Palet: navy `#0A1F44`/`#08152E`, emas
`#D4AF37`/`#E7C76A`, font Playfair Display (judul) + Cinzel (label kecil huruf besar) + Inter (teks).
Ini konsisten dengan situs utama Noblesse Property yang sudah ada.

## Langkah Integrasi

1. **Install dependency** (Photo Sphere Viewer v5 + Three.js — dipakai untuk viewer 360°/tur virtual):
   ```bash
   npm i @photo-sphere-viewer/core @photo-sphere-viewer/virtual-tour-plugin \
         @photo-sphere-viewer/markers-plugin @photo-sphere-viewer/autorotate-plugin \
         @photo-sphere-viewer/gyroscope-plugin three
   ```

2. **Salin file komponen** ke proyek Anda:
   ```
   VirtualTour.svelte  →  src/lib/components/VirtualTour.svelte
   ```

3. **Salin foto 360° placeholder** ke folder static SvelteKit:
   ```
   static/tours/*.png  →  static/tours/*.png   (root proyek Anda)
   ```
   Semua foto ini **PLACEHOLDER** bergaya equirectangular (rasio 2:1) dengan label nama ruangan/titik.
   Ganti dengan foto 360° asli — nama file boleh sama persis agar tidak perlu mengubah kode:
   - `vr-teras.png`, `vr-tamu.png`, `vr-tidur.png`, `vr-dapur.png`, `vr-mandi.png`
   - `street-01-gerbang.png` … `street-08-rumah.png`

4. **Pakai komponennya** di halaman/route mana pun:
   ```svelte
   <script>
     import VirtualTour from '$lib/components/VirtualTour.svelte';
   </script>

   <VirtualTour />
   ```

5. **Hubungkan dari nav/halaman utama** — tambahkan link/tombol di situs utama menuju route
   yang memuat `<VirtualTour />` (mis. `/tur-virtual`).

## SSR (SvelteKit)
Aman dipakai walau route-nya di-server-render: semua import Photo Sphere Viewer dilakukan
**lazy** (`await import(...)`) di dalam fungsi `initVR()`/`initStreet()`, bukan di top-level module,
dan hanya dipanggil setelah user membuka tab "Tur VR" / "Streetview" (klik tombol di browser).
Tidak ada kode yang menyentuh `window`/WebGL saat render di server.

## Menambah Titik Streetview (target real: 30–50 titik)
Di bagian atas `<script>`, salin pola objek pada array `STREET_NODES`:
```js
{ id: 'unik-anda', name: 'Nama Titik', img: '/tours/nama-file.png', mapX: 50, mapY: 50,
  links: [{ to: 'id-sebelumnya', yaw: 180 }, { to: 'id-berikutnya', yaw: 0 }] }
```
- `mapX`/`mapY` (0–100) menentukan posisi titik di denah skematik pojok kanan-atas viewer.
- `yaw` (derajat) hanya menentukan arah panah navigasi di dalam foto 360° — tidak perlu presisi GPS.
- Struktur ini sudah siap discale dari 8 titik demo ke 30–50 titik nyata tanpa ubah logika lain.

## Tur 3D Rumah (model SketchUp)
Saat ini masih placeholder card (dicari dengan komentar `🔌 3D PLACEHOLDER` di file). Begitu model
final diekspor ke `.glb`/`.gltf`, ganti blok tersebut dengan Google `<model-viewer>`:
```bash
npm i @google/model-viewer
```
```svelte
<script>
  import '@google/model-viewer';
</script>
<model-viewer src="/models/rumah-tipe-45.glb" camera-controls auto-rotate style="width:100%;height:100%"></model-viewer>
```

## Interaksi & Perilaku
- Klik tab (Tur 3D / Tur VR / Streetview) → ganti mode; viewer VR/Streetview di-*lazy-init* saat
  pertama kali dibuka (kode & CSS Photo Sphere Viewer baru diunduh saat itu), lalu tetap hidup di
  memori saat berpindah tab (tidak perlu re-load ulang).
- Seret di dalam viewer → memutar pandangan 360°. Klik panah emas → berpindah ke node/ruangan lain.
- Klik titik emas kecil ("i") → info hotspot (tooltip + panel info di bawah, bisa ditutup dengan ×).
- Rail horizontal di bawah viewer → lompat langsung ke titik/ruangan mana pun.
- Denah skematik kanan-atas → titik aktif menyala emas, mengikuti node yang sedang dilihat.
- Navbar viewer bawaan (kiri-bawah dalam viewer): zoom, auto-rotate, gyroscope (mode VR di HP),
  fullscreen — semua sudah aktif tanpa kode tambahan.
- Petunjuk "seret untuk melihat sekeliling" tampil 5 detik lalu memudar otomatis.
- Jika CDN/paket gagal dimuat (mis. offline), viewer menampilkan pesan error yang sopan alih-alih layar kosong.

## Design Tokens
- Navy: `#0A1F44` (utama), `#08152E` (gelap), `#060e22` (background halaman)
- Emas: `#D4AF37` (utama), `#E7C76A` (terang, untuk gradient)
- Font judul: `Playfair Display` (700/800, italic untuk aksen)
- Font label kecil kapital: `Cinzel` (600, letter-spacing lebar)
- Font teks: `Inter` (300–600)
- Radius: `rounded-sm` (2px) konsisten di seluruh kartu/tombol, mengikuti gaya situs utama yang tegas/elegan (bukan rounded besar)

## Assets
- 13 foto 360° placeholder (equirectangular, PNG) di `static/tours/` — buatan sendiri sebagai
  penanda posisi, **wajib diganti** dengan foto 360° asli sebelum rilis produksi.
- Font Google Fonts (Playfair Display, Cinzel, Inter) dimuat lewat `<svelte:head>` di komponen —
  hapus blok tersebut kalau proyek Anda sudah memuat font yang sama secara global di layout.

## Files
- `VirtualTour.svelte` — komponen utama (lengkap: script + markup, siap pakai)
- `static/tours/*.png` — 13 foto 360° placeholder (5 interior + 8 streetview)

## Referensi desain awal (opsional)
Versi awal fitur ini dibuat sebagai prototipe HTML interaktif (`Noblesse Tur Virtual.dc.html`,
di luar paket ini) untuk validasi visual/UX sebelum ditulis ulang sebagai komponen Svelte di atas.
