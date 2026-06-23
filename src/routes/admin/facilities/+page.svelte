<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	type Row = PageData['facilities'][number];

	const blank = { id: 0, title: '', description: '', iconSvg: '', sortOrder: 0, isActive: 1 };
	let editing = $state<typeof blank | null>(null);
	let saving = $state(false);

	const openCreate = () => (editing = { ...blank, sortOrder: data.facilities.length });
	const openEdit = (f: Row) =>
		(editing = {
			id: f.id,
			title: f.title,
			description: f.description,
			iconSvg: f.iconSvg ?? '',
			sortOrder: f.sortOrder,
			isActive: f.isActive
		});
</script>

<svelte:head><title>Fasilitas — Noblesse Admin</title></svelte:head>

<div class="adm-head">
	<div>
		<h1 class="adm-title">Fasilitas</h1>
		<p class="adm-sub">Kelola daftar fasilitas kawasan. Ikon berupa SVG path (atribut d) atau markup penuh.</p>
	</div>
	{#if !editing}<button class="adm-btn adm-btn-gold" onclick={openCreate}>+ Tambah Fasilitas</button>{/if}
</div>

{#if editing}
	<div class="adm-card" style="padding:28px;margin-bottom:24px;">
		<h2 style="font-family:'Playfair Display',serif;font-size:21px;color:#0a1f44;margin:0 0 20px;">
			{editing.id ? 'Edit' : 'Tambah'} Fasilitas
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
				<label for="f-title">Judul *</label>
				<input id="f-title" name="title" required value={editing.title} />
			</div>
			<div class="adm-field">
				<label for="f-sort">Urutan</label>
				<input id="f-sort" name="sortOrder" type="number" value={editing.sortOrder} />
			</div>
			<div class="adm-field full">
				<label for="f-desc">Deskripsi *</label>
				<input id="f-desc" name="description" required value={editing.description} />
			</div>
			<div class="adm-field full">
				<label for="f-icon">Ikon (SVG path "d" atau markup)</label>
				<textarea id="f-icon" name="iconSvg" rows="2" placeholder="M12 2v3M5 21v-7...">{editing.iconSvg}</textarea>
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
	{#if data.facilities.length === 0}
		<div class="adm-empty">Belum ada fasilitas.</div>
	{:else}
		<table class="adm-table">
			<thead><tr><th>Judul</th><th>Deskripsi</th><th>Status</th><th style="width:1%;">Aksi</th></tr></thead>
			<tbody>
				{#each data.facilities as f (f.id)}
					<tr>
						<td style="font-weight:600;color:#0a1f44;">{f.title}</td>
						<td style="color:#475066;">{f.description}</td>
						<td><span class="adm-badge {f.isActive ? 'adm-badge-on' : 'adm-badge-off'}">{f.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
						<td>
							<div class="adm-actions">
								<button class="adm-btn adm-btn-ghost adm-btn-sm" onclick={() => openEdit(f)}>Edit</button>
								<form method="POST" action="?/toggle" use:enhance>
									<input type="hidden" name="id" value={f.id} /><input type="hidden" name="isActive" value={f.isActive} />
									<button class="adm-btn adm-btn-ghost adm-btn-sm" type="submit">{f.isActive ? 'Sembunyikan' : 'Tampilkan'}</button>
								</form>
								<form method="POST" action="?/delete" use:enhance onsubmit={(e) => { if (!confirm('Hapus fasilitas ini?')) e.preventDefault(); }}>
									<input type="hidden" name="id" value={f.id} />
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
