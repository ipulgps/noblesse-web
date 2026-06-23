// Seed data awal — memindahkan data yang sebelumnya hardcoded di +page.svelte ke DB.
// Jalankan: npm run db:seed   (atau: node --env-file=.env db/seed.mjs)
//
// Bersifat idempoten: tabel dikosongkan dulu (kecuali admin_users & leads) lalu diisi ulang.
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL tidak ditemukan. Jalankan: npm run db:seed');
	process.exit(1);
}

const db = await mysql.createConnection({ uri: url, multipleStatements: true });

async function reset(table) {
	await db.query(`DELETE FROM \`${table}\``);
	await db.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
}

// ---------- STATS ----------
await reset('stats');
const stats = [
	[12, '+', 'Tahun Pengalaman', 0],
	[2500, '+', 'Unit Terjual', 1],
	[18, '', 'Kawasan Hunian', 2],
	[98, '%', 'Indeks Kepuasan', 3]
];
for (const [value, suffix, label, sort] of stats) {
	await db.query(
		'INSERT INTO stats (value, suffix, label, sort_order) VALUES (?,?,?,?)',
		[value, suffix, label, sort]
	);
}

// ---------- ABOUT TIMELINE ----------
await reset('about_timeline');
const timeline = [
	['2013 — Awal Perjalanan', 'Noblesse Property didirikan dengan satu kawasan pertama.', 0],
	['2017 — 1.000 Unit Terjual', 'Pencapaian tonggak kepercayaan ribuan keluarga.', 1],
	['2021 — Penghargaan Developer', 'Diakui sebagai pengembang hunian premium terbaik.', 2],
	['2025 — 18 Kawasan', 'Hadir di lokasi-lokasi paling strategis di tanah air.', 3]
];
for (const [yt, d, sort] of timeline) {
	await db.query(
		'INSERT INTO about_timeline (year_title, description, sort_order) VALUES (?,?,?)',
		[yt, d, sort]
	);
}

// ---------- PROJECTS ----------
await reset('projects');
const projects = [
	['Noblesse Grand Avenue', 'Bandung Utara', 'Rp 2,8 M', 'Ready Stock', 'gold', 0],
	['Noblesse Hills Residence', 'Sentul, Bogor', 'Rp 1,5 M', 'Selling Fast', 'dark', 1],
	['Noblesse Signature', 'BSD, Tangerang', 'Rp 4,2 M', 'New Launch', 'gold', 2]
];
for (const [name, loc, price, badge, style, sort] of projects) {
	await db.query(
		'INSERT INTO projects (name, location, price_label, badge, badge_style, sort_order) VALUES (?,?,?,?,?,?)',
		[name, loc, price, badge, style, sort]
	);
}

// ---------- GALLERY ----------
await reset('gallery_images');
const galleryHeights = [300, 230, 360, 260, 330, 240];
for (let i = 0; i < galleryHeights.length; i++) {
	await db.query(
		'INSERT INTO gallery_images (image_path, caption, height_px, sort_order) VALUES (?,?,?,?)',
		['', 'Foto', galleryHeights[i], i]
	);
}

// ---------- FACILITIES ----------
await reset('facilities');
const facilities = [
	['Masjid', 'Rumah ibadah megah di jantung kawasan.', 'M12 2v3M10.5 4.5a1.5 1.5 0 0 0 3 0M5 21v-7a7 7 0 0 1 14 0v7M3 21h18M9 21v-4a3 3 0 0 1 6 0v4'],
	['Security 24 Jam', 'Penjagaan profesional sepanjang waktu.', 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Zm-3 9 2 2 4-4'],
	['Taman', 'Lanskap hijau yang asri dan menenangkan.', 'M12 22v-6M12 16c-3 0-5-2-5-5 0-2 1-3 1-3s2 1 2 3c0-3 2-6 2-6s2 3 2 6c0-2 2-3 2-3s1 1 1 3c0 3-2 5-5 5Z'],
	['Playground', 'Ruang bermain aman untuk si kecil.', 'M4 20V8l8-4 8 4v12M4 14h16M9 20v-5h6v5'],
	['Jogging Track', 'Jalur lari mengelilingi kawasan hijau.', '<circle cx="15" cy="5" r="2"/><path d="M13 22l-2-6 3-3-1-4-4 2-2 3m12 1 4 1 1 4"/>'],
	['Area Komersial', 'Ruko, kafe, dan kebutuhan harian.', 'M6 8h12l1 12H5L6 8ZM9 8V6a3 3 0 0 1 6 0v2'],
	['CCTV', 'Pemantauan menyeluruh demi keamanan.', '<circle cx="9" cy="20" r="1.5"/><path d="M3 7l13-3 1 4-13 3-1-4ZM4 11v7M16 8l3 5-4 2"/>'],
	['One Gate System', 'Akses tunggal yang aman dan terkontrol.', 'M3 21V5l9-2 9 2v16M3 21h18M8 21V9M16 21V9M12 21V8']
];
for (let i = 0; i < facilities.length; i++) {
	const [title, d, icon] = facilities[i];
	await db.query(
		'INSERT INTO facilities (title, description, icon_svg, sort_order) VALUES (?,?,?,?)',
		[title, d, icon, i]
	);
}

// ---------- LOCATION POINTS ----------
await reset('location_points');
const locations = [
	['Gerbang Tol', '5 menit', 'M4 17l4-9h8l4 9M2 17h20M7 17v2M17 17v2'],
	['Mall & Lifestyle', '10 menit', 'M4 9h16l-1 11H5L4 9ZM8 9V6a4 4 0 0 1 8 0v3'],
	['RS Internasional', '8 menit', 'M4 3h16v18H4zM12 8v6M9 11h6'],
	['Sekolah & Universitas', '7 menit', 'M3 9l9-5 9 5-9 5-9-5ZM7 11v5c0 1 2.2 2 5 2s5-1 5-2v-5'],
	['Bandara', '25 menit', 'M2 16l20-7-7 13-2-5-5-1Z']
];
for (let i = 0; i < locations.length; i++) {
	const [label, time, icon] = locations[i];
	await db.query(
		'INSERT INTO location_points (label, travel_time, icon_svg, sort_order) VALUES (?,?,?,?)',
		[label, time, icon, i]
	);
}

// ---------- HOUSE TYPES ----------
await reset('house_types');
const houseTypes = [
	['Aurelia', 'Tipe 45', 45, 90, '2', '1', '1', '1 Lantai', 0],
	['Valencia', 'Tipe 60', 60, 120, '3', '2', '1', '2 Lantai', 1],
	['Montecristo', 'Tipe 90', 90, 150, '4', '3', '2', '2 Lantai', 2]
];
for (const [name, code, lb, lt, bed, bath, cp, fl, sort] of houseTypes) {
	await db.query(
		'INSERT INTO house_types (name, type_code, building_area, land_area, bedrooms, bathrooms, carport, floors, sort_order) VALUES (?,?,?,?,?,?,?,?,?)',
		[name, code, lb, lt, bed, bath, cp, fl, sort]
	);
}

// ---------- TESTIMONIALS ----------
await reset('testimonials');
const testimonials = [
	['Proses pembelian sangat profesional. Kualitas bangunan jauh melampaui ekspektasi kami.', 'Bpk. Andreas Wijaya', 'Pemilik · Noblesse Grand Avenue', 5, 0],
	['Lingkungan yang aman, asri, dan eksklusif. Tempat terbaik untuk membesarkan keluarga.', 'Ibu Clara Santoso', 'Pemilik · Noblesse Hills', 5, 1],
	['Nilai investasi yang terus tumbuh. Lokasi strategis Noblesse adalah sebuah jaminan.', 'Bpk. Reza Pratama', 'Investor Properti', 5, 2]
];
for (const [quote, name, role, rating, sort] of testimonials) {
	await db.query(
		'INSERT INTO testimonials (quote, author_name, author_role, rating, sort_order) VALUES (?,?,?,?,?)',
		[quote, name, role, rating, sort]
	);
}

// ---------- PARTNER BANKS ----------
await reset('partner_banks');
const banks = ['BCA', 'Mandiri', 'BNI', 'BTN', 'CIMB Niaga', 'Permata'];
for (let i = 0; i < banks.length; i++) {
	await db.query('INSERT INTO partner_banks (name, sort_order) VALUES (?,?)', [banks[i], i]);
}

// ---------- SITE SETTINGS ----------
const settings = {
	hero_title: 'Temukan Hunian Impian Anda',
	hero_subtitle:
		'Perumahan modern dengan konsep premium, arsitektur elegan, dan lokasi paling strategis di jantung kota.',
	about_heading: 'Membangun Warisan, Bukan Sekadar Hunian',
	about_paragraph_1:
		'Selama lebih dari satu dekade, Noblesse Property mendedikasikan diri menciptakan kawasan hunian yang memadukan arsitektur elegan, material premium, dan perencanaan kota yang matang — sebuah standar baru hidup mewah di Indonesia.',
	about_paragraph_2:
		'Visi kami sederhana namun abadi: menghadirkan ruang yang tidak hanya ditinggali, tetapi diwariskan lintas generasi.',
	footer_about:
		'Pengembang hunian premium yang membangun warisan lintas generasi melalui arsitektur elegan dan kawasan terencana.',
	wa_number: '62813544126',
	wa_display: '+62 813-5444-126',
	instagram_url: 'https://instagram.com/noblesseproperty',
	instagram_handle: '@noblesseproperty',
	maps_url: 'https://www.google.com/maps',
	location_marker_label: 'NOBLESSE GRAND AVENUE',
	kpr_default_price: '2800',
	kpr_default_dp: '20',
	kpr_default_tenor: '15',
	kpr_default_rate: '8.5'
};
for (const [key, value] of Object.entries(settings)) {
	await db.query(
		'INSERT INTO site_settings (`key`, `value`) VALUES (?,?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
		[key, value]
	);
}

console.log('✓ Seed selesai.');
console.log('  stats: 4, timeline: 4, projects: 3, gallery: 6, facilities: 8,');
console.log('  locations: 5, house_types: 3, testimonials: 3, banks: 6, settings:', Object.keys(settings).length);
await db.end();
