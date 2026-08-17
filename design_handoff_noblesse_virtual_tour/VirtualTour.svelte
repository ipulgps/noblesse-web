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

  Cara pakai:
    import VirtualTour from '$lib/components/VirtualTour.svelte';
    <VirtualTour />

  Menambah titik Streetview (target 30–50 titik): salin pola objek di STREET_NODES —
  tiap titik butuh id unik, foto (panorama), posisi mapX/mapY (0–100, untuk denah
  skematik kanan-atas), dan link ke titik sebelum/sesudah (yaw dalam derajat, hanya
  menentukan arah panah, tak perlu presisi).

  Tur 3D Rumah masih placeholder (model masih dibuat di SketchUp). Setelah diekspor
  ke .glb/.gltf, ganti blok bertanda "🔌 3D PLACEHOLDER" dengan Google <model-viewer>.

  🔌 SSR: semua import Photo Sphere Viewer dilakukan lazy (dynamic import) di dalam
  initVR()/initStreet(), bukan di top-level module — aman dipakai di SvelteKit
  meski route-nya di-server-side-render.
-->
<script>
  import { onDestroy } from 'svelte';

  /* ───────────────── DATA TITIK ─────────────────
     Ganti "img" dengan path foto 360° asli Anda di /static/tours. */
  const VR_NODES = [
    { id: 'teras', name: 'Teras & Carport', img: '/tours/vr-teras.png', mapX: 50, mapY: 88,
      links: [{ to: 'tamu', yaw: 10 }, { to: 'mandi', yaw: 190 }] },
    { id: 'tamu', name: 'Ruang Tamu', img: '/tours/vr-tamu.png', mapX: 50, mapY: 62,
      links: [{ to: 'teras', yaw: 190 }, { to: 'tidur', yaw: 60 }],
      marker: { yaw: '25deg', pitch: '-6deg', title: 'Sofa Premium', desc: 'Sofa kulit asli dengan rangka kayu jati solid, dipilih untuk kenyamanan dan daya tahan.' } },
    { id: 'tidur', name: 'Kamar Tidur Utama', img: '/tours/vr-tidur.png', mapX: 26, mapY: 34,
      links: [{ to: 'tamu', yaw: 240 }, { to: 'dapur', yaw: 340 }] },
    { id: 'dapur', name: 'Dapur', img: '/tours/vr-dapur.png', mapX: 74, mapY: 34,
      links: [{ to: 'tidur', yaw: 160 }, { to: 'mandi', yaw: 80 }],
      marker: { yaw: '-35deg', pitch: '-8deg', title: 'Kitchen Set', desc: 'Meja granit impor dan kabinet custom, dirancang untuk dapur modern yang fungsional.' } },
    { id: 'mandi', name: 'Kamar Mandi', img: '/tours/vr-mandi.png', mapX: 80, mapY: 70,
      links: [{ to: 'dapur', yaw: 260 }, { to: 'teras', yaw: 10 }] },
  ];

  const STREET_NODES = [
    { id: 'gerbang', name: 'Gerbang Utama', img: '/tours/street-01-gerbang.png', mapX: 8, mapY: 88,
      links: [{ to: 'pos', yaw: 0 }] },
    { id: 'pos', name: 'Pos Keamanan', img: '/tours/street-02-pos.png', mapX: 20, mapY: 80,
      links: [{ to: 'gerbang', yaw: 180 }, { to: 'taman', yaw: 8 }] },
    { id: 'taman', name: 'Taman Depan Kawasan', img: '/tours/street-03-taman.png', mapX: 33, mapY: 70,
      links: [{ to: 'pos', yaw: 185 }, { to: 'boulevard', yaw: 355 }],
      marker: { yaw: '40deg', pitch: '-4deg', title: 'Taman Tematik', desc: 'Taman seluas 500m² dengan area duduk dan lanskap hijau di pintu masuk kawasan.' } },
    { id: 'boulevard', name: 'Jalan Boulevard', img: '/tours/street-04-boulevard.png', mapX: 47, mapY: 76,
      links: [{ to: 'taman', yaw: 175 }, { to: 'persimpangan', yaw: 12 }] },
    { id: 'persimpangan', name: 'Persimpangan Blok A', img: '/tours/street-05-persimpangan.png', mapX: 58, mapY: 58,
      links: [{ to: 'boulevard', yaw: 190 }, { to: 'blokc', yaw: 350 }] },
    { id: 'blokc', name: 'Jalan Blok C', img: '/tours/street-06-blokc.png', mapX: 67, mapY: 42,
      links: [{ to: 'persimpangan', yaw: 170 }, { to: 'playground', yaw: 15 }] },
    { id: 'playground', name: 'Playground', img: '/tours/street-07-playground.png', mapX: 75, mapY: 27,
      links: [{ to: 'blokc', yaw: 195 }, { to: 'rumah', yaw: 2 }],
      marker: { yaw: '-20deg', pitch: '-5deg', title: 'Area Bermain Anak', desc: 'Playground dengan permukaan karet aman dan wahana ramah anak.' } },
    { id: 'rumah', name: 'Depan Rumah Tipe 45', img: '/tours/street-08-rumah.png', mapX: 85, mapY: 12,
      links: [{ to: 'playground', yaw: 180 }] },
  ];

  /* ──────────────── STATE ──────────────── */
  let mode = $state('3d'); // '3d' | 'vr' | 'street'

  let vrRootEl, streetRootEl;
  let vrViewer, vrTour, vrMarkersPlugin;
  let streetViewer, streetTour, streetMarkersPlugin;
  let vrLoading = false, streetLoading = false;

  let vrInited = $state(false);
  let vrError = $state(null);
  let vrNodeId = $state('teras');
  let vrHintOn = $state(true);
  let vrMarker = $state(null);

  let streetInited = $state(false);
  let streetError = $state(null);
  let streetNodeId = $state('gerbang');
  let streetHintOn = $state(true);
  let streetMarker = $state(null);

  let devNotesOpen = $state(false);

  /* ──────────────── DERIVED ──────────────── */
  const vrIdx = $derived(Math.max(0, VR_NODES.findIndex(n => n.id === vrNodeId)));
  const streetIdx = $derived(Math.max(0, STREET_NODES.findIndex(n => n.id === streetNodeId)));
  const vrNode = $derived(VR_NODES[vrIdx]);
  const streetNode = $derived(STREET_NODES[streetIdx]);

  const TITLES = {
    '3d': ['Model 3D Rumah', 'Putar dan telusuri model 3D rumah dari luar maupun dalam. Sedang dalam proses pemodelan di SketchUp.'],
    vr: ['Tur VR — Jelajahi Interior', 'Rasakan setiap sudut hunian dari dalam. Seret untuk melihat sekeliling, klik anak panah emas untuk berpindah ruangan.'],
    street: ['Streetview Menuju Lokasi', 'Ikuti jalur foto 360° dari gerbang utama hingga tiba di depan rumah — seperti berjalan langsung ke lokasi.'],
  };
  const modeTitle = $derived(TITLES[mode][0]);
  const modeDesc = $derived(TITLES[mode][1]);

  function pathOf(list, close) {
    const pts = list.map(n => `${n.mapX},${n.mapY}`);
    if (close) pts.push(`${list[0].mapX},${list[0].mapY}`);
    return pts.join(' ');
  }
  const vrMapPath = pathOf(VR_NODES, true);
  const streetMapPath = pathOf(STREET_NODES, false);

  /* ──────────────── HELPERS DE STYLE (Tailwind, kelas kondisional) ──────────────── */
  function tabClass(m) {
    return 'px-5 py-3 rounded-sm text-xs font-semibold tracking-wide uppercase transition-all whitespace-nowrap ' +
      (mode === m
        ? 'bg-gradient-to-br from-[#E7C76A] to-[#D4AF37] text-[#08152E] shadow-lg shadow-[#D4AF37]/30'
        : 'bg-transparent text-slate-400 hover:text-slate-200');
  }
  function railClass(active) {
    return 'shrink-0 px-4 py-2.5 rounded-sm border text-[12.5px] font-semibold whitespace-nowrap transition-all cursor-pointer ' +
      (active
        ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#E7C76A]'
        : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/25');
  }
  function dotClass(active) {
    return 'absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ' +
      (active ? 'w-[11px] h-[11px] bg-[#E7C76A] shadow-[0_0_0_5px_rgba(212,175,55,.22)]' : 'w-1.5 h-1.5 bg-white/45');
  }
  function dotPos(n) { return `left:${n.mapX}%;top:${n.mapY}%`; }

  /* ──────────────── PHOTO SPHERE VIEWER ──────────────── */
  function buildNodes(list) {
    return list.map(n => ({
      id: n.id,
      panorama: n.img,
      name: n.name,
      links: n.links.map(l => ({ nodeId: l.to, position: { yaw: l.yaw + 'deg', pitch: '3deg' } })),
      markers: n.marker ? [{
        id: n.id + '-info',
        position: { yaw: n.marker.yaw, pitch: n.marker.pitch },
        html: '<div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#E7C76A,#D4AF37);display:flex;align-items:center;justify-content:center;color:#08152E;font-family:Georgia,serif;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 0 0 5px rgba(212,175,55,.2);">i</div>',
        size: { width: 30, height: 30 },
        anchor: 'center center',
        tooltip: { content: '<strong>' + n.marker.title + '</strong><br>' + n.marker.desc, position: 'top' },
        data: { title: n.marker.title, desc: n.marker.desc },
      }] : [],
    }));
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
    vrLoading = true;
    try {
      const { Viewer, VirtualTourPlugin, MarkersPlugin, AutorotatePlugin, GyroscopePlugin } = await loadPSV();
      await new Promise(r => setTimeout(r, 30)); // beri waktu DOM commit sebelum ukur ukuran container
      const viewer = new Viewer({
        container: vrRootEl,
        navbar: ['zoom', 'autorotate', 'gyroscope', 'fullscreen'],
        rendererParameters: { preserveDrawingBuffer: true },
        plugins: [
          MarkersPlugin,
          AutorotatePlugin,
          GyroscopePlugin,
          VirtualTourPlugin.withConfig({
            positionMode: 'manual',
            renderMode: '3d',
            nodes: buildNodes(VR_NODES),
            startNodeId: 'teras',
          }),
        ],
      });
      vrViewer = viewer;
      vrTour = viewer.getPlugin(VirtualTourPlugin);
      vrMarkersPlugin = viewer.getPlugin(MarkersPlugin);
      vrTour.addEventListener('node-changed', (e) => { vrNodeId = e.node.id; vrMarker = null; });
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
    streetLoading = true;
    try {
      const { Viewer, VirtualTourPlugin, MarkersPlugin, AutorotatePlugin, GyroscopePlugin } = await loadPSV();
      await new Promise(r => setTimeout(r, 30));
      const viewer = new Viewer({
        container: streetRootEl,
        navbar: ['zoom', 'autorotate', 'gyroscope', 'fullscreen'],
        rendererParameters: { preserveDrawingBuffer: true },
        plugins: [
          MarkersPlugin,
          AutorotatePlugin,
          GyroscopePlugin,
          VirtualTourPlugin.withConfig({
            positionMode: 'manual',
            renderMode: '3d',
            nodes: buildNodes(STREET_NODES),
            startNodeId: 'gerbang',
          }),
        ],
      });
      streetViewer = viewer;
      streetTour = viewer.getPlugin(VirtualTourPlugin);
      streetMarkersPlugin = viewer.getPlugin(MarkersPlugin);
      streetTour.addEventListener('node-changed', (e) => { streetNodeId = e.node.id; streetMarker = null; });
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

  function setMode3d() { mode = '3d'; }
  function setModeVr() { mode = 'vr'; setTimeout(initVR, 0); }
  function setModeStreet() { mode = 'street'; setTimeout(initStreet, 0); }

  onDestroy(() => {
    try { vrViewer?.destroy(); } catch (e) {}
    try { streetViewer?.destroy(); } catch (e) {}
  });
</script>

<svelte:head>
  <!-- Hapus blok ini kalau font sudah dimuat global di layout Anda -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,500&family=Cinzel:wght@500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="w-full font-[Inter,sans-serif] text-white bg-[#060e22]">

  <div class="flex items-center justify-between gap-4 flex-wrap mb-7">
    <div>
      <div class="font-[Cinzel,serif] text-[10px] tracking-[.3em] text-[#D4AF37] font-semibold">TUR VIRTUAL</div>
      <h2 class="font-[Playfair_Display,serif] font-extrabold text-2xl md:text-3xl">Rumah Tipe 45 · Noblesse Grand Avenue</h2>
    </div>
    <div class="inline-flex gap-1 p-1.5 bg-white/5 border border-[#D4AF37]/20 rounded-sm flex-wrap">
      <button onclick={setMode3d} class={tabClass('3d')}>Tur 3D Rumah</button>
      <button onclick={setModeVr} class={tabClass('vr')}>Tur VR Interior</button>
      <button onclick={setModeStreet} class={tabClass('street')}>Streetview Lokasi</button>
    </div>
  </div>

  <div class="text-center mb-7">
    <h3 class="font-[Playfair_Display,serif] font-extrabold text-[26px] md:text-4xl leading-tight mb-2.5">{modeTitle}</h3>
    <p class="text-slate-400 text-[15.5px] leading-relaxed max-w-[640px] mx-auto">{modeDesc}</p>
  </div>

  <!-- ================= VIEWER STAGE ================= -->
  <div class="relative h-[clamp(440px,64vh,640px)] rounded-sm overflow-hidden border border-[#D4AF37]/20 bg-gradient-to-b from-[#0A1F44] to-[#08152E] shadow-[0_30px_80px_rgba(0,0,0,.45)]">

    <!-- 🔌 3D PLACEHOLDER — ganti dengan <model-viewer> setelah model .glb siap -->
    <div class={'absolute inset-0 flex-col items-center justify-center gap-4 text-center p-8 ' + (mode === '3d' ? 'flex' : 'hidden')}>
      <span class="w-16 h-16 rounded-full border border-[#D4AF37]/40 flex items-center justify-center bg-[#D4AF37]/10">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
      </span>
      <div class="font-[Cinzel,serif] text-xs tracking-[.28em] text-[#D4AF37]">SEDANG DIMODELKAN DI SKETCHUP</div>
      <p class="text-slate-400 text-[14.5px] leading-relaxed max-w-[460px]">Model 3D detail rumah — orbit dari luar dan telusuri dari dalam — akan ditempatkan di sini setelah proses pemodelan selesai.</p>
    </div>

    <!-- VR wrap -->
    <div class={mode === 'vr' ? 'block absolute inset-0' : 'hidden'}>
      <div bind:this={vrRootEl} class="absolute inset-0 z-[1]"></div>

      <div class="absolute top-4 left-4 z-[5] pointer-events-none bg-[#060e22]/70 border border-[#D4AF37]/30 px-4 py-2.5 rounded-sm">
        <div class="font-[Cinzel,serif] text-[9.5px] tracking-[.22em] text-[#D4AF37]">NODE {vrIdx + 1} / {VR_NODES.length}</div>
        <div class="font-[Playfair_Display,serif] font-bold text-base">{vrNode.name}</div>
      </div>

      <div class={'absolute bottom-[76px] left-1/2 -translate-x-1/2 z-[5] pointer-events-none bg-[#060e22]/80 px-4.5 py-2.5 rounded-full text-[12.5px] text-slate-200 whitespace-nowrap transition-opacity duration-700 ' + (vrHintOn ? 'opacity-100' : 'opacity-0')}>↺ Seret untuk melihat sekeliling · titik emas = info</div>

      {#if vrError}
        <div class="absolute inset-0 z-[6] flex items-center justify-center text-center p-8 bg-[#060e22]/85 text-slate-200 text-[14.5px]">{vrError}</div>
      {/if}

      <div class="absolute top-4 right-4 z-[5] w-[150px] bg-[#060e22]/80 border border-[#D4AF37]/30 rounded-sm p-2.5">
        <div class="font-[Cinzel,serif] text-[8.5px] tracking-[.2em] text-[#D4AF37] mb-2">DENAH SKEMATIK</div>
        <div class="relative w-full h-[110px]">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="absolute inset-0 w-full h-full">
            <polyline points={vrMapPath} fill="none" stroke="rgba(212,175,55,.35)" stroke-width="1.2"></polyline>
          </svg>
          {#each VR_NODES as n (n.id)}
            <span class={dotClass(n.id === vrNodeId)} style={dotPos(n)}></span>
          {/each}
        </div>
      </div>

      {#if vrMarker}
        <div class="absolute left-4 right-4 bottom-4 z-[6] bg-[#060e22]/95 border border-[#D4AF37]/40 rounded-sm px-4.5 py-3.5">
          <div class="flex justify-between items-start gap-3">
            <div>
              <div class="text-[#E7C76A] font-bold text-sm mb-1">{vrMarker.title}</div>
              <div class="text-slate-200 text-[13px] leading-snug">{vrMarker.desc}</div>
            </div>
            <button onclick={() => vrMarker = null} class="bg-transparent border-none text-slate-400 cursor-pointer text-xl leading-none p-0">×</button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Street wrap -->
    <div class={mode === 'street' ? 'block absolute inset-0' : 'hidden'}>
      <div bind:this={streetRootEl} class="absolute inset-0 z-[1]"></div>

      <div class="absolute top-4 left-4 z-[5] pointer-events-none bg-[#060e22]/70 border border-[#D4AF37]/30 px-4 py-2.5 rounded-sm">
        <div class="font-[Cinzel,serif] text-[9.5px] tracking-[.22em] text-[#D4AF37]">TITIK {streetIdx + 1} / {STREET_NODES.length}</div>
        <div class="font-[Playfair_Display,serif] font-bold text-base">{streetNode.name}</div>
      </div>

      <div class={'absolute bottom-[76px] left-1/2 -translate-x-1/2 z-[5] pointer-events-none bg-[#060e22]/80 px-4.5 py-2.5 rounded-full text-[12.5px] text-slate-200 whitespace-nowrap transition-opacity duration-700 ' + (streetHintOn ? 'opacity-100' : 'opacity-0')}>↺ Seret untuk melihat sekeliling · ikuti panah emas menuju rumah</div>

      {#if streetError}
        <div class="absolute inset-0 z-[6] flex items-center justify-center text-center p-8 bg-[#060e22]/85 text-slate-200 text-[14.5px]">{streetError}</div>
      {/if}

      <div class="absolute top-4 right-4 z-[5] w-[150px] bg-[#060e22]/80 border border-[#D4AF37]/30 rounded-sm p-2.5">
        <div class="font-[Cinzel,serif] text-[8.5px] tracking-[.2em] text-[#D4AF37] mb-2">JALUR MENUJU RUMAH</div>
        <div class="relative w-full h-[110px]">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="absolute inset-0 w-full h-full">
            <polyline points={streetMapPath} fill="none" stroke="rgba(212,175,55,.35)" stroke-width="1.2"></polyline>
          </svg>
          {#each STREET_NODES as n (n.id)}
            <span class={dotClass(n.id === streetNodeId)} style={dotPos(n)}></span>
          {/each}
        </div>
      </div>

      {#if streetMarker}
        <div class="absolute left-4 right-4 bottom-4 z-[6] bg-[#060e22]/95 border border-[#D4AF37]/40 rounded-sm px-4.5 py-3.5">
          <div class="flex justify-between items-start gap-3">
            <div>
              <div class="text-[#E7C76A] font-bold text-sm mb-1">{streetMarker.title}</div>
              <div class="text-slate-200 text-[13px] leading-snug">{streetMarker.desc}</div>
            </div>
            <button onclick={() => streetMarker = null} class="bg-transparent border-none text-slate-400 cursor-pointer text-xl leading-none p-0">×</button>
          </div>
        </div>
      {/if}
    </div>

  </div>

  <!-- rail -->
  {#if mode !== '3d'}
    <div class="mt-4 overflow-x-auto">
      <div class="flex gap-2.5 py-1">
        {#if mode === 'vr'}
          {#each VR_NODES as n (n.id)}
            <button class={railClass(n.id === vrNodeId)} onclick={() => vrTour?.setCurrentNode(n.id)}>{n.name}</button>
          {/each}
        {:else}
          {#each STREET_NODES as n (n.id)}
            <button class={railClass(n.id === streetNodeId)} onclick={() => streetTour?.setCurrentNode(n.id)}>{n.name}</button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}

  <!-- dev notes -->
  <div class="mt-14 pt-8 border-t border-[#D4AF37]/15">
    <button onclick={() => devNotesOpen = !devNotesOpen} class="flex items-center gap-2.5 bg-transparent border-none text-[#D4AF37] font-[Cinzel,serif] text-xs tracking-[.2em] uppercase cursor-pointer p-0">
      Catatan Teknis untuk Pengembang <span>{devNotesOpen ? '▴' : '▾'}</span>
    </button>
    {#if devNotesOpen}
      <div class="mt-5 text-slate-400 text-[14.5px] leading-relaxed max-w-[820px] space-y-3.5">
        <p><strong class="text-slate-100">1. Ganti foto placeholder.</strong> Semua foto 360° di <code class="bg-white/5 px-1.5 py-0.5 rounded text-[#E7C76A]">static/tours</code> adalah placeholder equirectangular (rasio 2:1). Ganti dengan foto 360° asli (idealnya ≥4000×2000px, JPG), nama file boleh sama.</p>
        <p><strong class="text-slate-100">2. Menambah titik Streetview (target 30–50 titik).</strong> Salin pola objek pada <code class="bg-white/5 px-1.5 py-0.5 rounded text-[#E7C76A]">STREET_NODES</code> di bagian atas file ini.</p>
        <p><strong class="text-slate-100">3. Tur VR &amp; Streetview</strong> dibangun dengan Photo Sphere Viewer + Virtual Tour Plugin (npm, di-import lazy). Fullscreen, auto-rotate, dan mode gyroscope sudah aktif di navbar bawaan viewer.</p>
        <p><strong class="text-slate-100">4. Tur 3D Rumah</strong> masih placeholder. Setelah model SketchUp diekspor ke <code class="bg-white/5 px-1.5 py-0.5 rounded text-[#E7C76A]">.glb</code>/<code class="bg-white/5 px-1.5 py-0.5 rounded text-[#E7C76A]">.gltf</code>, ganti blok "🔌 3D PLACEHOLDER" dengan Google <code class="bg-white/5 px-1.5 py-0.5 rounded text-[#E7C76A]">&lt;model-viewer&gt;</code>.</p>
      </div>
    {/if}
  </div>

</div>
