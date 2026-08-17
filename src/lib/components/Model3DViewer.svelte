<!--
  Model3DViewer.svelte — Penampil 3D rumah (.glb) berbasis three.js MURNI.

  Kenapa bukan <model-viewer>? model-viewer hanya menyalakan model lewat IBL/HDRI dan
  tidak mengekspos API untuk menambah DirectionalLight (matahari) + shadow map sendiri.
  Untuk realisme "matahari sore" dengan bayangan cor yang benar, kita butuh kontrol
  penuh atas scene three.js. Komponen ini menyediakan itu:

    · WebGLRenderer  — ACESFilmicToneMapping + sRGB + shadowMap (PCFSoft) aktif.
    · DirectionalLight (MATAHARI) — castShadow; frustum shadow-camera dipaskan otomatis
      ke bounding box model agar bayangan tajam & tidak terpotong.
    · AmbientLight  — fill lembut supaya area bayangan tidak pekat mati.
    · HDRI environment (RGBELoader + PMREMGenerator) — pantulan & ambient IBL realistis
      dari file .hdr yang sama dgn model-viewer lama (static/.../env/*.hdr). Kalau tak ada
      HDRI, fallback ke RoomEnvironment bawaan three (netral) agar material tetap hidup.
    · OrbitControls + auto-rotate — interaksi orbit; berhenti saat user menyentuh.
    · Ground shadow-catcher — bidang tak-terlihat (ShadowMaterial) menangkap bayangan
      matahari, jadi rumah "duduk" di tanah tanpa perlu plane di dalam .glb.

  Props (kompatibel dengan pemanggil lama):
    glbSrc   : string  — path .glb, mis. "/images/tours/rajendra-hills/3D/rajendra_3d.glb"
    envImage : string|null — path HDRI .hdr; kalau null → RoomEnvironment netral.
    houseName: string  — untuk alt/aria.

  SSR-safe: semua three.js di-import dinamis & scene dibangun hanya di onMount (browser).
-->
<script>
  // @ts-nocheck — plain JS, konsisten dgn VirtualTour.svelte di project ini.
  import { onMount, onDestroy } from 'svelte';

  // compact: mode tampilan ringkas untuk ditempel di hero/kartu kecil — sembunyikan
  // tombol "Masuk ke Dalam" + joystick + hint kontrol (walkthrough tak relevan di sana),
  // orbit auto-rotate tetap jalan sebagai dekorasi.
  // frontView: kamera awal menghadap TEPAT DI DEPAN rumah (bukan sudut 3/4 default) —
  // dipakai khusus di hero agar rumah langsung terlihat dari depan saat model termuat.
  // Tak memengaruhi halaman Tur Virtual (default false di sana).
  let { glbSrc = null, envImage = null, houseName = 'Model 3D', compact = false, frontView = false } = $props();

  let canvasWrap = $state(null); // container <div> tempat <canvas> disuntik
  let loading = $state(true);
  let errorMsg = $state(null);
  let inside = $state(false);       // mode walkthrough interior aktif?
  let canGoInside = $state(false);  // tombol "Masuk" tampil setelah model siap

  // Referensi objek three.js yang perlu dibersihkan / diakses ulang.
  let renderer, scene, camera, controls, rafId, composer;
  let disposed = false;
  let resizeObs;

  // ── Walkthrough interior (first-person) ──
  let THREE_; // simpan modul THREE untuk dipakai handler di luar init()
  let walkControls;           // PointerLockControls
  let eyeHeight = 1.6;        // tinggi mata dari lantai (skala model)
  let floorY = 0;            // ketinggian lantai interior (world Y)
  let insideStart = null;    // Vector3 titik masuk (tengah rumah, setinggi mata)
  const keyState = { w: false, a: false, s: false, d: false };
  let walkSpeed = 1;         // kecepatan jalan (unit/detik), diskalakan ke model
  let lastTime = 0;
  const WALK_FOV = 70;       // FOV first-person default (lebih lebar dari orbit → tak "zoom")
  const FOV_MIN = 35;        // batas zoom-in (FOV kecil)
  const FOV_MAX = 90;        // batas zoom-out (FOV besar)

  /* ── Kontrol SENTUH untuk walkthrough di mobile ──
     PointerLock/WASD/wheel semuanya khusus desktop (Pointer Lock API bahkan tidak
     didukung iOS Safari). Di perangkat sentuh kita pakai jalur sendiri:
       · drag di layar   → melihat sekeliling (menggantikan pointer lock)
       · joystick virtual→ berjalan (menggantikan WASD)
       · pinch 2 jari    → zoom FOV (menggantikan scroll wheel)
     isTouch dievaluasi di browser saja (SSR-safe: dicek saat onMount). */
  let isTouch = $state(false);
  let joyActive = $state(false);   // joystick sedang disentuh
  let joyVec = { x: 0, y: 0 };     // arah joystick ternormalisasi (-1..1)
  let joyKnob = $state({ x: 0, y: 0 }); // posisi knob utk tampilan (px)
  const JOY_RADIUS = 46;           // radius area joystick (px)
  let joyTouchId = null;           // id jari yg memegang joystick
  let lookTouchId = null;          // id jari yg sedang melihat-lihat (drag)
  let lastLook = { x: 0, y: 0 };
  let pinchDist = 0;               // jarak awal pinch (utk zoom)
  const LOOK_SENS = 0.0042;        // sensitivitas putar pandangan per px

  onMount(() => {
    // Deteksi perangkat sentuh (menentukan jalur kontrol walkthrough: sentuh vs desktop).
    isTouch = window.matchMedia?.('(pointer: coarse)')?.matches
      || 'ontouchstart' in window
      || navigator.maxTouchPoints > 0;
    if (!glbSrc) { loading = false; errorMsg = 'Model 3D belum tersedia.'; return; }
    init();
    return () => cleanup();
  });

  onDestroy(() => cleanup());

  async function init() {
    try {
      const THREE = await import('three');
      THREE_ = THREE;
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      const { PointerLockControls } = await import('three/examples/jsm/controls/PointerLockControls.js');
      const { RGBELoader } = await import('three/examples/jsm/loaders/RGBELoader.js');
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
      // Post-processing: GTAO (ambient occlusion kualitas tinggi → kedalaman di celah/
      // sudut) + SMAA (anti-alias tepi). OutputPass menangani tone-mapping + colorspace.
      const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js');
      const { RenderPass } = await import('three/examples/jsm/postprocessing/RenderPass.js');
      const { GTAOPass } = await import('three/examples/jsm/postprocessing/GTAOPass.js');
      const { OutputPass } = await import('three/examples/jsm/postprocessing/OutputPass.js');
      const { SMAAPass } = await import('three/examples/jsm/postprocessing/SMAAPass.js');

      if (disposed || !canvasWrap) return;

      const width = canvasWrap.clientWidth || 800;
      const height = canvasWrap.clientHeight || 600;

      // ── RENDERER ──────────────────────────────────────────────
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; // kurva sinematik (mood Noblesse)
      renderer.toneMappingExposure = 0.88; // turun lagi → dinding putih tak "terbakar", kontras lebih dalam
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;   // tepi bayangan lembut
      canvasWrap.appendChild(renderer.domElement);
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';

      // ── SCENE ─────────────────────────────────────────────────
      scene = new THREE.Scene();

      // ── KAMERA ────────────────────────────────────────────────
      camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 2000);

      // ── ENVIRONMENT / HDRI (ambient IBL + refleksi + LANGIT background) ───
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      if (envImage && /\.hdr$/i.test(envImage)) {
        await new Promise((resolve) => {
          new RGBELoader().load(
            envImage,
            (hdr) => {
              hdr.mapping = THREE.EquirectangularReflectionMapping;
              const envMap = pmrem.fromEquirectangular(hdr).texture;
              scene.environment = envMap;   // IBL untuk semua material PBR (pencahayaan)
              hdr.dispose();
              resolve();
            },
            undefined,
            () => resolve() // gagal HDRI → lanjut tanpa (fallback di bawah)
          );
        });
      }
      if (!scene.environment) {
        // Fallback netral supaya material tetap terlihat "ter-cahaya" walau tanpa HDRI.
        const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = env;
      }
      pmrem.dispose();

      // ── LANGIT background (gradient prosedural) ───────────────
      // HDRI golden-hour dipakai HANYA untuk pencahayaan; sebagai background ia tampil
      // abu-ungu gelap (zenith-nya memang gelap). Jadi background kita gambar sendiri:
      // gradient langit siang cerah — biru di atas → putih-kebiruan di horizon. Ini
      // memberi konteks "di luar, siang" tanpa mengganggu, dan sepenuhnya terkontrol.
      {
        const skyCanvas = document.createElement('canvas');
        skyCanvas.width = 16; skyCanvas.height = 256;
        const sctx = skyCanvas.getContext('2d');
        const grad = sctx.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0.0, '#5b8fd6');   // zenith — biru langit
        grad.addColorStop(0.55, '#a9c9ec');  // biru muda
        grad.addColorStop(1.0, '#e9f1f8');   // horizon — putih kebiruan (kabut)
        sctx.fillStyle = grad;
        sctx.fillRect(0, 0, 16, 256);
        const skyTex = new THREE.CanvasTexture(skyCanvas);
        skyTex.colorSpace = THREE.SRGBColorSpace;
        scene.background = skyTex;
      }

      // ── PENCAHAYAAN (model cahaya outdoor realistis) ──────────
      // Kunci realisme outdoor = KONTRAS SUHU WARNA: sinar matahari HANGAT (kuning)
      // vs cahaya isian dari langit yang SEJUK (biru). Mata membaca kombinasi ini
      // sebagai "di luar ruangan, siang hari" — jauh lebih nyata dari ambient putih rata.

      // HemisphereLight = cahaya lingkungan berarah: warna langit (biru sejuk) menyinari
      // dari ATAS, warna pantulan tanah (hijau-hangat, mengikuti rumput) dari BAWAH.
      // Menggantikan AmbientLight putih rata → area bayangan terisi biru langit, bukan
      // abu-abu mati. Inilah pembeda terbesar terhadap kesan "render 3D flat".
      const sky = new THREE.HemisphereLight(0xbcd4ff /*langit*/, 0x6b7250 /*pantulan rumput*/, 0.9);
      scene.add(sky);

      // DirectionalLight = MATAHARI SORE. Warna golden hangat + intensitas tinggi supaya
      // sisi tersinari benar-benar "menyala" dan kontras ke sisi bayangan terasa tegas.
      const sun = new THREE.DirectionalLight(0xffe6b8, 3.6);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.02;
      scene.add(sun);
      scene.add(sun.target);

      // FILL LIGHT sejuk dari sisi berlawanan matahari (arah langit teduh). Lemah, TANPA
      // shadow — hanya mengangkat sisi gelap sedikit dengan rona kebiruan agar bentuk
      // bangunan tetap terbaca di area bayangan (mencegah "mati" hitam pekat).
      const fill = new THREE.DirectionalLight(0x9db8ff, 0.6);
      scene.add(fill);
      scene.add(fill.target);

      // ── MUAT MODEL .glb ───────────────────────────────────────
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(glbSrc);
      if (disposed) return;
      const model = gltf.scene;

      // Nama material kaca di model ini (hasil audit .glb). Dicocokkan case-insensitive
      // sebagai substring supaya tahan varian ".001" dsb. "Kaca_Jendela" penting: aslinya
      // diekspor OPAQUE (buram) → harus dijadikan kaca transparan sungguhan.
      const isGlassName = (name) =>
        /kaca|glass|translucent/i.test(name || '');

      // Upgrade satu material biasa → MeshPhysicalMaterial dgn transmission (kaca fisik):
      // cahaya menembus (transparan) + memantulkan environment (HDRI) di permukaannya.
      const glassCache = new Map();
      function toGlass(THREE, src) {
        if (glassCache.has(src)) return glassCache.get(src);
        // Kaca jendela rumah NYATA: bukan kaca kristal bening (transmission tinggi bikin
        // isi ruangan tembus & buram). Yang diinginkan = kaca REFLEKTIF GELAP kehijauan:
        // permukaan mengilap yang MEMANTULKAN langit/lingkungan, dgn rona hijau-biru gelap,
        // dan hanya sedikit tembus pandang. Dicapai dengan:
        //  · warna dasar gelap kehijauan (tint kaca float)
        //  · transmission RENDAH (0.12) → dominan memantul, bukan menembus
        //  · reflectivity/clearcoat tinggi + roughness rendah → pantulan langit tajam
        //  · opacity < 1 → sedikit kedalaman tanpa memperlihatkan detail dalam
        const g = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(0x1f2d2b),   // hijau-gelap khas kaca jendela
          metalness: 0.0,
          roughness: 0.08,                     // halus → pantulan langit tajam & mengilap
          transmission: 0.12,                  // sedikit saja tembus (bukan bening penuh)
          thickness: 0.2,
          ior: 1.5,
          reflectivity: 0.9,                   // pantulan environment kuat
          clearcoat: 1.0,                      // lapisan kilap seperti kaca dilapisi
          clearcoatRoughness: 0.06,
          transparent: true,
          opacity: 0.85,
          envMapIntensity: 1.6,                // perkuat pantulan HDRI langit
          side: THREE.FrontSide,
          depthWrite: true
        });
        glassCache.set(src, g);
        return g;
      }

      // Nama material rumput → warnanya terlalu hijau-neon & jenuh (terbaca "karpet
      // plastik"). Kita redam: kalikan color dgn abu-kehijauan gelap (menurunkan
      // kecerahan + saturasi), naikkan roughness (rumput tak mengilap), dan matikan
      // pantulan environment agar tak berkilau.
      const isGrassName = (name) => /rumput|grass|halaman/i.test(name || '');
      const grassTint = new THREE.Color(0.62, 0.72, 0.5); // faktor peredam (hijau natural)

      // ASPAL jalan: di .glb warnanya abu terang (~0.55) sehingga tak terbaca "aspal".
      // Dijadikan hitam-abu gelap. Material "Slate" ikut kelompok ini (permukaan jalan).
      // CATATAN: material2 ini BERTEKSTUR — `color` bekerja sbg PENGALI tekstur, jadi
      // tekstur aspal tetap terlihat, hanya nilainya diturunkan sampai gelap.
      const isAsphaltName = (name) => /blacktop|aspal|asphalt|road|jalan|slate/i.test(name || '');
      const asphaltColor = new THREE.Color(0.16, 0.16, 0.17); // hitam-abu (sedikit dingin)

      // LANTAI CARPORT: dijadikan abu-abu beton (lebih terang dari aspal, netral).
      // Hanya Carport_Concrete_Final — "Tiles" adalah keramik INTERIOR, jangan disentuh.
      const isCarportName = (name) => /carport/i.test(name || '');
      const carportColor = new THREE.Color(0.55, 0.55, 0.56); // abu-abu beton

      // Aktifkan shadow + upgrade material kaca & redam rumput di seluruh mesh model.
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true;
        o.receiveShadow = true;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const upgraded = mats.map((m) => {
          if (!m) return m;
          if (isGlassName(m.name)) {
            o.castShadow = false; // kaca tidak membuang bayangan pekat
            return toGlass(THREE, m);
          }
          if (isGrassName(m.name)) {
            // Redam warna rumput langsung di material (multiply ke color yg ada).
            if (m.color) m.color.multiply(grassTint);
            m.roughness = 1.0;         // rumput sepenuhnya matte
            m.metalness = 0;
            m.envMapIntensity = 0.25;  // hampir tak memantul langit
            return m;
          }
          if (isAsphaltName(m.name)) {
            // SET (bukan multiply) — warna lama abu terang; color jadi pengali tekstur
            // sehingga tekstur aspal tetap tampak, hanya menjadi gelap/hitam.
            if (m.color) m.color.copy(asphaltColor);
            m.roughness = 0.92;        // aspal kasar, hampir tak memantul
            m.metalness = 0;
            m.envMapIntensity = 0.35;
            return m;
          }
          if (isCarportName(m.name)) {
            if (m.color) m.color.copy(carportColor);
            m.roughness = 0.85;        // beton halus tapi tetap matte
            m.metalness = 0;
            m.envMapIntensity = 0.5;
            return m;
          }
          m.envMapIntensity = 1.0;
          return m;
        });
        o.material = Array.isArray(o.material) ? upgraded : upgraded[0];
      });
      scene.add(model);

      // ── FRAME OTOMATIS: paskan kamera + matahari ke ukuran model ──
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;

      // Bounding box HANYA rumah (mengecualikan plane rumput/aspal/carport, yang lebar
      // & tidak simetris terhadap rumah — kalau ikut dihitung, titik pusat X/Z bergeser
      // dan rumah tampak "nyempil" di salah satu sisi frame saat frontView). Model ini
      // satu mesh gabungan dengan banyak material GROUP, jadi hitung ulang per-group,
      // lalu buang group yang material-nya rumput/aspal/carport (nama sudah dikenali
      // oleh isGrassName/isAsphaltName/isCarportName di atas).
      const houseBox = new THREE.Box3();
      model.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        const geo = o.geometry;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const groups = geo.groups && geo.groups.length ? geo.groups : [{ start: 0, count: Infinity, materialIndex: 0 }];
        const posAttr = geo.getAttribute('position');
        if (!posAttr) return;
        const tmp = new THREE.Vector3();
        for (const g of groups) {
          const mat = mats[g.materialIndex] || mats[0];
          const name = mat?.name || '';
          if (isGrassName(name) || isAsphaltName(name) || isCarportName(name)) continue;
          const index = geo.getIndex();
          const startVert = index ? 0 : g.start;
          const endVert = index ? posAttr.count : Math.min(g.start + g.count, posAttr.count);
          if (index) {
            const lo = g.start, hi = Math.min(g.start + g.count, index.count);
            for (let i = lo; i < hi; i++) {
              const vi = index.getX(i);
              tmp.fromBufferAttribute(posAttr, vi).applyMatrix4(o.matrixWorld);
              houseBox.expandByPoint(tmp);
            }
          } else {
            for (let vi = startVert; vi < endVert; vi++) {
              tmp.fromBufferAttribute(posAttr, vi).applyMatrix4(o.matrixWorld);
              houseBox.expandByPoint(tmp);
            }
          }
        }
      });
      // Fallback ke bounding box penuh kalau deteksi group gagal (mis. tanpa groups/material array).
      const houseCenter = new THREE.Vector3();
      if (!houseBox.isEmpty()) houseBox.getCenter(houseCenter);
      else houseCenter.copy(center);

      // Pusatkan model di origin (memudahkan kontrol & shadow camera). Sumbu Y tetap
      // pakai bounding box PENUH (kaki rumah/plane harus konsisten sbg lantai=0), tapi
      // X/Z dipusatkan ke RUMAH saja supaya frontView menghadap tepat ke rumah, bukan
      // ke tengah keseluruhan plot (yang bisa asimetris karena jalan/rumput tak rata).
      model.position.x -= houseCenter.x;
      model.position.z -= houseCenter.z;
      model.position.y -= center.y;
      // Setelah digeser, kaki model kira-kira di y = -size.y/2.
      const groundY = -size.y / 2;

      // Kamera awal: 3/4 depan-atas (default, dipakai Tur Virtual) ATAU tepat di depan
      // rumah (frontView, dipakai hero) — sedikit dari atas (Y kecil) agar tak terasa
      // "rata mata" dan tetap terlihat sebagai render 3D, bukan foto datar.
      // frontView pakai jarak lebih dekat (1.7 vs 2.6): radius dihitung dari bounding
      // box SELURUH model (termasuk plane rumput lebar), jadi jarak "aman" default
      // membuat rumah tampak kecil di tengah frame — didekatkan agar rumah mengisi
      // komposisi (sedikit rumput di kiri/kanan tetap terlihat, cukup untuk konteks).
      const dist = radius * (frontView ? 1.7 : 2.6);
      if (frontView) {
        camera.position.set(0, dist * 0.34, dist);
      } else {
        camera.position.set(dist * 0.85, dist * 0.72, dist * 0.95);
      }
      camera.near = radius * 0.05;
      camera.far = radius * 40;
      camera.updateProjectionMatrix();

      // Posisi matahari: tinggi dari kiri-depan (sudut sore ~45°). Sengaja TIDAK terlalu
      // rendah agar bayangan cor jatuh ke rumput di sisi yang terlihat kamera, bukan
      // memanjang tersembunyi di belakang rumah.
      sun.position.set(radius * 2.2, radius * 3.4, radius * 2.6);
      sun.target.position.set(0, 0, 0);
      // Frustum shadow-camera diperbesar agar mencakup hamparan rumput/aspal model yang
      // jauh lebih lebar dari rumah (kalau terlalu kecil, area plane di luar frustum tak
      // menerima bayangan). mapSize 2048 tetap memberi ketajaman memadai di skala ini.
      const s = radius * 4.5;
      const sc = sun.shadow.camera;
      sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s;
      sc.near = 0.1; sc.far = radius * 16;
      sc.updateProjectionMatrix();

      // Fill light dari sisi BERLAWANAN matahari (kanan-belakang, lebih rendah) → mengisi
      // sisi bayangan dengan rona biru sejuk tanpa menghapus kontras utama.
      fill.position.set(-radius * 2.2, radius * 1.6, -radius * 2.0);
      fill.target.position.set(0, 0, 0);

      // ── BAYANGAN JATUH KE PLANE RUMPUT/ASPAL BAWAAN MODEL ──────
      // Model .glb ini sudah membawa plane rumput + aspal sendiri, dan seluruh mesh
      // model sudah di-set receiveShadow=true (lihat traverse di atas). Jadi bayangan
      // matahari jatuh LANGSUNG ke rumput/aspal itu — kita TIDAK menambah shadow-catcher
      // terpisah, karena catcher di titik terendah bbox justru tertutup plane rumput
      // (membuat bayangan seolah hilang). Cukup pastikan frustum shadow-camera matahari
      // (di atas) mencakup area plane; groundY dibiarkan hanya untuk referensi kamera.
      void groundY;

      // ── PARAMETER WALKTHROUGH INTERIOR ────────────────────────
      // Lantai interior ≈ titik terendah model (groundY). Kamera "berdiri" setinggi mata.
      // Skala model diasumsikan ~meter (tinggi rumah size.y beberapa meter); eyeHeight &
      // kecepatan diskalakan relatif size.y agar tetap wajar bila skala berbeda.
      const metersPerUnit = size.y / 5.0; // asumsi tinggi total ~5m → faktor skala
      eyeHeight = 1.6 * metersPerUnit;
      walkSpeed = 2.2 * metersPerUnit;    // ~2.2 m/detik (jalan santai)
      floorY = groundY + eyeHeight;
      // Titik masuk: tengah footprint (x,z=0 karena model dipusatkan), setinggi mata.
      insideStart = new THREE.Vector3(0, floorY, 0);
      canGoInside = true;

      // ── CONTROLS ──────────────────────────────────────────────
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0, 0);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = radius * 1.3;
      controls.maxDistance = radius * 8;
      controls.maxPolarAngle = Math.PI * 0.495; // cegah kamera menyelam ke bawah tanah
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.6;
      controls.update();

      // ── WALKTHROUGH CONTROLS (PointerLock, first-person) ──────
      // Dibuat sekali; hanya aktif saat mode `inside`. Look via mouse (pointer lock),
      // gerak via WASD (di-handle di render loop pakai keyState).
      walkControls = new PointerLockControls(camera, renderer.domElement);
      // Saat user menekan Esc (keluar pointer-lock) di dalam, kembalikan ke mode luar.
      walkControls.addEventListener('unlock', () => {
        if (inside && !disposed) exitInside();
      });

      // Hentikan auto-rotate saat user berinteraksi, aktifkan lagi setelah idle.
      let idleTimer;
      const stopAuto = () => {
        controls.autoRotate = false;
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => { if (!disposed) controls.autoRotate = true; }, 3500);
      };
      controls.addEventListener('start', stopAuto);

      // ── PELACAKAN GERAK KAMERA (untuk render adaptif) ─────────
      // GTAO berat bila dihitung tiap frame. Strategi: saat kamera BERGERAK (orbit/geser/
      // auto-rotate) → render ringan tanpa post-processing agar mulus; saat DIAM →
      // render penuh (GTAO+SMAA) agar tetap cantik. `moving` di-set true tiap ada
      // perubahan dan di-reset ke false setelah jeda singkat tanpa perubahan.
      let moving = false;
      let stillTimer;
      const markMoving = () => {
        moving = true;
        clearTimeout(stillTimer);
        stillTimer = setTimeout(() => { moving = false; }, 180); // dianggap diam setelah 180ms tenang
      };
      controls.addEventListener('change', markMoving);

      // ── POST-PROCESSING (EffectComposer: GTAO + SMAA) ─────────
      // Urutan pass: Render → GTAO (ambient occlusion) → Output (tone-map+sRGB) → SMAA (AA).
      composer = new EffectComposer(renderer);
      composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      composer.setSize(width, height);
      composer.addPass(new RenderPass(scene, camera));

      // GTAO: gelapkan celah/sudut (pertemuan dinding-lantai, bawah atap, dalam carport)
      // → kedalaman realistis. Radius diskalakan ke ukuran model. Nilai lembut agar
      // tidak "kotor" berlebihan pada permukaan besar (dinding/rumput).
      const gtao = new GTAOPass(scene, camera, width, height);
      gtao.output = GTAOPass.OUTPUT.Default;
      const aoParams = {
        radius: Math.max(0.4, radius * 0.10), // jangkauan AO lebih luas → celah lebih dalam
        distanceExponent: 1.0,
        thickness: 1.0,
        scale: 1.0,
        samples: 16,
        distanceFallOff: 1.0,
        screenSpaceRadius: false
      };
      try { gtao.updateGtaoMaterial(aoParams); } catch (e) {}
      // Kekuatan blend AO diperkuat agar sudut/celah lebih berdimensi.
      try { gtao.blendIntensity = 1.2; } catch (e) {}
      composer.addPass(gtao);

      // OutputPass menerapkan tone-mapping (ACES) + konversi colorspace di akhir chain.
      composer.addPass(new OutputPass());

      // SMAA: anti-alias tepi (garis atap, kusen) lebih halus dari MSAA bawaan pada
      // pipeline post-processing.
      const smaa = new SMAAPass(width * Math.min(window.devicePixelRatio, 2), height * Math.min(window.devicePixelRatio, 2));
      composer.addPass(smaa);

      // ── RESIZE ────────────────────────────────────────────────
      resizeObs = new ResizeObserver(() => {
        if (!canvasWrap || disposed) return;
        const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        composer?.setSize(w, h);
      });
      resizeObs.observe(canvasWrap);

      // ── RENDER LOOP ───────────────────────────────────────────
      // MODE LUAR (orbit): adaptif — bergerak→render ringan, diam→composer (GTAO+SMAA).
      // MODE DALAM (walkthrough): gerak WASD tiap frame; selalu render ringan (mulus,
      //   karena user terus bergerak/melihat & butuh responsif). Look via PointerLock.
      lastTime = performance.now();
      const tmpDir = new THREE.Vector3();
      const tick = () => {
        if (disposed) return;
        rafId = requestAnimationFrame(tick);
        const now = performance.now();
        const dt = Math.min(0.05, (now - lastTime) / 1000); // clamp agar lonjakan tak melompat
        lastTime = now;

        if (inside) {
          // Gerak first-person di bidang lantai (Y dikunci = floorY).
          // Sumber input: WASD (desktop) ATAU joystick virtual (mobile). joyVec.y negatif
          // saat knob digeser ke atas → dijadikan maju.
          const forward = (keyState.w ? 1 : 0) - (keyState.s ? 1 : 0) - joyVec.y;
          const strafe = (keyState.d ? 1 : 0) - (keyState.a ? 1 : 0) + joyVec.x;
          if (forward !== 0 || strafe !== 0) {
            const step = walkSpeed * dt;
            // Arah maju kamera diproyeksikan ke bidang datar (abaikan komponen Y).
            camera.getWorldDirection(tmpDir);
            tmpDir.y = 0; tmpDir.normalize();
            const right = tmpDir.clone().cross(camera.up).normalize();
            camera.position.addScaledVector(tmpDir, forward * step);
            camera.position.addScaledVector(right, strafe * step);
          }
          camera.position.y = floorY; // kunci ketinggian mata
          renderer.render(scene, camera);
        } else {
          controls.update(); // auto-rotate/damping → memicu 'change' → moving=true
          if (moving) renderer.render(scene, camera);
          else composer.render();
        }
      };
      tick();

      loading = false;
    } catch (e) {
      console.error('[Model3DViewer] gagal init:', e);
      errorMsg = 'Gagal memuat model 3D.';
      loading = false;
    }
  }

  // ── MASUK / KELUAR mode walkthrough interior ────────────────
  function enterInside() {
    if (!insideStart || disposed) return;
    if (!isTouch && !walkControls) return; // desktop butuh PointerLockControls
    inside = true;
    try { controls.autoRotate = false; controls.enabled = false; } catch (e) {}
    // FOV first-person lebih lebar (70°) agar tak terasa "terlalu zoom" seperti orbit (35°).
    camera.fov = WALK_FOV;
    camera.updateProjectionMatrix();
    // Tempatkan kamera di titik masuk (tengah rumah, setinggi mata), menghadap ke depan.
    camera.position.copy(insideStart);
    camera.lookAt(insideStart.x, insideStart.y, insideStart.z - 1);

    if (isTouch) {
      // MOBILE: drag layar = melihat, joystick = jalan, pinch = zoom.
      const el = renderer.domElement;
      el.addEventListener('touchstart', onTouchStart, { passive: false });
      el.addEventListener('touchmove', onTouchMove, { passive: false });
      el.addEventListener('touchend', onTouchEnd, { passive: false });
      el.addEventListener('touchcancel', onTouchEnd, { passive: false });
    } else {
      // DESKTOP: pointer lock (look) + WASD (jalan) + wheel (zoom).
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      renderer.domElement.addEventListener('wheel', onWalkWheel, { passive: false });
      try { walkControls.lock(); } catch (e) {}
    }
  }

  function exitInside() {
    inside = false;
    for (const k in keyState) keyState[k] = false;
    joyVec.x = joyVec.y = 0;
    joyActive = false; joyKnob = { x: 0, y: 0 };
    joyTouchId = lookTouchId = null; pinchDist = 0;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    try {
      const el = renderer?.domElement;
      el?.removeEventListener('wheel', onWalkWheel);
      el?.removeEventListener('touchstart', onTouchStart);
      el?.removeEventListener('touchmove', onTouchMove);
      el?.removeEventListener('touchend', onTouchEnd);
      el?.removeEventListener('touchcancel', onTouchEnd);
    } catch (e) {}
    try { walkControls?.unlock?.(); } catch (e) {}
    try {
      controls.enabled = true;
      // Kembalikan FOV orbit (35°) + posisi orbit luar.
      camera.fov = 35;
      camera.updateProjectionMatrix();
      const d = (controls.maxDistance + controls.minDistance) * 0.32;
      camera.position.set(d * 0.85, d * 0.72, d * 0.95);
      controls.target.set(0, 0, 0);
      controls.update();
    } catch (e) {}
  }

  /* ── Handler SENTUH (mode walkthrough di mobile) ──
     Satu jari di area layar (di luar joystick) = melihat sekeliling: kita putar kamera
     manual pakai Euler YXZ (yaw dari geser horizontal, pitch dari vertikal, pitch
     dijepit ±85° agar tak terbalik). Dua jari = pinch zoom FOV. Joystick punya handler
     sendiri di elemen overlay-nya (onJoyStart/Move/End). */
  function onTouchStart(e) {
    if (!inside) return;
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      pinchDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      lookTouchId = null;
      return;
    }
    const t = e.changedTouches[0];
    if (lookTouchId === null) {
      lookTouchId = t.identifier;
      lastLook = { x: t.clientX, y: t.clientY };
    }
  }

  function onTouchMove(e) {
    if (!inside) return;
    e.preventDefault(); // cegah scroll halaman saat menelusuri
    // Pinch → zoom FOV
    if (e.touches.length === 2 && pinchDist > 0) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const delta = (pinchDist - d) * 0.12; // menjauh = zoom in
      camera.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, camera.fov + delta));
      camera.updateProjectionMatrix();
      pinchDist = d;
      return;
    }
    // Satu jari → putar pandangan
    for (const t of e.changedTouches) {
      if (t.identifier !== lookTouchId) continue;
      const dx = t.clientX - lastLook.x;
      const dy = t.clientY - lastLook.y;
      lastLook = { x: t.clientX, y: t.clientY };
      const euler = new THREE_.Euler(0, 0, 0, 'YXZ');
      euler.setFromQuaternion(camera.quaternion);
      euler.y -= dx * LOOK_SENS;
      euler.x -= dy * LOOK_SENS;
      const LIMIT = Math.PI / 2 - 0.09; // ±~85°, cegah kamera terbalik
      euler.x = Math.max(-LIMIT, Math.min(LIMIT, euler.x));
      camera.quaternion.setFromEuler(euler);
    }
  }

  function onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === lookTouchId) lookTouchId = null;
    }
    if (e.touches.length < 2) pinchDist = 0;
  }

  /* ── Joystick virtual (berjalan) ── */
  function joySet(clientX, clientY, rect) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > JOY_RADIUS) { dx = (dx / dist) * JOY_RADIUS; dy = (dy / dist) * JOY_RADIUS; }
    joyKnob = { x: dx, y: dy };
    joyVec = { x: dx / JOY_RADIUS, y: dy / JOY_RADIUS };
  }
  function onJoyStart(e) {
    e.preventDefault(); e.stopPropagation();
    const t = e.changedTouches ? e.changedTouches[0] : e;
    joyTouchId = e.changedTouches ? t.identifier : 'mouse';
    joyActive = true;
    joySet(t.clientX, t.clientY, e.currentTarget.getBoundingClientRect());
  }
  function onJoyMove(e) {
    if (!joyActive) return;
    e.preventDefault(); e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.changedTouches) {
      for (const t of e.changedTouches) {
        if (t.identifier === joyTouchId) joySet(t.clientX, t.clientY, rect);
      }
    } else {
      joySet(e.clientX, e.clientY, rect);
    }
  }
  function onJoyEnd(e) {
    e.preventDefault(); e.stopPropagation();
    joyActive = false;
    joyTouchId = null;
    joyKnob = { x: 0, y: 0 };
    joyVec = { x: 0, y: 0 };
  }

  // Scroll di mode walkthrough → zoom via FOV (bukan geser posisi). Scroll ke atas =
  // zoom in (FOV mengecil), ke bawah = zoom out (FOV membesar), dibatasi FOV_MIN..MAX.
  function onWalkWheel(e) {
    if (!inside) return;
    e.preventDefault();
    const next = camera.fov + (e.deltaY > 0 ? 3 : -3);
    camera.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, next));
    camera.updateProjectionMatrix();
  }

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keyState.w = true;
    else if (k === 's' || k === 'arrowdown') keyState.s = true;
    else if (k === 'a' || k === 'arrowleft') keyState.a = true;
    else if (k === 'd' || k === 'arrowright') keyState.d = true;
  }
  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keyState.w = false;
    else if (k === 's' || k === 'arrowdown') keyState.s = false;
    else if (k === 'a' || k === 'arrowleft') keyState.a = false;
    else if (k === 'd' || k === 'arrowright') keyState.d = false;
  }

  function toggleInside() {
    if (inside) exitInside();
    else enterInside();
  }

  function cleanup() {
    disposed = true;
    if (rafId) cancelAnimationFrame(rafId);
    try { resizeObs?.disconnect(); } catch (e) {}
    try { controls?.dispose(); } catch (e) {}
    try {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer?.domElement?.removeEventListener('wheel', onWalkWheel);
      walkControls?.disconnect?.();
      walkControls?.dispose?.();
    } catch (e) {}
    try {
      scene?.traverse((o) => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
          const m = o.material;
          if (Array.isArray(m)) m.forEach((x) => x?.dispose?.());
          else m?.dispose?.();
        }
      });
    } catch (e) {}
    try { scene?.environment?.dispose?.(); } catch (e) {}
    try { composer?.dispose?.(); } catch (e) {}
    try {
      renderer?.dispose?.();
      if (renderer?.domElement?.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    } catch (e) {}
    renderer = scene = camera = controls = composer = null;
  }
</script>

<div bind:this={canvasWrap} class="model3d-wrap">
  {#if loading}
    <div class="model3d-overlay">
      <div class="model3d-spinner" aria-hidden="true"></div>
      <span>Memuat model 3D…</span>
    </div>
  {/if}
  {#if errorMsg}
    <div class="model3d-overlay">
      <span>{errorMsg}</span>
    </div>
  {/if}

  <!-- Tombol Masuk / Keluar walkthrough interior (disembunyikan di mode compact) -->
  {#if canGoInside && !loading && !errorMsg && !compact}
    <button class="model3d-enter" onclick={toggleInside}>
      {#if inside}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
        Keluar ke Luar
      {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/></svg>
        Masuk ke Dalam
      {/if}
    </button>
  {/if}

  <!-- Joystick virtual (hanya perangkat sentuh, saat mode telusuri) -->
  {#if inside && isTouch}
    <div
      class="model3d-joy"
      class:active={joyActive}
      role="application"
      aria-label="Joystick berjalan"
      ontouchstart={onJoyStart}
      ontouchmove={onJoyMove}
      ontouchend={onJoyEnd}
      ontouchcancel={onJoyEnd}
    >
      <div class="model3d-joy-knob" style={`transform: translate(${joyKnob.x}px, ${joyKnob.y}px)`}></div>
    </div>
  {/if}

  <!-- Petunjuk kontrol: berbeda antara mode luar (orbit) & mode telusuri (walkthrough),
       dan antara perangkat sentuh vs desktop. Disembunyikan di mode compact. -->
  {#if !loading && !errorMsg && !compact}
    {#if inside}
      <div class="model3d-walkhint">
        {#if isTouch}
          <strong>Joystick</strong> berjalan · <strong>seret layar</strong> melihat · <strong>cubit</strong> zoom
        {:else}
          <strong>W A S D</strong> berjalan · <strong>mouse</strong> melihat · <strong>scroll</strong> zoom · <strong>Esc</strong> keluar
        {/if}
      </div>
    {:else}
      <div class="model3d-walkhint">
        {#if isTouch}
          ↺ Seret untuk memutar · cubit untuk zoom
        {:else}
          ↺ Seret untuk memutar · gulir untuk zoom
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .model3d-wrap {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(120% 120% at 50% 12%, #12294f 0%, #08152e 60%, #060e22 100%);
    overflow: hidden;
  }
  .model3d-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    color: #d4af37;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    pointer-events: none;
  }
  .model3d-spinner {
    width: 34px;
    height: 34px;
    border: 2px solid rgba(212, 175, 55, 0.25);
    border-top-color: #d4af37;
    border-radius: 50%;
    animation: model3d-spin 0.9s linear infinite;
  }
  @keyframes model3d-spin {
    to { transform: rotate(360deg); }
  }

  .model3d-enter {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 6;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #e7c76a, #d4af37);
    color: #08152e;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.02em;
    padding: 9px 16px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(212, 175, 55, 0.4);
    transition: filter 0.15s, transform 0.1s;
  }
  .model3d-enter:hover { filter: brightness(1.1); }
  .model3d-enter:active { transform: scale(0.96); }

  .model3d-walkhint {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 5;
    pointer-events: none;
    background: rgba(6, 14, 34, 0.82);
    color: #e2e8f0;
    font-size: 12.5px;
    padding: 9px 18px;
    border-radius: 999px;
    white-space: nowrap;
  }
  .model3d-walkhint strong { color: #e7c76a; font-weight: 700; }

  /* Joystick virtual — hanya tampil di perangkat sentuh saat mode telusuri. */
  .model3d-joy {
    position: absolute;
    left: 20px;
    bottom: 68px;
    z-index: 7;
    width: 112px;
    height: 112px;
    border-radius: 50%;
    background: rgba(6, 14, 34, 0.42);
    border: 1.5px solid rgba(231, 199, 106, 0.45);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: none;      /* cegah browser men-scroll saat joystick dipakai */
    transition: background 0.15s;
  }
  .model3d-joy.active { background: rgba(6, 14, 34, 0.6); }
  .model3d-joy-knob {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e7c76a, #d4af37);
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.45);
    pointer-events: none;
  }
</style>
