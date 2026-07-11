import { readdirSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { galleryEntries } from '$lib/gallery-data.js';

describe('galleryEntries', () => {
	it('has at least one entry', () => {
		expect(galleryEntries.length).toBeGreaterThan(0);
	});

	it('each entry has required fields', () => {
		for (const entry of galleryEntries) {
			expect(entry.file).toBeTruthy();
			expect(entry.alt).toBeTruthy();
			expect(entry.caption).toBeTruthy();
		}
	});

	it('entries and gallery asset files match one-to-one', () => {
		// fs instead of the ?enhanced glob so this test never pulls the image
		// pipeline into the unit-test module graph.
		const assetFiles = readdirSync('src/lib/assets/gallery').sort();
		const entryFiles = galleryEntries.map((entry) => entry.file).sort();

		expect(entryFiles).toEqual(assetFiles);
	});

	it('each entry has a positive aspect ratio', () => {
		for (const entry of galleryEntries) {
			expect(typeof entry.ratio).toBe('number');
			expect(entry.ratio).toBeGreaterThan(0);
		}
	});
});
