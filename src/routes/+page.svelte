<script lang="ts">
	import { onMount } from 'svelte';
	import ImageSlot from '$lib/ImageSlot.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// site_settings (key-value) — helper baca dengan fallback
	const s = (key: string, fallback = '') => data.settings[key] || fallback;
	const numSetting = (key: string, fallback: number) => {
		const v = parseFloat(data.settings[key]);
		return Number.isFinite(v) ? v : fallback;
	};

	// SVG ikon dari DB bisa berupa string path "d=..." atau markup penuh
	// (mengandung <circle>/<path>). Kembalikan markup inner yang siap di-{@html}.
	const iconInner = (svg: string | null) =>
		svg && svg.trim().startsWith('<') ? svg : `<path d="${svg ?? ''}"/>`;

	// ---------- state ----------
	let isMobile = $state(false);
	let menuOpen = $state(false);
	let scrolled = $state(false);
	let slide = $state(0);
	let planType = $state(0);
	let price = $state(numSetting('kpr_default_price', 2800)); // in juta
	let dpPct = $state(numSetting('kpr_default_dp', 20));
	let tenor = $state(numSetting('kpr_default_tenor', 15));
	let rate = $state(numSetting('kpr_default_rate', 8.5));
	let sent = $state(false);
	let showBackToTop = $state(false);

	// ---------- form kontak (leads) ----------
	let formName = $state('');
	let formWa = $state('');
	let formType = $state('Tipe 45 — Aurelia');
	let formMessage = $state('');
	let formHoneypot = $state(''); // jebakan bot — harus tetap kosong
	let submitting = $state(false);
	let formError = $state('');

	let heroBg = $state<HTMLElement | null>(null);
	let heroContent = $state<HTMLElement | null>(null);

	let autoTimer: ReturnType<typeof setInterval>;

	// ---------- derived: KPR ----------
	const idr = (v: number) => 'Rp ' + Math.round(v).toLocaleString('id-ID');
	const principal = $derived(price * 1e6 * (1 - dpPct / 100));
	const dpAmt = $derived(price * 1e6 * (dpPct / 100));
	const monthly = $derived.by(() => {
		const r = rate / 100 / 12;
		const n = tenor * 12;
		return r > 0
			? (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
			: principal / n;
	});
	const priceLabel = $derived(
		price >= 1000
			? 'Rp ' + (price / 1000).toFixed(1).replace('.', ',') + ' Miliar'
			: 'Rp ' + price + ' Juta'
	);
	const dpLabel = $derived(idr(dpAmt) + ' (' + dpPct + '%)');
	const tenorLabel = $derived(tenor + ' Tahun');
	const rateLabel = $derived(rate.toFixed(1).replace('.', ',') + '% / thn');
	const monthlyLabel = $derived(idr(monthly));
	const loanLabel = $derived(idr(principal));

	// ---------- derived: floor plans (dari DB) ----------
	const plans = $derived(
		data.houseTypes.map((h) => ({
			nm: h.name,
			code: h.typeCode,
			lb: String(h.buildingArea),
			lt: String(h.landArea),
			bed: h.bedrooms,
			bath: h.bathrooms,
			cp: h.carport,
			fl: h.floors,
			img: h.floorplanImg
		}))
	);
	const plan = $derived(plans[planType] ?? plans[0]);

	const navLinks = [
		{ href: '#about', label: 'Tentang' },
		{ href: '#projects', label: 'Proyek' },
		{ href: '#gallery', label: 'Galeri' },
		{ href: '#facilities', label: 'Fasilitas' },
		{ href: '#location', label: 'Lokasi' },
		{ href: '#kpr', label: 'Simulasi KPR' }
	];

	const slideCount = () => data.testimonials.length || 1;
	function nextSlide() {
		clearInterval(autoTimer);
		slide = (slide + 1) % slideCount();
	}
	function prevSlide() {
		clearInterval(autoTimer);
		slide = (slide + slideCount() - 1) % slideCount();
	}
	function goSlide(i: number) {
		clearInterval(autoTimer);
		slide = i;
	}

	async function submitForm(e: SubmitEvent) {
		e.preventDefault();
		if (submitting) return;
		formError = '';
		submitting = true;
		try {
			const res = await fetch('/api/leads', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name: formName,
					whatsapp: formWa,
					interestedType: formType,
					message: formMessage,
					website: formHoneypot
				})
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.message || 'Gagal mengirim. Coba lagi.');
			}
			sent = true;
			formName = '';
			formWa = '';
			formMessage = '';
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Gagal mengirim. Coba lagi.';
		} finally {
			submitting = false;
		}
	}

	function scrollTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	// ---------- scroll reveal action ----------
	function reveal(node: HTMLElement, delay = 0) {
		node.classList.add('reveal');
		const dx = node.dataset.revealX;
		if (dx) {
			node.style.transform = `translateY(${dx}px)`;
		}
		const io = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setTimeout(() => node.classList.add('is-visible'), delay);
						io.unobserve(node);
					}
				});
			},
			{ threshold: 0.1, rootMargin: '0px 0px -6% 0px' }
		);
		io.observe(node);
		return { destroy: () => io.disconnect() };
	}

	// ---------- count-up action ----------
	function countUp(node: HTMLElement, target: number) {
		const io = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const dur = 1700;
						const start = performance.now();
						const step = (now: number) => {
							let p = Math.min(1, (now - start) / dur);
							p = 1 - Math.pow(1 - p, 3);
							node.textContent = Math.round(target * p).toLocaleString('id-ID');
							if (p < 1) requestAnimationFrame(step);
							else node.textContent = Math.round(target).toLocaleString('id-ID');
						};
						requestAnimationFrame(step);
						io.unobserve(node);
					}
				});
			},
			{ threshold: 0.5 }
		);
		io.observe(node);
		return { destroy: () => io.disconnect() };
	}

	onMount(() => {
		const onResize = () => {
			const m = window.innerWidth < 920;
			if (m !== isMobile) {
				isMobile = m;
				if (!m) menuOpen = false;
			}
		};
		window.addEventListener('resize', onResize);
		onResize();

		const onScroll = () => {
			const y = window.pageYOffset || document.documentElement.scrollTop || 0;
			scrolled = y > 40;
			showBackToTop = y > 600;
			if (heroBg && y < 1100) heroBg.style.transform = `translateY(${y * 0.22}px)`;
			if (heroContent && y < 1000) {
				heroContent.style.transform = `translateY(${y * 0.12}px)`;
				heroContent.style.opacity = String(Math.max(0, 1 - y / 720));
			}
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();

		autoTimer = setInterval(() => {
			if (!document.hidden) slide = (slide + 1) % slideCount();
		}, 6500);

		return () => {
			window.removeEventListener('resize', onResize);
			window.removeEventListener('scroll', onScroll);
			clearInterval(autoTimer);
		};
	});

	// ---------- data dari DB (lewat +page.server.ts) ----------
	const testimonials = $derived(
		data.testimonials.map((t) => ({
			quote: t.quote,
			name: t.authorName,
			role: t.authorRole ?? '',
			rating: t.rating,
			photo: t.photoPath
		}))
	);

	const facilities = $derived(
		data.facilities.map((f) => ({ t: f.title, d: f.description, icon: iconInner(f.iconSvg) }))
	);

	const locationItems = $derived(
		data.locations.map((l) => ({ label: l.label, time: l.travelTime, icon: iconInner(l.iconSvg) }))
	);

	const star = 'M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2Z';
	const waPath =
		'M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.2-.7-2.7-1.1-4.4-3.9-4.5-4.1-.1-.2-1.1-1.4-1.1-2.7 0-1.3.7-1.9.9-2.2.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6c-.2.2-.3.4-.1.7.2.3.9 1.5 2 2.4 1.4 1.2 2.1 1.3 2.4 1.1.2-.2.5-.6.7-.9.2-.2.4-.2.6-.1l1.9.9c.3.2.5.2.5.4.1.1.1.7-.2 1.2Z';

	// kontak (dari site_settings)
	const waUrl = $derived('https://wa.me/' + s('wa_number', '62813544126'));
	const waDisplay = $derived(s('wa_display', '{waDisplay}'));
	const igUrl = $derived(s('instagram_url', 'https://instagram.com/noblesseproperty'));
	const igHandle = $derived(s('instagram_handle', '{igHandle}'));

	const gallery = $derived(
		data.gallery.map((g) => ({ height: `${g.heightPx}px`, caption: g.caption ?? 'Foto', src: g.imagePath }))
	);

	const particles = [
		{ t: '18%', l: '12%', w: 6, c: 'var(--nb-accent)', sh: '0 0 14px 2px rgba(212,175,55,.6)', op: '1', d: '9s', dl: '0s' },
		{ t: '32%', l: '78%', w: 4, c: 'var(--nb-accent-l)', sh: '0 0 10px 2px rgba(231,199,106,.5)', op: '1', d: '11s', dl: '.8s' },
		{ t: '64%', l: '22%', w: 5, c: 'var(--nb-accent)', sh: '0 0 12px 2px rgba(212,175,55,.5)', op: '1', d: '13s', dl: '1.4s' },
		{ t: '74%', l: '68%', w: 3, c: '#fff', sh: 'none', op: '.6', d: '10s', dl: '.4s' },
		{ t: '22%', l: '48%', w: 3, c: 'var(--nb-accent-l)', sh: 'none', op: '.7', d: '12s', dl: '2s' },
		{ t: '50%', l: '88%', w: 5, c: 'var(--nb-accent)', sh: '0 0 12px 2px rgba(212,175,55,.5)', op: '1', d: '14s', dl: '1s' },
		{ t: '84%', l: '40%', w: 4, c: 'var(--nb-accent-l)', sh: 'none', op: '.6', d: '10.5s', dl: '1.8s' },
		{ t: '12%', l: '62%', w: 4, c: '#fff', sh: 'none', op: '.45', d: '12.5s', dl: '.2s' }
	];

	const aboutTimeline = $derived(
		data.timeline.map((m, i) => ({
			y: m.yearTitle,
			d: m.description,
			dl: 80 + i * 80,
			last: i === data.timeline.length - 1
		}))
	);

	const stats = $derived(
		data.stats.map((st, i) => ({
			n: st.value,
			suffix: st.suffix,
			label: st.label,
			d: i * 120,
			border: i < data.stats.length - 1
		}))
	);

	const projects = $derived(
		data.projects.map((p, i) => ({
			loc: p.location,
			name: p.name,
			price: p.priceLabel,
			badge: p.badge ?? '',
			gold: p.badgeStyle === 'gold',
			img: p.imagePath,
			d: i * 140
		}))
	);

	type Field = { label: string; val: string; min: number; max: number; step: number; get: () => number; set: (v: number) => void; fs: string; mb: boolean };
	const kprFields = $derived<Field[]>([
		{ label: 'Harga Properti', val: priceLabel, min: 800, max: 8000, step: 100, get: () => price, set: (v) => (price = v), fs: '22px', mb: true },
		{ label: 'Uang Muka (DP)', val: dpLabel, min: 10, max: 50, step: 5, get: () => dpPct, set: (v) => (dpPct = v), fs: '18px', mb: true },
		{ label: 'Jangka Waktu', val: tenorLabel, min: 5, max: 25, step: 1, get: () => tenor, set: (v) => (tenor = v), fs: '18px', mb: true },
		{ label: 'Suku Bunga', val: rateLabel, min: 5, max: 14, step: 0.5, get: () => rate, set: (v) => (rate = v), fs: '18px', mb: false }
	]);

	const planCells = $derived([
		{ l: 'Luas Bangunan', v: plan.lb + ' m²' },
		{ l: 'Luas Tanah', v: plan.lt + ' m²' },
		{ l: 'Kamar Tidur', v: plan.bed },
		{ l: 'Kamar Mandi', v: plan.bath },
		{ l: 'Carport', v: plan.cp },
		{ l: 'Tingkat', v: plan.fl }
	]);

	const footerNav = [
		{ h: '#about', l: 'Tentang Kami' },
		{ h: '#projects', l: 'Proyek' },
		{ h: '#gallery', l: 'Galeri' },
		{ h: '#facilities', l: 'Fasilitas' }
	];
	const footerHunian = $derived([
		...data.projects.map((p) => ({ h: '#projects', l: p.name })),
		{ h: '#kpr', l: 'Simulasi KPR' }
	]);
</script>

<div style="width:100%;overflow-x:hidden;">
	<!-- ================= NAVBAR ================= -->
	<nav
		style="position:fixed;top:0;left:0;right:0;z-index:120;
		background:{scrolled ? 'rgba(8,21,46,0.92)' : 'rgba(8,21,46,0)'};
		backdrop-filter:{scrolled ? 'saturate(150%) blur(16px)' : 'blur(0px)'};
		-webkit-backdrop-filter:{scrolled ? 'saturate(150%) blur(16px)' : 'blur(0px)'};
		border-bottom:{scrolled ? '1px solid rgba(212,175,55,0.16)' : '1px solid rgba(212,175,55,0)'};
		box-shadow:{scrolled ? '0 14px 50px rgba(0,0,0,0.4)' : 'none'};
		transition:background .5s ease, padding .5s ease, box-shadow .5s ease, border-color .5s ease;"
	>
		<div
			style="max-width:1320px;margin:0 auto;padding:{scrolled
				? '14px'
				: '24px'} clamp(20px,5vw,56px);display:flex;align-items:center;justify-content:space-between;transition:padding .5s ease;"
		>
			<a href="#home" style="display:flex;align-items:center;gap:12px;">
				<img
					src="/uploads/logo_light.png"
					alt="Noblesse Property"
					style="height:46px;width:auto;display:block;"
				/>
			</a>
			<div style="display:{isMobile ? 'none' : 'flex'};align-items:center;gap:clamp(20px,2.4vw,40px);">
				{#each navLinks as link}
					<a
						href={link.href}
						class="nav-link"
						style="color:#e8edf6;font-size:13.5px;font-weight:500;letter-spacing:.04em;transition:color .3s;"
						>{link.label}</a
					>
				{/each}
				<a
					href="#contact"
					class="nav-cta"
					style="display:inline-flex;align-items:center;padding:11px 24px;border:1px solid rgba(212,175,55,.55);border-radius:2px;color:#fff;font-size:12.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;transition:all .35s ease;"
					>Kontak</a
				>
			</div>
			<button
				onclick={() => (menuOpen = !menuOpen)}
				aria-label="Menu"
				style="display:{isMobile
					? 'flex'
					: 'none'};flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:8px;"
			>
				<span style="width:26px;height:2px;background:var(--nb-accent);display:block;"></span>
				<span style="width:26px;height:2px;background:#fff;display:block;"></span>
				<span style="width:18px;height:2px;background:#fff;display:block;align-self:flex-end;"></span>
			</button>
		</div>
		<div
			style="overflow:hidden;max-height:{menuOpen
				? '480px'
				: '0px'};opacity:{menuOpen
				? '1'
				: '0'};pointer-events:{menuOpen
				? 'auto'
				: 'none'};background:rgba(8,21,46,0.98);backdrop-filter:blur(16px);transition:max-height .5s cubic-bezier(.16,1,.3,1), opacity .4s ease;"
		>
			<div style="display:flex;flex-direction:column;padding:8px 28px 28px;gap:4px;">
				{#each navLinks as link}
					<a
						href={link.href}
						onclick={() => (menuOpen = false)}
						style="color:#e8edf6;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.07);font-size:15px;letter-spacing:.03em;"
						>{link.label}</a
					>
				{/each}
				<a
					href="#contact"
					onclick={() => (menuOpen = false)}
					style="margin-top:14px;text-align:center;padding:15px;background:linear-gradient(135deg,var(--nb-accent-l),var(--nb-accent));color:#08152E;border-radius:2px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;font-size:13px;"
					>Hubungi Marketing</a
				>
			</div>
		</div>
	</nav>

	<!-- ================= HERO ================= -->
	<section
		id="home"
		style="position:relative;min-height:100vh;display:flex;align-items:center;overflow:hidden;background:#08152E;"
	>
		<div
			bind:this={heroBg}
			style="position:absolute;inset:-8% 0 0 0;will-change:transform;background:radial-gradient(120% 95% at 50% -12%, rgba(212,175,55,0.18), transparent 52%), radial-gradient(85% 65% at 82% 116%, rgba(38,68,134,0.55), transparent 60%), linear-gradient(180deg,#0A1F44 0%,#08152E 58%,#060e22 100%);"
		></div>
		<div
			style="position:absolute;inset:0;opacity:.55;background-image:linear-gradient(rgba(212,175,55,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,.055) 1px,transparent 1px);background-size:68px 68px;-webkit-mask-image:radial-gradient(circle at 50% 42%,#000,transparent 72%);mask-image:radial-gradient(circle at 50% 42%,#000,transparent 72%);"
		></div>
		<div style="position:absolute;inset:0;pointer-events:none;">
			{#each particles as p}
				<span
					style="position:absolute;top:{p.t};left:{p.l};width:{p.w}px;height:{p.w}px;border-radius:50%;background:{p.c};box-shadow:{p.sh};opacity:{p.op};animation:nbFloat {p.d} ease-in-out infinite {p.dl};"
				></span>
			{/each}
		</div>
		<div
			style="position:absolute;bottom:0;left:0;right:0;height:42%;background:linear-gradient(180deg,transparent,rgba(6,14,34,.85));pointer-events:none;"
		></div>

		<div
			bind:this={heroContent}
			style="position:relative;z-index:3;width:100%;max-width:1100px;margin:0 auto;padding:120px clamp(24px,6vw,64px) 80px;text-align:center;"
		>
			<div use:reveal={0} style="display:inline-flex;align-items:center;gap:14px;margin-bottom:30px;">
				<span style="width:38px;height:1px;background:linear-gradient(90deg,transparent,var(--nb-accent));"></span>
				<span style="font-family:'Cinzel',serif;font-size:13px;letter-spacing:.42em;color:var(--nb-accent);font-weight:600;">NOBLESSE&nbsp;PROPERTY</span>
				<span style="width:38px;height:1px;background:linear-gradient(90deg,var(--nb-accent),transparent);"></span>
			</div>
			<h1
				use:reveal={140}
				style="font-family:var(--nb-head);font-weight:800;font-size:clamp(42px,7vw,92px);line-height:1.02;letter-spacing:-.02em;color:#fff;margin:0 0 26px;text-wrap:balance;"
			>
				Temukan Hunian<br /><span
					style="font-style:italic;font-weight:500;background:linear-gradient(120deg,var(--nb-accent-l),var(--nb-accent),var(--nb-accent-l));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;"
					>Impian</span
				> Anda
			</h1>
			<p
				use:reveal={280}
				style="max-width:640px;margin:0 auto 44px;color:#b7c2d9;font-size:clamp(16px,1.5vw,20px);line-height:1.7;font-weight:300;"
			>
				{s('hero_subtitle', 'Perumahan modern dengan konsep premium, arsitektur elegan, dan lokasi paling strategis di jantung kota.')}
			</p>
			<div use:reveal={420} style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;">
				<a
					href="#projects"
					class="btn-gold"
					style="display:inline-flex;align-items:center;gap:10px;padding:18px 40px;background:linear-gradient(135deg,var(--nb-accent-l),var(--nb-accent));color:#08152E;border-radius:2px;font-size:13.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;transition:all .4s ease;box-shadow:0 14px 40px rgba(212,175,55,.32);"
					>Lihat Unit</a
				>
				<a
					href="#contact"
					class="btn-outline"
					style="display:inline-flex;align-items:center;gap:10px;padding:18px 40px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.28);color:#fff;border-radius:2px;font-size:13.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;transition:all .4s ease;"
					>Hubungi Marketing</a
				>
			</div>
		</div>

		<a
			href="#stats"
			style="position:absolute;bottom:34px;left:50%;transform:translateX(-50%);z-index:3;display:flex;flex-direction:column;align-items:center;gap:10px;color:#8b97b3;"
		>
			<span style="font-size:10px;letter-spacing:.3em;text-transform:uppercase;">Gulir</span>
			<span style="position:relative;width:24px;height:40px;border:1px solid rgba(212,175,55,.5);border-radius:14px;display:block;">
				<span style="position:absolute;top:8px;left:50%;transform:translateX(-50%);width:4px;height:8px;border-radius:3px;background:var(--nb-accent);animation:nbScrollCue 1.8s ease-in-out infinite;"></span>
			</span>
		</a>
	</section>

	<!-- ================= STATS ================= -->
	<section id="stats" style="background:#060e22;padding:0;">
		<div
			style="max-width:1320px;margin:0 auto;padding:clamp(56px,7vw,90px) clamp(20px,5vw,56px);display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:clamp(28px,4vw,48px);"
		>
			{#each stats as stat}
				<div
					use:reveal={stat.d}
					style="text-align:center;{stat.border ? 'border-right:1px solid rgba(212,175,55,.14);' : ''}"
				>
					<div style="font-family:var(--nb-head);font-weight:700;font-size:clamp(44px,5vw,68px);color:#fff;line-height:1;">
						<span use:countUp={stat.n}>0</span>{#if stat.suffix}<span style="color:var(--nb-accent);">{stat.suffix}</span>{/if}
					</div>
					<div style="margin-top:14px;color:#8b97b3;font-size:13px;letter-spacing:.16em;text-transform:uppercase;">{stat.label}</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- ================= ABOUT ================= -->
	<section id="about" style="background:#ffffff;padding:clamp(80px,10vw,140px) clamp(20px,5vw,56px);">
		<div style="max-width:1320px;margin:0 auto;display:flex;gap:clamp(40px,6vw,90px);align-items:center;flex-wrap:wrap;">
			<div style="flex:1 1 420px;min-width:300px;">
				<div use:reveal style="display:flex;align-items:center;gap:14px;margin-bottom:24px;">
					<span style="width:34px;height:1px;background:var(--nb-accent);"></span>
					<span style="font-family:'Cinzel',serif;font-size:12px;letter-spacing:.34em;color:var(--nb-accent);font-weight:600;">TENTANG KAMI</span>
				</div>
				<h2
					use:reveal={80}
					style="font-family:var(--nb-head);font-weight:800;font-size:clamp(30px,4.2vw,56px);line-height:1.08;letter-spacing:-.015em;color:var(--nb-navy);margin:0 0 28px;text-wrap:balance;"
				>
					{@html s('about_heading', 'Membangun Warisan,<br />Bukan Sekadar Hunian')}
				</h2>
				<p use:reveal={160} style="color:#5b6478;font-size:17px;line-height:1.85;margin:0 0 22px;max-width:560px;">
					{s('about_paragraph_1', 'Selama lebih dari satu dekade, Noblesse Property mendedikasikan diri menciptakan kawasan hunian yang memadukan arsitektur elegan, material premium, dan perencanaan kota yang matang — sebuah standar baru hidup mewah di Indonesia.')}
				</p>
				<p use:reveal={220} style="color:#5b6478;font-size:17px;line-height:1.85;margin:0 0 40px;max-width:560px;">
					{s('about_paragraph_2', 'Visi kami sederhana namun abadi: menghadirkan ruang yang tidak hanya ditinggali, tetapi diwariskan lintas generasi.')}
				</p>

				<div style="display:flex;flex-direction:column;gap:0;border-left:1px solid rgba(212,175,55,.3);">
					{#each aboutTimeline as m}
						<div use:reveal={m.dl} style="position:relative;padding:0 0 {m.last ? '4px' : '28px'} 30px;">
							<span style="position:absolute;left:-6px;top:4px;width:11px;height:11px;border-radius:50%;background:var(--nb-accent);box-shadow:0 0 0 4px rgba(212,175,55,.15);"></span>
							<div style="font-family:var(--nb-head);font-size:20px;color:var(--nb-navy);font-weight:700;">{m.y}</div>
							<div style="color:#7a8499;font-size:14.5px;margin-top:5px;">{m.d}</div>
						</div>
					{/each}
				</div>
			</div>
			<div use:reveal={200} data-reveal-x="50" style="flex:1 1 360px;min-width:300px;position:relative;">
				<div style="position:absolute;inset:18px -18px -18px 18px;border:1px solid rgba(212,175,55,.45);border-radius:2px;pointer-events:none;"></div>
				<ImageSlot caption="Foto arsitektur" height="560px" radius={2} />
			</div>
		</div>
	</section>

	<!-- ================= PROJECTS ================= -->
	<section id="projects" style="background:#F8F8F8;padding:clamp(80px,10vw,140px) clamp(20px,5vw,56px);">
		<div style="max-width:1320px;margin:0 auto;">
			<div style="text-align:center;margin-bottom:64px;">
				<div use:reveal style="display:inline-flex;align-items:center;gap:14px;margin-bottom:20px;">
					<span style="width:34px;height:1px;background:var(--nb-accent);"></span>
					<span style="font-family:'Cinzel',serif;font-size:12px;letter-spacing:.34em;color:var(--nb-accent);font-weight:600;">PROYEK PILIHAN</span>
					<span style="width:34px;height:1px;background:var(--nb-accent);"></span>
				</div>
				<h2 use:reveal={80} style="font-family:var(--nb-head);font-weight:800;font-size:clamp(30px,4.2vw,56px);line-height:1.08;color:var(--nb-navy);margin:0;">Koleksi Hunian Eksklusif</h2>
			</div>
			<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:32px;">
				{#each projects as proj}
					<div
						use:reveal={proj.d}
						class="proj-card"
						style="background:#fff;border-radius:2px;overflow:hidden;box-shadow:0 18px 50px rgba(10,31,68,.08);transition:transform .5s cubic-bezier(.16,1,.3,1), box-shadow .5s ease;border:1px solid rgba(10,31,68,.05);"
					>
						<div style="position:relative;">
							<ImageSlot caption="Foto proyek" src={proj.img ?? ''} height="280px" />
							{#if proj.gold}
								<span style="position:absolute;top:18px;left:18px;background:linear-gradient(135deg,var(--nb-accent-l),var(--nb-accent));color:#08152E;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:7px 14px;border-radius:2px;">{proj.badge}</span>
							{:else}
								<span style="position:absolute;top:18px;left:18px;background:rgba(8,21,46,.92);color:#fff;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:7px 14px;border-radius:2px;border:1px solid rgba(212,175,55,.4);">{proj.badge}</span>
							{/if}
						</div>
						<div style="padding:30px 30px 34px;">
							<div style="display:flex;align-items:center;gap:7px;color:#8a93a7;font-size:13px;margin-bottom:10px;">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--nb-accent)" stroke-width="1.6"><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>{proj.loc}
							</div>
							<h3 style="font-family:var(--nb-head);font-weight:700;font-size:26px;color:var(--nb-navy);margin:0 0 16px;">{proj.name}</h3>
							<div style="display:flex;align-items:flex-end;justify-content:space-between;border-top:1px solid #eee;padding-top:18px;">
								<div>
									<div style="font-size:12px;color:#9aa3b5;letter-spacing:.08em;">MULAI DARI</div>
									<div style="font-family:var(--nb-head);font-size:24px;color:var(--nb-accent);font-weight:700;">{proj.price}</div>
								</div>
								<a href="#contact" style="font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--nb-navy);border-bottom:1px solid var(--nb-accent);padding-bottom:3px;">Detail →</a>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- ================= SHOWCASE BAND ================= -->
	<section style="position:relative;background:#08152E;">
		<ImageSlot caption="Foto drone / aerial kawasan" height="clamp(420px,60vh,640px)" />
		<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,21,46,.55),rgba(8,21,46,.78));display:flex;align-items:center;justify-content:center;text-align:center;padding:40px 24px;pointer-events:none;">
			<div use:reveal style="max-width:760px;">
				<svg width="40" height="40" viewBox="0 0 24 24" fill="var(--nb-accent)" style="opacity:.85;margin-bottom:18px;"><path d="M7 7h4v4H7zM7 7c0 4-2 6-4 6" /><path d="M14 7h4v4h-4zM14 7c0 4-2 6-4 6" stroke="var(--nb-accent)" stroke-width="1.5" fill="none" /></svg>
				<p style="font-family:var(--nb-head);font-style:italic;font-weight:500;font-size:clamp(24px,3.4vw,42px);line-height:1.35;color:#fff;margin:0;text-wrap:balance;">Setiap detail dirancang untuk Anda yang menghargai kesempurnaan.</p>
			</div>
		</div>
	</section>

	<!-- ================= GALLERY ================= -->
	<section id="gallery" style="background:#ffffff;padding:clamp(80px,10vw,140px) clamp(20px,5vw,56px);">
		<div style="max-width:1320px;margin:0 auto;">
			<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:54px;">
				<div>
					<div use:reveal style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
						<span style="width:34px;height:1px;background:var(--nb-accent);"></span>
						<span style="font-family:'Cinzel',serif;font-size:12px;letter-spacing:.34em;color:var(--nb-accent);font-weight:600;">GALERI</span>
					</div>
					<h2 use:reveal={80} style="font-family:var(--nb-head);font-weight:800;font-size:clamp(30px,4.2vw,56px);line-height:1.08;color:var(--nb-navy);margin:0;">Galeri Kawasan</h2>
				</div>
				<p use:reveal={160} style="color:#7a8499;font-size:16px;max-width:380px;line-height:1.7;margin:0;">Sentuhan arsitektur, lanskap, dan interior yang dirancang dengan presisi.</p>
			</div>
			<div use:reveal style="columns:300px;column-gap:22px;">
				{#each gallery as g}
					<div style="break-inside:avoid;margin-bottom:22px;overflow:hidden;border-radius:2px;">
						<ImageSlot caption={g.caption} src={g.src} height={g.height} />
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- ================= FACILITIES ================= -->
	<section id="facilities" style="position:relative;background:#0A1F44;padding:clamp(80px,10vw,140px) clamp(20px,5vw,56px);overflow:hidden;">
		<div style="position:absolute;inset:0;opacity:.5;background-image:linear-gradient(rgba(212,175,55,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,.045) 1px,transparent 1px);background-size:64px 64px;-webkit-mask-image:radial-gradient(circle at 50% 30%,#000,transparent 78%);mask-image:radial-gradient(circle at 50% 30%,#000,transparent 78%);"></div>
		<div style="position:relative;max-width:1320px;margin:0 auto;">
			<div style="text-align:center;margin-bottom:64px;">
				<div use:reveal style="display:inline-flex;align-items:center;gap:14px;margin-bottom:20px;">
					<span style="width:34px;height:1px;background:var(--nb-accent);"></span>
					<span style="font-family:'Cinzel',serif;font-size:12px;letter-spacing:.34em;color:var(--nb-accent);font-weight:600;">FASILITAS</span>
					<span style="width:34px;height:1px;background:var(--nb-accent);"></span>
				</div>
				<h2 use:reveal={80} style="font-family:var(--nb-head);font-weight:800;font-size:clamp(30px,4.2vw,56px);line-height:1.08;color:#fff;margin:0;">Fasilitas Kelas Premium</h2>
			</div>
			<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;">
				{#each facilities as f, i}
					<div
						use:reveal={(i % 4) * 80}
						class="fac-card"
						style="padding:34px 26px;background:rgba(255,255,255,.03);border:1px solid rgba(212,175,55,.14);border-radius:2px;transition:all .4s ease;"
					>
						<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--nb-accent)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">{@html f.icon}</svg>
						<h3 style="font-family:var(--nb-head);font-size:20px;color:#fff;margin:20px 0 8px;font-weight:600;">{f.t}</h3>
						<p style="color:#8b97b3;font-size:14px;line-height:1.6;margin:0;">{f.d}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- ================= LOCATION ================= -->
	<section id="location" style="background:#F8F8F8;padding:clamp(80px,10vw,140px) clamp(20px,5vw,56px);">
		<div style="max-width:1320px;margin:0 auto;display:flex;gap:clamp(40px,5vw,72px);align-items:center;flex-wrap:wrap;">
			<div style="flex:1 1 360px;min-width:300px;">
				<div use:reveal style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
					<span style="width:34px;height:1px;background:var(--nb-accent);"></span>
					<span style="font-family:'Cinzel',serif;font-size:12px;letter-spacing:.34em;color:var(--nb-accent);font-weight:600;">LOKASI</span>
				</div>
				<h2 use:reveal={80} style="font-family:var(--nb-head);font-weight:800;font-size:clamp(30px,4.2vw,56px);line-height:1.08;color:var(--nb-navy);margin:0 0 22px;">Terhubung dengan Segalanya</h2>
				<p use:reveal={140} style="color:#5b6478;font-size:16.5px;line-height:1.8;margin:0 0 36px;max-width:480px;">Posisi strategis dengan akses langsung ke pusat-pusat penting kota — hidup tanpa kompromi.</p>
				<div style="display:flex;flex-direction:column;gap:2px;">
					{#each locationItems as item, i}
						<div
							use:reveal={60 + i * 60}
							style="display:flex;align-items:center;justify-content:space-between;padding:16px 0;{i < locationItems.length - 1 ? 'border-bottom:1px solid #e4e2dc;' : ''}"
						>
							<span style="display:flex;align-items:center;gap:12px;color:var(--nb-navy);font-size:15.5px;font-weight:500;">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--nb-accent)" stroke-width="1.6">{@html item.icon}</svg>{item.label}
							</span>
							<span style="font-family:var(--nb-head);color:var(--nb-accent);font-weight:700;font-size:18px;">{item.time}</span>
						</div>
					{/each}
				</div>
			</div>
			<div use:reveal={160} data-reveal-x="50" style="flex:1 1 380px;min-width:300px;">
				<div style="position:relative;border-radius:2px;overflow:hidden;border:1px solid rgba(10,31,68,.1);box-shadow:0 24px 60px rgba(10,31,68,.14);background:#0A1F44;height:clamp(360px,46vh,500px);">
					<div style="position:absolute;inset:0;background:radial-gradient(circle at 52% 46%, #11295a, #08152E 80%);"></div>
					<div style="position:absolute;inset:0;opacity:.5;background-image:linear-gradient(rgba(212,175,55,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,.12) 1px,transparent 1px);background-size:46px 46px;"></div>
					<div style="position:absolute;top:0;bottom:0;left:30%;width:8px;background:rgba(212,175,55,.16);transform:skewX(-12deg);"></div>
					<div style="position:absolute;left:0;right:0;top:58%;height:7px;background:rgba(212,175,55,.16);transform:skewY(4deg);"></div>
					<div style="position:absolute;top:0;bottom:0;left:68%;width:4px;background:rgba(255,255,255,.06);"></div>
					<span style="position:absolute;top:24%;left:20%;width:9px;height:9px;border-radius:50%;background:#fff;opacity:.5;"></span>
					<span style="position:absolute;top:72%;left:78%;width:9px;height:9px;border-radius:50%;background:#fff;opacity:.5;"></span>
					<span style="position:absolute;top:40%;left:80%;width:9px;height:9px;border-radius:50%;background:#fff;opacity:.5;"></span>
					<div style="position:absolute;top:46%;left:50%;transform:translate(-50%,-50%);">
						<span style="position:absolute;top:50%;left:50%;width:20px;height:20px;border-radius:50%;background:rgba(212,175,55,.5);animation:nbPulse 2.4s ease-out infinite;"></span>
						<span style="position:absolute;top:50%;left:50%;width:20px;height:20px;border-radius:50%;background:rgba(212,175,55,.5);animation:nbPulse 2.4s ease-out infinite 1.2s;"></span>
						<span style="position:relative;display:flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,var(--nb-accent-l),var(--nb-accent));box-shadow:0 8px 24px rgba(212,175,55,.5);">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="#08152E" style="transform:rotate(45deg);"><path d="M3 21V9l9-6 9 6v12h-6v-7H9v7H3Z" /></svg>
						</span>
					</div>
					<div style="position:absolute;left:50%;top:calc(46% + 36px);transform:translateX(-50%);background:rgba(8,21,46,.85);border:1px solid rgba(212,175,55,.35);color:#fff;font-size:12px;letter-spacing:.1em;padding:6px 14px;border-radius:2px;white-space:nowrap;font-weight:600;">{s('location_marker_label', 'NOBLESSE GRAND AVENUE')}</div>
					<a
						href={s('maps_url', 'https://www.google.com/maps')}
						target="_blank"
						rel="noopener"
						class="map-link"
						style="position:absolute;bottom:18px;right:18px;display:inline-flex;align-items:center;gap:8px;background:#fff;color:var(--nb-navy);font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:11px 18px;border-radius:2px;transition:all .3s;"
						>Lihat di Google Maps →</a
					>
				</div>
			</div>
		</div>
	</section>

	<!-- ================= FLOOR PLAN ================= -->
	<section id="floorplan" style="background:#ffffff;padding:clamp(80px,10vw,140px) clamp(20px,5vw,56px);">
		<div style="max-width:1320px;margin:0 auto;">
			<div style="text-align:center;margin-bottom:48px;">
				<div use:reveal style="display:inline-flex;align-items:center;gap:14px;margin-bottom:20px;">
					<span style="width:34px;height:1px;background:var(--nb-accent);"></span>
					<span style="font-family:'Cinzel',serif;font-size:12px;letter-spacing:.34em;color:var(--nb-accent);font-weight:600;">DENAH UNIT</span>
					<span style="width:34px;height:1px;background:var(--nb-accent);"></span>
				</div>
				<h2 use:reveal={80} style="font-family:var(--nb-head);font-weight:800;font-size:clamp(30px,4.2vw,56px);line-height:1.08;color:var(--nb-navy);margin:0;">Pilih Tipe Hunian Anda</h2>
			</div>
			<div use:reveal style="max-width:440px;margin:0 auto 44px;display:flex;gap:8px;background:#08152E;padding:8px;border-radius:2px;">
				{#each ['Tipe 45', 'Tipe 60', 'Tipe 90'] as label, i}
					<button
						onclick={() => (planType = i)}
						style="flex:1;padding:15px 8px;border:none;cursor:pointer;font-family:Inter,sans-serif;font-size:12.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;transition:all .35s ease;border-radius:2px;{planType === i
							? 'background:linear-gradient(135deg,var(--nb-accent-l),var(--nb-accent));color:#08152E;box-shadow:0 10px 30px rgba(212,175,55,.3);'
							: 'background:transparent;color:#8b97b3;'}">{label}</button
					>
				{/each}
			</div>
			<div use:reveal={120} style="display:flex;gap:clamp(32px,5vw,64px);align-items:center;flex-wrap:wrap;">
				<div style="flex:1 1 380px;min-width:300px;position:relative;background:#F8F8F8;border:1px solid rgba(10,31,68,.08);border-radius:2px;padding:18px;">
					<ImageSlot caption="Denah {plan.nm} — Tipe {plan.lb}" src={plan.img ?? ''} height="380px" fit="contain" />
				</div>
				<div style="flex:1 1 320px;min-width:280px;">
					<div style="font-family:'Cinzel',serif;font-size:12px;letter-spacing:.26em;color:var(--nb-accent);margin-bottom:6px;">Tipe {plan.nm}</div>
					<h3 style="font-family:var(--nb-head);font-weight:800;font-size:clamp(28px,3.5vw,42px);color:var(--nb-navy);margin:0 0 28px;">{plan.lb}/{plan.lt}</h3>
					<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#e9e7e1;border:1px solid #e9e7e1;border-radius:2px;overflow:hidden;">
						{#each planCells as cell}
							<div style="background:#fff;padding:22px 24px;">
								<div style="font-size:12px;color:#9aa3b5;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px;">{cell.l}</div>
								<div style="font-family:var(--nb-head);font-size:26px;color:var(--nb-navy);font-weight:700;">{cell.v}</div>
							</div>
						{/each}
					</div>
					<a
						href="#contact"
						class="btn-gold"
						style="display:inline-flex;margin-top:28px;align-items:center;gap:10px;padding:16px 34px;background:linear-gradient(135deg,var(--nb-accent-l),var(--nb-accent));color:#08152E;border-radius:2px;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;transition:all .4s;"
						>Tanya Ketersediaan</a
					>
				</div>
			</div>
		</div>
	</section>

	<!-- ================= TESTIMONIALS ================= -->
	<section id="testimonials" style="position:relative;background:#08152E;padding:clamp(80px,10vw,140px) clamp(20px,5vw,56px);overflow:hidden;">
		<div style="position:absolute;top:-120px;right:-120px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(212,175,55,.14),transparent 70%);animation:nbGlow 6s ease-in-out infinite;"></div>
		<div style="position:relative;max-width:920px;margin:0 auto;text-align:center;">
			<div use:reveal style="display:inline-flex;align-items:center;gap:14px;margin-bottom:20px;">
				<span style="width:34px;height:1px;background:var(--nb-accent);"></span>
				<span style="font-family:'Cinzel',serif;font-size:12px;letter-spacing:.34em;color:var(--nb-accent);font-weight:600;">TESTIMONI</span>
				<span style="width:34px;height:1px;background:var(--nb-accent);"></span>
			</div>
			<h2 use:reveal={80} style="font-family:var(--nb-head);font-weight:800;font-size:clamp(30px,4.2vw,52px);line-height:1.1;color:#fff;margin:0 0 56px;">Dipercaya oleh Keluarga Terbaik</h2>

			<div use:reveal={140} style="overflow:hidden;">
				<div style="display:flex;transform:translateX(-{slide * 100}%);transition:transform .7s cubic-bezier(.16,1,.3,1);">
					{#each testimonials as t}
						<div style="flex:0 0 100%;padding:0 8px;box-sizing:border-box;">
							<div style="font-size:54px;font-family:var(--nb-head);color:var(--nb-accent);line-height:.6;height:34px;">&ldquo;</div>
							<p style="font-family:var(--nb-head);font-style:italic;font-weight:500;font-size:clamp(20px,2.6vw,30px);line-height:1.5;color:#eef2f9;margin:0 auto 32px;max-width:720px;text-wrap:balance;">{t.quote}</p>
							<div style="display:flex;justify-content:center;gap:5px;margin-bottom:22px;">
								{#each Array(5) as _}
									<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--nb-accent)"><path d={star} /></svg>
								{/each}
							</div>
							<div style="display:flex;align-items:center;justify-content:center;gap:16px;">
								<ImageSlot caption="Foto" src={t.photo ?? ''} width="60px" height="60px" circle />
								<div style="text-align:left;">
									<div style="color:#fff;font-weight:600;font-size:16px;">{t.name}</div>
									<div style="color:#8b97b3;font-size:13px;">{t.role}</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div style="display:flex;align-items:center;justify-content:center;gap:24px;margin-top:44px;">
				<button onclick={prevSlide} aria-label="Sebelumnya" class="slider-arrow" style="width:46px;height:46px;border-radius:50%;border:1px solid rgba(212,175,55,.4);background:transparent;color:var(--nb-accent);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .3s;">‹</button>
				<div style="display:flex;gap:8px;align-items:center;">
					{#each testimonials as _, i}
						<button
							onclick={() => goSlide(i)}
							aria-label={String(i + 1)}
							style="height:8px;border-radius:99px;border:none;cursor:pointer;padding:0;transition:all .4s ease;{i === slide
								? 'width:30px;background:var(--nb-accent);'
								: 'width:8px;background:rgba(255,255,255,.28);'}"
						></button>
					{/each}
				</div>
				<button onclick={nextSlide} aria-label="Berikutnya" class="slider-arrow" style="width:46px;height:46px;border-radius:50%;border:1px solid rgba(212,175,55,.4);background:transparent;color:var(--nb-accent);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .3s;">›</button>
			</div>
		</div>
	</section>

	<!-- ================= KPR ================= -->
	<section id="kpr" style="background:#F8F8F8;padding:clamp(80px,10vw,140px) clamp(20px,5vw,56px);">
		<div style="max-width:1320px;margin:0 auto;">
			<div style="text-align:center;margin-bottom:56px;">
				<div use:reveal style="display:inline-flex;align-items:center;gap:14px;margin-bottom:20px;">
					<span style="width:34px;height:1px;background:var(--nb-accent);"></span>
					<span style="font-family:'Cinzel',serif;font-size:12px;letter-spacing:.34em;color:var(--nb-accent);font-weight:600;">SIMULASI KPR</span>
					<span style="width:34px;height:1px;background:var(--nb-accent);"></span>
				</div>
				<h2 use:reveal={80} style="font-family:var(--nb-head);font-weight:800;font-size:clamp(30px,4.2vw,56px);line-height:1.08;color:var(--nb-navy);margin:0;">Wujudkan Sekarang</h2>
			</div>
			<div use:reveal={120} style="display:flex;gap:0;flex-wrap:wrap;border-radius:2px;overflow:hidden;box-shadow:0 28px 70px rgba(10,31,68,.13);">
				<div style="flex:1 1 420px;min-width:300px;background:#fff;padding:clamp(34px,4vw,56px);">
					{#each kprFields as field}
						<div style={field.mb ? 'margin-bottom:34px;' : ''}>
							<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;">
								<span style="font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#7a8499;font-weight:600;">{field.label}</span>
								<span style="font-family:var(--nb-head);font-size:{field.fs};color:var(--nb-navy);font-weight:700;">{field.val}</span>
							</div>
							<input
								class="rng"
								type="range"
								min={field.min}
								max={field.max}
								step={field.step}
								value={field.get()}
								oninput={(e) => field.set(+e.currentTarget.value)}
							/>
						</div>
					{/each}
				</div>
				<div style="flex:1 1 320px;min-width:280px;background:linear-gradient(160deg,#0A1F44,#08152E);padding:clamp(34px,4vw,56px);display:flex;flex-direction:column;justify-content:center;color:#fff;">
					<div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#8b97b3;margin-bottom:12px;">Estimasi Angsuran / Bulan</div>
					<div style="font-family:var(--nb-head);font-weight:800;font-size:clamp(34px,5vw,52px);line-height:1;background:linear-gradient(120deg,var(--nb-accent-l),var(--nb-accent));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:30px;">{monthlyLabel}</div>
					<div style="display:flex;justify-content:space-between;padding:14px 0;border-top:1px solid rgba(255,255,255,.1);">
						<span style="color:#8b97b3;font-size:14px;">Uang Muka</span>
						<span style="font-weight:600;font-size:14.5px;">{dpLabel}</span>
					</div>
					<div style="display:flex;justify-content:space-between;padding:14px 0;border-top:1px solid rgba(255,255,255,.1);border-bottom:1px solid rgba(255,255,255,.1);">
						<span style="color:#8b97b3;font-size:14px;">Total Pinjaman</span>
						<span style="font-weight:600;font-size:14.5px;">{loanLabel}</span>
					</div>
					<a
						href="#contact"
						class="btn-gold"
						style="margin-top:28px;text-align:center;padding:16px;background:linear-gradient(135deg,var(--nb-accent-l),var(--nb-accent));color:#08152E;border-radius:2px;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;transition:all .3s;"
						>Konsultasi KPR</a
					>
					<div style="margin-top:14px;font-size:11.5px;color:#6b7794;line-height:1.5;text-align:center;">*Estimasi. Angka final mengikuti ketentuan bank.</div>
				</div>
			</div>
			<div use:reveal style="margin-top:48px;text-align:center;">
				<div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#9aa3b5;margin-bottom:22px;">Bekerja Sama Dengan</div>
				<div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;">
					{#each ['BCA', 'Mandiri', 'BNI', 'BTN', 'CIMB Niaga', 'Permata'] as bank}
						<span style="padding:11px 26px;background:#fff;border:1px solid rgba(10,31,68,.08);border-radius:2px;font-family:var(--nb-head);font-weight:700;font-size:18px;color:var(--nb-navy);letter-spacing:.02em;">{bank}</span>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- ================= CONTACT ================= -->
	<section id="contact" style="position:relative;background:#0A1F44;padding:clamp(80px,10vw,140px) clamp(20px,5vw,56px);overflow:hidden;">
		<div style="position:absolute;bottom:-140px;left:-100px;width:440px;height:440px;border-radius:50%;background:radial-gradient(circle,rgba(212,175,55,.13),transparent 70%);"></div>
		<div style="position:relative;max-width:1320px;margin:0 auto;display:flex;gap:clamp(40px,5vw,80px);flex-wrap:wrap;align-items:center;">
			<div style="flex:1 1 380px;min-width:300px;">
				<div use:reveal style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
					<span style="width:34px;height:1px;background:var(--nb-accent);"></span>
					<span style="font-family:'Cinzel',serif;font-size:12px;letter-spacing:.34em;color:var(--nb-accent);font-weight:600;">KONTAK</span>
				</div>
				<h2 use:reveal={80} style="font-family:var(--nb-head);font-weight:800;font-size:clamp(32px,4.4vw,58px);line-height:1.06;color:#fff;margin:0 0 24px;">Mari Bicara tentang<br />Rumah Anda</h2>
				<p use:reveal={140} style="color:#aeb9d1;font-size:17px;line-height:1.8;margin:0 0 40px;max-width:460px;">Tim marketing kami siap memandu Anda menemukan hunian yang tepat. Hubungi kami kapan saja.</p>
				<div style="display:flex;flex-direction:column;gap:16px;">
					<a use:reveal={180} href={waUrl} target="_blank" rel="noopener" class="contact-row" style="display:flex;align-items:center;gap:18px;padding:20px 24px;background:rgba(255,255,255,.04);border:1px solid rgba(212,175,55,.18);border-radius:2px;transition:all .35s;">
						<span style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#25D366,#128C7E);display:flex;align-items:center;justify-content:center;flex:none;"><svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d={waPath} /></svg></span>
						<div>
							<div style="color:#fff;font-weight:600;font-size:16px;">WhatsApp</div>
							<div style="color:#8b97b3;font-size:14px;">{waDisplay}</div>
						</div>
					</a>
					<a use:reveal={240} href={igUrl} target="_blank" rel="noopener" class="contact-row" style="display:flex;align-items:center;gap:18px;padding:20px 24px;background:rgba(255,255,255,.04);border:1px solid rgba(212,175,55,.18);border-radius:2px;transition:all .35s;">
						<span style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#feda75,#d62976,#962fbf);display:flex;align-items:center;justify-content:center;flex:none;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="#fff" stroke="none" /></svg></span>
						<div>
							<div style="color:#fff;font-weight:600;font-size:16px;">Instagram</div>
							<div style="color:#8b97b3;font-size:14px;">{igHandle}</div>
						</div>
					</a>
				</div>
			</div>
			<div use:reveal={160} data-reveal-x="40" style="flex:1 1 380px;min-width:300px;background:#fff;border-radius:2px;padding:clamp(30px,3.5vw,48px);box-shadow:0 30px 80px rgba(0,0,0,.3);">
				{#if !sent}
					<form onsubmit={submitForm} style="display:flex;flex-direction:column;gap:18px;">
						<h3 style="font-family:var(--nb-head);font-weight:700;font-size:26px;color:var(--nb-navy);margin:0 0 6px;">Jadwalkan Kunjungan</h3>
						<input
							type="text"
							name="website"
							tabindex="-1"
							autocomplete="off"
							aria-hidden="true"
							bind:value={formHoneypot}
							style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;"
						/>
						<div>
							<label for="nb-name" style="display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9aa3b5;margin-bottom:8px;">Nama Lengkap</label>
							<input id="nb-name" type="text" required placeholder="Nama Anda" bind:value={formName} class="nb-input" style="width:100%;padding:14px 16px;border:1px solid #e2e0d9;border-radius:2px;font-size:15px;color:#0A1F44;outline:none;transition:border-color .3s;" />
						</div>
						<div>
							<label for="nb-wa" style="display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9aa3b5;margin-bottom:8px;">Nomor WhatsApp</label>
							<input id="nb-wa" type="tel" required placeholder="08xx-xxxx-xxxx" bind:value={formWa} class="nb-input" style="width:100%;padding:14px 16px;border:1px solid #e2e0d9;border-radius:2px;font-size:15px;color:#0A1F44;outline:none;transition:border-color .3s;" />
						</div>
						<div>
							<label for="nb-type" style="display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9aa3b5;margin-bottom:8px;">Tipe Unit Diminati</label>
							<select id="nb-type" bind:value={formType} class="nb-input" style="width:100%;padding:14px 16px;border:1px solid #e2e0d9;border-radius:2px;font-size:15px;color:#0A1F44;outline:none;background:#fff;transition:border-color .3s;">
								{#each plans as p}
									<option>{p.code} — {p.nm}</option>
								{/each}
								<option>Konsultasi Umum</option>
							</select>
						</div>
						<div>
							<label for="nb-msg" style="display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9aa3b5;margin-bottom:8px;">Pesan (Opsional)</label>
							<textarea id="nb-msg" rows="3" placeholder="Ceritakan kebutuhan Anda..." bind:value={formMessage} class="nb-input" style="width:100%;padding:14px 16px;border:1px solid #e2e0d9;border-radius:2px;font-size:15px;color:#0A1F44;outline:none;resize:vertical;font-family:inherit;transition:border-color .3s;"></textarea>
						</div>
						{#if formError}
							<div style="color:#b3261e;font-size:13.5px;background:#fdecea;border:1px solid #f5c2bd;border-radius:2px;padding:10px 14px;">{formError}</div>
						{/if}
						<button type="submit" disabled={submitting} class="btn-gold" style="margin-top:6px;padding:17px;background:linear-gradient(135deg,var(--nb-accent-l),var(--nb-accent));color:#08152E;border:none;border-radius:2px;font-size:13.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:all .35s;opacity:{submitting ? '.7' : '1'};">{submitting ? 'Mengirim…' : 'Kirim Permintaan'}</button>
					</form>
				{:else}
					<div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:30px 0;gap:18px;">
						<span style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--nb-accent-l),var(--nb-accent));display:flex;align-items:center;justify-content:center;"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#08152E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7" /></svg></span>
						<h3 style="font-family:var(--nb-head);font-weight:700;font-size:26px;color:var(--nb-navy);margin:0;">Terima Kasih!</h3>
						<p style="color:#7a8499;font-size:15.5px;line-height:1.7;margin:0;max-width:300px;">Permintaan Anda telah kami terima. Tim marketing akan segera menghubungi Anda.</p>
						<button onclick={() => (sent = false)} style="background:none;border:none;color:var(--nb-accent);font-size:13px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;border-bottom:1px solid var(--nb-accent);padding-bottom:3px;">Kirim Lagi</button>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- ================= FOOTER ================= -->
	<footer style="background:#060e22;padding:clamp(60px,7vw,90px) clamp(20px,5vw,56px) 36px;">
		<div style="max-width:1320px;margin:0 auto;display:flex;gap:clamp(36px,5vw,72px);flex-wrap:wrap;justify-content:space-between;padding-bottom:48px;border-bottom:1px solid rgba(255,255,255,.08);">
			<div style="flex:1 1 300px;max-width:360px;">
				<img src="/uploads/logo_light.png" alt="Noblesse Property" style="height:80px;width:auto;margin-bottom:22px;" />
				<p style="color:#7a8499;font-size:14.5px;line-height:1.8;margin:0;">{s('footer_about', 'Pengembang hunian premium yang membangun warisan lintas generasi melalui arsitektur elegan dan kawasan terencana.')}</p>
			</div>
			<div style="flex:0 1 auto;">
				<div style="font-family:'Cinzel',serif;font-size:12px;letter-spacing:.2em;color:var(--nb-accent);margin-bottom:20px;">NAVIGASI</div>
				<div style="display:flex;flex-direction:column;gap:12px;">
					{#each footerNav as item}
						<a href={item.h} class="footer-link" style="color:#aeb9d1;font-size:14.5px;transition:color .3s;">{item.l}</a>
					{/each}
				</div>
			</div>
			<div style="flex:0 1 auto;">
				<div style="font-family:'Cinzel',serif;font-size:12px;letter-spacing:.2em;color:var(--nb-accent);margin-bottom:20px;">HUNIAN</div>
				<div style="display:flex;flex-direction:column;gap:12px;">
					{#each footerHunian as item}
						<a href={item.h} class="footer-link" style="color:#aeb9d1;font-size:14.5px;transition:color .3s;">{item.l}</a>
					{/each}
				</div>
			</div>
			<div style="flex:0 1 auto;">
				<div style="font-family:'Cinzel',serif;font-size:12px;letter-spacing:.2em;color:var(--nb-accent);margin-bottom:20px;">KONTAK</div>
				<div style="display:flex;flex-direction:column;gap:12px;">
					<a href={waUrl} target="_blank" rel="noopener" class="footer-link" style="color:#aeb9d1;font-size:14.5px;transition:color .3s;">{waDisplay}</a>
					<a href={igUrl} target="_blank" rel="noopener" class="footer-link" style="color:#aeb9d1;font-size:14.5px;transition:color .3s;">{igHandle}</a>
				</div>
				<div style="display:flex;gap:12px;margin-top:22px;">
					<a href={waUrl} target="_blank" rel="noopener" aria-label="WhatsApp" class="social-icon" style="width:40px;height:40px;border-radius:50%;border:1px solid rgba(212,175,55,.3);display:flex;align-items:center;justify-content:center;transition:all .3s;"><svg width="18" height="18" viewBox="0 0 24 24" fill="#D4AF37"><path d={waPath} /></svg></a>
					<a href={igUrl} target="_blank" rel="noopener" aria-label="Instagram" class="social-icon" style="width:40px;height:40px;border-radius:50%;border:1px solid rgba(212,175,55,.3);display:flex;align-items:center;justify-content:center;transition:all .3s;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="#D4AF37" stroke="none" /></svg></a>
				</div>
			</div>
		</div>
		<div style="max-width:1320px;margin:0 auto;padding-top:28px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;">
			<span style="color:#5b6680;font-size:13px;">© 2026 Noblesse Property. Hak cipta dilindungi.</span>
			<span style="color:#5b6680;font-size:13px;">Kebijakan Privasi · Syarat &amp; Ketentuan</span>
		</div>
	</footer>

	<!-- ================= FLOATING BUTTONS ================= -->
	<button
		onclick={scrollTop}
		aria-label="Kembali ke atas"
		class="back-to-top"
		style="position:fixed;right:24px;bottom:92px;z-index:120;width:48px;height:48px;border-radius:50%;border:1px solid rgba(212,175,55,.5);background:rgba(8,21,46,.9);backdrop-filter:blur(8px);color:var(--nb-accent);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .4s ease;opacity:{showBackToTop ? '1' : '0'};pointer-events:{showBackToTop ? 'auto' : 'none'};transform:{showBackToTop ? 'translateY(0) scale(1)' : 'translateY(14px) scale(.9)'};"
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6" /></svg>
	</button>
	<a
		href={waUrl}
		target="_blank"
		rel="noopener"
		aria-label="Chat WhatsApp"
		class="wa-float"
		style="position:fixed;right:24px;bottom:24px;z-index:120;width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#25D366,#128C7E);display:flex;align-items:center;justify-content:center;box-shadow:0 12px 34px rgba(37,211,102,.45);transition:transform .3s;"
	>
		<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d={waPath} /></svg>
	</a>
</div>

<style>
	/* Hover states ported from the prototype's style-hover attributes */
	.nav-link:hover {
		color: var(--nb-accent-l);
	}
	.nav-cta:hover {
		background: linear-gradient(135deg, var(--nb-accent-l), var(--nb-accent));
		color: #08152e;
		border-color: transparent;
		box-shadow: 0 10px 30px rgba(212, 175, 55, 0.35);
	}
	.btn-gold:hover {
		transform: translateY(-3px);
		box-shadow: 0 22px 54px rgba(212, 175, 55, 0.5);
	}
	.btn-outline:hover {
		border-color: var(--nb-accent);
		background: rgba(212, 175, 55, 0.1);
	}
	.proj-card:hover {
		transform: translateY(-12px);
		box-shadow:
			0 34px 70px rgba(10, 31, 68, 0.16),
			0 0 0 1px rgba(212, 175, 55, 0.5);
	}
	.fac-card:hover {
		background: rgba(212, 175, 55, 0.07);
		border-color: rgba(212, 175, 55, 0.4);
		transform: translateY(-6px);
	}
	.map-link:hover {
		background: var(--nb-accent);
		color: #08152e;
	}
	.slider-arrow:hover {
		background: var(--nb-accent);
		color: #08152e;
	}
	.contact-row:hover {
		background: rgba(212, 175, 55, 0.08);
		border-color: rgba(212, 175, 55, 0.45);
		transform: translateX(6px);
	}
	.footer-link:hover {
		color: #fff;
	}
	.social-icon:hover {
		background: var(--nb-accent);
		border-color: var(--nb-accent);
	}
	.nb-input:focus {
		border-color: var(--nb-accent);
	}
	.wa-float:hover {
		transform: scale(1.08);
	}
	.back-to-top:hover {
		background: var(--nb-accent);
		color: #08152e;
	}
</style>
