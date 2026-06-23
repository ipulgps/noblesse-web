<script lang="ts">
	// Placeholder image frame — recreates the prototype's <image-slot> empty
	// state. Pass `src` (and optional `alt`) once real photography is available;
	// until then it shows a captioned placeholder.
	let {
		src = '',
		alt = '',
		caption = 'Foto',
		height = '300px',
		width = '100%',
		radius = 0,
		circle = false,
		fit = 'cover',
		class: cls = ''
	}: {
		src?: string;
		alt?: string;
		caption?: string;
		height?: string;
		width?: string;
		radius?: number;
		circle?: boolean;
		fit?: 'cover' | 'contain' | 'fill';
		class?: string;
	} = $props();

	const borderRadius = $derived(circle ? '50%' : `${radius}px`);
</script>

<div
	class="nb-slot {cls}"
	style="width:{width};height:{height};border-radius:{borderRadius};"
>
	{#if src}
		<img {src} {alt} style="object-fit:{fit};" />
	{:else}
		<div class="nb-slot-empty">
			<svg
				width="28"
				height="28"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.6"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<rect x="3" y="3" width="18" height="18" rx="2" />
				<circle cx="8.5" cy="8.5" r="1.5" />
				<path d="m21 15-5-5L5 21" />
			</svg>
			<span>{caption}</span>
		</div>
	{/if}
</div>

<style>
	.nb-slot {
		position: relative;
		display: block;
		overflow: hidden;
		background: linear-gradient(135deg, #0f254f, #08152e);
	}
	.nb-slot img {
		width: 100%;
		height: 100%;
		display: block;
	}
	.nb-slot-empty {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		text-align: center;
		padding: 12px;
		color: rgba(212, 175, 55, 0.55);
		font-size: 13px;
		letter-spacing: 0.04em;
	}
</style>
