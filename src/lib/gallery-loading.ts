/** How far (in slides) from the active position images still load eagerly.
 *  2 covers the centred slide, the visible peeking neighbours, and one
 *  prefetched slide per side — everything further defers until the carousel
 *  approaches it, instead of downloading the whole gallery on first paint. */
export const EAGER_RADIUS = 2;

/** Native `loading` hint for the slide at `slideIndex` while `activePos` is
 *  centred. Both index into the carousel's extended (clone-padded) slide list,
 *  so the eager window simply follows the active position across wraps. */
export function galleryImageLoading(slideIndex: number, activePos: number): 'eager' | 'lazy' {
	return Math.abs(slideIndex - activePos) <= EAGER_RADIUS ? 'eager' : 'lazy';
}
