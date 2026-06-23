<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let saving = $state(false);
	let saved = $state(false);
</script>

<svelte:head><title>Pengaturan — Noblesse Admin</title></svelte:head>

<div class="adm-head">
	<div>
		<h1 class="adm-title">Pengaturan</h1>
		<p class="adm-sub">Teks dan kontak yang tampil di seluruh website.</p>
	</div>
</div>

<div class="adm-card" style="padding:28px;max-width:760px;">
	<form
		method="POST"
		use:enhance={() => {
			saving = true;
			saved = false;
			return async ({ result, update }) => {
				await update({ reset: false });
				saving = false;
				if (result.type === 'success') {
					saved = true;
					setTimeout(() => (saved = false), 2500);
				}
			};
		}}
		class="adm-form"
		style="max-width:none;"
	>
		{#each data.fields as f}
			<div class="adm-field full">
				<label for={f.key}>{f.label}</label>
				{#if f.type === 'textarea'}
					<textarea id={f.key} name={f.key} rows="2">{data.values[f.key] ?? ''}</textarea>
				{:else}
					<input id={f.key} name={f.key} value={data.values[f.key] ?? ''} />
				{/if}
			</div>
		{/each}
		<div class="adm-form-actions" style="align-items:center;">
			<button type="submit" class="adm-btn adm-btn-gold" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan Pengaturan'}</button>
			{#if saved}<span style="color:#1a7f43;font-size:14px;font-weight:600;">✓ Tersimpan</span>{/if}
		</div>
	</form>
</div>
