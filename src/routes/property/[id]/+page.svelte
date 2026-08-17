<script lang="ts">
	import PropertyTour360, { type TourNode } from '$lib/components/PropertyTour360.svelte';

	// Data dummy untuk pengujian. Ganti `panorama` dengan path foto 360 asli
	// (contoh: /images/tours/halaman-depan.jpg) dan sesuaikan `links`/`mapPosition`.
	const nodes: TourNode[] = [
		{
			id: 'gerbang',
			panorama: '/images/tours/halaman-depan.jpg',
			name: 'Gerbang Depan',
			kind: 'outdoor',
			mapPosition: { x: 50, y: 90 },
			links: [{ nodeId: 'halaman-depan', position: { yaw: 0, pitch: 0 } }]
		},
		{
			id: 'halaman-depan',
			panorama: '/images/tours/halaman-depan.jpg',
			name: 'Halaman Depan',
			kind: 'outdoor',
			mapPosition: { x: 50, y: 70 },
			links: [
				{ nodeId: 'gerbang', position: { yaw: 3.14, pitch: 0 } },
			]
		},
		// {
		// 	id: 'halaman-depan',
		// 	panorama: '/images/tours/halaman-depan.jpg',
		// 	name: 'Halaman Depan',
		// 	kind: 'outdoor',
		// 	mapPosition: { x: 50, y: 70 },
		// 	links: [
		// 		{ nodeId: 'gerbang', position: { yaw: 3.14, pitch: 0 } },
		// 		{ nodeId: 'teras', position: { yaw: 0, pitch: 0 } }
		// 	]
		// },
		// {
		// 	id: 'teras',
		// 	panorama: '/images/tours/teras.jpg',
		// 	name: 'Teras',
		// 	kind: 'outdoor',
		// 	mapPosition: { x: 50, y: 50 },
		// 	links: [
		// 		{ nodeId: 'halaman-depan', position: { yaw: 3.14, pitch: 0 } },
		// 		{ nodeId: 'ruang-tamu', position: { yaw: 0, pitch: 0 } }
		// 	]
		// },
		// {
		// 	id: 'ruang-tamu',
		// 	panorama: '/images/tours/ruang-tamu.jpg',
		// 	name: 'Ruang Tamu',
		// 	kind: 'indoor',
		// 	mapPosition: { x: 50, y: 30 },
		// 	links: [
		// 		{ nodeId: 'teras', position: { yaw: 3.14, pitch: 0 } },
		// 		{ nodeId: 'kamar-tidur', position: { yaw: 1.57, pitch: 0 } },
		// 		{ nodeId: 'dapur', position: { yaw: -1.57, pitch: 0 } }
		// 	]
		// },
		// {
		// 	id: 'kamar-tidur',
		// 	panorama: '/images/tours/kamar-tidur.jpg',
		// 	name: 'Kamar Tidur Utama',
		// 	kind: 'indoor',
		// 	mapPosition: { x: 70, y: 20 },
		// 	links: [{ nodeId: 'ruang-tamu', position: { yaw: -1.57, pitch: 0 } }]
		// },
		// {
		// 	id: 'dapur',
		// 	panorama: '/images/tours/dapur.jpg',
		// 	name: 'Dapur',
		// 	kind: 'indoor',
		// 	mapPosition: { x: 30, y: 20 },
		// 	links: [{ nodeId: 'ruang-tamu', position: { yaw: 1.57, pitch: 0 } }]
		// }
	];
</script>

<svelte:head>
	<title>Virtual Tour 360° - Properti</title>
</svelte:head>

<section class="tour-page">
	<h1>Virtual Tour 360°</h1>
	<p>Jelajahi area luar dan dalam properti ini secara interaktif.</p>

	<PropertyTour360
		{nodes}
		startNodeId="gerbang"
		floorPlan={{ image: '/images/tours/floor-plan.png', alt: 'Denah properti' }}
		height="70vh"
	/>
</section>

<style>
	.tour-page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 1.5rem;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 0.25rem;
	}

	p {
		color: #6b7280;
		margin-bottom: 1rem;
	}
</style>
