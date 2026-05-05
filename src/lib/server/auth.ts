import { randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from './db.js';
import { adminSessions, guestPairs, sessions } from './schema.js';
import { eq, and, gt } from 'drizzle-orm';

const SESSION_DURATION_DAYS = 30;
const DEFAULT_ADMIN_CODE = 'harndrupbryllupadmins1234';

export function getAdminCode(): string {
	return process.env.ADMIN_CODE?.trim() || DEFAULT_ADMIN_CODE;
}

export function validateAdminCode(code: string): boolean {
	const expected = getAdminCode();
	const provided = code.trim();
	if (provided.length !== expected.length) return false;
	return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function createAdminSession(): Promise<string> {
	const sessionId = randomBytes(32).toString('hex');
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

	await db.insert(adminSessions).values({
		id: sessionId,
		expiresAt
	});

	return sessionId;
}

export async function getAdminSession(sessionId: string): Promise<boolean> {
	const [session] = await db
		.select({ id: adminSessions.id })
		.from(adminSessions)
		.where(and(eq(adminSessions.id, sessionId), gt(adminSessions.expiresAt, new Date())))
		.limit(1);

	return !!session;
}

export async function deleteAdminSession(sessionId: string): Promise<void> {
	await db.delete(adminSessions).where(eq(adminSessions.id, sessionId));
}

export async function validateCode(code: string) {
	const [pair] = await db
		.select()
		.from(guestPairs)
		.where(eq(guestPairs.code, code.toUpperCase().trim()))
		.limit(1);

	return pair ?? null;
}

export async function createSession(guestPairId: number): Promise<string> {
	const sessionId = randomBytes(32).toString('hex');
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

	await db.insert(sessions).values({
		id: sessionId,
		guestPairId,
		expiresAt
	});

	return sessionId;
}

export async function getSession(sessionId: string) {
	const [session] = await db
		.select({
			sessionId: sessions.id,
			guestPairId: sessions.guestPairId,
			expiresAt: sessions.expiresAt,
			pairName: guestPairs.name,
			pairCode: guestPairs.code
		})
		.from(sessions)
		.innerJoin(guestPairs, eq(sessions.guestPairId, guestPairs.id))
		.where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
		.limit(1);

	return session ?? null;
}

export async function deleteSession(sessionId: string) {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}
