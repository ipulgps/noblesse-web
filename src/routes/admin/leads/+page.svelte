<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const statuses = ['baru', 'dihubungi', 'closing', 'batal'];
	const statusColor: Record<string, string> = {
		baru: 'background:#fff4e0;color:#9a6b00;',
		dihubungi: 'background:#e3f0ff;color:#1c4f99;',
		closing: 'background:#e7f6ec;color:#1a7f43;',
		batal: 'background:#f0f1f4;color:#8a93a7;'
	};
	const fmtDate = (d: string | Date) =>
		new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
	const initials = (name: string) =>
		name
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('');
</script>

<svelte:head><title>Prospek — Noblesse Admin</title></svelte:head>

<div class="adm-head">
	<div>
		<h1 class="adm-title">Prospek</h1>
		<p class="adm-sub">Kiriman dari form kontak website. Total: {data.leads.length}.</p>
	</div>
</div>

<div class="adm-card">
	{#if data.leads.length === 0}
		<div class="adm-empty">Belum ada prospek masuk.</div>
	{:else}
		<table class="adm-table">
			<thead>
				<tr><th>Nama</th><th>WhatsApp</th><th>Tipe Diminati</th><th>Pesan</th><th>Masuk</th><th>Status</th><th style="width:1%;">Aksi</th></tr>
			</thead>
			<tbody>
				{#each data.leads as l (l.id)}
					<tr>
						<td>
							<div style="display:flex;align-items:center;gap:10px;">
								<span class="adm-mono">{initials(l.name)}</span>
								<span style="font-weight:600;color:#0a1f44;">{l.name}</span>
							</div>
						</td>
						<td><a href={'https://wa.me/' + l.whatsapp.replace(/\D/g, '')} target="_blank" rel="noopener" style="color:#1c7c4a;">{l.whatsapp}</a></td>
						<td>{l.interestedType ?? '—'}</td>
						<td style="max-width:260px;color:#475066;">{l.message ?? '—'}</td>
						<td style="white-space:nowrap;color:#7a8499;font-size:13px;">{fmtDate(l.createdAt)}</td>
						<td>
							<form method="POST" action="?/setStatus" use:enhance>
								<input type="hidden" name="id" value={l.id} />
								<select name="status" onchange={(e) => e.currentTarget.form?.requestSubmit()} style="padding:7px 10px;border:1px solid #e2e5ec;border-radius:8px;font-size:12.5px;{statusColor[l.status]}">
									{#each statuses as st}
										<option value={st} selected={st === l.status}>{st}</option>
									{/each}
								</select>
							</form>
						</td>
						<td>
							<form method="POST" action="?/delete" use:enhance onsubmit={(e) => { if (!confirm(`Hapus prospek “${l.name}”?`)) e.preventDefault(); }}>
								<input type="hidden" name="id" value={l.id} />
								<button class="adm-btn adm-btn-danger adm-btn-sm" type="submit">Hapus</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
