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
	location: varchar('location', { length: 160 }).notNull(),
	priceLabel: varchar('price_label', { length: 60 }).notNull(),
	badge: varchar('badge', { length: 40 }),
	badgeStyle: mysqlEnum('badge_style', ['gold', 'dark']).notNull().default('gold'),
	imagePath: varchar('image_path', { length: 255 }),
	description: text('description'),
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
