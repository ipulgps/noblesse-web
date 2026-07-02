import { db } from '$lib/server/db';
import { vouchers, voucherTemplates } from '$lib/server/schema';
import { decryptVoucherCode } from '$lib/server/voucher-token';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const code = decryptVoucherCode(params.token);
	if (!code) return { valid: false as const };

	const [row] = await db
		.select({
			code: vouchers.code,
			status: vouchers.status,
			expiredAt: vouchers.expiredAt,
			amount: voucherTemplates.amount,
			redeemLocation: voucherTemplates.redeemLocation
		})
		.from(vouchers)
		.innerJoin(voucherTemplates, eq(vouchers.templateId, voucherTemplates.id))
		.where(eq(vouchers.code, code))
		.limit(1);

	if (!row) return { valid: false as const };

	const expired = row.expiredAt ? new Date(row.expiredAt).getTime() <= Date.now() : false;
	const valid = row.status !== 'tidak_aktif' && !expired;

	return {
		valid,
		code: row.code,
		amount: row.amount,
		redeemLocation: row.redeemLocation,
		expiredAt: row.expiredAt
	} as const;
};
