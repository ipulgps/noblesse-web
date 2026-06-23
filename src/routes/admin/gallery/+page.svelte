<script lang="ts">
	import { enhance } from '$app/forms';
	import ImageUpload from '$lib/ImageUpload.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	type Row = PageData['gallery'][number];

	const blank = { id: 0, imagePath: '', caption: '', heightPx: 300, sortOrder: 0, isActive: 1 };
	let editing = $state<typeof blank | null>(null);
	let saving = $state(false);

	const openCreate = () => (editing = { ...blank, sortOrder: data.gallery.length });
	const openEdit = (g: Row) =>
		(editing = {
			id: g.id,
			imagePath: g.imagePath,
			caption: g.caption ?? '',
			heightPx: g.heightPx,
			sortOrder: g.sortOrder,
			isActive: g.isActive
		});
</script>

<svelte:head><title>Galeri — Noblesse Admin</title></svelte:head>

<div class="adm-head">
	<div>
		<h1 class="adm-title">Galeri</h1>
		<p class="adm-sub">Foto pada bagian galeri. (Unggah file menyusul; sementara isi path manual.)</p>
	</div>
	{#if !editing}<button class="adm-btn adm-btn-gold" onclick={openCreate}>+ Tambah Foto</button>{/if}
</div>

{#if editing}
	<div class="adm-card" style="padding:28px;margin-bottom:24px;">
		<h2 style="font-family:'Playfair Display',serif;font-size:21px;color:#0a1f44;margin:0 0 20px;">
			{editing.id ? 'Edit' : 'Tambah'} Foto
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
			<div class="adm-field full">
				{#key editing.id}
					<ImageUpload name="imagePath" value={editing.imagePath} label="Foto Galeri" />
				{/key}
			</div>
			<div class="adm-field">
				<label for="g-cap">Caption</label>
				<input id="g-cap" name="caption" value={editing.caption} />
			</div>
			<div class="adm-field">
				<label for="g-h">Tinggi (px)</label>
				<input id="g-h" name="heightPx" type="number" min="120" max="800" value={editing.heightPx} />
			</div>
			<div class="adm-field">
				<label for="g-sort">Urutan</label>
				<input id="g-sort" name="sortOrder" type="number" value={editing.sortOrder} />
			</div>
			<div class="adm-field">
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
	{#if data.gallery.length === 0}
		<div class="adm-empty">Belum ada foto.</div>
	{:else}
		<table class="adm-table">
			<thead><tr><th style="width:64px;">Foto</th><th>Caption</th><th>Tinggi</th><th>Status</th><th style="width:1%;">Aksi</th></tr></thead>
			<tbody>
				{#each data.gallery as g (g.id)}
					<tr>
						<td>{#if g.imagePath}<img class="adm-thumb" src={g.imagePath} alt="" />{:else}<span class="adm-thumb"></span>{/if}</td>
						<td>{g.caption ?? '—'}</td>
						<td>{g.heightPx}px</td>
						<td><span class="adm-badge {g.isActive ? 'adm-badge-on' : 'adm-badge-off'}">{g.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
						<td>
							<div class="adm-actions">
								<button class="adm-btn adm-btn-ghost adm-btn-sm" onclick={() => openEdit(g)}>Edit</button>
								<form method="POST" action="?/toggle" use:enhance>
									<input type="hidden" name="id" value={g.id} /><input type="hidden" name="isActive" value={g.isActive} />
									<button class="adm-btn adm-btn-ghost adm-btn-sm" type="submit">{g.isActive ? 'Sembunyikan' : 'Tampilkan'}</button>
								</form>
								<form method="POST" action="?/delete" use:enhance onsubmit={(e) => { if (!confirm('Hapus foto ini?')) e.preventDefault(); }}>
									<input type="hidden" name="id" value={g.id} />
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
