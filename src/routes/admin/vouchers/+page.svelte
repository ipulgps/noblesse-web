<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const statuses = ['belum_aktivasi', 'aktif', 'tidak_aktif', 'sudah_digunakan'] as const;
	const statusLabel: Record<string, string> = {
		belum_aktivasi: 'Belum Aktivasi',
		aktif: 'Aktif',
		tidak_aktif: 'Tidak Aktif',
		sudah_digunakan: 'Sudah Digunakan'
	};
	const statusColor: Record<string, string> = {
		belum_aktivasi: 'background:#fff4e0;color:#9a6b00;',
		aktif: 'background:#e7f6ec;color:#1a7f43;',
		tidak_aktif: 'background:#f0f1f4;color:#8a93a7;',
		sudah_digunakan: 'background:#e3f0ff;color:#1c4f99;'
	};
	const fmtDate = (d: string | Date | null) =>
		d ? new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

	let creating = $state(false);
	let templateId = $state(untrack(() => data.templates[0]?.id ?? 0));
	let count = $state(1);
</script>

<svelte:head><title>Voucher — Noblesse Admin</title></svelte:head>

<div class="adm-head">
	<div>
		<h1 class="adm-title">Voucher</h1>
		<p class="adm-sub">Kelola kode voucher digital. Total: {data.vouchers.length}.</p>
	</div>
	{#if data.templates.length > 0}
		<button class="adm-btn adm-btn-gold" onclick={() => (creating = true)}>+ Generate Voucher</button>
	{/if}
</div>

{#if data.templates.length === 0}
	<div class="adm-card" style="padding:24px;margin-bottom:24px;">
		<p class="adm-sub" style="margin:0;">
			Belum ada template voucher aktif. Buat dulu di menu <a href="/admin/voucher-templates">Template Voucher</a>.
		</p>
	</div>
{/if}

{#if creating}
	<div class="adm-card" style="padding:28px;margin-bottom:24px;">
		<h2 style="font-family:'Playfair Display',serif;font-size:21px;color:#0a1f44;margin:0 0 20px;">
			Generate Voucher
		</h2>
		<form
			method="POST"
			action="?/create"
			use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') creating = false;
				};
			}}
			class="adm-form"
		>
			{#if form?.error}<div class="adm-err">{form.error}</div>{/if}
			<div class="adm-field">
				<label for="v-template">Template</label>
				<select id="v-template" name="templateId" bind:value={templateId}>
					{#each data.templates as t (t.id)}
						<option value={t.id}>{t.name}</option>
					{/each}
				</select>
			</div>
			<div class="adm-field">
				<label for="v-count">Jumlah Kode</label>
				<input id="v-count" name="count" type="number" min="1" max="100" bind:value={count} />
			</div>
			<div class="adm-form-actions">
				<button type="submit" class="adm-btn adm-btn-gold">Generate</button>
				<button type="button" class="adm-btn adm-btn-ghost" onclick={() => (creating = false)}
					>Batal</button
				>
			</div>
		</form>
	</div>
{/if}

<div class="adm-card">
	{#if data.vouchers.length === 0}
		<div class="adm-empty">Belum ada voucher.</div>
	{:else}
		<table class="adm-table">
			<thead>
				<tr
					><th>Kode</th><th>Template</th><th>Diklaim</th><th>Dibuat</th><th>Status</th><th
						style="width:1%;">Aksi</th
					></tr
				>
			</thead>
			<tbody>
				{#each data.vouchers as v (v.id)}
					<tr>
						<td><span style="font-family:monospace;font-size:13.5px;letter-spacing:.03em;color:#0a1f44;font-weight:600;white-space:nowrap;">{v.code}</span></td>
						<td>{v.templateName}</td>
						<td style="white-space:nowrap;color:#7a8499;font-size:13px;">{fmtDate(v.claimedAt)}</td>
						<td style="white-space:nowrap;color:#7a8499;font-size:13px;">{fmtDate(v.createdAt)}</td>
						<td>
							<form method="POST" action="?/setStatus" use:enhance>
								<input type="hidden" name="id" value={v.id} />
								<select
									name="status"
									onchange={(e) => e.currentTarget.form?.requestSubmit()}
									style="padding:7px 10px;border:1px solid #e2e5ec;border-radius:8px;font-size:12.5px;{statusColor[
										v.status
									]}"
								>
									{#each statuses as st}
										<option value={st} selected={st === v.status}>{statusLabel[st]}</option>
									{/each}
								</select>
							</form>
						</td>
						<td>
							<form
								method="POST"
								action="?/delete"
								use:enhance
								onsubmit={(e) => {
									if (!confirm(`Hapus voucher “${v.code}”?`)) e.preventDefault();
								}}
							>
								<input type="hidden" name="id" value={v.id} />
								<button class="adm-btn adm-btn-danger adm-btn-sm" type="submit">Hapus</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
