Taruh file HDRI environment kustom di folder ini untuk pencahayaan model 3D.

Nama file yang otomatis terdeteksi (urutan prioritas):
  1. golden-hour.hdr   (disarankan — mood sore keemasan Noblesse)
  2. sunset.hdr
  3. environment.hdr
  4. environment.jpg

Format:
  - .hdr equirectangular (rasio 2:1) paling ideal & realistis.
  - .jpg/.png HDR juga didukung model-viewer (kualitas lebih rendah).
  - Ukuran wajar: 1k-2k (1024x512 s/d 2048x1024) sudah cukup untuk web.

Sumber HDRI gratis (lisensi CC0): https://polyhaven.com/hdris
  Cari kategori "sunset" / "sunrise" untuk nuansa keemasan.

Setelah menaruh file, restart dev server; environment otomatis dipakai.
Jika folder ini kosong, model pakai environment "neutral" bawaan + sentuhan
keemasan (exposure/tone-mapping) yang sudah disetel di VirtualTour.svelte.
