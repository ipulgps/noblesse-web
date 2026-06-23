<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	type Row = PageData['stats'][number];

	const blank = { id: 0, value: 0, suffix: '', label: '', sortOrder: 0, isActive: 1 };
	let editing = $state<typeof blank | null>(null);
	let saving = $state(false);

	const openCreate = () => (editing = { ...blank, sortOrder: data.stats.length });
	const openEdit = (s: Row) =>
		(editing = { id: s.id, value: s.value, suffix: s.suffix, label: s.label, sortOrder: s.sortOrder, isActive: s.isActive });
</script>

<svelte:head><title>Statistik — Noblesse Admin</title></svelte:head>

<div class="adm-head">
	<div>
		<h1 class="adm-title">Statistik</h1>
		<p class="adm-sub">Angka pencapaian di bagian atas halaman.</p>
	</div>
	{#if !editing}<button class="adm-btn adm-btn-gold" onclick={openCreate}>+ Tambah Statistik</button>{/if}
</div>

{#if editing}
	<div class="adm-card" style="padding:28px;margin-bottom:24px;">
		<h2 style="font-family:'Playfair Display',serif;font-size:21px;color:#0a1f44;margin:0 0 20px;">
			{editing.id ? 'Edit' : 'Tambah'} Statistik
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
				<label for="s-value">Nilai (angka) *</label>
				<input id="s-value" name="value" type="number" required value={editing.value} />
			</div>
			<div class="adm-field">
				<label for="s-suffix">Akhiran</label>
				<input id="s-suffix" name="suffix" placeholder="+ atau %" value={editing.suffix} />
			</div>
			<div class="adm-field full">
				<label for="s-label">Label *</label>
				<input id="s-label" name="label" required placeholder="Tahun Pengalaman" value={editing.label} />
			</div>
			<div class="adm-field">
				<label for="s-sort">Urutan</label>
				<input id="s-sort" name="sortOrder" type="number" value={editing.sortOrder} />
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
	{#if data.stats.length === 0}
		<div class="adm-empty">Belum ada statistik.</div>
	{:else}
		<table class="adm-table">
			<thead><tr><th>Nilai</th><th>Label</th><th>Status</th><th style="width:1%;">Aksi</th></tr></thead>
			<tbody>
				{#each data.stats as s (s.id)}
					<tr>
						<td style="font-weight:700;color:#0a1f44;font-size:16px;">{s.value}{s.suffix}</td>
						<td>{s.label}</td>
						<td><span class="adm-badge {s.isActive ? 'adm-badge-on' : 'adm-badge-off'}">{s.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
						<td>
							<div class="adm-actions">
								<button class="adm-btn adm-btn-ghost adm-btn-sm" onclick={() => openEdit(s)}>Edit</button>
								<form method="POST" action="?/toggle" use:enhance>
									<input type="hidden" name="id" value={s.id} /><input type="hidden" name="isActive" value={s.isActive} />
									<button class="adm-btn adm-btn-ghost adm-btn-sm" type="submit">{s.isActive ? 'Sembunyikan' : 'Tampilkan'}</button>
								</form>
								<form method="POST" action="?/delete" use:enhance onsubmit={(e) => { if (!confirm('Hapus statistik ini?')) e.preventDefault(); }}>
									<input type="hidden" name="id" value={s.id} />
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
