import { randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from './db.js';
import { guestPairs, guests } from './schema.js';

export const GUEST_PAIRS = [
	'Charlotte og Orla',
	'Alette og Sunny',
	'Mathias og Ane Kirstine',
	'Kurt og Trine',
	'Karen Lise',
	'Birgit og Tage',
	'Gerda',
	'Monica og Lasse',
	'Louise og Matias',
	'Clara og Frederik',
	'Monica og Philip',
	'Linnea og Malthe',
	'Louise og Maja'
];

function generateCode(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	// Rejection sampling avoids modulo bias from uneven byte→char mapping
	const maxValid = Math.floor(256 / chars.length) * chars.length;
	let code = '';
	while (code.length < 6) {
		for (const byte of randomBytes(6)) {
			if (byte < maxValid && code.length < 6) {
				code += chars[byte % chars.length];
			}
		}
	}
	return code;
}

export function parseGuestNames(pairName: string): string[] {
	if (pairName.includes(' og ')) {
		return pairName.split(' og ').map((n) => n.trim());
	}
	return [pairName.trim()];
}

export async function runSeed(): Promise<void> {
	await db.transaction(async (tx) => {
		// Advisory lock serializes seeding across concurrent replicas
		await tx.execute(sql`SELECT pg_advisory_xact_lock(42)`);

		const existing = await tx.select().from(guestPairs).limit(1);
		if (existing.length > 0) {
			console.log('🌱 Seed data already exists, skipping.');
			return;
		}

		console.log('🌱 Seeding database...');

		for (const pairName of GUEST_PAIRS) {
			const code = generateCode();
			const [pair] = await tx
				.insert(guestPairs)
				.values({ code, name: pairName })
				.returning();

			const names = parseGuestNames(pairName);
			for (const name of names) {
				await tx.insert(guests).values({ guestPairId: pair.id, name });
			}

			console.log(`  ✅ ${pairName} → [code hidden]`);
		}

		console.log('✨ Seeding complete!');
	});
}

// CLI entrypoint
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
	runSeed()
		.then(() => process.exit(0))
		.catch((err) => {
			console.error('❌ Seed failed:', err);
			process.exit(1);
		});
}
