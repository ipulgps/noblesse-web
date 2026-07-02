<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const fmtDate = (d: string | Date | null | undefined) =>
		d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

	const fmtRupiah = (n: number | undefined) =>
		new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
			n ?? 0
		);
</script>

<svelte:head><title>Verifikasi Voucher — Noblesse Property</title></svelte:head>

<div
	style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F8F8F8;padding:24px;"
>
	<div
		style="max-width:460px;width:100%;background:#fff;border-radius:2px;padding:clamp(32px,5vw,48px);box-shadow:0 20px 60px rgba(0,0,0,.12);text-align:center;"
	>
		<div style="display:inline-flex;align-items:center;gap:14px;margin-bottom:20px;">
			<span style="width:34px;height:1px;background:var(--nb-accent);"></span>
			<span
				style="font-family:'Cinzel',serif;font-size:12px;letter-spacing:.34em;color:var(--nb-accent);font-weight:600;"
				>VERIFIKASI VOUCHER</span
			>
			<span style="width:34px;height:1px;background:var(--nb-accent);"></span>
		</div>

		{#if data.valid}
			<div
				style="display:inline-flex;align-items:center;gap:8px;background:#e7f6ec;color:#1a7f43;padding:8px 18px;border-radius:20px;font-size:13px;font-weight:700;letter-spacing:.04em;margin-bottom:28px;"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
					><path d="M20 6 9 17l-5-5" /></svg
				>
				Voucher Valid
			</div>

			<div style="display:flex;flex-direction:column;gap:20px;text-align:left;">
				<div>
					<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9aa3b5;margin-bottom:6px;">
						Kode Voucher
					</div>
					<div
						style="font-family:monospace;font-size:20px;font-weight:700;letter-spacing:.08em;color:var(--nb-navy);"
					>
						{data.code}
					</div>
				</div>
				<div>
					<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9aa3b5;margin-bottom:6px;">
						Nominal Voucher
					</div>
					<div style="font-size:20px;font-weight:700;color:var(--nb-accent);">
						{fmtRupiah(data.amount)}
					</div>
				</div>
				<div>
					<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9aa3b5;margin-bottom:6px;">
						Lokasi Penukaran
					</div>
					<div style="font-size:15px;color:var(--nb-navy);line-height:1.6;">
						{data.redeemLocation || '—'}
					</div>
				</div>
				<div>
					<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9aa3b5;margin-bottom:6px;">
						Berlaku Sampai
					</div>
					<div style="font-size:15px;color:var(--nb-navy);">{fmtDate(data.expiredAt)}</div>
				</div>
			</div>
		{:else}
			<div
				style="display:inline-flex;align-items:center;gap:8px;background:#fdecea;color:#b3261e;padding:8px 18px;border-radius:20px;font-size:13px;font-weight:700;letter-spacing:.04em;margin-bottom:20px;"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
					><path d="M18 6 6 18M6 6l12 12" /></svg
				>
				Voucher Tidak Valid
			</div>
			<p style="color:#7a8499;font-size:15px;line-height:1.7;margin:0;">
				Kode voucher tidak valid atau sudah kedaluwarsa. Silakan hubungi tim marketing Noblesse
				Property jika Anda merasa ini adalah kekeliruan.
			</p>
		{/if}
	</div>
</div>
