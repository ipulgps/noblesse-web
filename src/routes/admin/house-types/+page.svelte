<script lang="ts">
	import { enhance } from '$app/forms';
	import ImageUpload from '$lib/ImageUpload.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	type Row = PageData['houseTypes'][number];

	const blank = {
		id: 0, name: '', typeCode: '', buildingArea: 0, landArea: 0,
		bedrooms: '', bathrooms: '', carport: '', floors: '', floorplanImg: '', sortOrder: 0, isActive: 1
	};
	let editing = $state<typeof blank | null>(null);
	let saving = $state(false);
	let uploadingImg = $state(false);

	const openCreate = () => (editing = { ...blank, sortOrder: data.houseTypes.length });
	const openEdit = (h: Row) =>
		(editing = {
			id: h.id, name: h.name, typeCode: h.typeCode, buildingArea: h.buildingArea, landArea: h.landArea,
			bedrooms: h.bedrooms, bathrooms: h.bathrooms, carport: h.carport, floors: h.floors,
			floorplanImg: h.floorplanImg ?? '', sortOrder: h.sortOrder, isActive: h.isActive
		});
</script>

<svelte:head><title>Tipe / Denah — Noblesse Admin</title></svelte:head>

<div class="adm-head">
	<div>
		<h1 class="adm-title">Tipe / Denah</h1>
		<p class="adm-sub">Tipe hunian yang tampil pada pemilih denah.</p>
	</div>
	{#if !editing}<button class="adm-btn adm-btn-gold" onclick={openCreate}>+ Tambah Tipe</button>{/if}
</div>

{#if editing}
	<div class="adm-card" style="padding:28px;margin-bottom:24px;">
		<h2 style="font-family:'Playfair Display',serif;font-size:21px;color:#0a1f44;margin:0 0 20px;">
			{editing.id ? 'Edit' : 'Tambah'} Tipe
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
				<label for="h-name">Nama *</label>
				<input id="h-name" name="name" required placeholder="Aurelia" value={editing.name} />
			</div>
			<div class="adm-field">
				<label for="h-code">Kode Tipe *</label>
				<input id="h-code" name="typeCode" required placeholder="Tipe 45" value={editing.typeCode} />
			</div>
			<div class="adm-field">
				<label for="h-lb">Luas Bangunan (m²) *</label>
				<input id="h-lb" name="buildingArea" type="number" required value={editing.buildingArea} />
			</div>
			<div class="adm-field">
				<label for="h-lt">Luas Tanah (m²) *</label>
				<input id="h-lt" name="landArea" type="number" required value={editing.landArea} />
			</div>
			<div class="adm-field">
				<label for="h-bed">Kamar Tidur</label>
				<input id="h-bed" name="bedrooms" value={editing.bedrooms} />
			</div>
			<div class="adm-field">
				<label for="h-bath">Kamar Mandi</label>
				<input id="h-bath" name="bathrooms" value={editing.bathrooms} />
			</div>
			<div class="adm-field">
				<label for="h-cp">Carport</label>
				<input id="h-cp" name="carport" value={editing.carport} />
			</div>
			<div class="adm-field">
				<label for="h-fl">Tingkat</label>
				<input id="h-fl" name="floors" placeholder="2 Lantai" value={editing.floors} />
			</div>
			<div class="adm-field">
				<label for="h-sort">Urutan</label>
				<input id="h-sort" name="sortOrder" type="number" value={editing.sortOrder} />
			</div>
			<div class="adm-field full">
				{#key editing.id}
					<ImageUpload
						name="floorplanImg"
						value={editing.floorplanImg}
						label="Gambar Denah"
						onuploading={(v) => (uploadingImg = v)}
					/>
				{/key}
			</div>
			<div class="adm-field full">
				<label class="adm-check"><input type="checkbox" name="isActive" checked={editing.isActive === 1} /><span>Aktif</span></label>
			</div>
			<div class="adm-form-actions">
				<button type="submit" class="adm-btn adm-btn-gold" disabled={saving || uploadingImg}>{saving ? 'Menyimpan…' : uploadingImg ? 'Menunggu unggah…' : 'Simpan'}</button>
				<button type="button" class="adm-btn adm-btn-ghost" onclick={() => (editing = null)}>Batal</button>
			</div>
		</form>
	</div>
{/if}

<div class="adm-card">
	{#if data.houseTypes.length === 0}
		<div class="adm-empty">Belum ada tipe.</div>
	{:else}
		<table class="adm-table">
			<thead><tr><th>Tipe</th><th>LB / LT</th><th>KT / KM</th><th>Status</th><th style="width:1%;">Aksi</th></tr></thead>
			<tbody>
				{#each data.houseTypes as h (h.id)}
					<tr>
						<td style="font-weight:600;color:#0a1f44;">{h.name}<div style="font-weight:400;color:#9aa3b5;font-size:12.5px;">{h.typeCode}</div></td>
						<td>{h.buildingArea} / {h.landArea} m²</td>
						<td>{h.bedrooms} KT · {h.bathrooms} KM</td>
						<td><span class="adm-badge {h.isActive ? 'adm-badge-on' : 'adm-badge-off'}">{h.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
						<td>
							<div class="adm-actions">
								<button class="adm-btn adm-btn-ghost adm-btn-sm" onclick={() => openEdit(h)}>Edit</button>
								<form method="POST" action="?/toggle" use:enhance>
									<input type="hidden" name="id" value={h.id} /><input type="hidden" name="isActive" value={h.isActive} />
									<button class="adm-btn adm-btn-ghost adm-btn-sm" type="submit">{h.isActive ? 'Sembunyikan' : 'Tampilkan'}</button>
								</form>
								<form method="POST" action="?/delete" use:enhance onsubmit={(e) => { if (!confirm('Hapus tipe ini?')) e.preventDefault(); }}>
									<input type="hidden" name="id" value={h.id} />
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
