<script lang="ts">
	import { enhance } from '$app/forms';
	import ImageUpload from '$lib/ImageUpload.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	type Row = PageData['testimonials'][number];

	const initials = (name: string) =>
		name
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('');

	const blank = {
		id: 0,
		quote: '',
		authorName: '',
		authorRole: '',
		rating: 5,
		photoPath: '',
		sortOrder: 0,
		isActive: 1
	};
	let editing = $state<typeof blank | null>(null);
	let saving = $state(false);
	let uploadingImg = $state(false);

	const openCreate = () => (editing = { ...blank, sortOrder: data.testimonials.length });
	const openEdit = (t: Row) =>
		(editing = {
			id: t.id,
			quote: t.quote,
			authorName: t.authorName,
			authorRole: t.authorRole ?? '',
			rating: t.rating,
			photoPath: t.photoPath ?? '',
			sortOrder: t.sortOrder,
			isActive: t.isActive
		});
</script>

<svelte:head><title>Testimoni — Noblesse Admin</title></svelte:head>

<div class="adm-head">
	<div>
		<h1 class="adm-title">Testimoni</h1>
		<p class="adm-sub">Kelola testimoni pelanggan.</p>
	</div>
	{#if !editing}<button class="adm-btn adm-btn-gold" onclick={openCreate}>+ Tambah Testimoni</button>{/if}
</div>

{#if editing}
	<div class="adm-card" style="padding:28px;margin-bottom:24px;">
		<h2 style="font-family:'Playfair Display',serif;font-size:21px;color:#0a1f44;margin:0 0 20px;">
			{editing.id ? 'Edit' : 'Tambah'} Testimoni
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
				<label for="t-quote">Kutipan *</label>
				<textarea id="t-quote" name="quote" rows="3" required>{editing.quote}</textarea>
			</div>
			<div class="adm-field">
				<label for="t-name">Nama *</label>
				<input id="t-name" name="authorName" required value={editing.authorName} />
			</div>
			<div class="adm-field">
				<label for="t-role">Peran</label>
				<input id="t-role" name="authorRole" placeholder="Pemilik · Noblesse Hills" value={editing.authorRole} />
			</div>
			<div class="adm-field">
				<label for="t-rating">Rating (1–5)</label>
				<input id="t-rating" name="rating" type="number" min="1" max="5" value={editing.rating} />
			</div>
			<div class="adm-field">
				<label for="t-sort">Urutan</label>
				<input id="t-sort" name="sortOrder" type="number" value={editing.sortOrder} />
			</div>
			<div class="adm-field full">
				{#key editing.id}
					<ImageUpload
					name="photoPath"
					value={editing.photoPath}
					label="Foto"
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
	{#if data.testimonials.length === 0}
		<div class="adm-empty">Belum ada testimoni.</div>
	{:else}
		<table class="adm-table">
			<thead>
				<tr><th>Nama</th><th>Kutipan</th><th>Rating</th><th>Status</th><th style="width:1%;">Aksi</th></tr>
			</thead>
			<tbody>
				{#each data.testimonials as t (t.id)}
					<tr>
						<td>
							<div style="display:flex;align-items:center;gap:10px;">
								<span class="adm-mono">{initials(t.authorName)}</span>
								<div>
									<div style="font-weight:600;color:#0a1f44;">{t.authorName}</div>
									<div style="font-weight:400;color:#9aa3b5;font-size:12.5px;">{t.authorRole ?? ''}</div>
								</div>
							</div>
						</td>
						<td style="max-width:360px;color:#475066;">{t.quote.length > 90 ? t.quote.slice(0, 90) + '…' : t.quote}</td>
						<td>{'★'.repeat(t.rating)}</td>
						<td><span class="adm-badge {t.isActive ? 'adm-badge-on' : 'adm-badge-off'}">{t.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
						<td>
							<div class="adm-actions">
								<button class="adm-btn adm-btn-ghost adm-btn-sm" onclick={() => openEdit(t)}>Edit</button>
								<form method="POST" action="?/toggle" use:enhance>
									<input type="hidden" name="id" value={t.id} /><input type="hidden" name="isActive" value={t.isActive} />
									<button class="adm-btn adm-btn-ghost adm-btn-sm" type="submit">{t.isActive ? 'Sembunyikan' : 'Tampilkan'}</button>
								</form>
								<form method="POST" action="?/delete" use:enhance onsubmit={(e) => { if (!confirm('Hapus testimoni ini?')) e.preventDefault(); }}>
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
