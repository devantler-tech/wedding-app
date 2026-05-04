import { randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from './db.js';
import { guestPairs, sessions } from './schema.js';
import { eq, and, gt } from 'drizzle-orm';

const SESSION_DURATION_DAYS = 30;
const SESSION_DURATION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;
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

// Admin sessions are kept in-memory: the admin route is rare, low-traffic, and
// keeping it out of the DB avoids extending the guest-only schema. Server
// restarts invalidate admin sessions, which is acceptable here.
const adminSessions = new Map<string, number>();

function pruneExpiredAdminSessions(now: number) {
	for (const [id, expiresAt] of adminSessions) {
		if (expiresAt <= now) adminSessions.delete(id);
	}
}

export function createAdminSession(): string {
	const sessionId = randomBytes(32).toString('hex');
	const now = Date.now();
	pruneExpiredAdminSessions(now);
	adminSessions.set(sessionId, now + SESSION_DURATION_MS);
	return sessionId;
}

export function getAdminSession(sessionId: string): boolean {
	const expiresAt = adminSessions.get(sessionId);
	if (!expiresAt) return false;
	if (expiresAt <= Date.now()) {
		adminSessions.delete(sessionId);
		return false;
	}
	return true;
}

export function deleteAdminSession(sessionId: string) {
	adminSessions.delete(sessionId);
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
