# Catatan: Cara Membuat Tur 3D Realistik Seperti Referensi

Dokumen ini menjelaskan **langkah detail** untuk membuat model 3D rumah (`.glb`) di
tur virtual tampak realistik seperti render referensi (foto rumah dengan cat, tekstur,
bayangan, dan pencahayaan alami).

---

## 1. Kenapa hasil sekarang belum seperti referensi

Render referensi dibuat dengan **offline raytracing** (V-Ray / Enscape / Lumion / Corona),
sedangkan website memakai **`model-viewer` (real-time WebGL)**. Dua hal berbeda mendasar.

Diagnosa model `rajendra_3d.glb` (hasil ekspor SketchUp GLTF Exporter):

| Temuan | Dampak |
|---|---|
| **5.302 material `metalness=1.00`** (bug SketchUp) | Semua permukaan jadi "logam gelap" → SUDAH DIPERBAIKI (di-set 0) |
| **~230 material bernama `default_face_material`** | Mayoritas permukaan **tanpa material** di SketchUp, hanya abu-abu default |
| **0 normal map, 0 roughness map** | Permukaan mulus sempurna → tak ada relief plester/kayu/genteng |
| **7 tekstur, resolusi rendah** (400×400) | Blur saat di-zoom |
| **Punya alas rumput sendiri** | Bayangan `model-viewer` ke tanah tertutup, tak terlihat |

**Kesimpulan:** akar masalah realisme ada di **model SketchUp**, bukan di kode web.
Tanpa memperbaiki material di sumber, plafon realisme real-time hanya ~"maket bercat
dengan pencahayaan bagus".

---

## 2. Yang SUDAH dikerjakan (dari sisi kode/aset)

Sudah dilakukan tanpa menyentuh SketchUp — ini batas maksimal tanpa remodel:

- ✅ **Poles metalness** 1→0 pada 5.200+ material (fix bug SketchUp). File web sekarang
  `rajendra_3d.glb` (3.6 MB), backup di `rajendra_3d.prepolish.glb`.
- ✅ **HDRI diganti** golden-hour bermatahari terang → **partly-cloudy** (lembut, anti-silau).
  File: `static/images/tours/rajendra-hills/env/golden-hour.hdr`.
- ✅ **Tone-mapping** `aces` → `neutral` (anti dinding terbakar putih).
- ✅ **Exposure & SSAO** dituning, sudut kamera dibuat ¾.
- ✅ **Warna dinding** (material `Color C02`) di-set manual via skrip.

> Semua setting viewer ada di `src/lib/components/VirtualTour.svelte` (blok `<model-viewer>`).

---

## 3. Langkah untuk MENDEKATI referensi (real-time interaktif)

Urutan dari dampak-terbesar. **Semua wajib dikerjakan di sumber model**, bukan di web.

### Langkah A — Beri material yang benar di SketchUp (WAJIB, dampak #1)

Masalah terbesar: ~230 permukaan masih `default_face_material` (abu-abu polos).

1. Buka model di **SketchUp**.
2. Untuk **setiap permukaan**, assign material yang benar lewat panel *Materials*:
   - Dinding → cat tembok (warna solid, mis. krem/salmon)
   - Atap → material genteng/metal
   - Pintu & kusen → kayu
   - Kaca jendela → material kaca transparan
   - Lantai/teras → keramik/paving
3. **Jangan biarkan ada permukaan tanpa material.** Cek dengan mewarnai default_face
   dengan warna mencolok — bagian yang masih menyala = belum diberi material.
4. Ekspor ulang ke `.glb` (lihat **Langkah A2** di bawah untuk cara ekspor yang benar).

Setelah ini saja, HDRI + viewer yang sudah bagus akan langsung terlihat jauh lebih hidup.

### Langkah A2 — Cara EKSPOR `.glb` dari SketchUp (PENTING, ini sumber bug awal)

> ⚠️ File lama Anda dibuat plugin **"SketchUp GLTF Exporter"** — plugin inilah yang
> menaruh `metalness=1` di semua material (bug yang bikin model tampak logam gelap).
> **Hindari plugin itu**, atau perbaiki hasilnya dengan skrip poles (lihat bawah).

Pilih SATU dari tiga jalur berikut:

**Jalur 1 — Blender (PALING DIREKOMENDASIKAN, hasil paling benar)**
1. Di SketchUp: `File → Export → 3D Model`, pilih format **COLLADA (.dae)** atau
   **FBX** (keduanya bawaan SketchUp, tanpa plugin).
2. Buka **Blender** → `File → Import → Collada (.dae)` / FBX.
3. (Sekalian kerjakan Langkah B & C di Blender di sini.)
4. Ekspor: `File → Export → glTF 2.0 (.glb/.gltf)` dengan setting:
   - Format: **glTF Binary (.glb)**
   - *Include* → centang **Selected Objects** (bila hanya ingin rumah, bukan lampu/kamera)
   - *Transform* → **+Y Up** (default, biar orientasi benar di web)
   - *Data → Mesh* → centang **Normals**, **UVs**, **Tangents** (tangents wajib untuk normal map)
   - *Data → Material* → **Export**, Images: **Automatic** (atau WebP untuk lebih ringan)
   - *Data → Lighting* → **Standard**
   Blender menulis PBR dengan benar (metalness/roughness sesuai), jadi **tidak ada bug**.

**Jalur 2 — Plugin SketchUp yang benar (tanpa Blender)**
1. Install extension **"glTF Export"** dari Centaur/Extension Warehouse, ATAU tetap
   pakai exporter lama.
2. Ekspor ke `.glb`.
3. **WAJIB jalankan skrip poles** untuk memperbaiki bug metalness (lihat di bawah).

**Jalur 3 — Perbaiki hasil exporter lama dengan skrip poles**
Jika terpaksa pakai "SketchUp GLTF Exporter", perbaiki metalness bug dengan skrip yang
sudah dibuat (sama seperti yang dipakai untuk model ini). Skrip:
`scratchpad/glb-polish.mjs` — set metalness 1→0, roughness wajar, dedup material.
```bash
# di direktori terpisah yang sudah punya @gltf-transform:
node glb-polish.mjs input-dari-sketchup.glb output-bersih.glb
```
Lalu pakai `output-bersih.glb` sebagai file web.

**Verifikasi hasil ekspor** (cek bug sebelum upload):
```bash
node glb-audit.mjs model.glb
# Pastikan: "metalness > 0.5 : 0"  (kalau > 0, ada bug — jalankan poles)
```

> Nama file harus cocok dengan yang dicari server (lihat
> `src/routes/tur-virtual/[slug]/+page.server.ts`):
> `static/images/tours/<slug>/3D/<slug>_3d.glb` — mis. `rajendra-hills_3d.glb`.

### Langkah B — Tambah tekstur PBR (normal + roughness) via Blender (dampak #2)

Ini yang memisahkan "model game" dari "mendekati foto". Butuh Blender (gratis).

1. Unduh texture PBR gratis (CC0) dari **ambientCG.com** atau **Poly Haven**:
   - Plester dinding: cari "plaster" / "stucco"
   - Kayu: "wood planks"
   - Genteng: "roof tiles"
   - Rumput: "grass"
   - Tiap set biasanya berisi: `Color/Albedo`, `Normal`, `Roughness`, kadang `AO`.
2. Import `.glb` ke **Blender**.
3. Untuk tiap material, di *Shader Editor* pasang:
   - `Base Color` ← tekstur Albedo
   - `Roughness` ← tekstur Roughness
   - `Normal` ← tekstur Normal (lewat node *Normal Map*)
4. **Kaca**: pakai `Transmission = 1`, `Roughness` rendah → kaca transparan asli.
5. Set skala UV agar tekstur tidak terlalu besar/kecil (mis. plester ~1–2 m per ubin).
6. Ekspor `.glb` dengan opsi:
   - Format: **glTF Binary (.glb)**
   - Aktifkan **"Include → Normals"** dan **material export**.
   - Aktifkan ekstensi transmission bila kaca dipakai.

### Langkah C — Baked lighting / lightmap (opsional, dampak #3)

Membuat bayangan & cahaya-memantul (GI) "menempel" jadi bagian tekstur. Paling mendekati
referensi, tapi paling lama (Blender + bake).

1. Di Blender, buat *UV kedua* (lightmap UV) untuk seluruh model.
2. Set lighting matahari + world (langit) yang diinginkan.
3. *Bake* → Diffuse (Indirect + Direct) ke sebuah image.
4. Assign lightmap sebagai tekstur *emissive*/AO tambahan.
5. Ekspor `.glb`. Bayangan jadi statis (tak ikut orbit) — untuk properti justru bagus.

### Langkah D — Hapus alas rumput bawaan model (agar bayangan viewer muncul)

Model punya kotak rumput sendiri yang menutupi bayangan `model-viewer` ke tanah.
Pilih salah satu:
- **Hapus alas rumput** di SketchUp/Blender → biarkan `shadow-intensity` viewer
  menggambar bayangan kontak ke ground plane virtual. **ATAU**
- Biarkan rumput, dan andalkan **SSAO** (sudah aktif di viewer) untuk kedalaman.

---

## 4. Update model dari Blender → optimasi → pasang (ALUR WAJIB)

> **JANGAN langsung timpa `rajendra_3d.glb` dengan ekspor Blender mentah!**
> File aktif itu sudah dioptimasi (42 MB → 6 MB, WebP + weld). Timpa langsung =
> balik ke file 40+ MB & berisiko merusak fitur viewer. Ikuti 5 langkah ini tiap
> kali ada perubahan di Blender.

Lokasi model aktif: `static/images/tours/rajendra-hills/3D/rajendra_3d.glb`

```bash
cd static/images/tours/rajendra-hills/3D

# 1) Ekspor dari Blender ke nama SEMENTARA (jangan timpa yang aktif)
#    → taruh sebagai: rajendra_3d.RAW.glb

# 2) Optimasi: WebP + weld. WAJIB pakai flag ini — JANGAN --join/--palette/--draco
#    (join & palette menghapus NAMA material → kaca/rumput rusak; draco butuh
#     DRACOLoader yg belum dipasang di Model3DViewer → model tak load).
npx --yes @gltf-transform/cli@latest optimize rajendra_3d.RAW.glb rajendra_3d.OPT.glb \
  --texture-compress webp --compress false --join false --palette false --simplify false

# 3) CEK nama material kaca & rumput MASIH ADA (fitur viewer bergantung nama ini):
node -e 'const fs=require("fs");const b=fs.readFileSync("rajendra_3d.OPT.glb");const j=JSON.parse(b.slice(20,20+b.readUInt32LE(12)).toString());const m=(j.materials||[]).map(x=>x.name||"");console.log("MB:",(b.length/1048576).toFixed(1));console.log("kaca:",m.filter(n=>/kaca|glass|translucent/i.test(n)));console.log("rumput:",m.filter(n=>/rumput|grass|halaman/i.test(n)));'
#    Harus muncul minimal: kaca "Kaca_Jendela" & rumput "Rumput_Halaman"/"Grass".
#    Kalau KOSONG → Blender mengubah nama material; rename di Blender lalu ekspor ulang.

# 4) Backup file aktif lama, lalu ganti dengan hasil optimasi:
cp rajendra_3d.glb rajendra_3d.pre-update.glb
cp rajendra_3d.OPT.glb rajendra_3d.glb
rm rajendra_3d.RAW.glb rajendra_3d.OPT.glb

# 5) Refresh browser & cek visual (kaca reflektif? rumput natural? interior utuh?).
#    Kalau ada yg salah: cp rajendra_3d.pre-update.glb rajendra_3d.glb  (rollback)
```

Target ukuran akhir: **< 8 MB** (versi WebP+weld biasanya ~6 MB). Nama material yang
dijaga viewer (lihat `src/lib/components/Model3DViewer.svelte`):
- **Kaca** (jadi reflektif): nama mengandung `kaca` / `glass` / `translucent`
- **Rumput** (diredam warnanya): nama mengandung `rumput` / `grass` / `halaman`
- **Interior walkthrough**: butuh geometri dalam (lantai `Tiles`, plafon `Plafond_*`).

---

## 5. Batas real-time (yang TIDAK mungkin ditiru dari referensi)

Bahkan setelah A–D, `model-viewer` real-time **tidak akan** punya:

- **Depth of field** (blur latar sinematik)
- **Global illumination akurat** (cahaya memantul antar permukaan)
- **Tanaman/bunga/paving bervolume** seperti di referensi
- **Refleksi tajam** sempurna

Hasil realistis real-time = **sekelas showroom mobil di web** (bersih, bagus, tapi tetap
terbaca "3D real-time").

### Alternatif jika benar-benar mau sekelas foto referensi:
Buat **render statis** (hero image) dengan **D5 Render**, **Enscape**, atau **Lumion**
(plugin SketchUp), lalu tampilkan sebagai gambar. Realisme foto penuh, ringan, tapi
**tidak bisa diputar**. Praktik umum: gabungkan — 1 hero image realistik + model 3D
interaktif untuk eksplorasi.

> ⚠️ **PENTING — D5 Render / Enscape / Lumion BUKAN pengganti Blender.**
> Renderer ini menghasilkan **gambar/video/panorama 360°** (piksel diam), **BUKAN file
> `.glb`** yang bisa diputar user di web. Analogi: Blender = membangun & mengecat maket
> yang bisa diputar; D5 = memotret maket itu (dapat foto indah, bukan maketnya).
>
> - Mau model **tetap bisa diputar** di web → **wajib Blender → `.glb`** (jalur di dokumen ini). D5 tidak relevan.
> - Rela model **jadi statis** demi realisme foto → pakai D5, tampilkan sebagai `<img>`/`<video>`.
> - Jalan tengah: **D5 render panorama 360°** → masukkan sebagai node ke **sistem tur
>   virtual 360° yang sudah ada** (interior/streetview). Realistik + bisa lihat sekeliling,
>   tanpa Blender. Tapi ini "berdiri di dalam & lihat sekeliling", bukan "orbit model dari luar".
>
> Tidak ada satu output yang sekaligus "realisme D5" **dan** "orbit bebas seperti
> model-viewer" — itu batas teknologi web saat ini.

---

## 6. Ringkasan prioritas

| Prioritas | Langkah | Effort | Hasil |
|---|---|---|---|
| 1 (wajib) | A — Material di SketchUp | ~½ hari | Lompatan terbesar |
| 2 | B — Normal/roughness map (Blender) | ~1 hari | "Model game" → mendekati foto |
| 3 | D — Hapus alas rumput | ~10 menit | Bayangan kontak muncul |
| 4 (opsional) | C — Baked lighting | ~2 hari | Paling mendekati referensi |
| Alternatif | Render statis Enscape/Lumion | Bervariasi | Realisme foto, tapi tak interaktif |

---

## 7. File penting & cara rollback

- Model web (dipakai): `static/images/tours/rajendra-hills/3D/rajendra_3d.glb` (~6 MB, WebP)
- Backup sebelum optimasi WebP: `rajendra_3d.pre-webp-40mb.glb` (40 MB, Blender export)
- Model asli SketchUp: `rajendra_3d.original.glb` (6 MB, punya semua tekstur asli)
- Backup sebelum poles: `rajendra_3d.prepolish.glb`
- Backup sebelum ubah warna dinding: `rajendra_3d.prewall.glb`
- HDRI lama (bermatahari): `env/golden-hour.sunny-backup.hdr`
- **Viewer aktif: `src/lib/components/Model3DViewer.svelte`** (three.js: DirectionalLight
  matahari + GTAO + kaca reflektif + walkthrough interior WASD). Dipakai oleh tab Tur 3D
  di `VirtualTour.svelte`. Halaman uji: `/tur-virtual/rajendra-hills/3d-test`.
  (Viewer `<model-viewer>` lama sudah TIDAK dipakai.)

**Rollback model:** salin file backup menimpa `rajendra_3d.glb`.
**Rollback HDRI:** salin `golden-hour.sunny-backup.hdr` menimpa `golden-hour.hdr`.
