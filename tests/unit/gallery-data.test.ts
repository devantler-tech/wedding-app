import { describe, it, expect } from 'vitest';
import { galleryEntries } from '$lib/gallery-data.js';

describe('galleryEntries', () => {
	it('has at least one entry', () => {
		expect(galleryEntries.length).toBeGreaterThan(0);
	});

	it('each entry has required fields', () => {
		for (const entry of galleryEntries) {
			expect(entry.src).toBeTruthy();
			expect(entry.alt).toBeTruthy();
			expect(entry.caption).toBeTruthy();
			expect(entry.date).toBeTruthy();
		}
	});

	it('entries are in chronological order', () => {
		for (let i = 1; i < galleryEntries.length; i++) {
			expect(galleryEntries[i].date >= galleryEntries[i - 1].date).toBe(true);
		}
	});

	it('image sources point to gallery directory', () => {
		for (const entry of galleryEntries) {
			expect(entry.src).toMatch(/^\/gallery\//);
		}
	});
});
