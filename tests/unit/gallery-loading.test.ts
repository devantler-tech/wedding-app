import { describe, it, expect } from 'vitest';
import { EAGER_RADIUS, galleryImageLoading } from '$lib/gallery-loading.js';
import { galleryEntries } from '$lib/gallery-data.js';

describe('galleryImageLoading', () => {
	it('loads the active slide and its visible neighbours eagerly', () => {
		expect(galleryImageLoading(5, 5)).toBe('eager');
		expect(galleryImageLoading(4, 5)).toBe('eager');
		expect(galleryImageLoading(6, 5)).toBe('eager');
	});

	it('defers slides outside the eager window', () => {
		expect(galleryImageLoading(5 + EAGER_RADIUS + 1, 5)).toBe('lazy');
		expect(galleryImageLoading(5 - EAGER_RADIUS - 1, 5)).toBe('lazy');
		expect(galleryImageLoading(0, 20)).toBe('lazy');
	});

	it('moves the eager window with the active position', () => {
		const slide = 9;
		expect(galleryImageLoading(slide, 3)).toBe('lazy');
		expect(galleryImageLoading(slide, slide - EAGER_RADIUS)).toBe('eager');
		expect(galleryImageLoading(slide, slide + EAGER_RADIUS)).toBe('eager');
	});

	it('covers the peeking neighbours but only a fraction of the gallery', () => {
		// The carousel shows the active slide plus a peek of each neighbour, so the
		// window must span at least ±1 — while staying far below the full set, which
		// is the whole point (the gallery must not download in one burst).
		expect(EAGER_RADIUS).toBeGreaterThanOrEqual(1);
		expect(2 * EAGER_RADIUS + 1).toBeLessThan(galleryEntries.length);
	});
});
