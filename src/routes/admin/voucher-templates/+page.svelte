<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import ImageUpload from '$lib/ImageUpload.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	type Row = PageData['templates'][number];

	const blank = {
		id: 0,
		name: '',
		imagePath: '',
		qrX: 20,
		qrY: 20,
		qrSize: 200,
		codeX: 20,
		codeY: 260,
		fontSize: 32,
		textColor: '#000000',
		amount: 0,
		redeemLocation: '',
		expiredX: 20,
		expiredY: 300,
		expiredFontSize: 24,
		expiredTextColor: '#000000',
		isActive: 1
	};
	let editing = $state<typeof blank | null>(null);
	let saving = $state(false);
	let uploadingImg = $state(false);
	let formCardEl: HTMLDivElement | undefined = $state();

	// Form muncul di atas tabel; setelah dibuka, gulir ke sana supaya user tahu
	// formnya terbuka (tidak perlu scroll manual ke atas).
	async function scrollToForm() {
		await tick();
		formCardEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	// Ukuran asli gambar template (dibaca saat gambar dimuat) dan skala tampilan
	// preview, supaya koordinat px yang disimpan tetap relatif ke ukuran asli.
	let naturalW = $state(0);
	let naturalH = $state(0);
	let previewEl = $state<HTMLDivElement | null>(null);

	const openCreate = () => {
		editing = { ...blank };
		scrollToForm();
	};
	const openEdit = (t: Row) => {
		editing = {
			id: t.id,
			name: t.name,
			imagePath: t.imagePath,
			qrX: t.qrX,
			qrY: t.qrY,
			qrSize: t.qrSize,
			codeX: t.codeX,
			codeY: t.codeY,
			fontSize: t.fontSize,
			textColor: t.textColor,
			amount: t.amount,
			redeemLocation: t.redeemLocation,
			expiredX: t.expiredX,
			expiredY: t.expiredY,
			expiredFontSize: t.expiredFontSize,
			expiredTextColor: t.expiredTextColor,
			isActive: t.isActive
		};
		scrollToForm();
	};

	function onPreviewImgLoad(e: Event) {
		const img = e.currentTarget as HTMLImageElement;
		naturalW = img.naturalWidth;
		naturalH = img.naturalHeight;
	}

	// Drag handle generik: menyeret memperbarui field x/y (koordinat asli gambar)
	// berdasar posisi kursor relatif terhadap kotak preview yang mungkin diskalakan.
	function startDrag(field: 'qr' | 'code' | 'expired') {
		return (e: PointerEvent) => {
			e.preventDefault();
			const box = previewEl;
			if (!box || !editing || !naturalW) return;
			const scale = box.clientWidth / naturalW;

			const move = (ev: PointerEvent) => {
				const rect = box.getBoundingClientRect();
				const x = Math.round((ev.clientX - rect.left) / scale);
				const y = Math.round((ev.clientY - rect.top) / scale);
				if (!editing) return;
				if (field === 'qr') {
					editing.qrX = Math.max(0, x);
					editing.qrY = Math.max(0, y);
				} else if (field === 'code') {
					// codeX/codeY disimpan sebagai baseline teks SVG (dipakai langsung
					// sebagai x/y pada <text>), tapi kursor harus "memegang" pojok
					// kiri-atas kotak seperti QR agar drag terasa presisi 1:1 —
					// karena itu baseline = posisi kursor + tinggi font.
					editing.codeX = Math.max(0, x);
					editing.codeY = Math.max(0, y + editing.fontSize);
				} else {
					editing.expiredX = Math.max(0, x);
					editing.expiredY = Math.max(0, y + editing.expiredFontSize);
				}
			};
			const up = () => {
				window.removeEventListener('pointermove', move);
				window.removeEventListener('pointerup', up);
			};
			window.addEventListener('pointermove', move);
			window.addEventListener('pointerup', up);
		};
	}

	const previewScale = $derived(previewEl && naturalW ? previewEl.clientWidth / naturalW : 1);
</script>

<svelte:head><title>Template Voucher — Noblesse Admin</title></svelte:head>

<div class="adm-head">
	<div>
		<h1 class="adm-title">Template Voucher</h1>
		<p class="adm-sub">
			Unggah desain voucher digital, lalu atur posisi QR code dan nomor voucher dengan menyeret
			kotak pada pratinjau.
		</p>
	</div>
	{#if !editing}<button class="adm-btn adm-btn-gold" onclick={openCreate}>+ Tambah Template</button
		>{/if}
</div>

{#if editing}
	<div class="adm-card" style="padding:28px;margin-bottom:24px;scroll-margin-top:80px;" bind:this={formCardEl}>
		<h2 style="font-family:'Playfair Display',serif;font-size:21px;color:#0a1f44;margin:0 0 20px;">
			{editing.id ? 'Edit' : 'Tambah'} Template
		</h2>
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

			<div class="adm-field">
				<label for="vt-name">Nama Template</label>
				<input id="vt-name" name="name" bind:value={editing.name} required />
			</div>
			<div class="adm-field">
				<label class="adm-check"
					><input type="checkbox" name="isActive" checked={editing.isActive === 1} /><span
						>Aktif</span
					></label
				>
			</div>

			<div class="adm-field">
				<label for="vt-amount">Nominal Voucher (Rp)</label>
				<input id="vt-amount" name="amount" type="number" min="0" bind:value={editing.amount} />
			</div>
			<div class="adm-field">
				<label for="vt-loc">Lokasi Penukaran</label>
				<input
					id="vt-loc"
					name="redeemLocation"
					bind:value={editing.redeemLocation}
					placeholder="mis. Kantor Pemasaran Noblesse, Jl. ..."
				/>
			</div>

			<div class="adm-field full">
				{#key editing.id}
					<ImageUpload
						name="imagePath"
						value={editing.imagePath}
						label="Gambar Template"
						onuploading={(v) => (uploadingImg = v)}
						onpath={(p) => {
							if (editing) editing.imagePath = p;
						}}
					/>
				{/key}
			</div>

			{#if editing.imagePath}
				<div class="adm-field full">
					<span class="adm-label-like">Pratinjau &amp; Posisi (seret kotak)</span>
					<div class="vt-preview" bind:this={previewEl}>
						<img src={editing.imagePath} alt="" onload={onPreviewImgLoad} />
						{#if naturalW}
							<div
								class="vt-handle vt-handle-qr"
								style="left:{editing.qrX * previewScale}px; top:{editing.qrY *
									previewScale}px; width:{editing.qrSize * previewScale}px; height:{editing.qrSize *
									previewScale}px;"
								onpointerdown={startDrag('qr')}
								role="button"
								tabindex="0"
							>
								QR
							</div>
							<div
								class="vt-handle vt-handle-code"
								style="left:{editing.codeX * previewScale}px; top:{editing.codeY *
									previewScale -
									editing.fontSize *
										previewScale}px; font-size:{editing.fontSize * previewScale}px; line-height:{editing.fontSize *
									previewScale}px;"
								onpointerdown={startDrag('code')}
								role="button"
								tabindex="0"
							>
								{editing.name ? '000000000000' : 'NOMOR'}
							</div>
							<div
								class="vt-handle vt-handle-expired"
								style="left:{editing.expiredX * previewScale}px; top:{editing.expiredY *
									previewScale -
									editing.expiredFontSize *
										previewScale}px; font-size:{editing.expiredFontSize *
									previewScale}px; line-height:{editing.expiredFontSize * previewScale}px;"
								onpointerdown={startDrag('expired')}
								role="button"
								tabindex="0"
							>
								31 Des 2026
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<div class="adm-field">
				<label for="vt-qrx">QR — X (px)</label>
				<input id="vt-qrx" name="qrX" type="number" bind:value={editing.qrX} />
			</div>
			<div class="adm-field">
				<label for="vt-qry">QR — Y (px)</label>
				<input id="vt-qry" name="qrY" type="number" bind:value={editing.qrY} />
			</div>
			<div class="adm-field">
				<label for="vt-qrs">QR — Ukuran (px)</label>
				<input id="vt-qrs" name="qrSize" type="number" min="40" bind:value={editing.qrSize} />
			</div>

			<div class="adm-field">
				<label for="vt-cx">Nomor — X (px)</label>
				<input id="vt-cx" name="codeX" type="number" bind:value={editing.codeX} />
			</div>
			<div class="adm-field">
				<label for="vt-cy">Nomor — Y (px)</label>
				<input id="vt-cy" name="codeY" type="number" bind:value={editing.codeY} />
			</div>
			<div class="adm-field">
				<label for="vt-fs">Nomor — Ukuran Font</label>
				<input id="vt-fs" name="fontSize" type="number" min="8" bind:value={editing.fontSize} />
			</div>
			<div class="adm-field">
				<label for="vt-tc">Nomor — Warna</label>
				<input id="vt-tc" name="textColor" type="color" bind:value={editing.textColor} />
			</div>

			<div class="adm-field">
				<label for="vt-ex">Expired — X (px)</label>
				<input id="vt-ex" name="expiredX" type="number" bind:value={editing.expiredX} />
			</div>
			<div class="adm-field">
				<label for="vt-ey">Expired — Y (px)</label>
				<input id="vt-ey" name="expiredY" type="number" bind:value={editing.expiredY} />
			</div>
			<div class="adm-field">
				<label for="vt-efs">Expired — Ukuran Font</label>
				<input
					id="vt-efs"
					name="expiredFontSize"
					type="number"
					min="8"
					bind:value={editing.expiredFontSize}
				/>
			</div>
			<div class="adm-field">
				<label for="vt-etc">Expired — Warna</label>
				<input
					id="vt-etc"
					name="expiredTextColor"
					type="color"
					bind:value={editing.expiredTextColor}
				/>
			</div>

			<div class="adm-form-actions">
				<button type="submit" class="adm-btn adm-btn-gold" disabled={saving || uploadingImg}
					>{saving ? 'Menyimpan…' : uploadingImg ? 'Menunggu unggah…' : 'Simpan'}</button
				>
				<button type="button" class="adm-btn adm-btn-ghost" onclick={() => (editing = null)}
					>Batal</button
				>
			</div>
		</form>
	</div>
{/if}

<div class="adm-card">
	{#if data.templates.length === 0}
		<div class="adm-empty">Belum ada template voucher.</div>
	{:else}
		<table class="adm-table">
			<thead
				><tr
					><th style="width:64px;">Gambar</th><th>Nama</th><th>Status</th><th style="width:1%;"
						>Aksi</th
					></tr
				></thead
			>
			<tbody>
				{#each data.templates as t (t.id)}
					<tr>
						<td
							>{#if t.imagePath}<img class="adm-thumb" src={t.imagePath} alt="" />{:else}<span
									class="adm-thumb"
								></span>{/if}</td
						>
						<td>{t.name}</td>
						<td
							><span class="adm-badge {t.isActive ? 'adm-badge-on' : 'adm-badge-off'}"
								>{t.isActive ? 'Aktif' : 'Nonaktif'}</span
							></td
						>
						<td>
							<div class="adm-actions">
								<button class="adm-btn adm-btn-ghost adm-btn-sm" onclick={() => openEdit(t)}
									>Edit</button
								>
								<form method="POST" action="?/toggle" use:enhance>
									<input type="hidden" name="id" value={t.id} /><input
										type="hidden"
										name="isActive"
										value={t.isActive}
									/>
									<button class="adm-btn adm-btn-ghost adm-btn-sm" type="submit"
										>{t.isActive ? 'Sembunyikan' : 'Tampilkan'}</button
									>
								</form>
								<form
									method="POST"
									action="?/delete"
									use:enhance
									onsubmit={(e) => {
										if (!confirm('Hapus template ini?')) e.preventDefault();
									}}
								>
									<input type="hidden" name="id" value={t.id} />
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

<style>
	.adm-label-like {
		display: block;
		font-size: 12px;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: #9aa3b5;
		margin-bottom: 8px;
		font-weight: 600;
	}
	.vt-preview {
		position: relative;
		width: 100%;
		max-width: 480px;
		border: 1px solid #e2e5ec;
		border-radius: 8px;
		overflow: hidden;
		user-select: none;
	}
	.vt-preview img {
		display: block;
		width: 100%;
		height: auto;
	}
	.vt-handle {
		position: absolute;
		cursor: grab;
		touch-action: none;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		font-weight: 700;
		color: #0a1f44;
	}
	.vt-handle:active {
		cursor: grabbing;
	}
	.vt-handle-qr {
		border: 2px dashed #d4af37;
		background: rgba(212, 175, 55, 0.15);
	}
	.vt-handle-code {
		border: 2px dashed #2e7d32;
		background: rgba(46, 125, 50, 0.15);
		padding: 2px 6px;
		white-space: nowrap;
	}
	.vt-handle-expired {
		border: 2px dashed #1c4f99;
		background: rgba(28, 79, 153, 0.15);
		padding: 2px 6px;
		white-space: nowrap;
	}
</style>
