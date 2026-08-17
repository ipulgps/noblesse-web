<svelte:head>
	<title>Tur Virtual 360° | Noblesse Property</title>
</svelte:head>

<!--
  Halaman ini nyaris tak pernah tampak: +page.server.ts selalu redirect ke tur
  proyek pertama, atau melempar error 404 kalau belum ada tur aktif sama sekali.
  Markup di bawah hanya fallback untuk kasus 404 itu.
-->
<main
	style="min-height:100vh;background:#060e22;display:flex;align-items:center;justify-content:center;padding:clamp(90px,10vw,120px) clamp(20px,5vw,56px);"
>
	<div style="max-width:480px;margin:0 auto;text-align:center;">
		<div style="font-family:'Cinzel',serif;font-size:10px;letter-spacing:.3em;color:#D4AF37;font-weight:600;margin-bottom:12px;">
			TUR VIRTUAL 360°
		</div>
		<h1 style="font-family:'Playfair Display',serif;font-weight:800;font-size:clamp(24px,3.4vw,32px);color:#fff;margin:0 0 12px;">
			Belum Ada Tur Tersedia
		</h1>
		<p style="color:#8b97b3;font-size:15.5px;line-height:1.7;margin:0 0 28px;">
			Tur virtual sedang disiapkan. Silakan kembali lagi nanti.
		</p>
		<a
			href="/"
			style="display:inline-flex;align-items:center;gap:8px;color:#D4AF37;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;"
		>
			← Kembali ke Beranda
		</a>
	</div>
</main>
