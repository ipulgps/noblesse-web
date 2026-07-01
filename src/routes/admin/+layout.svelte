<script lang="ts">
	import { page } from '$app/state';
	import '$lib/admin-ui.css';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const isLogin = $derived(page.url.pathname === '/admin/login');

	const nav = [
		{ href: '/admin', label: 'Dashboard' },
		{ href: '/admin/projects', label: 'Proyek' },
		{ href: '/admin/house-types', label: 'Tipe / Denah' },
		{ href: '/admin/gallery', label: 'Galeri' },
		{ href: '/admin/facilities', label: 'Fasilitas' },
		{ href: '/admin/locations', label: 'Lokasi' },
		{ href: '/admin/testimonials', label: 'Testimoni' },
		{ href: '/admin/stats', label: 'Statistik' },
		{ href: '/admin/voucher-templates', label: 'Template Voucher' },
		{ href: '/admin/vouchers', label: 'Voucher' },
		{ href: '/admin/leads', label: 'Prospek' },
		{ href: '/admin/settings', label: 'Pengaturan' }
	];

	const isActive = (href: string) =>
		href === '/admin' ? page.url.pathname === '/admin' : page.url.pathname.startsWith(href);
</script>

{#if isLogin}
	{@render children()}
{:else}
	<div class="shell">
		<aside>
			<div class="brand">
				<img src="/uploads/logo_light.png" alt="Noblesse" />
			</div>
			<nav>
				{#each nav as item}
					<a href={item.href} class:active={isActive(item.href)}>{item.label}</a>
				{/each}
			</nav>
		</aside>
		<div class="main">
			<header>
				<div class="who">
					{#if data.user}
						<span class="name">{data.user.name}</span>
						<span class="role">{data.user.role}</span>
					{/if}
				</div>
				<form method="POST" action="/admin/logout">
					<button type="submit">Keluar</button>
				</form>
			</header>
			<main>
				{@render children()}
			</main>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		background: #f5f6f9;
		margin: 0;
	}
	.shell {
		display: flex;
		min-height: 100vh;
		font-family: 'Inter', system-ui, sans-serif;
	}
	aside {
		width: 248px;
		flex: none;
		background: #0a1f44;
		color: #9aa6bd;
		display: flex;
		flex-direction: column;
		position: sticky;
		top: 0;
		height: 100vh;
	}
	.brand {
		padding: 24px 22px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
	}
	.brand img {
		height: 38px;
		width: auto;
	}
	nav {
		display: flex;
		flex-direction: column;
		padding: 16px 14px;
		gap: 3px;
	}
	nav a {
		display: block;
		padding: 12px 14px;
		border-radius: 10px;
		font-size: 14px;
		font-weight: 500;
		color: #9aa6bd;
		text-decoration: none;
		transition: all 0.2s;
	}
	nav a:hover {
		background: rgba(255, 255, 255, 0.05);
		color: #e8edf6;
	}
	nav a.active {
		background: rgba(212, 175, 55, 0.13);
		color: #e7c76a;
		box-shadow: inset 3px 0 0 #d4af37;
	}
	.main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	header {
		height: 64px;
		background: #fff;
		border-bottom: 1px solid #eceef3;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 28px;
	}
	.who {
		display: flex;
		align-items: baseline;
		gap: 10px;
	}
	.who .name {
		font-weight: 600;
		color: #0a1f44;
		font-size: 14.5px;
	}
	.who .role {
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #9aa3b5;
	}
	header button {
		background: #fff;
		border: 1px solid #e2e5ec;
		color: #475066;
		border-radius: 8px;
		padding: 9px 18px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}
	header button:hover {
		border-color: #d4af37;
		color: #0a1f44;
	}
	main {
		padding: 32px 28px;
	}
</style>
