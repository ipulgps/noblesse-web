<script lang="ts">
	import { enhance } from '$app/forms';
	import ImageUpload from '$lib/ImageUpload.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Project = PageData['projects'][number];
	const blank = {
		id: 0,
		name: '',
		location: '',
		priceLabel: '',
		badge: '',
		badgeStyle: 'gold' as 'gold' | 'dark',
		imagePath: '',
		description: '',
		sortOrder: 0,
		isActive: 1
	};

	let editing = $state<typeof blank | null>(null);
	let saving = $state(false);

	function openCreate() {
		editing = { ...blank, sortOrder: data.projects.length };
	}
	function openEdit(p: Project) {
		editing = {
			id: p.id,
			name: p.name,
			location: p.location,
			priceLabel: p.priceLabel,
			badge: p.badge ?? '',
			badgeStyle: p.badgeStyle,
			imagePath: p.imagePath ?? '',
			description: p.description ?? '',
			sortOrder: p.sortOrder,
			isActive: p.isActive
		};
	}
	function close() {
		editing = null;
	}
</script>

<svelte:head><title>Proyek — Noblesse Admin</title></svelte:head>

<div class="adm-head">
	<div>
		<h1 class="adm-title">Proyek</h1>
		<p class="adm-sub">Kelola kartu proyek yang tampil di halaman utama.</p>
	</div>
	{#if !editing}
		<button class="adm-btn adm-btn-gold" onclick={openCreate}>+ Tambah Proyek</button>
	{/if}
</div>

{#if editing}
	<div class="adm-card" style="padding:28px;margin-bottom:24px;">
		<h2 style="font-family:'Playfair Display',serif;font-size:21px;color:#0a1f44;margin:0 0 20px;">
			{editing.id ? 'Edit Proyek' : 'Tambah Proyek'}
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
				<label for="p-name">Nama Proyek *</label>
				<input id="p-name" name="name" required value={editing.name} />
			</div>
			<div class="adm-field">
				<label for="p-loc">Lokasi *</label>
				<input id="p-loc" name="location" required value={editing.location} />
			</div>
			<div class="adm-field">
				<label for="p-price">Harga (label) *</label>
				<input id="p-price" name="priceLabel" required placeholder="Rp 2,8 M" value={editing.priceLabel} />
			</div>
			<div class="adm-field">
				<label for="p-badge">Badge</label>
				<input id="p-badge" name="badge" placeholder="Ready Stock" value={editing.badge} />
			</div>
			<div class="adm-field">
				<label for="p-style">Gaya Badge</label>
				<select id="p-style" name="badgeStyle" value={editing.badgeStyle}>
					<option value="gold">Emas</option>
					<option value="dark">Gelap</option>
				</select>
			</div>
			<div class="adm-field">
				<label for="p-sort">Urutan</label>
				<input id="p-sort" name="sortOrder" type="number" value={editing.sortOrder} />
			</div>
			<div class="adm-field full">
				{#key editing.id}
					<ImageUpload name="imagePath" value={editing.imagePath} label="Foto Proyek" />
				{/key}
			</div>
			<div class="adm-field full">
				<label for="p-desc">Deskripsi</label>
				<textarea id="p-desc" name="description" rows="3">{editing.description}</textarea>
			</div>
			<div class="adm-field full">
				<label class="adm-check">
					<input type="checkbox" name="isActive" checked={editing.isActive === 1} />
					<span>Aktif (tampil di website)</span>
				</label>
			</div>

			<div class="adm-form-actions">
				<button type="submit" class="adm-btn adm-btn-gold" disabled={saving}>
					{saving ? 'Menyimpan…' : 'Simpan'}
				</button>
				<button type="button" class="adm-btn adm-btn-ghost" onclick={close}>Batal</button>
			</div>
		</form>
	</div>
{/if}

<div class="adm-card">
	{#if data.projects.length === 0}
		<div class="adm-empty">Belum ada proyek. Klik “Tambah Proyek”.</div>
	{:else}
		<table class="adm-table">
			<thead>
				<tr>
					<th style="width:64px;">Foto</th>
					<th>Nama</th>
					<th>Lokasi</th>
					<th>Harga</th>
					<th>Badge</th>
					<th>Status</th>
					<th style="width:1%;">Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#each data.projects as p (p.id)}
					<tr>
						<td>
							{#if p.imagePath}
								<img class="adm-thumb" src={p.imagePath} alt="" />
							{:else}
								<span class="adm-thumb"></span>
							{/if}
						</td>
						<td style="font-weight:600;color:#0a1f44;">{p.name}</td>
						<td>{p.location}</td>
						<td>{p.priceLabel}</td>
						<td>{p.badge ?? '—'}</td>
						<td>
							<span class="adm-badge {p.isActive ? 'adm-badge-on' : 'adm-badge-off'}">
								{p.isActive ? 'Aktif' : 'Nonaktif'}
							</span>
						</td>
						<td>
							<div class="adm-actions">
								<button class="adm-btn adm-btn-ghost adm-btn-sm" onclick={() => openEdit(p)}>Edit</button>
								<form method="POST" action="?/toggle" use:enhance>
									<input type="hidden" name="id" value={p.id} />
									<input type="hidden" name="isActive" value={p.isActive} />
									<button class="adm-btn adm-btn-ghost adm-btn-sm" type="submit">
										{p.isActive ? 'Sembunyikan' : 'Tampilkan'}
									</button>
								</form>
								<form
									method="POST"
									action="?/delete"
									use:enhance={() => async ({ update }) => { await update(); }}
									onsubmit={(e) => {
										if (!confirm(`Hapus proyek “${p.name}”?`)) e.preventDefault();
									}}
								>
									<input type="hidden" name="id" value={p.id} />
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
