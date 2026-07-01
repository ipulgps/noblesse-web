<script lang="ts">
	import { page } from '$app/state';

	const status = $derived(page.status);
	const message = $derived(
		status === 404 ? 'Halaman yang Anda cari tidak ditemukan.' : (page.error?.message ?? 'Terjadi kesalahan.')
	);
</script>

<svelte:head>
	<title>{status} — Noblesse Property</title>
</svelte:head>

<section class="nb-err">
	<div class="nb-err-bg"></div>
	<div class="nb-err-content">
		<div class="nb-err-kicker">
			<span class="ln"></span>
			<span class="lbl">NOBLESSE&nbsp;PROPERTY</span>
			<span class="ln"></span>
		</div>
		<div class="nb-err-code">{status}</div>
		<p class="nb-err-msg">{message}</p>
		<a href="/" class="nb-err-btn">Kembali ke Beranda</a>
	</div>
</section>

<style>
	.nb-err {
		position: relative;
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		background: #08152e;
		text-align: center;
		padding: 40px 24px;
	}
	.nb-err-bg {
		position: absolute;
		inset: -8% 0 0 0;
		background:
			radial-gradient(120% 95% at 50% -12%, rgba(212, 175, 55, 0.18), transparent 52%),
			radial-gradient(85% 65% at 82% 116%, rgba(38, 68, 134, 0.55), transparent 60%),
			linear-gradient(180deg, #0a1f44 0%, #08152e 58%, #060e22 100%);
	}
	.nb-err-content {
		position: relative;
		max-width: 560px;
	}
	.nb-err-kicker {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 14px;
		margin-bottom: 28px;
	}
	.ln {
		width: 38px;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--nb-accent));
	}
	.nb-err-kicker .ln:last-child {
		background: linear-gradient(90deg, var(--nb-accent), transparent);
	}
	.lbl {
		font-family: 'Cinzel', serif;
		font-size: 13px;
		letter-spacing: 0.42em;
		color: var(--nb-accent);
		font-weight: 600;
	}
	.nb-err-code {
		font-family: var(--nb-head);
		font-weight: 800;
		font-size: clamp(72px, 14vw, 160px);
		line-height: 1;
		letter-spacing: -0.02em;
		background: linear-gradient(120deg, var(--nb-accent-l), var(--nb-accent), var(--nb-accent-l));
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		margin: 0 0 18px;
	}
	.nb-err-msg {
		font-size: clamp(15px, 2vw, 18px);
		color: rgba(255, 255, 255, 0.78);
		margin: 0 0 40px;
		line-height: 1.6;
	}
	.nb-err-btn {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 18px 40px;
		background: linear-gradient(135deg, var(--nb-accent-l), var(--nb-accent));
		color: #08152e;
		border-radius: 2px;
		font-size: 13.5px;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		transition: all 0.4s ease;
		box-shadow: 0 14px 40px rgba(212, 175, 55, 0.32);
	}
	.nb-err-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 18px 46px rgba(212, 175, 55, 0.42);
	}
</style>
