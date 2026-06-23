<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	type Row = PageData['locations'][number];

	const blank = { id: 0, label: '', travelTime: '', iconSvg: '', sortOrder: 0, isActive: 1 };
	let editing = $state<typeof blank | null>(null);
	let saving = $state(false);

	const openCreate = () => (editing = { ...blank, sortOrder: data.locations.length });
	const openEdit = (l: Row) =>
		(editing = {
			id: l.id,
			label: l.label,
			travelTime: l.travelTime,
			iconSvg: l.iconSvg ?? '',
			sortOrder: l.sortOrder,
			isActive: l.isActive
		});
</script>

<svelte:head><title>Lokasi — Noblesse Admin</title></svelte:head>

<div class="adm-head">
	<div>
		<h1 class="adm-title">Lokasi & Akses</h1>
		<p class="adm-sub">Titik penting dan waktu tempuh dari kawasan.</p>
	</div>
	{#if !editing}<button class="adm-btn adm-btn-gold" onclick={openCreate}>+ Tambah Titik</button>{/if}
</div>

{#if editing}
	<div class="adm-card" style="padding:28px;margin-bottom:24px;">
		<h2 style="font-family:'Playfair Display',serif;font-size:21px;color:#0a1f44;margin:0 0 20px;">
			{editing.id ? 'Edit' : 'Tambah'} Titik Lokasi
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
				<label for="l-label">Label *</label>
				<input id="l-label" name="label" required placeholder="Gerbang Tol" value={editing.label} />
			</div>
			<div class="adm-field">
				<label for="l-time">Waktu Tempuh *</label>
				<input id="l-time" name="travelTime" required placeholder="5 menit" value={editing.travelTime} />
			</div>
			<div class="adm-field">
				<label for="l-sort">Urutan</label>
				<input id="l-sort" name="sortOrder" type="number" value={editing.sortOrder} />
			</div>
			<div class="adm-field full">
				<label for="l-icon">Ikon (SVG path "d" atau markup)</label>
				<textarea id="l-icon" name="iconSvg" rows="2">{editing.iconSvg}</textarea>
			</div>
			<div class="adm-field full">
				<label class="adm-check"><input type="checkbox" name="isActive" checked={editing.isActive === 1} /><span>Aktif</span></label>
			</div>
			<div class="adm-form-actions">
				<button type="submit" class="adm-btn adm-btn-gold" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
				<button type="button" class="adm-btn adm-btn-ghost" onclick={() => (editing = null)}>Batal</button>
			</div>
		</form>
	</div>
{/if}

<div class="adm-card">
	{#if data.locations.length === 0}
		<div class="adm-empty">Belum ada titik lokasi.</div>
	{:else}
		<table class="adm-table">
			<thead><tr><th>Label</th><th>Waktu</th><th>Status</th><th style="width:1%;">Aksi</th></tr></thead>
			<tbody>
				{#each data.locations as l (l.id)}
					<tr>
						<td style="font-weight:600;color:#0a1f44;">{l.label}</td>
						<td>{l.travelTime}</td>
						<td><span class="adm-badge {l.isActive ? 'adm-badge-on' : 'adm-badge-off'}">{l.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
						<td>
							<div class="adm-actions">
								<button class="adm-btn adm-btn-ghost adm-btn-sm" onclick={() => openEdit(l)}>Edit</button>
								<form method="POST" action="?/toggle" use:enhance>
									<input type="hidden" name="id" value={l.id} /><input type="hidden" name="isActive" value={l.isActive} />
									<button class="adm-btn adm-btn-ghost adm-btn-sm" type="submit">{l.isActive ? 'Sembunyikan' : 'Tampilkan'}</button>
								</form>
								<form method="POST" action="?/delete" use:enhance onsubmit={(e) => { if (!confirm('Hapus titik ini?')) e.preventDefault(); }}>
									<input type="hidden" name="id" value={l.id} />
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
