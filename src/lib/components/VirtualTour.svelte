<!--
  VirtualTour.svelte — Tur Virtual 360° (Tur 3D Rumah placeholder + Tur VR Interior + Streetview Menuju Lokasi)
  Stack: Svelte 5 (runes) + Tailwind CSS 4 + Photo Sphere Viewer v5 (360°/virtual tour)

  Install dulu:
    npm i @photo-sphere-viewer/core @photo-sphere-viewer/virtual-tour-plugin \
          @photo-sphere-viewer/markers-plugin @photo-sphere-viewer/autorotate-plugin \
          @photo-sphere-viewer/gyroscope-plugin three

  Taruh foto 360° di:  static/tours/*.png  (diakses di kode sebagai "/tours/namafile.png")
  Semua foto saat ini PLACEHOLDER — ganti dengan foto 360° equirectangular asli
  (rasio 2:1, format JPG, idealnya ≥4000×2000px). Boleh pakai nama file yang sama
  persis agar tidak perlu mengubah kode di bawah.

  Cara pakai (data vrNodes/streetNodes dimuat dari DB oleh route pemanggil, lihat
  src/routes/tur-virtual/[slug]/+page.server.ts dan admin > Tur Virtual 360°):
    import VirtualTour from '$lib/components/VirtualTour.svelte';
    <VirtualTour houseName={...} vrNodes={...} streetNodes={...} />

  Menambah titik interior/streetview (target 30–50 titik streetview): kelola lewat
  admin > Tur Virtual 360° — tiap titik butuh id unik (nodeKey), foto (panorama),
  posisi mapX/mapY (0–100, untuk denah skematik kanan-atas, tak perlu presisi),
  dan link ke titik sebelum/sesudah dengan yaw (arah panah) dikalibrasi presisi
  langsung di viewer 360° admin (klik pada foto, mis. tepat di pintu tujuan).

  Tur 3D Rumah masih placeholder (model masih dibuat di SketchUp). Setelah diekspor
  ke .glb/.gltf, ganti blok bertanda "🔌 3D PLACEHOLDER" dengan Google <model-viewer>.

  🔌 SSR: semua import Photo Sphere Viewer dilakukan lazy (dynamic import) di dalam
  initVR()/initStreet(), bukan di top-level module — aman dipakai di SvelteKit
  meski route-nya di-server-side-render.
-->
<script>
  // @ts-nocheck -- komponen ditulis sebagai plain JS (bukan lang="ts"); project ini
  // memakai checkJs+strict di tsconfig sehingga svelte-check melaporkan implicit-any
  // di banyak tempat walau tidak ada bug. Lihat catatan handoff di header file ini.
  import { onDestroy } from 'svelte';
  import Model3DViewer from './Model3DViewer.svelte';

  /* ──────────────── PROPS ────────────────
     houseName: judul yang tampil di atas panel ("Rumah Tipe 45 · Noblesse Grand Avenue").
     vrNodes/streetNodes: data titik foto 360° (interior/streetview), dimuat dari DB oleh
     route pemanggil. Bentuk tiap node:
       { id, name, img, mapX, mapY, links: [{ to, yaw }], marker?: { yaw, pitch, title, desc } }
     Default array kosong: komponen tetap aman dipakai walau properti belum punya foto tur.
     floorPlanImage: path foto denah lantai asli (mis. /images/tours/rajendra-hills/floor-plan.jpg)
     dipakai sebagai latar panel "Denah Skematik" Tur VR Interior. Kalau null/kosong, panel
     jatuh ke SVG garis putus-putus lama (lihat vrMapPath).
     otherProjects/currentSlug: daftar semua proyek aktif (dari route pemanggil) untuk
     switcher "Proyek Lain" di header — pindah tur tanpa balik ke beranda. Tiap item:
       { name, slug, imagePath, hasTour }. Proyek tanpa tur ditandai "Segera Hadir". */
  let { houseName = 'Rumah Tipe 45 · Noblesse Grand Avenue', vrNodes = [], streetNodes = [], floorPlanImage = null, glbSrc = null, envImage = null, otherProjects = [], currentSlug = '' } = $props();

  /* ──────────────── STATE ──────────────── */
  let mode = $state('3d'); // '3d' | 'vr' | 'street'
  let projectMenuOpen = $state(false);

  /* ──────────────── 3D (three.js — Model3DViewer) ────────────────
     Tab "Tur 3D" memakai komponen Model3DViewer.svelte (three.js murni) untuk
     realisme penuh: DirectionalLight matahari + shadow map + HDRI + kaca reflektif.
     Komponen itu meng-handle load/spinner/error & cleanup-nya sendiri; di sini kita
     cukup me-mount-nya saat mode==='3d'. Props diteruskan apa adanya (glbSrc, envImage,
     houseName). Fitur AR (khusus <model-viewer>) sengaja tidak dibawa ke viewer baru. */

  let vrRootEl, streetRootEl;
  let vrWrapEl, streetWrapEl;
  let vrViewer, vrTour, vrMarkersPlugin;
  let streetViewer, streetTour, streetMarkersPlugin;
  let vrLoading = false, streetLoading = false;

  let vrInited = $state(false);
  let vrError = $state(null);
  let vrNodeId = $state(vrNodes[0]?.id ?? '');
  let vrHintOn = $state(true);
  let vrMarker = $state(null);

  let streetInited = $state(false);
  let streetError = $state(null);
  let streetNodeId = $state(streetNodes[0]?.id ?? '');
  let streetHintOn = $state(true);
  let streetMarker = $state(null);

  // Pindah proyek lewat switcher "Proyek Lain" navigasi ke slug baru tanpa remount
  // komponen — tutup dropdown & kembali ke tab 3D supaya tak "nyangkut" di state lama.
  $effect(() => {
    void currentSlug;
    projectMenuOpen = false;
    mode = '3d';
  });

  // Properti bisa berganti tanpa remount komponen (mis. navigasi antar-slug di
  // /tur-virtual/[slug]) — reset viewer & state saat data node berubah.
  $effect(() => {
    void vrNodes;
    try { vrViewer?.destroy(); } catch (e) {}
    vrViewer = vrTour = vrMarkersPlugin = undefined;
    vrInited = false;
    vrError = null;
    vrNodeId = vrNodes[0]?.id ?? '';
    vrMarker = null;
    vrHintOn = true;
  });
  $effect(() => {
    void streetNodes;
    try { streetViewer?.destroy(); } catch (e) {}
    streetViewer = streetTour = streetMarkersPlugin = undefined;
    streetInited = false;
    streetError = null;
    streetNodeId = streetNodes[0]?.id ?? '';
    streetMarker = null;
    streetHintOn = true;
  });

  /* ──────────────── DERIVED ──────────────── */
  const vrIdx = $derived(Math.max(0, vrNodes.findIndex(n => n.id === vrNodeId)));
  const streetIdx = $derived(Math.max(0, streetNodes.findIndex(n => n.id === streetNodeId)));
  const vrNode = $derived(vrNodes[vrIdx]);
  const streetNode = $derived(streetNodes[streetIdx]);

  // Deskripsi tab 3D beda tergantung apakah model .glb sudah tersedia — dulu teks
  // "sedang dimodelkan di SketchUp" ditampilkan tanpa syarat meski model sudah jadi
  // & tampil sempurna, jadi terlihat kontradiktif dengan yang dilihat pengguna.
  const TITLES = $derived({
    '3d': [
      'Model 3D Rumah',
      glbSrc
        ? 'Putar dan telusuri model 3D rumah dari luar maupun dalam — seret untuk memutar, gulir untuk zoom.'
        : 'Putar dan telusuri model 3D rumah dari luar maupun dalam. Sedang dalam proses pemodelan di SketchUp.'
    ],
    vr: ['Tur VR — Jelajahi Interior', 'Rasakan setiap sudut hunian dari dalam. Seret untuk melihat sekeliling, klik anak panah emas untuk berpindah ruangan.'],
    street: ['Streetview Menuju Lokasi', 'Ikuti jalur foto 360° dari gerbang utama hingga tiba di depan rumah — seperti berjalan langsung ke lokasi.'],
  });
  const modeTitle = $derived(TITLES[mode][0]);
  const modeDesc = $derived(TITLES[mode][1]);

  function pathOf(list, close) {
    if (!list.length) return '';
    const pts = list.map(n => `${n.mapX},${n.mapY}`);
    if (close) pts.push(`${list[0].mapX},${list[0].mapY}`);
    return pts.join(' ');
  }
  const vrMapPath = $derived(pathOf(vrNodes, true));
  const streetMapPath = $derived(pathOf(streetNodes, false));

  /* ──────────────── HELPERS DE STYLE (Tailwind, kelas kondisional) ──────────────── */
  const TAB_ICONS = {
    '3d': 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.3 7l8.7 5 8.7-5M12 22V12',
    vr: 'M12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM3 12c0-1.5 3.5-6 9-6s9 4.5 9 6-3.5 6-9 6-9-4.5-9-6z',
    street: 'M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7'
  };
  function tabClass(m) {
    return 'group relative flex items-center gap-2.5 px-5 py-3.5 rounded-[3px] text-[11.5px] font-semibold tracking-wide uppercase transition-all whitespace-nowrap ' +
      (mode === m
        ? 'bg-gradient-to-br from-[#E7C76A] to-[#D4AF37] text-[#08152E] shadow-[0_8px_24px_rgba(212,175,55,.35)]'
        : 'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-white/[.04]');
  }
  /* Tombol "Layar Penuh" tab VR/Streetview. Bukan absolute — ia anak dari kolom flex
     kanan-atas bersama panel denah, sehingga otomatis jatuh di bawah panel tanpa
     perlu menebak offset piksel (tinggi panel berbeda antara mode foto & SVG).
     Gaya kaca gelap disamakan dengan tombol di viewer 3D. */
  const fsBtnClass =
    'inline-flex items-center gap-2 px-3 py-2 rounded-[3px] ' +
    'border border-[#D4AF37]/40 bg-[#060e22]/80 backdrop-blur-md text-[#E7C76A] text-[12.5px] font-semibold ' +
    'shadow-[0_8px_22px_rgba(0,0,0,.35)] hover:bg-[#060e22]/95 active:scale-[.96] transition-all cursor-pointer';

  function railClass(active) {
    return 'group shrink-0 relative px-4 py-2.5 rounded-[3px] border text-[12.5px] font-semibold whitespace-nowrap transition-all cursor-pointer ' +
      (active
        ? 'border-[#D4AF37]/70 bg-gradient-to-b from-[#D4AF37]/20 to-[#D4AF37]/5 text-[#E7C76A] shadow-[0_4px_16px_rgba(212,175,55,.18)]'
        : 'border-white/10 bg-white/[.03] text-slate-300 hover:border-[#D4AF37]/30 hover:text-white hover:bg-white/[.06]');
  }
  function dotClass(active) {
    return 'absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ' +
      (active ? 'w-[11px] h-[11px] bg-[#E7C76A] shadow-[0_0_0_5px_rgba(212,175,55,.22)]' : 'w-1.5 h-1.5 bg-white/45');
  }
  function dotPos(n) { return `left:${n.mapX}%;top:${n.mapY}%`; }

  /* ──────────────── PHOTO SPHERE VIEWER ────────────────
     Arah panah navigasi (yaw) memakai nilai manual yang diatur admin lewat
     kalibrasi interaktif di viewer 360° (klik langsung ke titik pintu/arah
     tujuan pada foto asli) — lihat src/routes/admin/virtual-tour/+page.svelte.
     Ini presisi karena dikalibrasi per foto, berbeda dari posisi denah
     skematik (mapX/mapY) yang hanya untuk minimap dan tak wajib akurat. */
  // Elemen arrow (ikon panah bulat saja). Objek ini dirotasi rigid oleh
  // plugin mengikuti yaw (lihat ArrowsRenderer.addLinkArrow), yang cocok
  // untuk ikon panah tapi membuat teks label ikut miring/terbalik dan
  // sulit dibaca kalau ikut digabung. Karena itu label nama ruangan
  // dipisah sebagai marker (lihat linkLabelMarkers di buildNodes) —
  // markers-plugin selalu membuat elemen menghadap kamera (billboard),
  // jadi teksnya tetap tegak lurus di layar untuk yaw berapa pun.
  function arrowElement() {
    // PENTING: plugin virtual-tour meng-override langsung `element.style.width`
    // dan `.height` pada elemen yang dikembalikan di sini (lihat
    // ArrowsRenderer.addLinkArrow: element.style.width = size.width*1.5+'px').
    // Kalau lingkaran emas dipasang pada elemen terluar itu sendiri, ia jadi
    // ikut membesar dipaksa jadi ukuran size*1.5 (mis. 135px), sehingga
    // tampilannya jadi bulat besar polos & ikon chevron kecil di tengahnya
    // nyaris tak terlihat. Solusi: bungkus lingkaran+ikon di DIV ANAK
    // dengan ukuran tetap sendiri; elemen terluar biarkan transparan &
    // hanya jadi wadah yang boleh di-resize plugin.
    const el = document.createElement('div');
    el.style.cssText = 'display:flex;align-items:center;justify-content:center;';
    el.innerHTML =
      '<div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#E7C76A,#D4AF37);' +
      'display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 7px rgba(212,175,55,.25);cursor:pointer;">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#08152E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>' +
      '</div>';
    return el;
  }

  // Saat 2+ link dari node yang sama punya yaw berdekatan (mis. tiga pintu
  // yang searah), panahnya akan tumpang tindih secara visual. Kelompokkan
  // link yang berdekatan (< ANGLE_GROUP_THRESHOLD) lalu beri tiap anggota
  // pitch bertingkat (baris atas/bawah berbeda) supaya tetap terpisah jelas
  // tanpa mengubah yaw hasil kalibrasi admin.
  const ANGLE_GROUP_THRESHOLD = 28; // derajat
  const PITCH_STEP = 13; // derajat, jarak antar baris dalam satu kelompok

  // Terapkan arah pandang awal kamera untuk node yang baru aktif. Dipanggil dari
  // handler node-changed (jalan saat pertama load DAN tiap pindah node), memakai
  // nilai initialYaw yang kita titipkan di node.data. Jika node belum diatur
  // (null), tidak diputar apa-apa — viewer tetap pada horizon depan (yaw 0).
  function applyInitialYaw(viewer, node) {
    const y = node?.data?.initialYaw;
    if (viewer && y != null) {
      try { viewer.rotate({ yaw: (y * Math.PI) / 180, pitch: 0 }); } catch (e) {}
    }
  }

  function angleDiff(a, b) {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }

  function withSpreadPitch(links) {
    const items = links.map(l => ({ ...l, _yaw: ((l.yaw % 360) + 360) % 360 }));
    items.sort((a, b) => a._yaw - b._yaw);
    const groups = [];
    for (const item of items) {
      const group = groups.find(g => g.some(m => angleDiff(m._yaw, item._yaw) < ANGLE_GROUP_THRESHOLD));
      if (group) group.push(item);
      else groups.push([item]);
    }
    for (const group of groups) {
      if (group.length < 2) continue;
      const mid = (group.length - 1) / 2;
      group.forEach((item, i) => { item._pitchOffset = (i - mid) * PITCH_STEP; });
    }
    return items;
  }

  function buildNodes(list) {
    const byId = new Map(list.map(n => [n.id, n]));
    return list.map(n => {
      const spreadLinks = withSpreadPitch(n.links);

      // Label nama ruangan tujuan, satu marker per link, ditempatkan agak
      // di bawah ikon arrow (pitch - 14deg) memakai yaw yang sama persis.
      // Markers-plugin selalu membuat elemen menghadap kamera (billboard),
      // beda dari arrow yang dirotasi rigid — jadi teks label tetap tegak
      // lurus dan mudah dibaca dari sudut manapun, tidak ikut miring.
      const linkLabelMarkers = spreadLinks.map(l => {
        const target = byId.get(l.to);
        const pitch = 3 + (l._pitchOffset ?? 0);
        return {
          id: n.id + '-link-' + l.to,
          position: { yaw: l.yaw + 'deg', pitch: (pitch - 8) + 'deg' },
          html:
            '<div style="width:140px;padding:3px 10px;border-radius:20px;box-sizing:border-box;' +
            'background:#060e22e6;border:1px solid rgba(212,175,55,.5);color:#E7C76A;font-size:12.5px;' +
            'font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;line-height:1.5;pointer-events:none;">' +
            (target ? target.name : l.to) + '</div>',
          size: { width: 140, height: 24 },
          anchor: 'top center',
        };
      });

      return {
        id: n.id,
        panorama: n.img,
        name: n.name,
        // Arah pandang awal kamera (yaw derajat) yang diatur admin per titik
        // (kolom initial_yaw). Virtual-tour-plugin tidak punya properti "defaultYaw"
        // per node, jadi nilai ini kita simpan di node.data lalu terapkan lewat
        // viewer.rotate() saat event node-changed (lihat initVR/initStreet).
        data: { initialYaw: n.initialYaw ?? null },
        links: spreadLinks.map(l => {
          const pitch = 3 + (l._pitchOffset ?? 0);
          return {
            nodeId: l.to,
            position: { yaw: l.yaw + 'deg', pitch: pitch + 'deg' },
            // linkOffset.depth > 1 mendorong render panah lebih jauh dari
            // kamera (radius bola default = depth 1) — panah tampak lebih
            // kecil & menjauh ke arah cakrawala, tidak menempel di tengah.
            linkOffset: { depth: 1.5 },
            arrowStyle: { element: arrowElement, size: { width: 90, height: 90 } },
          };
        }),
        markers: [
          ...linkLabelMarkers,
          ...(n.marker
            ? [{
                id: n.id + '-info',
                position: { yaw: n.marker.yaw, pitch: n.marker.pitch },
                html: '<div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#E7C76A,#D4AF37);display:flex;align-items:center;justify-content:center;color:#08152E;font-family:Georgia,serif;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 0 0 5px rgba(212,175,55,.2);">i</div>',
                size: { width: 30, height: 30 },
                anchor: 'center center',
                tooltip: { content: '<strong>' + n.marker.title + '</strong><br>' + n.marker.desc, position: 'top' },
                data: { title: n.marker.title, desc: n.marker.desc },
              }]
            : []),
        ],
      };
    });
  }

  async function loadPSV() {
    // 🔌 Diimpor lazy (dynamic import) supaya aman di-SSR dan tidak membengkakkan bundle awal.
    const [core, tour, markers, autorotate, gyro] = await Promise.all([
      import('@photo-sphere-viewer/core'),
      import('@photo-sphere-viewer/virtual-tour-plugin'),
      import('@photo-sphere-viewer/markers-plugin'),
      import('@photo-sphere-viewer/autorotate-plugin'),
      import('@photo-sphere-viewer/gyroscope-plugin'),
    ]);
    await Promise.all([
      import('@photo-sphere-viewer/core/index.css'),
      import('@photo-sphere-viewer/markers-plugin/index.css'),
      import('@photo-sphere-viewer/virtual-tour-plugin/index.css'),
    ]);
    return { Viewer: core.Viewer, VirtualTourPlugin: tour.VirtualTourPlugin, MarkersPlugin: markers.MarkersPlugin, AutorotatePlugin: autorotate.AutorotatePlugin, GyroscopePlugin: gyro.GyroscopePlugin };
  }

  async function initVR() {
    if (vrInited || vrLoading) return;
    if (!vrNodes.length) {
      vrError = 'Foto 360° interior untuk properti ini belum tersedia.';
      return;
    }
    vrLoading = true;
    try {
      const { Viewer, VirtualTourPlugin, MarkersPlugin, AutorotatePlugin, GyroscopePlugin } = await loadPSV();
      await new Promise(r => setTimeout(r, 30)); // beri waktu DOM commit sebelum ukur ukuran container
      const viewer = new Viewer({
        container: vrRootEl,
        // 'fullscreen' bawaan PSV DIHAPUS: ia mem-fullscreen-kan container PSV saja,
        // sehingga panel denah / label node / hint (sibling di luar container) hilang
        // dari layar. Diganti tombol kustom di pojok kanan atas yang mem-fullscreen-kan
        // wrapper — lihat toggleWrapFullscreen().
        navbar: ['zoom', 'autorotate', 'gyroscope'],
        rendererParameters: { preserveDrawingBuffer: true },
        plugins: [
          MarkersPlugin,
          // autostartDelay: null → panorama TIDAK berputar sendiri saat idle.
          // Plugin tetap dipasang agar tombol 'autorotate' di navbar berfungsi
          // bila user ingin menyalakannya manual.
          AutorotatePlugin.withConfig({ autostartDelay: null }),
          GyroscopePlugin,
          VirtualTourPlugin.withConfig({
            positionMode: 'manual',
            renderMode: '3d',
            nodes: buildNodes(vrNodes),
            startNodeId: vrNodes[0].id,
          }),
        ],
      });
      vrViewer = viewer;
      vrTour = viewer.getPlugin(VirtualTourPlugin);
      vrMarkersPlugin = viewer.getPlugin(MarkersPlugin);
      vrTour.addEventListener('node-changed', (e) => { vrNodeId = e.node.id; vrMarker = null; applyInitialYaw(vrViewer, e.node); });
      vrMarkersPlugin.addEventListener('select-marker', (e) => {
        const d = e.marker && (e.marker.data || (e.marker.config && e.marker.config.data));
        if (d) vrMarker = d;
      });
      vrInited = true;
      setTimeout(() => { vrHintOn = false; }, 5000);
    } catch (err) {
      console.error('Gagal memuat Tur VR', err);
      vrError = 'Gagal memuat penampil 360°. Periksa koneksi internet Anda lalu muat ulang halaman.';
    }
    vrLoading = false;
  }

  async function initStreet() {
    if (streetInited || streetLoading) return;
    if (!streetNodes.length) {
      streetError = 'Foto 360° streetview untuk properti ini belum tersedia.';
      return;
    }
    streetLoading = true;
    try {
      const { Viewer, VirtualTourPlugin, MarkersPlugin, AutorotatePlugin, GyroscopePlugin } = await loadPSV();
      await new Promise(r => setTimeout(r, 30));
      const viewer = new Viewer({
        container: streetRootEl,
        // 'fullscreen' bawaan PSV DIHAPUS: ia mem-fullscreen-kan container PSV saja,
        // sehingga panel denah / label node / hint (sibling di luar container) hilang
        // dari layar. Diganti tombol kustom di pojok kanan atas yang mem-fullscreen-kan
        // wrapper — lihat toggleWrapFullscreen().
        navbar: ['zoom', 'autorotate', 'gyroscope'],
        rendererParameters: { preserveDrawingBuffer: true },
        plugins: [
          MarkersPlugin,
          // Sama seperti tab VR: tanpa putaran otomatis, tombol navbar tetap aktif.
          AutorotatePlugin.withConfig({ autostartDelay: null }),
          GyroscopePlugin,
          VirtualTourPlugin.withConfig({
            positionMode: 'manual',
            renderMode: '3d',
            nodes: buildNodes(streetNodes),
            startNodeId: streetNodes[0].id,
          }),
        ],
      });
      streetViewer = viewer;
      streetTour = viewer.getPlugin(VirtualTourPlugin);
      streetMarkersPlugin = viewer.getPlugin(MarkersPlugin);
      streetTour.addEventListener('node-changed', (e) => { streetNodeId = e.node.id; streetMarker = null; applyInitialYaw(streetViewer, e.node); });
      streetMarkersPlugin.addEventListener('select-marker', (e) => {
        const d = e.marker && (e.marker.data || (e.marker.config && e.marker.config.data));
        if (d) streetMarker = d;
      });
      streetInited = true;
      setTimeout(() => { streetHintOn = false; }, 5000);
    } catch (err) {
      console.error('Gagal memuat Streetview', err);
      streetError = 'Gagal memuat penampil 360°. Periksa koneksi internet Anda lalu muat ulang halaman.';
    }
    streetLoading = false;
  }

  /* ──────────────── LAYAR PENUH (tab VR & Streetview) ────────────────
     Yang di-fullscreen adalah WRAPPER tab (vrWrapEl/streetWrapEl), bukan container
     PSV — supaya panel denah, label node, hint, dan kartu info marker ikut terbawa.
     Tombol 'fullscreen' bawaan PSV sudah dihapus dari navbar karena hanya membawa
     container-nya saja.

     Sama seperti Model3DViewer: ada fallback CSS untuk iOS Safari yang tidak
     mendukung requestFullscreen pada elemen non-video. PSV punya ResizeObserver
     sendiri sehingga panorama otomatis menyesuaikan ukuran baru. */
  let psvFs = $state(false);          // sedang layar penuh (tab VR/street mana pun)
  let psvFsFallback = $state(false);  // memakai jalur CSS (iOS)

  function wrapElFor(m) { return m === 'vr' ? vrWrapEl : streetWrapEl; }

  async function toggleWrapFullscreen() {
    if (psvFs) { await exitWrapFullscreen(); return; }
    const el = wrapElFor(mode);
    if (!el) return;

    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) {
      try {
        await req.call(el);
        return; // sukses → onPsvFsChange yang men-set psvFs
      } catch (e) { /* ditolak → fallback CSS */ }
    }
    psvFsFallback = true;
    psvFs = true;
    document.body.style.overflow = 'hidden';
    // Beri tahu PSV agar mengukur ulang container setelah wrapper berubah ukuran.
    setTimeout(() => { try { (mode === 'vr' ? vrViewer : streetViewer)?.autoSize(); } catch (e) {} }, 60);
  }

  async function exitWrapFullscreen() {
    if (psvFsFallback) {
      psvFsFallback = false;
      psvFs = false;
      document.body.style.overflow = '';
      setTimeout(() => { try { (mode === 'vr' ? vrViewer : streetViewer)?.autoSize(); } catch (e) {} }, 60);
      return;
    }
    try {
      const ex = document.exitFullscreen || document.webkitExitFullscreen;
      if (ex && (document.fullscreenElement || document.webkitFullscreenElement)) await ex.call(document);
    } catch (e) {}
  }

  // Sinkronkan state saat user keluar lewat Esc / gestur browser.
  function onPsvFsChange() {
    const el = document.fullscreenElement || document.webkitFullscreenElement;
    psvFs = !!el && (el === vrWrapEl || el === streetWrapEl);
  }

  // Esc pada jalur fallback tidak ditangani browser (tak ada fullscreen natif aktif).
  function onPsvFsKey(e) {
    if (e.key === 'Escape' && psvFsFallback) exitWrapFullscreen();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('fullscreenchange', onPsvFsChange);
    document.addEventListener('webkitfullscreenchange', onPsvFsChange);
    window.addEventListener('keydown', onPsvFsKey);
  }

  function setMode3d() { mode = '3d'; }
  function setModeVr() { mode = 'vr'; setTimeout(initVR, 0); }
  function setModeStreet() { mode = 'street'; setTimeout(initStreet, 0); }

  // Tab 3D memakai <Model3DViewer> yang di-mount kondisional di markup (mode==='3d'),
  // jadi tak perlu lagi effect pemuat model-viewer di sini.

  onDestroy(() => {
    try { vrViewer?.destroy(); } catch (e) {}
    try { streetViewer?.destroy(); } catch (e) {}
    // Lepas listener layar penuh & pulihkan scroll body — kalau komponen dilepas saat
    // masih fullscreen (mis. navigasi keluar), halaman tak boleh tertinggal terkunci.
    try {
      document.removeEventListener('fullscreenchange', onPsvFsChange);
      document.removeEventListener('webkitfullscreenchange', onPsvFsChange);
      window.removeEventListener('keydown', onPsvFsKey);
      if (psvFsFallback) document.body.style.overflow = '';
      const ex = document.exitFullscreen || document.webkitExitFullscreen;
      const cur = document.fullscreenElement || document.webkitFullscreenElement;
      if (ex && cur && (cur === vrWrapEl || cur === streetWrapEl)) ex.call(document);
    } catch (e) {}
  });
</script>

<!-- Ikon layar penuh (masuk/keluar) — dipakai tombol di tab VR & Streetview. -->
{#snippet fsIcon(isOn)}
  {#if isOn}
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
  {:else}
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
  {/if}
{/snippet}

<div class="w-full font-[Inter,sans-serif] text-white">

  <div class="flex items-start justify-between gap-5 flex-wrap mb-6">
    <div class="flex items-center gap-4">
      <span class="hidden sm:flex w-11 h-11 shrink-0 rounded-full items-center justify-center bg-gradient-to-br from-[#E7C76A]/15 to-[#D4AF37]/5 border border-[#D4AF37]/30">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
      </span>
      <div>
        <div class="font-[Cinzel,serif] text-[10px] tracking-[.32em] text-[#D4AF37] font-semibold mb-1">TUR VIRTUAL 360°</div>
        <h2 class="font-[Playfair_Display,serif] font-extrabold text-2xl md:text-3xl leading-tight">{houseName}</h2>
      </div>
    </div>

    <!-- Switcher "Proyek Lain" — pindah tur tanpa balik ke beranda. -->
    {#if otherProjects.length > 1}
      <div class="relative">
        <button
          onclick={() => (projectMenuOpen = !projectMenuOpen)}
          class="flex items-center gap-2.5 pl-2 pr-3.5 py-2 rounded-[4px] border border-white/[.1] bg-white/[.03] hover:bg-white/[.06] hover:border-[#D4AF37]/30 transition-all text-[13px] font-semibold text-slate-200"
        >
          <span class="flex items-center justify-center w-7 h-7 rounded-[3px] bg-[#D4AF37]/12 text-[#D4AF37]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </span>
          Proyek Lain
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-500 transition-transform {projectMenuOpen ? 'rotate-180' : ''}"><path d="m6 9 6 6 6-6"/></svg>
        </button>

        {#if projectMenuOpen}
          <!-- Backdrop tak terlihat untuk menutup dropdown saat klik di luar. -->
          <button
            class="fixed inset-0 z-[19] cursor-default"
            aria-label="Tutup menu proyek"
            onclick={() => (projectMenuOpen = false)}
          ></button>
          <div class="absolute right-0 top-[calc(100%+10px)] z-20 w-[280px] bg-[#0A1F44] border border-[#D4AF37]/25 rounded-[6px] shadow-[0_24px_60px_rgba(0,0,0,.5)] overflow-hidden">
            <div class="px-4 pt-3.5 pb-2.5 font-[Cinzel,serif] text-[9.5px] tracking-[.24em] text-[#D4AF37]/80 border-b border-white/[.06]">PILIH PROYEK</div>
            <div class="max-h-[320px] overflow-y-auto py-1.5">
              {#each otherProjects as p (p.slug)}
                {#if p.hasTour}
                  <a
                    href="/tur-virtual/{p.slug}"
                    class="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[.05] transition-colors {p.slug === currentSlug ? 'bg-[#D4AF37]/10' : ''}"
                  >
                    <span class="w-9 h-9 shrink-0 rounded-[3px] overflow-hidden bg-[#08152E] border border-white/[.08]">
                      {#if p.imagePath}<img src={p.imagePath} alt="" class="w-full h-full object-cover" />{/if}
                    </span>
                    <span class="flex-1 text-[13.5px] font-semibold {p.slug === currentSlug ? 'text-[#E7C76A]' : 'text-slate-200'}">{p.name}</span>
                    {#if p.slug === currentSlug}
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    {/if}
                  </a>
                {:else}
                  <div class="flex items-center gap-3 px-4 py-2.5 opacity-45 cursor-not-allowed">
                    <span class="w-9 h-9 shrink-0 rounded-[3px] overflow-hidden bg-[#08152E] border border-white/[.08]">
                      {#if p.imagePath}<img src={p.imagePath} alt="" class="w-full h-full object-cover" />{/if}
                    </span>
                    <span class="flex-1 text-[13.5px] font-semibold text-slate-300">{p.name}</span>
                    <span class="text-[9.5px] font-semibold tracking-wide uppercase text-slate-500 border border-white/10 rounded-full px-2 py-[3px] whitespace-nowrap">Segera Hadir</span>
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="flex items-center justify-between gap-4 flex-wrap pb-7 mb-8 border-b border-white/[.07]">
    <div class="inline-flex gap-1 p-1.5 bg-white/[.03] border border-white/[.08] rounded-[4px] flex-wrap backdrop-blur-sm">
      <button onclick={setMode3d} class={tabClass('3d')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="opacity-80"><path d={TAB_ICONS['3d']}/></svg>
        Tur 3D Rumah
      </button>
      <button onclick={setModeVr} class={tabClass('vr')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="opacity-80"><path d={TAB_ICONS.vr}/></svg>
        Tur VR Interior
      </button>
      <button onclick={setModeStreet} class={tabClass('street')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="opacity-80"><path d={TAB_ICONS.street}/></svg>
        Streetview Lokasi
      </button>
    </div>
  </div>

  <div class="text-center mb-8">
    <div class="inline-flex items-center gap-3 mb-3.5">
      <span class="w-8 h-px bg-gradient-to-r from-transparent to-[#D4AF37]/70"></span>
      <span class="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
      <span class="w-8 h-px bg-gradient-to-l from-transparent to-[#D4AF37]/70"></span>
    </div>
    <h3 class="font-[Playfair_Display,serif] font-extrabold text-[26px] md:text-4xl leading-tight mb-2.5">{modeTitle}</h3>
    <p class="text-slate-400 text-[15.5px] leading-relaxed max-w-[640px] mx-auto">{modeDesc}</p>
  </div>

  <!-- ================= VIEWER STAGE ================= -->
  <div class="relative rounded-[6px] p-[1px] bg-gradient-to-br from-[#D4AF37]/40 via-[#D4AF37]/10 to-transparent shadow-[0_40px_100px_rgba(0,0,0,.55)]">
    <div class="relative h-[clamp(560px,82vh,860px)] rounded-[5px] overflow-hidden bg-gradient-to-b from-[#0A1F44] to-[#08152E]">

    <!-- ================= 3D MODEL (three.js — Model3DViewer) =================
         Diganti dari <model-viewer> ke viewer three.js murni (Model3DViewer.svelte)
         untuk realisme penuh: DirectionalLight (matahari) + shadow map + HDRI +
         kaca reflektif. Komponen menangani spinner & error-nya sendiri. Catatan:
         fitur AR "Lihat di Ruang Anda" (khusus model-viewer) DIHAPUS pada penggantian
         ini — lihat memori threejs-realistic-viewer-lighting. -->
    <div class={'absolute inset-0 ' + (mode === '3d' ? 'block' : 'hidden')}>
      {#if glbSrc}
        {#if mode === '3d'}
          <!-- Mount hanya saat tab 3D aktif → tak membebani GPU saat user di tab VR/Street.
               Hint kontrol (orbit / walkthrough) dirender DI DALAM Model3DViewer karena
               hanya komponen itu yang tahu sedang mode luar atau mode telusuri. -->
          <Model3DViewer {glbSrc} {envImage} {houseName} />
          <!-- Vignette: langit render 3D (biru cerah) bertemu langsung tepi panel
               gelap tanpa transisi ("patah") — redam tepinya, biarkan tengah (rumah)
               bersih. z-[2] di atas canvas Model3DViewer, di bawah tombol/hint (z-[5+]). -->
          <div class="absolute inset-0 z-[2] pointer-events-none" style="box-shadow: inset 0 0 90px 20px rgba(6,14,34,.55);"></div>
        {/if}
      {:else}
        <!-- Fallback: proyek ini belum punya file .glb -->
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-8">
          <span class="w-16 h-16 rounded-full border border-[#D4AF37]/40 flex items-center justify-center bg-[#D4AF37]/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
          </span>
          <div class="font-[Cinzel,serif] text-xs tracking-[.28em] text-[#D4AF37]">SEDANG DIMODELKAN DI SKETCHUP</div>
          <p class="text-slate-400 text-[14.5px] leading-relaxed max-w-[460px]">Model 3D detail rumah — orbit dari luar dan telusuri dari dalam — akan ditempatkan di sini setelah proses pemodelan selesai.</p>
        </div>
      {/if}
    </div>

    <!-- VR wrap -->
    <!-- bind:this={vrWrapEl} — TARGET layar penuh. Sengaja wrapper, bukan vrRootEl
         (container PSV): overlay denah/label node/hint adalah sibling di luar
         container, jadi kalau yang di-fullscreen container-nya saja, semua panel itu
         hilang dari layar. Lihat toggleWrapFullscreen(). -->
    <div bind:this={vrWrapEl} class={'psv-tab-wrap ' + (psvFsFallback && mode === 'vr' ? 'psv-fs-fallback ' : '') + (mode === 'vr' ? 'block absolute inset-0' : 'hidden')}>
      <div bind:this={vrRootEl} class="absolute inset-0 z-[1]"></div>

      <div class="absolute top-4 left-4 z-[5] pointer-events-none bg-[#060e22]/75 backdrop-blur-md border border-[#D4AF37]/25 px-4.5 py-3 rounded-[4px] shadow-[0_10px_28px_rgba(0,0,0,.35)]">
        <div class="flex items-center gap-2 mb-1">
          <span class="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
          <div class="font-[Cinzel,serif] text-[9.5px] tracking-[.22em] text-[#D4AF37]">NODE {vrIdx + 1} / {vrNodes.length}</div>
        </div>
        <div class="font-[Playfair_Display,serif] font-bold text-base">{vrNode?.name ?? ''}</div>
      </div>

      <div class={'absolute bottom-[76px] left-1/2 -translate-x-1/2 z-[5] pointer-events-none bg-[#060e22]/85 backdrop-blur-md border border-white/[.06] px-4.5 py-2.5 rounded-full text-[12.5px] text-slate-200 whitespace-nowrap transition-opacity duration-700 ' + (vrHintOn ? 'opacity-100' : 'opacity-0')}>↺ Seret untuk melihat sekeliling · titik emas = info</div>

      {#if vrError}
        <div class="absolute inset-0 z-[6] flex items-center justify-center text-center p-8 bg-[#060e22]/85 text-slate-200 text-[14.5px]">{vrError}</div>
      {/if}

      <!-- Kolom kanan-atas: panel denah + tombol layar penuh ditumpuk vertikal.
           Dijadikan satu flex-col (bukan dua elemen absolut dgn offset tebakan) supaya
           tombol selalu jatuh persis di bawah panel, berapa pun tinggi panelnya —
           tinggi panel berbeda antara mode foto denah & SVG skematik. -->
      <div class={'absolute top-4 right-4 z-[5] flex flex-col items-end gap-2 ' + (floorPlanImage ? 'w-[130px]' : 'w-[150px]')}>
      <div class={'w-full bg-[#060e22]/80 backdrop-blur-md border border-[#D4AF37]/25 rounded-[4px] p-2.5 shadow-[0_10px_28px_rgba(0,0,0,.35)]'}>
        <div class="font-[Cinzel,serif] text-[8.5px] tracking-[.2em] text-[#D4AF37] mb-2">DENAH SKEMATIK</div>
        <div
          class={'relative w-full rounded-[2px] overflow-hidden ' + (floorPlanImage ? 'h-[198px] bg-white' : 'h-[110px]')}
          style={floorPlanImage ? `background-image:url(${floorPlanImage});background-size:contain;background-position:center;background-repeat:no-repeat;` : ''}
        >
          {#if !floorPlanImage}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="absolute inset-0 w-full h-full">
              <polyline points={vrMapPath} fill="none" stroke="rgba(212,175,55,.35)" stroke-width="1.2"></polyline>
            </svg>
          {/if}
          {#each vrNodes as n (n.id)}
            <span class={dotClass(n.id === vrNodeId)} style={dotPos(n)}></span>
          {/each}
        </div>
      </div>

        {#if vrInited && !vrError}
          <button onclick={toggleWrapFullscreen} class={fsBtnClass} title={psvFs ? 'Keluar layar penuh' : 'Layar penuh'} aria-label={psvFs ? 'Keluar layar penuh' : 'Layar penuh'}>
            {@render fsIcon(psvFs)}
            <span class="hidden sm:inline">{psvFs ? 'Keluar' : 'Layar Penuh'}</span>
          </button>
        {/if}
      </div>

      {#if vrMarker}
        <div class="absolute left-4 right-4 bottom-4 z-[6] bg-[#060e22]/95 backdrop-blur-md border border-[#D4AF37]/40 rounded-[4px] px-4.5 py-3.5 shadow-[0_-10px_30px_rgba(0,0,0,.35)]">
          <div class="flex justify-between items-start gap-3">
            <div>
              <div class="text-[#E7C76A] font-bold text-sm mb-1">{vrMarker.title}</div>
              <div class="text-slate-200 text-[13px] leading-snug">{vrMarker.desc}</div>
            </div>
            <button onclick={() => vrMarker = null} class="bg-transparent border-none text-slate-400 hover:text-white transition-colors cursor-pointer text-xl leading-none p-0">×</button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Street wrap -->
    <div bind:this={streetWrapEl} class={'psv-tab-wrap ' + (psvFsFallback && mode === 'street' ? 'psv-fs-fallback ' : '') + (mode === 'street' ? 'block absolute inset-0' : 'hidden')}>
      <div bind:this={streetRootEl} class="absolute inset-0 z-[1]"></div>

      <div class="absolute top-4 left-4 z-[5] pointer-events-none bg-[#060e22]/75 backdrop-blur-md border border-[#D4AF37]/25 px-4.5 py-3 rounded-[4px] shadow-[0_10px_28px_rgba(0,0,0,.35)]">
        <div class="flex items-center gap-2 mb-1">
          <span class="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
          <div class="font-[Cinzel,serif] text-[9.5px] tracking-[.22em] text-[#D4AF37]">TITIK {streetIdx + 1} / {streetNodes.length}</div>
        </div>
        <div class="font-[Playfair_Display,serif] font-bold text-base">{streetNode?.name ?? ''}</div>
      </div>

      <div class={'absolute bottom-[76px] left-1/2 -translate-x-1/2 z-[5] pointer-events-none bg-[#060e22]/85 backdrop-blur-md border border-white/[.06] px-4.5 py-2.5 rounded-full text-[12.5px] text-slate-200 whitespace-nowrap transition-opacity duration-700 ' + (streetHintOn ? 'opacity-100' : 'opacity-0')}>↺ Seret untuk melihat sekeliling · ikuti panah emas menuju rumah</div>

      {#if streetError}
        <div class="absolute inset-0 z-[6] flex items-center justify-center text-center p-8 bg-[#060e22]/85 text-slate-200 text-[14.5px]">{streetError}</div>
      {/if}

      <!-- Kolom kanan-atas: panel jalur + tombol layar penuh (lihat catatan di tab VR). -->
      <div class="absolute top-4 right-4 z-[5] w-[150px] flex flex-col items-end gap-2">
        <div class="w-full bg-[#060e22]/80 backdrop-blur-md border border-[#D4AF37]/25 rounded-[4px] p-2.5 shadow-[0_10px_28px_rgba(0,0,0,.35)]">
          <div class="font-[Cinzel,serif] text-[8.5px] tracking-[.2em] text-[#D4AF37] mb-2">JALUR MENUJU RUMAH</div>
          <div class="relative w-full h-[110px]">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="absolute inset-0 w-full h-full">
              <polyline points={streetMapPath} fill="none" stroke="rgba(212,175,55,.35)" stroke-width="1.2"></polyline>
            </svg>
            {#each streetNodes as n (n.id)}
              <span class={dotClass(n.id === streetNodeId)} style={dotPos(n)}></span>
            {/each}
          </div>
        </div>

        {#if streetInited && !streetError}
          <button onclick={toggleWrapFullscreen} class={fsBtnClass} title={psvFs ? 'Keluar layar penuh' : 'Layar penuh'} aria-label={psvFs ? 'Keluar layar penuh' : 'Layar penuh'}>
            {@render fsIcon(psvFs)}
            <span class="hidden sm:inline">{psvFs ? 'Keluar' : 'Layar Penuh'}</span>
          </button>
        {/if}
      </div>

      {#if streetMarker}
        <div class="absolute left-4 right-4 bottom-4 z-[6] bg-[#060e22]/95 backdrop-blur-md border border-[#D4AF37]/40 rounded-[4px] px-4.5 py-3.5 shadow-[0_-10px_30px_rgba(0,0,0,.35)]">
          <div class="flex justify-between items-start gap-3">
            <div>
              <div class="text-[#E7C76A] font-bold text-sm mb-1">{streetMarker.title}</div>
              <div class="text-slate-200 text-[13px] leading-snug">{streetMarker.desc}</div>
            </div>
            <button onclick={() => streetMarker = null} class="bg-transparent border-none text-slate-400 hover:text-white transition-colors cursor-pointer text-xl leading-none p-0">×</button>
          </div>
        </div>
      {/if}
    </div>

    </div>
  </div>

  <!-- rail -->
  {#if mode !== '3d'}
    <div class="mt-5 overflow-x-auto">
      <div class="flex items-center gap-2.5 py-1">
        <span class="hidden sm:inline-flex items-center gap-2 mr-1 text-[10.5px] font-semibold tracking-[.16em] uppercase text-slate-500 shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          Titik Lain
        </span>
        {#if mode === 'vr'}
          {#each vrNodes as n (n.id)}
            <button class={railClass(n.id === vrNodeId)} onclick={() => vrTour?.setCurrentNode(n.id)}>{n.name}</button>
          {/each}
        {:else}
          {#each streetNodes as n (n.id)}
            <button class={railClass(n.id === streetNodeId)} onclick={() => streetTour?.setCurrentNode(n.id)}>{n.name}</button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}

</div>

<style>
  /* ── LAYAR PENUH tab VR / Streetview ──
     Wrapper tab bergaya `absolute inset-0` (mengisi panel viewer). Saat ia menjadi
     elemen fullscreen, ia lepas dari induk ber-`position:relative` sehingga inset-0
     tak lagi punya acuan — tanpa aturan ini ukurannya bisa kolaps. Dipaksa mengisi
     viewport. 100dvh dipakai agar bilah alamat Safari yang muncul-hilang tak memotong.

     :global dipakai karena elemen target ditulis dengan kelas Tailwind (bukan kelas
     lokal), jadi tak ada selektor lokal yang bisa disematkan Svelte. */
  :global(.psv-tab-wrap:fullscreen),
  :global(.psv-tab-wrap:-webkit-full-screen) {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100dvh;
    background: #060e22;
  }

  /* Fallback iOS Safari (tak ada Fullscreen API untuk elemen non-video). */
  :global(.psv-tab-wrap.psv-fs-fallback) {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100dvh;
    z-index: 9999;
    background: #060e22;
  }
</style>
