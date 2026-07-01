<script lang="ts">
	import { untrack } from 'svelte';
	// Field unggah gambar untuk form admin. Menyimpan path hasil upload ke
	// sebuah hidden input bernama `name` agar form action membaca seperti biasa.
	let {
		name,
		value = '',
		label = 'Gambar'
	}: { name: string; value?: string; label?: string } = $props();

	// Komponen di-remount lewat {#key} saat target edit berganti, jadi cukup
	// menangkap nilai awal di sini (untrack agar tidak ada peringatan reaktif).
	let path = $state(untrack(() => value));
	let uploading = $state(false);
	let err = $state('');
	let fileInput: HTMLInputElement;

	async function onPick(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		err = '';
		uploading = true;
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.message || 'Gagal mengunggah.');
			path = body.path;
		} catch (e2) {
			err = e2 instanceof Error ? e2.message : 'Gagal mengunggah.';
		} finally {
			uploading = false;
			input.value = '';
		}
	}

	function clear() {
		path = '';
	}
</script>

<div class="iu">
	<span class="iu-label">{label}</span>
	<input type="hidden" {name} value={path} />

	<div class="iu-row">
		<div class="iu-preview" class:filled={!!path}>
			{#if uploading}
				<span class="iu-spinner"></span>
			{:else if path}
				<img src={path} alt="" />
			{:else}
				<span class="iu-ph">Belum ada gambar</span>
			{/if}
		</div>
		<div class="iu-actions">
			<button type="button" class="iu-btn" onclick={() => fileInput.click()} disabled={uploading}>
				{#if uploading}<span class="iu-btn-spinner"></span>{/if}
				{uploading ? 'Mengunggah…' : path ? 'Ganti' : 'Unggah'}
			</button>
			{#if path}
				<button type="button" class="iu-btn iu-btn-del" onclick={clear}>Hapus</button>
			{/if}
			<input
				bind:this={fileInput}
				type="file"
				accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
				onchange={onPick}
				hidden
			/>
		</div>
	</div>
	{#if err}<div class="iu-err">{err}</div>{/if}
	{#if path}<div class="iu-path">{path}</div>{/if}
</div>

<style>
	.iu {
		display: flex;
		flex-direction: column;
	}
	.iu-label {
		font-size: 12px;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: #9aa3b5;
		margin-bottom: 8px;
		font-weight: 600;
	}
	.iu-row {
		display: flex;
		gap: 14px;
		align-items: center;
	}
	.iu-preview {
		width: 96px;
		height: 68px;
		border-radius: 8px;
		border: 1px dashed #d6dae2;
		background: #f7f8fa;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		flex: none;
	}
	.iu-preview.filled {
		border-style: solid;
	}
	.iu-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.iu-ph {
		font-size: 11px;
		color: #aab2c0;
		text-align: center;
		padding: 4px;
	}
	.iu-actions {
		display: flex;
		gap: 8px;
	}
	.iu-btn {
		background: #fff;
		border: 1px solid #e2e5ec;
		color: #475066;
		border-radius: 8px;
		padding: 9px 16px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}
	.iu-btn:hover {
		border-color: #d4af37;
		color: #0a1f44;
	}
	.iu-btn:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.iu-btn-del {
		border-color: #f1c5bf;
		color: #b3261e;
	}
	.iu-btn-del:hover {
		background: #fdecea;
		border-color: #f1c5bf;
		color: #b3261e;
	}
	.iu-err {
		color: #b3261e;
		font-size: 12.5px;
		margin-top: 8px;
	}
	.iu-path {
		font-size: 11.5px;
		color: #9aa3b5;
		margin-top: 8px;
		word-break: break-all;
	}

	.iu-spinner {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: 2.5px solid #e2e5ec;
		border-top-color: #d4af37;
		animation: iu-spin 0.7s linear infinite;
	}
	.iu-btn-spinner {
		display: inline-block;
		width: 12px;
		height: 12px;
		margin-right: 6px;
		vertical-align: -1px;
		border-radius: 50%;
		border: 2px solid #d4d8e0;
		border-top-color: #475066;
		animation: iu-spin 0.7s linear infinite;
	}
	@keyframes iu-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
