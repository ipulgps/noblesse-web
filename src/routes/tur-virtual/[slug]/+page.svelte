<script lang="ts">
	import VirtualTour from '$lib/components/VirtualTour.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Kalau field "lokasi" proyek kebetulan sama persis dengan namanya (data belum
	// diisi area/alamat sebenarnya), jangan diulang di judul ("Rajendra Hills ·
	// Rajendra Hills") — cukup tampilkan nama proyek saja.
	const houseName = $derived(
		data.project.location && data.project.location !== data.project.name
			? `${data.project.name} · ${data.project.location}`
			: data.project.name
	);
</script>

<svelte:head>
	<title>Tur Virtual 360° — {data.project.name} | Noblesse Property</title>
	<meta
		name="description"
		content={`Jelajahi ${data.project.name} lewat Tur VR Interior dan Streetview 360° menuju lokasi.`}
	/>
</svelte:head>

<main style="position:relative;min-height:100vh;background:#08152E;overflow:hidden;">
	<!-- Latar dekoratif — sama nuansa dengan hero beranda: radial glow keemasan +
	     grid halus, supaya halaman tur terasa satu sistem desain dengan homepage. -->
	<div
		style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 70% at 50% -10%, rgba(212,175,55,.16), transparent 55%), radial-gradient(80% 60% at 88% 100%, rgba(38,68,134,.5), transparent 60%), linear-gradient(180deg,#0A1F44 0%,#08152E 55%,#060e22 100%);"
	></div>
	<div
		style="position:absolute;inset:0;pointer-events:none;opacity:.45;background-image:linear-gradient(rgba(212,175,55,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,.05) 1px,transparent 1px);background-size:64px 64px;-webkit-mask-image:radial-gradient(circle at 50% 0%,#000,transparent 65%);mask-image:radial-gradient(circle at 50% 0%,#000,transparent 65%);"
	></div>

	<div style="position:relative;z-index:1;padding:clamp(90px,10vw,120px) clamp(20px,5vw,56px) clamp(60px,8vw,100px);">
		<div style="max-width:1200px;margin:0 auto;">
			<!-- Breadcrumb halus ke Beranda — menggantikan "Kembali ke Daftar Proyek"
			     (halaman daftar itu sudah dihapus dari alur, tur ini satu-satunya tujuan). -->
			<div style="display:flex;align-items:center;gap:10px;margin-bottom:40px;">
				<a href="/" class="breadcrumb-home">Beranda</a>
				<span style="color:#3d4864;font-size:12px;">/</span>
				<span style="color:#D4AF37;font-size:13px;font-weight:600;">Tur Virtual 360°</span>
			</div>

			<VirtualTour
				{houseName}
				vrNodes={data.vrNodes}
				streetNodes={data.streetNodes}
				floorPlanImage={data.floorPlanImage}
				glbSrc={data.glbSrc}
				envImage={data.envImage}
				otherProjects={data.otherProjects}
				currentSlug={data.project.slug}
			/>
		</div>
	</div>
</main>

<style>
	.breadcrumb-home {
		color: #8b97b3;
		font-size: 13px;
		font-weight: 500;
		text-decoration: none;
		transition: color 0.25s;
	}
	.breadcrumb-home:hover {
		color: #d4af37;
	}
</style>
