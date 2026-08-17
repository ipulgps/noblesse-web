<script lang="ts">
	import Model3DViewer from '$lib/components/Model3DViewer.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Uji Viewer 3D (three.js) — {data.slug}</title>
</svelte:head>

<main style="min-height:100vh;background:#060e22;padding:clamp(60px,8vw,90px) clamp(20px,5vw,56px);">
	<div style="max-width:1200px;margin:0 auto;">
		<p style="color:#D4AF37;font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px;">
			Uji Viewer 3D · three.js (DirectionalLight + HDRI + shadow)
		</p>
		<p style="color:#8ea0c0;font-size:13px;margin-bottom:24px;">
			glb: {data.glbSrc} · hdri: {data.envImage ?? '(fallback RoomEnvironment)'}
		</p>
		<div style="position:relative;height:clamp(560px,82vh,860px);border:1px solid rgba(212,175,55,.2);border-radius:2px;overflow:hidden;">
			<Model3DViewer glbSrc={data.glbSrc} envImage={data.envImage} houseName={data.slug} />
		</div>
	</div>
</main>
