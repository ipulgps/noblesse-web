<script lang="ts">
	import { enhance } from '$app/forms';
	import { onDestroy, tick } from 'svelte';
	import ImageUpload from '$lib/ImageUpload.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Node = PageData['nodes'][number];
	type Link = { to: string; yaw: number };
	type TourType = 'interior' | 'streetview';

	const blank = {
		id: 0,
		nodeKey: '',
		name: '',
		imagePath: '',
		mapX: 50,
		mapY: 50,
		initialYaw: null as number | null, // arah pandang awal kamera 360° (derajat 0-360); null = belum diatur
		links: [] as Link[],
		markerTitle: '',
		markerDesc: '',
		markerYawDeg: 0, // 0-360, horizontal di dalam foto 360°
		markerPitchDeg: 0, // -90..90, naik/turun di dalam foto 360°
		sortOrder: 0,
		isActive: 1
	};

	function parseLinks(json: string | null): Link[] {
		if (!json) return [];
		try {
			return (JSON.parse(json) as Link[]).filter((l) => l.to);
		} catch {
			return [];
		}
	}

	// "25deg" -> 25, "-6deg" -> -6, kosong/invalid -> 0
	function degOf(v: string | null): number {
		const n = parseFloat(String(v ?? '').replace('deg', ''));
		return Number.isFinite(n) ? n : 0;
	}

	// ── Langkah 1: pilih proyek ──────────────────────────────────────────
	let selectedProjectId = $state<number | null>(data.projects[0]?.id ?? null);
	const selectedProject = $derived(data.projects.find((p) => p.id === selectedProjectId) ?? null);

	// ── Langkah 2: tab jenis tur, di dalam proyek terpilih ───────────────
	let tourType = $state<TourType>('interior');
	const nodesInProject = $derived(
		selectedProjectId === null ? [] : data.nodes.filter((n) => n.projectId === selectedProjectId)
	);
	const visibleNodes = $derived(nodesInProject.filter((n) => n.tourType === tourType));
	const interiorCount = $derived(nodesInProject.filter((n) => n.tourType === 'interior').length);
	const streetCount = $derived(nodesInProject.filter((n) => n.tourType === 'streetview').length);

	// Node lain (jenis+proyek sama) yang bisa jadi tujuan link — tidak termasuk diri sendiri.
	function otherNodeOptions(excludeId: number) {
		return excludeId === 0 ? visibleNodes : visibleNodes.filter((n) => n.id !== excludeId);
	}

	let editing = $state<typeof blank | null>(null);
	let showMarker = $state(false);
	let saving = $state(false);
	let uploadingImg = $state(false);
	let formCardEl: HTMLDivElement | undefined = $state();

	// Form edit/tambah muncul di atas tabel; setelah dibuka, gulir ke sana
	// supaya user tahu formnya terbuka (tidak perlu scroll manual ke atas).
	async function scrollToForm() {
		await tick();
		formCardEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function openCreate() {
		editing = { ...blank, sortOrder: visibleNodes.length };
		showMarker = false;
		closeCalibration();
		scrollToForm();
	}
	function openEdit(n: Node) {
		editing = {
			id: n.id,
			nodeKey: n.nodeKey,
			name: n.name,
			imagePath: n.imagePath,
			mapX: n.mapX,
			mapY: n.mapY,
			initialYaw: n.initialYaw ?? null,
			links: parseLinks(n.linksJson),
			markerTitle: n.markerTitle ?? '',
			markerDesc: n.markerDesc ?? '',
			markerYawDeg: degOf(n.markerYaw),
			markerPitchDeg: degOf(n.markerPitch),
			sortOrder: n.sortOrder,
			isActive: n.isActive
		};
		showMarker = !!n.markerTitle;
		closeCalibration();
		scrollToForm();
	}
	function close() {
		editing = null;
		closeCalibration();
	}
	function addLinkRow() {
		if (editing) editing.links = [...editing.links, { to: '', yaw: 0 }];
	}
	function removeLinkRow(i: number) {
		if (editing) editing.links = editing.links.filter((_, idx) => idx !== i);
		if (calibratingIdx === i) calibratingIdx = null;
	}

	// ── Kalibrasi arah panah: klik langsung di foto 360° node ini ────────
	// (mis. tepat di pintu tujuan) untuk mengisi yaw link secara presisi,
	// alih-alih menebak derajat. Pakai Photo Sphere Viewer yang sama dengan
	// halaman publik supaya sudut yang dikalibrasi konsisten dengan tampilan
	// pengunjung nanti.
	let calibBoxEl: HTMLDivElement | undefined = $state();
	let calibViewer: any;
	let calibLoading = $state(false);
	let calibError = $state('');
	let calibratingIdx = $state<number | null>(null);
	let calibYaw = $state(0);
	// Kalibrasi arah pandang AWAL kamera (bukan arah panah link). Reuse viewer 360°
	// yang sama; 'calibInitialOpen' menandai panel arah-awal sedang terbuka.
	let calibInitialOpen = $state(false);

	async function loadPSVCore() {
		const [core] = await Promise.all([
			import('@photo-sphere-viewer/core'),
			import('@photo-sphere-viewer/core/index.css')
		]);
		return core.Viewer;
	}

	async function openCalibration(i: number) {
		if (!editing?.imagePath) {
			calibError = 'Simpan/unggah foto 360° titik ini dulu sebelum mengalibrasi arah panah.';
			return;
		}
		calibratingIdx = i;
		calibInitialOpen = false; // tutup panel arah-awal bila sedang terbuka
		calibYaw = editing.links[i].yaw;
		calibError = '';
		await destroyCalibViewer();
		calibLoading = true;
		try {
			const Viewer = await loadPSVCore();
			await new Promise((r) => setTimeout(r, 30));
			if (!calibBoxEl) throw new Error('Kotak penampil belum siap.');
			calibViewer = new Viewer({
				container: calibBoxEl,
				panorama: editing.imagePath,
				navbar: false,
				defaultYaw: `${calibYaw}deg`
			});
			calibViewer.addEventListener('click', (e: any) => {
				if (calibratingIdx === null || !editing) return;
				const yaw = Math.round(((e.data.yaw * 180) / Math.PI + 360) % 360);
				calibYaw = yaw;
				editing.links[calibratingIdx].yaw = yaw;
			});
		} catch (err) {
			console.error('Gagal memuat viewer kalibrasi', err);
			calibError = 'Gagal memuat penampil 360°. Periksa koneksi internet Anda.';
		}
		calibLoading = false;
	}

	async function destroyCalibViewer() {
		try {
			calibViewer?.destroy();
		} catch (e) {}
		calibViewer = undefined;
	}

	function closeCalibration() {
		calibratingIdx = null;
		calibInitialOpen = false;
		destroyCalibViewer();
	}

	// Kalibrasi arah pandang AWAL kamera: buka viewer 360° foto node ini, mulai
	// dari yaw yang sudah tersimpan (atau 0), lalu klik di foto untuk mengunci arah
	// yang akan dilihat pengunjung tiap kali masuk/pindah ke titik ini.
	async function openInitialCalibration() {
		if (!editing?.imagePath) {
			calibError = 'Simpan/unggah foto 360° titik ini dulu sebelum mengatur arah awal kamera.';
			calibInitialOpen = true;
			return;
		}
		calibratingIdx = null; // pastikan tidak bentrok dengan kalibrasi panah link
		calibInitialOpen = true;
		calibYaw = editing.initialYaw ?? 0;
		calibError = '';
		await destroyCalibViewer();
		calibLoading = true;
		try {
			const Viewer = await loadPSVCore();
			await new Promise((r) => setTimeout(r, 30));
			if (!calibBoxEl) throw new Error('Kotak penampil belum siap.');
			calibViewer = new Viewer({
				container: calibBoxEl,
				panorama: editing.imagePath,
				navbar: false,
				defaultYaw: `${calibYaw}deg`
			});
			calibViewer.addEventListener('click', (e: any) => {
				if (!calibInitialOpen || !editing) return;
				const yaw = Math.round(((e.data.yaw * 180) / Math.PI + 360) % 360);
				calibYaw = yaw;
				editing.initialYaw = yaw;
			});
		} catch (err) {
			console.error('Gagal memuat viewer kalibrasi arah awal', err);
			calibError = 'Gagal memuat penampil 360°. Periksa koneksi internet Anda.';
		}
		calibLoading = false;
	}

	function clearInitialYaw() {
		if (editing) editing.initialYaw = null;
	}

	onDestroy(() => {
		destroyCalibViewer();
	});

	let panoBoxEl: HTMLDivElement;
	function setMarkerFromPointer(e: PointerEvent) {
		if (!editing || !panoBoxEl) return;
		const rect = panoBoxEl.getBoundingClientRect();
		const px = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
		const py = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
		editing.markerYawDeg = Math.round(px * 360);
		editing.markerPitchDeg = Math.round(90 - py * 180);
	}
	function onPanoPointerDown(e: PointerEvent) {
		setMarkerFromPointer(e);
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function onPanoPointerMove(e: PointerEvent) {
		if (e.buttons !== 1) return;
		setMarkerFromPointer(e);
	}
	function onPanoKeydown(e: KeyboardEvent) {
		if (!editing) return;
		const step = e.shiftKey ? 10 : 1;
		if (e.key === 'ArrowLeft') editing.markerYawDeg = (editing.markerYawDeg - step + 360) % 360;
		else if (e.key === 'ArrowRight') editing.markerYawDeg = (editing.markerYawDeg + step) % 360;
		else if (e.key === 'ArrowUp') editing.markerPitchDeg = Math.min(90, editing.markerPitchDeg + step);
		else if (e.key === 'ArrowDown') editing.markerPitchDeg = Math.max(-90, editing.markerPitchDeg - step);
		else return;
		e.preventDefault();
	}

	const tourTypeLabel = (t: TourType) => (t === 'interior' ? 'Interior (dalam rumah)' : 'Streetview (menuju lokasi)');
</script>

<svelte:head><title>Tur Virtual — Noblesse Admin</title></svelte:head>

<div class="adm-head">
	<div>
		<h1 class="adm-title">Tur Virtual 360°</h1>
		<p class="adm-sub">Kelola foto 360° yang tampil di halaman /tur-virtual, per proyek.</p>
	</div>
</div>

{#if data.projects.length === 0}
	<div class="adm-card"><div class="adm-empty">Buat proyek dulu di menu "Proyek" sebelum menambah titik tur.</div></div>
{:else}
	<!-- Langkah 1: pilih proyek -->
	<div class="vt-project-picker">
		{#each data.projects as p (p.id)}
			<button
				type="button"
				class="vt-project-card"
				class:active={selectedProjectId === p.id}
				onclick={() => {
					selectedProjectId = p.id;
					editing = null;
				}}
			>
				{#if p.imagePath}
					<img src={p.imagePath} alt="" />
				{:else}
					<span class="vt-project-card-ph"></span>
				{/if}
				<div class="vt-project-card-body">
					<div class="vt-project-card-name">{p.name}</div>
					<div class="vt-project-card-count">
						{data.nodes.filter((n) => n.projectId === p.id).length} titik foto
					</div>
				</div>
			</button>
		{/each}
	</div>

	{#if selectedProject}
		<!-- Langkah 2: tab jenis tur -->
		<div class="vt-tabs">
			<button
				type="button"
				class="vt-tab"
				class:active={tourType === 'interior'}
				onclick={() => { tourType = 'interior'; editing = null; }}
			>
				Interior (dalam rumah) <span class="vt-tab-count">{interiorCount}</span>
			</button>
			<button
				type="button"
				class="vt-tab"
				class:active={tourType === 'streetview'}
				onclick={() => { tourType = 'streetview'; editing = null; }}
			>
				Streetview (menuju lokasi) <span class="vt-tab-count">{streetCount}</span>
			</button>
			<div class="vt-tabs-spacer"></div>
			{#if !editing}
				<button class="adm-btn adm-btn-gold" onclick={openCreate}>+ Tambah Titik Foto</button>
			{/if}
		</div>
		<p class="adm-sub" style="margin:-6px 0 18px;">
			{tourType === 'interior'
				? `Foto 360° di dalam rumah untuk ${selectedProject.name} — tamu bisa berpindah antar ruangan.`
				: `Foto 360° dari gerbang kawasan menuju rumah untuk ${selectedProject.name} — tamu mengikuti jalur titik demi titik.`}
		</p>

		{#if editing}
			<div class="adm-card" style="padding:28px;margin-bottom:24px;scroll-margin-top:80px;" bind:this={formCardEl}>
				<h2 style="font-family:'Playfair Display',serif;font-size:21px;color:#0a1f44;margin:0 0 4px;">
					{editing.id ? 'Edit Titik Foto' : 'Tambah Titik Foto'}
				</h2>
				<p class="adm-sub" style="margin:0 0 20px;">
					{selectedProject.name} · {tourTypeLabel(tourType)}
				</p>
				<form
					method="POST"
					action="?/{editing.id ? 'update' : 'create'}"
					use:enhance={() => {
						saving = true;
						return async ({ result, update }) => {
							await update();
							saving = false;
							if (result.type === 'success') editing = null;
						};
					}}
					class="adm-form"
				>
					{#if form?.error}<div class="adm-err">{form.error}</div>{/if}
					{#if editing.id}<input type="hidden" name="id" value={editing.id} />{/if}
					<input type="hidden" name="projectId" value={selectedProjectId} />
					<input type="hidden" name="tourType" value={tourType} />

					<div class="adm-field full">
						<label for="vt-name">Nama Titik *</label>
						<input id="vt-name" name="name" required placeholder="Teras & Carport" value={editing.name} />
						<small>Nama yang tampil untuk pengunjung, mis. "Teras & Carport" atau "Gerbang Utama".</small>
					</div>

					<div class="adm-field full">
						{#key editing.id}
							<ImageUpload
								name="imagePath"
								value={editing.imagePath}
								label="Foto 360° (equirectangular, rasio lebar:tinggi = 2:1)"
								onuploading={(v) => (uploadingImg = v)}
							/>
						{/key}
					</div>

					<input type="hidden" name="nodeKey" value={editing.nodeKey || editing.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'titik'} />

					<div class="adm-field full">
						<label>Bisa berpindah ke titik mana saja dari sini?</label>
						<small style="margin-bottom:10px;">Pilih titik-titik lain yang terhubung langsung dengan titik ini, lalu klik "Atur Arah" untuk mengalibrasi arah panah tepat ke titik itu (mis. tepat di pintu) langsung di foto 360°.</small>
						{#each editing.links as link, i (i)}
							<div class="vt-link-row">
								<select name="linkTo" value={link.to} class="vt-link-select">
									<option value="">— Pilih titik tujuan —</option>
									{#each otherNodeOptions(editing.id) as n (n.id)}
										<option value={n.nodeKey}>{n.name}</option>
									{/each}
								</select>
								<input type="hidden" name="linkYaw" value={link.yaw} />
								<button
									type="button"
									class="adm-btn adm-btn-ghost adm-btn-sm"
									class:vt-calib-active={calibratingIdx === i}
									onclick={() => (calibratingIdx === i ? closeCalibration() : openCalibration(i))}
								>
									{calibratingIdx === i ? '● Mengatur…' : `Atur Arah (${link.yaw}°)`}
								</button>
								<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" onclick={() => removeLinkRow(i)}>
									Hapus
								</button>
							</div>
							{#if calibratingIdx === i}
								<div class="vt-calib-panel">
									{#if calibError}
										<div class="adm-err" style="margin-bottom:10px;">{calibError}</div>
									{:else}
										<div class="vt-calib-box" bind:this={calibBoxEl}></div>
										<div class="vt-calib-info">
											<span>Seret untuk memutar foto, lalu klik tepat di titik tujuan (mis. pintu) untuk mengunci arah panah.</span>
											<strong>Yaw saat ini: {calibYaw}°</strong>
										</div>
									{/if}
									<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" onclick={closeCalibration}>Selesai</button>
								</div>
							{/if}
						{/each}
						{#if nodesInProject.filter((n) => n.tourType === tourType).length === 0 && !editing.id}
							<div class="vt-hint">Ini titik pertama untuk {tourTypeLabel(tourType).toLowerCase()} — simpan dulu, baru tambahkan titik lain untuk dihubungkan.</div>
						{:else}
							<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" onclick={addLinkRow}>+ Tambah Titik Tujuan</button>
						{/if}
					</div>

					<div class="adm-field full">
						<label for="vt-mapx">Posisi di denah mini (pojok kanan-atas saat tur ditampilkan)</label>
						<div class="vt-map-preview">
							<div class="vt-map-box">
								<span
									class="vt-map-dot"
									style="left:{editing.mapX}%;top:{editing.mapY}%"
								></span>
							</div>
							<div class="vt-map-sliders">
								<label class="vt-slider-label">Kiri ⟷ Kanan
									<input id="vt-mapx" name="mapX" type="range" min="0" max="100" bind:value={editing.mapX} />
								</label>
								<label class="vt-slider-label">Atas ⟷ Bawah
									<input name="mapY" type="range" min="0" max="100" bind:value={editing.mapY} />
								</label>
							</div>
						</div>
						<small>Geser untuk mengatur kira-kira di mana titik ini muncul pada denah mini. Tidak perlu presisi.</small>
					</div>

					<div class="adm-field full">
						<label>Arah pandang awal kamera</label>
						<small style="margin-bottom:10px;">
							Tentukan ke mana kamera 360° menghadap saat pengunjung pertama kali membuka atau berpindah ke titik ini.
							Klik "Atur Arah Awal", lalu klik di foto ke arah yang ingin dilihat lebih dulu (mis. menghadap ruang tamu, bukan ke tembok). Kosongkan untuk memakai arah bawaan (menghadap tengah foto).
						</small>
						<!-- Kosong ('') bila belum diatur -> server menyimpan null (viewer pakai horizon depan). -->
						<input type="hidden" name="initialYaw" value={editing.initialYaw ?? ''} />
						<div class="vt-link-row">
							<button
								type="button"
								class="adm-btn adm-btn-ghost adm-btn-sm"
								class:vt-calib-active={calibInitialOpen}
								onclick={() => (calibInitialOpen && calibratingIdx === null ? closeCalibration() : openInitialCalibration())}
							>
								{calibInitialOpen && calibratingIdx === null
									? '● Mengatur…'
									: editing.initialYaw != null
										? `Ubah Arah Awal (${editing.initialYaw}°)`
										: 'Atur Arah Awal'}
							</button>
							{#if editing.initialYaw != null}
								<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" onclick={clearInitialYaw}>
									Reset (pakai arah bawaan)
								</button>
							{/if}
						</div>
						{#if calibInitialOpen && calibratingIdx === null}
							<div class="vt-calib-panel">
								{#if calibError}
									<div class="adm-err" style="margin-bottom:10px;">{calibError}</div>
								{:else}
									<div class="vt-calib-box" bind:this={calibBoxEl}></div>
									<div class="vt-calib-info">
										<span>Seret untuk memutar foto, lalu klik ke arah yang ingin ditampilkan lebih dulu saat titik ini dibuka.</span>
										<strong>Arah awal: {calibYaw}°</strong>
									</div>
								{/if}
								<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" onclick={closeCalibration}>Selesai</button>
							</div>
						{/if}
					</div>

					<div class="adm-field">
						<label for="vt-sort">Urutan di daftar titik</label>
						<input id="vt-sort" name="sortOrder" type="number" value={editing.sortOrder} />
						<small>Angka lebih kecil tampil lebih dulu di rail bawah viewer.</small>
					</div>
					<div class="adm-field">
						<label class="adm-check" style="margin-top:30px;">
							<input type="checkbox" name="isActive" checked={editing.isActive === 1} />
							<span>Aktif (tampil di tur virtual)</span>
						</label>
					</div>

					<div class="adm-field full">
						<button type="button" class="vt-toggle-advanced" onclick={() => (showMarker = !showMarker)}>
							{showMarker ? '▾' : '▸'} Info tambahan saat titik ini diklik (opsional)
						</button>
						{#if showMarker}
							<div class="vt-advanced">
								<div class="adm-field full">
									<label for="vt-mtitle">Judul info</label>
									<input id="vt-mtitle" name="markerTitle" placeholder="mis. Sofa Premium" value={editing.markerTitle} />
									<small>Kosongkan jika titik ini tidak perlu menampilkan info tambahan (hotspot "i").</small>
								</div>
								<div class="adm-field full">
									<label for="vt-mdesc">Isi keterangan</label>
									<textarea id="vt-mdesc" name="markerDesc" rows="2" placeholder="mis. Sofa kulit asli dengan rangka kayu jati solid.">{editing.markerDesc}</textarea>
								</div>
								<div class="adm-field full">
									<label for="vt-pano">Posisi info di dalam foto 360°</label>
									<input type="hidden" name="markerYaw" value="{editing.markerYawDeg}deg" />
									<input type="hidden" name="markerPitch" value="{editing.markerPitchDeg}deg" />
									<div
										id="vt-pano"
										bind:this={panoBoxEl}
										class="vt-pano-box"
										role="slider"
										aria-label="Posisi info di dalam foto 360°"
										aria-valuemin="0"
										aria-valuemax="360"
										aria-valuenow={editing.markerYawDeg}
										tabindex="0"
										onpointerdown={onPanoPointerDown}
										onpointermove={onPanoPointerMove}
										onkeydown={onPanoKeydown}
									>
										<span
											class="vt-pano-dot"
											style="left:{(editing.markerYawDeg / 360) * 100}%;top:{((90 - editing.markerPitchDeg) / 180) * 100}%"
										>i</span>
									</div>
									<small>Klik atau seret di kotak untuk menentukan posisi info — kiri/kanan mengikuti arah pandang, atas/bawah mengikuti naik/turun. Kotak ini mewakili foto 360° yang dibentangkan datar.</small>
								</div>
							</div>
						{/if}
					</div>

					<div class="adm-form-actions">
						<button type="submit" class="adm-btn adm-btn-gold" disabled={saving || uploadingImg}>
							{saving ? 'Menyimpan…' : uploadingImg ? 'Menunggu unggah…' : 'Simpan'}
						</button>
						<button type="button" class="adm-btn adm-btn-ghost" onclick={close}>Batal</button>
					</div>
				</form>
			</div>
		{/if}

		<div class="adm-card">
			{#if visibleNodes.length === 0}
				<div class="adm-empty">
					Belum ada titik foto {tourTypeLabel(tourType).toLowerCase()} untuk {selectedProject.name}.
					Klik "+ Tambah Titik Foto" untuk memulai.
				</div>
			{:else}
				<table class="adm-table">
					<thead>
						<tr>
							<th style="width:64px;">Foto</th>
							<th>Nama Titik</th>
							<th>Terhubung ke</th>
							<th>Status</th>
							<th style="width:1%;">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each visibleNodes as n (n.id)}
							<tr>
								<td>
									{#if n.imagePath}
										<img class="adm-thumb" src={n.imagePath} alt="" />
									{:else}
										<span class="adm-thumb"></span>
									{/if}
								</td>
								<td style="font-weight:600;color:#0a1f44;">{n.name}</td>
								<td>
									{#each parseLinks(n.linksJson) as l}
										<span class="vt-link-chip">{visibleNodes.find((v) => v.nodeKey === l.to)?.name ?? l.to}</span>
									{:else}
										<span style="color:#c2c7d1;">—</span>
									{/each}
								</td>
								<td>
									<span class="adm-badge {n.isActive ? 'adm-badge-on' : 'adm-badge-off'}">
										{n.isActive ? 'Aktif' : 'Nonaktif'}
									</span>
								</td>
								<td>
									<div class="adm-actions">
										<button class="adm-btn adm-btn-ghost adm-btn-sm" onclick={() => openEdit(n)}>Edit</button>
										<form method="POST" action="?/toggle" use:enhance>
											<input type="hidden" name="id" value={n.id} />
											<input type="hidden" name="isActive" value={n.isActive} />
											<button class="adm-btn adm-btn-ghost adm-btn-sm" type="submit">
												{n.isActive ? 'Sembunyikan' : 'Tampilkan'}
											</button>
										</form>
										<form
											method="POST"
											action="?/delete"
											use:enhance={() => async ({ update }) => { await update(); }}
											onsubmit={(e) => {
												if (!confirm(`Hapus titik "${n.name}"?`)) e.preventDefault();
											}}
										>
											<input type="hidden" name="id" value={n.id} />
											<button class="adm-btn adm-btn-danger adm-btn-sm" type="submit">Hapus</button>
										</form>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	{/if}
{/if}

<style>
	.vt-project-picker {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 14px;
		margin-bottom: 28px;
	}
	.vt-project-card {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		border: 2px solid #e7e9ef;
		border-radius: 12px;
		background: #fff;
		cursor: pointer;
		text-align: left;
		transition: all 0.2s;
	}
	.vt-project-card:hover {
		border-color: #e7c76a;
	}
	.vt-project-card.active {
		border-color: #d4af37;
		background: #fdfaf1;
	}
	.vt-project-card img,
	.vt-project-card-ph {
		width: 52px;
		height: 40px;
		border-radius: 6px;
		object-fit: cover;
		background: #f0f1f4;
		flex: none;
	}
	.vt-project-card-name {
		font-weight: 700;
		color: #0a1f44;
		font-size: 14px;
	}
	.vt-project-card-count {
		font-size: 12px;
		color: #9aa3b5;
		margin-top: 2px;
	}

	.vt-tabs {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 6px;
		flex-wrap: wrap;
	}
	.vt-tabs-spacer {
		flex: 1;
	}
	.vt-tab {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 11px 18px;
		border-radius: 8px;
		border: 1px solid #e2e5ec;
		background: #fff;
		color: #6b7794;
		font-size: 13.5px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}
	.vt-tab.active {
		border-color: #d4af37;
		background: #0a1f44;
		color: #fff;
	}
	.vt-tab-count {
		font-size: 11.5px;
		padding: 1px 7px;
		border-radius: 20px;
		background: rgba(255, 255, 255, 0.15);
	}
	.vt-tab:not(.active) .vt-tab-count {
		background: #f0f1f4;
		color: #9aa3b5;
	}

	.adm-field small {
		color: #9aa3b5;
		font-size: 12px;
		margin-top: 6px;
		line-height: 1.5;
	}

	.vt-link-row {
		display: flex;
		gap: 10px;
		align-items: center;
		margin-bottom: 8px;
	}
	.vt-link-select {
		flex: 2;
	}
	.vt-hint {
		font-size: 13px;
		color: #9c7a1e;
		background: #fdf8ec;
		border: 1px solid #f0e2bc;
		border-radius: 8px;
		padding: 10px 14px;
	}
	.vt-calib-active {
		border-color: #d4af37 !important;
		background: #fdfaf1 !important;
		color: #9c7a1e !important;
	}
	.vt-calib-panel {
		margin: -2px 0 12px;
		padding: 14px;
		background: #0a1f44;
		border-radius: 10px;
	}
	.vt-calib-box {
		width: 100%;
		aspect-ratio: 16 / 9;
		border-radius: 8px;
		overflow: hidden;
		background: #08152e;
	}
	.vt-calib-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-top: 10px;
		font-size: 12.5px;
		color: #b9c2d6;
	}
	.vt-calib-info strong {
		color: #e7c76a;
		white-space: nowrap;
	}
	.vt-link-chip {
		display: inline-block;
		background: #f0f1f4;
		color: #475066;
		font-size: 12px;
		padding: 3px 10px;
		border-radius: 20px;
		margin: 2px 4px 2px 0;
	}

	.vt-map-preview {
		display: flex;
		gap: 20px;
		align-items: center;
		background: #f8f9fb;
		border: 1px solid #eceef3;
		border-radius: 10px;
		padding: 16px;
	}
	.vt-map-box {
		position: relative;
		width: 120px;
		height: 90px;
		flex: none;
		background: #0a1f44;
		border-radius: 8px;
	}
	.vt-map-dot {
		position: absolute;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #d4af37;
		transform: translate(-50%, -50%);
		box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.25);
	}
	.vt-map-sliders {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.vt-slider-label {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 12px;
		color: #6b7794;
		font-weight: 600;
	}
	.vt-slider-label input[type='range'] {
		accent-color: #d4af37;
	}

	.vt-pano-box {
		position: relative;
		width: 100%;
		max-width: 360px;
		aspect-ratio: 2 / 1;
		background: linear-gradient(180deg, #0a1f44, #08152e);
		border-radius: 8px;
		border: 1px solid #1c2e52;
		cursor: crosshair;
		touch-action: none;
	}
	.vt-pano-dot {
		position: absolute;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: linear-gradient(135deg, #e7c76a, #d4af37);
		color: #08152e;
		font-family: Georgia, serif;
		font-weight: 700;
		font-size: 13px;
		display: flex;
		align-items: center;
		justify-content: center;
		transform: translate(-50%, -50%);
		box-shadow: 0 0 0 5px rgba(212, 175, 55, 0.22);
		pointer-events: none;
	}

	.vt-toggle-advanced {
		background: none;
		border: none;
		color: #6b7794;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		padding: 0;
	}
	.vt-toggle-advanced:hover {
		color: #0a1f44;
	}
	.vt-advanced {
		margin-top: 14px;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 18px;
		padding-top: 14px;
		border-top: 1px solid #eceef3;
	}
</style>
