<script lang="ts" module>
	export type TourNodeLink = {
		nodeId: string;
		/** Posisi marker arah di panorama (radian). Jika kosong, PSV menghitung otomatis dari GPS. */
		position?: { yaw: number; pitch: number };
	};

	export type TourNode = {
		id: string;
		/** Path panorama equirectangular 2:1, contoh: /images/tours/teras.jpg */
		panorama: string;
		name: string;
		/** Area luar atau dalam properti, dipakai untuk styling marker berbeda */
		kind?: 'outdoor' | 'indoor';
		links: TourNodeLink[];
		/** Rotasi awal kamera saat masuk ke node ini */
		sphereCorrection?: { pan?: number; tilt?: number; roll?: number };
		/**
		 * Posisi node di floor plan/minimap, dalam persen (0-100) relatif terhadap gambar floorPlan.
		 * Dipakai untuk minimap kustom, bukan koordinat GPS asli.
		 */
		mapPosition?: { x: number; y: number };
		/** Ukuran ruangan, contoh: "3.5m x 4m" atau "14 m²" */
		dimensions?: string;
		/** Catatan/keterangan tambahan tentang ruangan, contoh: "Menghadap taman" */
		note?: string;
	};

	export type PropertyTourProps = {
		nodes: TourNode[];
		startNodeId: string;
		/** Gambar floor plan/minimap keseluruhan properti (opsional) */
		floorPlan?: {
			image: string;
			alt?: string;
		};
		height?: string;
	};
</script>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Viewer } from '@photo-sphere-viewer/core';
	import { VirtualTourPlugin, type VirtualTourNode } from '@photo-sphere-viewer/virtual-tour-plugin';
	import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
	import '@photo-sphere-viewer/core/index.css';
	import '@photo-sphere-viewer/virtual-tour-plugin/index.css';
	import '@photo-sphere-viewer/markers-plugin/index.css';

	let { nodes, startNodeId, floorPlan, height = '600px' }: PropertyTourProps = $props();

	let container: HTMLDivElement;
	let viewer: Viewer | undefined;
	let currentNodeId = $state(startNodeId);

	const nodeById = $derived(new Map(nodes.map((n) => [n.id, n])));
	const currentNode = $derived(nodeById.get(currentNodeId));

	function toVirtualTourNodes(): VirtualTourNode[] {
		return nodes.map((node) => ({
			id: node.id,
			panorama: node.panorama,
			name: node.name,
			links: node.links.map((link) => ({
				nodeId: link.nodeId,
				position: link.position
			})),
			sphereCorrection: node.sphereCorrection,
			data: { kind: node.kind ?? 'indoor' }
		}));
	}

	onMount(() => {
		viewer = new Viewer({
			container,
			touchmoveTwoFingers: true,
			mousewheelCtrlKey: false,
			navbar: ['zoom', 'move', 'fullscreen'],
			plugins: [
				MarkersPlugin,
				[
					VirtualTourPlugin,
					{
						positionMode: 'manual',
						renderMode: '3d',
						nodes: toVirtualTourNodes(),
						startNodeId
					}
				]
			]
		});

		const virtualTour = viewer.getPlugin(VirtualTourPlugin) as VirtualTourPlugin;

		virtualTour.addEventListener('node-changed', (e) => {
			currentNodeId = e.node.id;
		});

		return () => {
			viewer?.destroy();
			viewer = undefined;
		};
	});

	onDestroy(() => {
		viewer?.destroy();
		viewer = undefined;
	});

	function goToNode(nodeId: string) {
		const virtualTour = viewer?.getPlugin(VirtualTourPlugin) as VirtualTourPlugin | undefined;
		virtualTour?.setCurrentNode(nodeId);
	}
</script>

<div class="tour-wrapper">
	<div bind:this={container} class="tour-viewer" style:height data-current-kind={nodeById.get(currentNodeId)?.kind ?? 'indoor'}></div>

	{#if currentNode && (currentNode.dimensions || currentNode.note)}
		<div class="room-info">
			<div class="room-info__label">Info Ruangan</div>
			<div class="room-info__name">{currentNode.name}</div>
			{#if currentNode.dimensions}
				<div class="room-info__dimensions">{currentNode.dimensions}</div>
			{/if}
			{#if currentNode.note}
				<div class="room-info__note">{currentNode.note}</div>
			{/if}
		</div>
	{/if}

	{#if floorPlan}
		<div class="floor-plan">
			<img src={floorPlan.image} alt={floorPlan.alt ?? 'Floor plan'} />
			{#each nodes as node (node.id)}
				{#if node.mapPosition}
					<button
						type="button"
						class="floor-plan__pin"
						class:floor-plan__pin--active={node.id === currentNodeId}
						class:floor-plan__pin--outdoor={node.kind === 'outdoor'}
						style:left="{node.mapPosition.x}%"
						style:top="{node.mapPosition.y}%"
						title={node.name}
						onclick={() => goToNode(node.id)}
					></button>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.tour-wrapper {
		position: relative;
		width: 100%;
	}

	.tour-viewer {
		width: 100%;
		border-radius: 0.75rem;
		overflow: hidden;
		background: #000;
	}

	.room-info {
		position: absolute;
		top: 1rem;
		left: 1rem;
		max-width: 240px;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		background: rgba(10, 15, 26, 0.72);
		backdrop-filter: blur(6px);
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: #fff;
		pointer-events: none;
	}

	.room-info__label {
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #d4af37;
		margin-bottom: 0.25rem;
	}

	.room-info__name {
		font-size: 1rem;
		font-weight: 700;
		line-height: 1.3;
	}

	.room-info__dimensions {
		margin-top: 0.25rem;
		font-size: 0.85rem;
		color: #e2e8f0;
	}

	.room-info__note {
		margin-top: 0.35rem;
		font-size: 0.78rem;
		line-height: 1.4;
		color: #b9c0cf;
	}

	.floor-plan {
		position: absolute;
		bottom: 1rem;
		right: 1rem;
		width: 180px;
		border-radius: 0.5rem;
		overflow: hidden;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
		border: 2px solid rgba(255, 255, 255, 0.8);
	}

	.floor-plan img {
		display: block;
		width: 100%;
		height: auto;
	}

	.floor-plan__pin {
		position: absolute;
		width: 12px;
		height: 12px;
		margin: -6px 0 0 -6px;
		border-radius: 50%;
		background: #60a5fa;
		border: 2px solid white;
		cursor: pointer;
		padding: 0;
	}

	.floor-plan__pin--outdoor {
		background: #4ade80;
	}

	.floor-plan__pin--active {
		width: 16px;
		height: 16px;
		margin: -8px 0 0 -8px;
		box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.4);
	}
</style>
