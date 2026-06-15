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
		}
	});

	it('image sources point to gallery directory', () => {
		for (const entry of galleryEntries) {
			expect(entry.src).toMatch(/^\/gallery\//);
		}
	});

	it('each entry has a positive aspect ratio', () => {
		for (const entry of galleryEntries) {
			expect(typeof entry.ratio).toBe('number');
			expect(entry.ratio).toBeGreaterThan(0);
		}
	});
});
