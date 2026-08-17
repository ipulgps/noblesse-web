import {
	mysqlTable,
	int,
	varchar,
	text,
	tinyint,
	datetime,
	mysqlEnum
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// Helper kolom timestamp yang dipakai berulang
const createdAt = datetime('created_at')
	.notNull()
	.default(sql`CURRENT_TIMESTAMP`);
const updatedAt = datetime('updated_at')
	.notNull()
	.default(sql`CURRENT_TIMESTAMP`)
	.$onUpdate(() => sql`CURRENT_TIMESTAMP`);

// ========== AUTENTIKASI ADMIN ==========
export const adminUsers = mysqlTable('admin_users', {
	id: int('id').autoincrement().primaryKey(),
	name: varchar('name', { length: 120 }).notNull(),
	email: varchar('email', { length: 190 }).notNull().unique(),
	passwordHash: varchar('password_hash', { length: 255 }).notNull(),
	role: mysqlEnum('role', ['superadmin', 'editor']).notNull().default('editor'),
	lastLoginAt: datetime('last_login_at'),
	createdAt,
	updatedAt
});

export const adminSessions = mysqlTable('admin_sessions', {
	id: varchar('id', { length: 64 }).primaryKey(),
	userId: int('user_id').notNull(),
	expiresAt: datetime('expires_at').notNull(),
	createdAt
});

// ========== PENGATURAN UMUM (key-value) ==========
export const siteSettings = mysqlTable('site_settings', {
	key: varchar('key', { length: 100 }).primaryKey(),
	value: text('value'),
	updatedAt
});

// ========== STATISTIK ==========
export const stats = mysqlTable('stats', {
	id: int('id').autoincrement().primaryKey(),
	value: int('value').notNull(),
	suffix: varchar('suffix', { length: 8 }).notNull().default(''),
	label: varchar('label', { length: 120 }).notNull(),
	sortOrder: int('sort_order').notNull().default(0),
	isActive: tinyint('is_active').notNull().default(1),
	createdAt,
	updatedAt
});

// ========== TIMELINE TENTANG KAMI ==========
export const aboutTimeline = mysqlTable('about_timeline', {
	id: int('id').autoincrement().primaryKey(),
	yearTitle: varchar('year_title', { length: 160 }).notNull(),
	description: varchar('description', { length: 255 }).notNull(),
	sortOrder: int('sort_order').notNull().default(0),
	isActive: tinyint('is_active').notNull().default(1),
	createdAt,
	updatedAt
});

// ========== PROYEK ==========
export const projects = mysqlTable('projects', {
	id: int('id').autoincrement().primaryKey(),
	name: varchar('name', { length: 160 }).notNull(),
	// Dipakai untuk URL publik (mis. /tur-virtual/[slug]) — unik, diisi admin dari form project.
	slug: varchar('slug', { length: 160 }).notNull().unique(),
	location: varchar('location', { length: 160 }).notNull(),
	priceLabel: varchar('price_label', { length: 60 }).notNull(),
	badge: varchar('badge', { length: 40 }),
	badgeStyle: mysqlEnum('badge_style', ['gold', 'dark']).notNull().default('gold'),
	imagePath: varchar('image_path', { length: 255 }),
	description: text('description'),
	// Desain rumah yang dipakai proyek ini (relasi ke house_types.id, tanpa FK constraint mengikuti pola tabel lain di file ini)
	houseTypeId: int('house_type_id'),
	sortOrder: int('sort_order').notNull().default(0),
	isActive: tinyint('is_active').notNull().default(1),
	createdAt,
	updatedAt
});

// ========== GALERI ==========
export const galleryImages = mysqlTable('gallery_images', {
	id: int('id').autoincrement().primaryKey(),
	imagePath: varchar('image_path', { length: 255 }).notNull(),
	caption: varchar('caption', { length: 160 }),
	heightPx: int('height_px').notNull().default(300),
	sortOrder: int('sort_order').notNull().default(0),
	isActive: tinyint('is_active').notNull().default(1),
	createdAt
});

// ========== FASILITAS ==========
export const facilities = mysqlTable('facilities', {
	id: int('id').autoincrement().primaryKey(),
	title: varchar('title', { length: 120 }).notNull(),
	description: varchar('description', { length: 255 }).notNull(),
	iconSvg: text('icon_svg'),
	sortOrder: int('sort_order').notNull().default(0),
	isActive: tinyint('is_active').notNull().default(1),
	createdAt,
	updatedAt
});

// ========== TITIK LOKASI / AKSES ==========
export const locationPoints = mysqlTable('location_points', {
	id: int('id').autoincrement().primaryKey(),
	label: varchar('label', { length: 120 }).notNull(),
	travelTime: varchar('travel_time', { length: 40 }).notNull(),
	iconSvg: text('icon_svg'),
	sortOrder: int('sort_order').notNull().default(0),
	isActive: tinyint('is_active').notNull().default(1),
	createdAt
});

// ========== TIPE RUMAH / DENAH ==========
export const houseTypes = mysqlTable('house_types', {
	id: int('id').autoincrement().primaryKey(),
	name: varchar('name', { length: 80 }).notNull(),
	typeCode: varchar('type_code', { length: 20 }).notNull(),
	buildingArea: int('building_area').notNull(),
	landArea: int('land_area').notNull(),
	bedrooms: varchar('bedrooms', { length: 10 }).notNull(),
	bathrooms: varchar('bathrooms', { length: 10 }).notNull(),
	carport: varchar('carport', { length: 10 }).notNull(),
	floors: varchar('floors', { length: 40 }).notNull(),
	floorplanImg: varchar('floorplan_img', { length: 255 }),
	sortOrder: int('sort_order').notNull().default(0),
	isActive: tinyint('is_active').notNull().default(1),
	createdAt,
	updatedAt
});

// ========== TITIK TUR VIRTUAL 360° (per proyek) ==========
export const virtualTourNodes = mysqlTable('virtual_tour_nodes', {
	id: int('id').autoincrement().primaryKey(),
	// Relasi ke projects.id, tanpa FK constraint mengikuti pola tabel lain di file ini
	projectId: int('project_id').notNull(),
	tourType: mysqlEnum('tour_type', ['interior', 'streetview']).notNull(),
	// id stabil dipakai untuk referensi link antar node (mis. 'teras', 'gerbang')
	nodeKey: varchar('node_key', { length: 60 }).notNull(),
	name: varchar('name', { length: 120 }).notNull(),
	imagePath: varchar('image_path', { length: 255 }).notNull(),
	mapX: int('map_x').notNull().default(50), // posisi di denah skematik, 0-100
	mapY: int('map_y').notNull().default(50),
	// Arah pandang awal kamera 360° saat node ini dimuat (yaw, derajat 0-360).
	// null = belum diatur -> viewer mulai dari horizon depan (yaw 0). Dipakai
	// sebagai defaultYaw node di Photo Sphere Viewer (lihat VirtualTour.svelte).
	initialYaw: int('initial_yaw'),
	// JSON.stringify([{ to: 'nodeKey', yaw: 10 }, ...]) — jumlah link per node bervariasi
	linksJson: text('links_json'),
	markerTitle: varchar('marker_title', { length: 120 }),
	markerDesc: varchar('marker_desc', { length: 500 }),
	markerYaw: varchar('marker_yaw', { length: 20 }), // mis. '25deg'
	markerPitch: varchar('marker_pitch', { length: 20 }), // mis. '-6deg'
	sortOrder: int('sort_order').notNull().default(0),
	isActive: tinyint('is_active').notNull().default(1),
	createdAt,
	updatedAt
});

// ========== TESTIMONI ==========
export const testimonials = mysqlTable('testimonials', {
	id: int('id').autoincrement().primaryKey(),
	quote: text('quote').notNull(),
	authorName: varchar('author_name', { length: 120 }).notNull(),
	authorRole: varchar('author_role', { length: 160 }),
	rating: tinyint('rating').notNull().default(5),
	photoPath: varchar('photo_path', { length: 255 }),
	sortOrder: int('sort_order').notNull().default(0),
	isActive: tinyint('is_active').notNull().default(1),
	createdAt,
	updatedAt
});

// ========== BANK REKANAN ==========
export const partnerBanks = mysqlTable('partner_banks', {
	id: int('id').autoincrement().primaryKey(),
	name: varchar('name', { length: 80 }).notNull(),
	logoPath: varchar('logo_path', { length: 255 }),
	sortOrder: int('sort_order').notNull().default(0),
	isActive: tinyint('is_active').notNull().default(1)
});

// ========== PROSPEK / LEADS ==========
export const leads = mysqlTable('leads', {
	id: int('id').autoincrement().primaryKey(),
	name: varchar('name', { length: 160 }).notNull(),
	whatsapp: varchar('whatsapp', { length: 40 }).notNull(),
	interestedType: varchar('interested_type', { length: 120 }),
	message: text('message'),
	source: varchar('source', { length: 60 }).notNull().default('website_form'),
	status: mysqlEnum('status', ['baru', 'dihubungi', 'closing', 'batal'])
		.notNull()
		.default('baru'),
	createdAt
});

// ========== TEMPLATE VOUCHER DIGITAL ==========
export const voucherTemplates = mysqlTable('voucher_templates', {
	id: int('id').autoincrement().primaryKey(),
	name: varchar('name', { length: 120 }).notNull(),
	imagePath: varchar('image_path', { length: 255 }).notNull(),
	// Posisi & ukuran QR code di atas gambar template (px, dari kiri-atas).
	qrX: int('qr_x').notNull().default(0),
	qrY: int('qr_y').notNull().default(0),
	qrSize: int('qr_size').notNull().default(200),
	// Posisi & gaya teks nomor voucher di atas gambar template.
	codeX: int('code_x').notNull().default(0),
	codeY: int('code_y').notNull().default(0),
	fontSize: int('font_size').notNull().default(32),
	textColor: varchar('text_color', { length: 20 }).notNull().default('#000000'),
	// Nominal voucher (Rp) dan lokasi penukaran — berlaku untuk semua kode dari template ini.
	amount: int('amount').notNull().default(0),
	redeemLocation: varchar('redeem_location', { length: 255 }).notNull().default(''),
	// Posisi & gaya teks tanggal kedaluwarsa di atas gambar template.
	expiredX: int('expired_x').notNull().default(0),
	expiredY: int('expired_y').notNull().default(0),
	expiredFontSize: int('expired_font_size').notNull().default(24),
	expiredTextColor: varchar('expired_text_color', { length: 20 }).notNull().default('#000000'),
	isActive: tinyint('is_active').notNull().default(1),
	createdAt,
	updatedAt
});

// ========== VOUCHER ==========
export const vouchers = mysqlTable('vouchers', {
	id: int('id').autoincrement().primaryKey(),
	code: varchar('code', { length: 12 }).notNull().unique(),
	templateId: int('template_id').notNull(),
	status: mysqlEnum('status', [
		'belum_aktivasi',
		'aktif',
		'tidak_aktif',
		'sudah_digunakan',
		'sudah_diklaim'
	])
		.notNull()
		.default('belum_aktivasi'),
	// Tanggal kedaluwarsa — diisi admin saat generate voucher (bisa beda per batch).
	expiredAt: datetime('expired_at'),
	// Path gambar hasil generate (QR + nomor di-composite ke template) — dibuat
	// sekali saat klaim pertama, lalu dipakai ulang untuk klaim/unduh berikutnya.
	generatedImagePath: varchar('generated_image_path', { length: 255 }),
	claimedAt: datetime('claimed_at'),
	createdAt,
	updatedAt
});
