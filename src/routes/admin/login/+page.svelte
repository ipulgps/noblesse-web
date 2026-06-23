<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Masuk — Noblesse Admin</title>
</svelte:head>

<div class="wrap">
	<div class="card">
		<img src="/uploads/logo_noblesse.png" alt="Noblesse Property" class="logo" />
		<h1>Panel Admin</h1>
		<p class="sub">Masuk untuk mengelola konten website.</p>

		<form
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			{#if form?.error}
				<div class="err">{form.error}</div>
			{/if}
			<label for="email">Email</label>
			<input id="email" name="email" type="email" required value={form?.email ?? ''} placeholder="admin@noblesse.id" />

			<label for="password">Password</label>
			<input id="password" name="password" type="password" required placeholder="••••••••" />

			<button type="submit" disabled={submitting}>{submitting ? 'Memproses…' : 'Masuk'}</button>
		</form>
	</div>
</div>

<style>
	/* Latar navy hanya untuk wrapper login, bukan <body> global —
	   supaya tidak ikut menggelapkan halaman admin lain saat navigasi SPA. */
	.wrap {
		min-height: 100vh;
		background: #08152e;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		font-family: 'Inter', system-ui, sans-serif;
	}
	.card {
		width: 100%;
		max-width: 400px;
		background: #fff;
		border-radius: 4px;
		padding: 44px 38px;
		box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
		border-top: 3px solid #d4af37;
	}
	.logo {
		height: 54px;
		width: auto;
		display: block;
		margin: 0 auto 22px;
	}
	h1 {
		font-family: 'Playfair Display', Georgia, serif;
		font-weight: 800;
		font-size: 26px;
		color: #0a1f44;
		margin: 0 0 6px;
		text-align: center;
	}
	.sub {
		color: #7a8499;
		font-size: 14px;
		text-align: center;
		margin: 0 0 28px;
	}
	form {
		display: flex;
		flex-direction: column;
	}
	label {
		font-size: 12px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #9aa3b5;
		margin-bottom: 8px;
	}
	input {
		padding: 13px 15px;
		border: 1px solid #e2e0d9;
		border-radius: 2px;
		font-size: 15px;
		color: #0a1f44;
		outline: none;
		margin-bottom: 18px;
		transition: border-color 0.25s;
	}
	input:focus {
		border-color: #d4af37;
	}
	button {
		margin-top: 6px;
		padding: 15px;
		background: linear-gradient(135deg, #e7c76a, #d4af37);
		color: #08152e;
		border: none;
		border-radius: 2px;
		font-size: 13.5px;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		cursor: pointer;
		transition: opacity 0.25s;
	}
	button:disabled {
		opacity: 0.7;
		cursor: default;
	}
	.err {
		background: #fdecea;
		border: 1px solid #f5c2bd;
		color: #b3261e;
		font-size: 13.5px;
		border-radius: 2px;
		padding: 10px 14px;
		margin-bottom: 18px;
	}
</style>
