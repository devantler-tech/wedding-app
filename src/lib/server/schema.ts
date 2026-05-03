import { pgTable, serial, varchar, boolean, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const guestPairs = pgTable('guest_pairs', {
	id: serial('id').primaryKey(),
	code: varchar('code', { length: 8 }).unique().notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

export const guests = pgTable('guests', {
	id: serial('id').primaryKey(),
	guestPairId: integer('guest_pair_id')
		.references(() => guestPairs.id)
		.notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	attending: boolean('attending'),
	dietaryNotes: text('dietary_notes'),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

export const roomBookings = pgTable('room_bookings', {
	id: serial('id').primaryKey(),
	guestPairId: integer('guest_pair_id')
		.references(() => guestPairs.id)
		.unique()
		.notNull(),
	requested: boolean('requested').notNull().default(false),
	nights: integer('nights').default(1),
	notes: text('notes'),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

export const sessions = pgTable('sessions', {
	id: varchar('id', { length: 64 }).primaryKey(),
	guestPairId: integer('guest_pair_id')
		.references(() => guestPairs.id)
		.notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});
