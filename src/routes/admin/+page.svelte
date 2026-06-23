<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	// ---- KPI ----
	const kpis = $derived([
		{
			value: data.stats.totalLeads.toLocaleString('id-ID'),
			label: 'Total Prospek',
			icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87'
		},
		{
			value: data.stats.closingLeads.toLocaleString('id-ID'),
			label: 'Prospek Closing',
			icon: 'M3 11l9-7 9 7M5 10v10h14V10'
		},
		{
			value: data.stats.totalProjects.toLocaleString('id-ID'),
			label: 'Proyek Aktif',
			icon: 'M3 21h18M5 21V7l5-4 5 4v14M9 9h2M9 13h2M9 17h2'
		},
		{
			value: data.stats.totalHouseTypes.toLocaleString('id-ID'),
			label: 'Tipe Hunian',
			icon: 'M3 3v18h18M7 14l3-3 3 3 5-6'
		}
	]);

	// ---- Grafik area (prospek 12 bulan) ----
	const W = 760,
		top = 24,
		bot = 232,
		padX = 14;
	const chart = $derived.by(() => {
		const vals = data.series.map((p) => p.value);
		const max = Math.max(1, ...vals) * 1.15;
		const xs = vals.map((_, i) => padX + (i * (W - 2 * padX)) / (vals.length - 1));
		const ys = vals.map((v) => bot - (v / max) * (bot - top));
		let line = `M ${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;
		for (let i = 0; i < vals.length - 1; i++) {
			const mx = ((xs[i] + xs[i + 1]) / 2).toFixed(1);
			line += ` C ${mx} ${ys[i].toFixed(1)} ${mx} ${ys[i + 1].toFixed(1)} ${xs[i + 1].toFixed(1)} ${ys[i + 1].toFixed(1)}`;
		}
		const area = `${line} L ${xs[xs.length - 1].toFixed(1)} 280 L ${xs[0].toFixed(1)} 280 Z`;
		const dots = xs.map((x, i) => ({ x: x.toFixed(1), y: ys[i].toFixed(1) }));
		return { line, area, dots };
	});
	const seriesTotal = $derived(data.series.reduce((a, b) => a + b.value, 0));

	// ---- Donut distribusi status ----
	const C = 2 * Math.PI * 70;
	const statusMeta = [
		{ key: 'baru', label: 'Baru', color: '#D4AF37' },
		{ key: 'dihubungi', label: 'Dihubungi', color: '#2A4A86' },
		{ key: 'closing', label: 'Closing', color: '#1F8A5B' },
		{ key: 'batal', label: 'Batal', color: '#E7C76A' }
	] as const;
	const donut = $derived.by(() => {
		const total = statusMeta.reduce((a, m) => a + (data.statusDist[m.key] ?? 0), 0);
		let cum = 0;
		const segs = statusMeta.map((m) => {
			const v = data.statusDist[m.key] ?? 0;
			const p = total ? v / total : 0;
			const len = p * C;
			const offset = -cum * C;
			cum += p;
			return {
				...m,
				value: v,
				pct: Math.round(p * 100),
				dash: `${len.toFixed(1)} ${(C - len).toFixed(1)}`,
				offset: offset.toFixed(1)
			};
		});
		return { segs, total };
	});

	// ---- helpers ----
	const initials = (name: string) =>
		name
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('');
	const fmtDate = (d: string | Date) =>
		new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
	const statusStyle: Record<string, string> = {
		baru: 'color:#9c7a1e;background:rgba(212,175,55,.16);',
		dihubungi: 'color:#2A6FDB;background:rgba(42,111,219,.1);',
		closing: 'color:#1F8A5B;background:rgba(31,138,91,.1);',
		batal: 'color:#7A4FC0;background:rgba(122,79,192,.1);'
	};
</script>

<svelte:head><title>Dashboard — Noblesse Admin</title></svelte:head>

<!-- page head -->
<div style="display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:28px;">
	<div>
		<div style="font-size:12px;letter-spacing:.06em;color:#8a93a7;margin-bottom:6px;">Beranda · Ringkasan</div>
		<h1 style="font-family:'Playfair Display',serif;font-weight:800;font-size:clamp(26px,3.4vw,38px);color:var(--nb-navy);margin:0;">Dashboard</h1>
	</div>
	<div style="display:flex;gap:10px;align-items:center;">
		<a href="/admin/leads" class="adm-btn adm-btn-ghost">Lihat Prospek</a>
		<a href="/admin/projects" class="adm-btn adm-btn-gold">+ Tambah Proyek</a>
	</div>
</div>

<!-- KPI cards -->
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;margin-bottom:20px;">
	{#each kpis as k}
		<div style="background:#fff;border:1px solid #e7e9ef;border-radius:14px;padding:22px 24px;">
			<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
				<span style="width:42px;height:42px;border-radius:11px;background:rgba(212,175,55,.12);display:flex;align-items:center;justify-content:center;">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--nb-accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d={k.icon} /></svg>
				</span>
			</div>
			<div style="font-family:'Playfair Display',serif;font-weight:800;font-size:34px;color:var(--nb-navy);line-height:1;">{k.value}</div>
			<div style="color:#8a93a7;font-size:13.5px;margin-top:8px;">{k.label}</div>
		</div>
	{/each}
</div>

<!-- chart row -->
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px;margin-bottom:20px;">
	<!-- area chart -->
	<div style="grid-column:span 2;min-width:320px;background:#fff;border:1px solid #e7e9ef;border-radius:14px;padding:26px 28px;">
		<div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:8px;">
			<div>
				<h3 style="font-size:17px;font-weight:700;color:var(--nb-navy);margin:0 0 4px;">Prospek Masuk · 12 Bulan</h3>
				<div style="font-family:'Playfair Display',serif;font-weight:800;font-size:30px;color:var(--nb-navy);">{seriesTotal.toLocaleString('id-ID')} <span style="font-family:Inter;font-size:13px;font-weight:600;color:#8a93a7;">total</span></div>
			</div>
		</div>
		<div style="position:relative;width:100%;">
			<svg viewBox="0 0 760 280" preserveAspectRatio="none" style="width:100%;height:260px;display:block;">
				<defs>
					<linearGradient id="nbArea" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color="var(--nb-accent)" stop-opacity="0.28" />
						<stop offset="100%" stop-color="var(--nb-accent)" stop-opacity="0" />
					</linearGradient>
				</defs>
				<line x1="14" y1="76" x2="746" y2="76" stroke="#eceef3" stroke-width="1" />
				<line x1="14" y1="128" x2="746" y2="128" stroke="#eceef3" stroke-width="1" />
				<line x1="14" y1="180" x2="746" y2="180" stroke="#eceef3" stroke-width="1" />
				<line x1="14" y1="232" x2="746" y2="232" stroke="#eceef3" stroke-width="1" />
				<path d={chart.area} fill="url(#nbArea)"></path>
				<path d={chart.line} fill="none" stroke="var(--nb-accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
				{#each chart.dots as d}
					<circle cx={d.x} cy={d.y} r="3.5" fill="#fff" stroke="var(--nb-accent)" stroke-width="2"></circle>
				{/each}
			</svg>
			<div style="display:flex;justify-content:space-between;margin-top:6px;padding:0 6px;">
				{#each data.series as p}
					<span style="font-size:11px;color:#9aa3b5;">{p.label}</span>
				{/each}
			</div>
		</div>
	</div>

	<!-- donut: distribusi status -->
	<div style="background:#fff;border:1px solid #e7e9ef;border-radius:14px;padding:26px 28px;display:flex;flex-direction:column;">
		<h3 style="font-size:17px;font-weight:700;color:var(--nb-navy);margin:0 0 4px;">Distribusi Prospek</h3>
		<div style="font-size:13px;color:#8a93a7;margin-bottom:18px;">Per status</div>
		<div style="position:relative;align-self:center;width:180px;height:180px;margin:6px 0 22px;">
			<svg viewBox="0 0 180 180" style="width:180px;height:180px;transform:rotate(-90deg);">
				<circle cx="90" cy="90" r="70" fill="none" stroke="#f0f1f5" stroke-width="22"></circle>
				{#each donut.segs as seg}
					<circle cx="90" cy="90" r="70" fill="none" stroke={seg.color} stroke-width="22" stroke-dasharray={seg.dash} stroke-dashoffset={seg.offset}></circle>
				{/each}
			</svg>
			<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
				<div style="font-family:'Playfair Display',serif;font-weight:800;font-size:30px;color:var(--nb-navy);line-height:1;">{donut.total}</div>
				<div style="font-size:11.5px;color:#8a93a7;">Total Prospek</div>
			</div>
		</div>
		<div style="display:flex;flex-direction:column;gap:13px;">
			{#each donut.segs as seg}
				<div style="display:flex;align-items:center;gap:10px;">
					<span style="width:11px;height:11px;border-radius:3px;background:{seg.color};"></span>
					<span style="font-size:13.5px;color:#475066;flex:1;">{seg.label}</span>
					<span style="font-size:13.5px;font-weight:700;color:var(--nb-navy);">{seg.value} · {seg.pct}%</span>
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- bottom row -->
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px;">
	<!-- recent leads -->
	<div style="grid-column:span 2;min-width:320px;background:#fff;border:1px solid #e7e9ef;border-radius:14px;padding:26px 28px;">
		<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
			<h3 style="font-size:17px;font-weight:700;color:var(--nb-navy);margin:0;">Prospek Terbaru</h3>
			<a href="/admin/leads" style="font-size:13px;font-weight:600;color:var(--nb-accent);">Lihat Semua →</a>
		</div>
		{#if data.recentLeads.length === 0}
			<div style="padding:32px;text-align:center;color:#9aa3b5;font-size:14px;">Belum ada prospek masuk.</div>
		{:else}
			<div style="overflow-x:auto;">
				<table style="width:100%;border-collapse:collapse;min-width:520px;">
					<thead>
						<tr style="text-align:left;">
							{#each ['Nama', 'Tipe Diminati', 'WhatsApp', 'Status', 'Tanggal'] as h}
								<th style="padding:10px 12px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#9aa3b5;font-weight:600;border-bottom:1px solid #eceef3;">{h}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each data.recentLeads as l (l.id)}
							<tr>
								<td style="padding:14px 12px;border-bottom:1px solid #f3f4f7;">
									<div style="display:flex;align-items:center;gap:10px;">
										<span style="width:34px;height:34px;border-radius:50%;background:rgba(212,175,55,.16);color:#9c7a1e;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;flex:none;">{initials(l.name)}</span>
										<div style="font-size:14px;font-weight:600;color:var(--nb-navy);">{l.name}</div>
									</div>
								</td>
								<td style="padding:14px 12px;border-bottom:1px solid #f3f4f7;font-size:13.5px;color:#475066;">{l.interestedType ?? '—'}</td>
								<td style="padding:14px 12px;border-bottom:1px solid #f3f4f7;font-size:13.5px;color:#475066;">{l.whatsapp}</td>
								<td style="padding:14px 12px;border-bottom:1px solid #f3f4f7;">
									<span style="font-size:12px;font-weight:600;padding:5px 11px;border-radius:20px;{statusStyle[l.status]}">{l.status}</span>
								</td>
								<td style="padding:14px 12px;border-bottom:1px solid #f3f4f7;font-size:13px;color:#8a93a7;">{fmtDate(l.createdAt)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- status breakdown / pintasan -->
	<div style="background:#fff;border:1px solid #e7e9ef;border-radius:14px;padding:26px 28px;">
		<h3 style="font-size:17px;font-weight:700;color:var(--nb-navy);margin:0 0 4px;">Ringkasan Prospek</h3>
		<div style="font-size:13px;color:#8a93a7;margin-bottom:24px;">Berdasarkan status</div>
		<div style="display:flex;flex-direction:column;gap:22px;">
			{#each donut.segs as seg}
				<div>
					<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:9px;">
						<span style="font-size:14px;font-weight:600;color:var(--nb-navy);">{seg.label}</span>
						<span style="font-size:13px;color:#8a93a7;"><b style="color:var(--nb-navy);">{seg.value}</b> / {donut.total}</span>
					</div>
					<div style="height:8px;border-radius:6px;background:#f0f1f5;overflow:hidden;">
						<div style="width:{seg.pct}%;height:100%;border-radius:6px;background:{seg.color};"></div>
					</div>
				</div>
			{/each}
			<div style="margin-top:6px;padding:18px;border-radius:11px;background:linear-gradient(155deg,#0A1F44,#08152E);color:#fff;">
				<div style="font-size:12.5px;color:#8b97b3;margin-bottom:5px;">Prospek Baru Belum Ditindak</div>
				<div style="font-family:'Playfair Display',serif;font-weight:800;font-size:28px;">{data.stats.newLeads} Prospek</div>
				<div style="font-size:12px;color:var(--nb-accent-l);margin-top:4px;">dari {data.stats.totalLeads} total prospek</div>
			</div>
		</div>
	</div>
</div>
