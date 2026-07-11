<script lang="ts">
	import { galleryEntries, type GalleryRatio } from '$lib/gallery-data.js';
	import { galleryImage } from '$lib/gallery-images.js';
	import { galleryImageLoading } from '$lib/gallery-loading.js';

	/** Responsive `sizes` hint: a slide is at most 86vw wide (the mobile cap) and
	 *  at most `ratio × 640px` (the desktop height cap times the photo's aspect
	 *  ratio), so the browser never downloads a larger variant than the slide can
	 *  render. */
	const slideSizes = (ratio: GalleryRatio) => `min(86vw, ${Math.round(ratio * 640)}px)`;

	const n = galleryEntries.length;
	const K = 3; // cloned slides on each side for the seamless loop

	// Extended list: [last K clones, ...all, first K clones]
	const extended = [
		...galleryEntries.slice(n - K),
		...galleryEntries,
		...galleryEntries.slice(0, K)
	];

	// `pos` indexes into `extended`; the real window is [K, K + n - 1].
	let pos = $state(K);
	let snapping = $state(false); // disables the slide transition during the invisible wrap-around jump
	let mounted = $state(false); // gates the transition so the first positioning is instant

	// Auto-advance pauses while the carousel is hovered, focused, or being dragged.
	let hovering = $state(false);
	let focusedWithin = $state(false);
	let dragging = $state(false);
	const paused = $derived(hovering || focusedWithin || dragging);

	let regionEl: HTMLDivElement | undefined = $state();
	let trackEl: HTMLDivElement | undefined = $state();
	let trackX = $state(0); // computed translateX (px) that centres the active slide

	/** Map any `extended` index back to its real gallery index in [0, n-1]. */
	const realIndex = (p: number) => (((p - K) % n) + n) % n;
	const current = $derived(realIndex(pos));

	// Slides have different widths (each photo keeps its own aspect ratio), so the
	// centre offset is measured from the active slide's laid-out position rather than
	// derived from a fixed slide width.
	function centerOn(i: number) {
		const slide = trackEl?.children[i] as HTMLElement | undefined;
		if (!slide || !regionEl) return;
		trackX = regionEl.clientWidth / 2 - (slide.offsetLeft + slide.offsetWidth / 2);
	}

	// Svelte actions run only in the browser, so the dynamic track offset never
	// becomes an SSR style attribute. Updating the individual CSSOM property
	// remains compatible with a strict style-src-attr policy.
	function setTrackOffset(node: HTMLElement, offset: number) {
		const update = (nextOffset: number) => {
			node.style.transform = `translateX(${nextOffset}px)`;
		};
		update(offset);
		return { update };
	}

	function slideRatioClass(ratio: GalleryRatio): string {
		switch (ratio) {
			case 1.333:
				return 'slide-ratio-1333';
			case 0.75:
				return 'slide-ratio-750';
			case 0.563:
				return 'slide-ratio-563';
			case 0.709:
				return 'slide-ratio-709';
		}
	}

	function next() {
		pos += 1;
	}
	function prev() {
		pos -= 1;
	}
	function go(i: number) {
		pos = K + i;
	}

	/** Run a callback after two animation frames, so a transform paints before a
	 *  flag flips (re-enabling the transition after an instant jump). */
	function afterTwoFrames(fn: () => void) {
		requestAnimationFrame(() => requestAnimationFrame(fn));
	}

	// Reposition whenever the active slide changes (after the DOM has updated).
	$effect(() => {
		centerOn(pos);
	});

	// Enable the slide transition only after the first (instant) positioning.
	$effect(() => {
		afterTwoFrames(() => (mounted = true));
	});

	// Keep the active slide centred on viewport resize (without animating the jump).
	$effect(() => {
		const onResize = () => {
			snapping = true;
			centerOn(pos);
			afterTwoFrames(() => (snapping = false));
		};
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	// After a slide settles, if we've landed on a clone, jump (without animation)
	// to the matching real slide — visually identical, so the loop is seamless.
	function onTrackTransitionEnd(e: TransitionEvent) {
		if (e.target !== trackEl || e.propertyName !== 'transform') return;
		if (pos >= K + n || pos < K) {
			snapping = true;
			pos = realIndex(pos) + K;
			afterTwoFrames(() => (snapping = false));
		}
	}

	// Auto-advance. Respects prefers-reduced-motion.
	$effect(() => {
		if (paused) return;
		const reduceMotion =
			typeof window !== 'undefined' &&
			window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
		if (reduceMotion) return;
		const id = setInterval(next, 6000);
		return () => clearInterval(id);
	});

	// Arrow keys navigate while the carousel (or a control inside it) holds focus.
	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			prev();
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			next();
		}
	}

	function onFocusOut(e: FocusEvent) {
		const region = e.currentTarget as HTMLElement;
		if (!region.contains(e.relatedTarget as Node | null)) focusedWithin = false;
	}

	// Pointer/touch swipe.
	let dragStartX = 0;
	function onPointerDown(e: PointerEvent) {
		dragStartX = e.clientX;
		dragging = true;
	}
	function onPointerUp(e: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		const dx = e.clientX - dragStartX;
		if (Math.abs(dx) > 40) {
			if (dx < 0) next();
			else prev();
		}
	}

	// Clicking a peeking slide brings it to the centre. Moving `pos` to that slide's
	// own index in `extended` always takes the shortest visible path — and when the
	// index is a clone, onTrackTransitionEnd snaps to the real slide, so wrapping
	// first↔last is seamless instead of scrolling back across every other image.
	function onSlideClick(e: number) {
		if (e !== pos) pos = e;
	}

	// Shared styling for the prev/next chevron buttons (only the side differs).
	const navBtnClass =
		'absolute top-1/2 -translate-y-1/2 z-30 grid place-items-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-warm-white/85 backdrop-blur-md text-dark-brown shadow-[0_10px_30px_-10px_rgba(61,46,31,0.55)] ring-1 ring-dark-brown/5 transition-all duration-200 hover:bg-warm-white hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-soft-gold';
</script>

<section id="galleri" class="py-20 sm:py-24 bg-cream">
	<div class="max-w-5xl mx-auto px-6">
		<h2 class="text-4xl sm:text-5xl font-serif font-light text-dark-brown text-center mb-4">
			Vores Rejse
		</h2>
		<div class="w-16 h-px bg-soft-gold mx-auto mb-4"></div>
		<p class="text-center text-warm-brown font-serif italic mb-12 sm:mb-14 max-w-xl mx-auto">
			Et lille udvalg af øjeblikke fra vejen hertil
		</p>
	</div>

	<!-- The carousel is a deliberately focusable, labelled region: it announces its
	     role, shows a visible focus ring, and supports arrow-key navigation as an
	     enhancement on top of the prev/next buttons and progress dots. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={regionEl}
		class="gallery relative w-full overflow-hidden focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-soft-gold"
		role="region"
		aria-roledescription="billedkarrusel"
		aria-label="Vores rejse i billeder — brug venstre og højre piletast for at skifte billede"
		tabindex="0"
		onkeydown={onKey}
		onmouseenter={() => (hovering = true)}
		onmouseleave={() => (hovering = false)}
		onfocusin={() => (focusedWithin = true)}
		onfocusout={onFocusOut}
		onpointerdown={onPointerDown}
		onpointerup={onPointerUp}
		onpointerleave={() => (dragging = false)}
	>
		<div
			bind:this={trackEl}
			class="track {mounted && !snapping ? 'is-animating' : ''}"
			use:setTrackOffset={trackX}
			ontransitionend={onTrackTransitionEnd}
		>
			{#each extended as entry, e (e)}
				{@const active = e === pos}
				<button
					type="button"
					class="slide {slideRatioClass(entry.ratio)} relative flex-shrink-0 overflow-hidden rounded-2xl transition-[opacity,transform,box-shadow] duration-500 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-soft-gold {active
						? 'opacity-100 scale-100 cursor-default shadow-[0_28px_64px_-24px_rgba(61,46,31,0.6)] ring-1 ring-dark-brown/10'
						: 'opacity-50 scale-[0.94] cursor-pointer shadow-[0_14px_40px_-26px_rgba(61,46,31,0.5)] hover:opacity-80'}"
					tabindex="-1"
					aria-hidden={active ? undefined : true}
					aria-label={active ? entry.caption : `Gå til billede: ${entry.caption}`}
					onclick={() => onSlideClick(e)}
				>
					<enhanced:img
						loading={galleryImageLoading(e, pos)}
						src={galleryImage(entry.file)}
						sizes={slideSizes(entry.ratio)}
						alt={active ? entry.alt : ''}
						fetchpriority="low"
						decoding="async"
						draggable="false"
						class="absolute inset-0 h-full w-full object-cover"
					/>
					<!-- Caption — shown on the active slide only -->
					<div
						class="absolute inset-x-0 bottom-0 z-10 px-5 sm:px-7 pt-16 pb-5 text-left pointer-events-none bg-gradient-to-t from-dark-brown/80 via-dark-brown/25 to-transparent transition-opacity duration-500 {active
							? 'opacity-100'
							: 'opacity-0'}"
					>
						<span class="block w-8 h-px bg-soft-gold/90 mb-3"></span>
						<p class="text-warm-white text-base sm:text-xl font-serif italic leading-snug drop-shadow-md">
							{entry.caption}
						</p>
					</div>
				</button>
			{/each}
		</div>

		<!-- Prev / next -->
		<button
			type="button"
			class="{navBtnClass} left-3 sm:left-5"
			onclick={prev}
			aria-label="Forrige billede"
		>
			<i class="fa-solid fa-chevron-left text-sm" aria-hidden="true"></i>
		</button>
		<button
			type="button"
			class="{navBtnClass} right-3 sm:right-5"
			onclick={next}
			aria-label="Næste billede"
		>
			<i class="fa-solid fa-chevron-right text-sm" aria-hidden="true"></i>
		</button>
	</div>

	<div class="max-w-5xl mx-auto px-6">
		<!-- Progress dots -->
		<div class="mt-8 flex flex-wrap items-center justify-center gap-1.5">
			{#each galleryEntries as entry, i (entry.file)}
				<button
					type="button"
					class="h-1.5 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-soft-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream {i ===
					current
						? 'w-8 bg-soft-gold'
						: 'w-2.5 bg-sand/60 hover:bg-warm-brown/50'}"
					onclick={() => go(i)}
					aria-label={`Gå til billede ${i + 1}: ${entry.caption}`}
					aria-current={i === current ? 'true' : undefined}
				></button>
			{/each}
		</div>
		<!-- Counter (announced to assistive tech) -->
		<p
			class="mt-4 text-center text-warm-brown text-xs font-sans tracking-[0.2em] uppercase tabular-nums"
			aria-live="polite"
		>
			{current + 1} <span class="text-warm-brown/40">/</span> {n}
		</p>
	</div>
</section>

<style>
	/* Full-bleed, multi-image filmstrip. Each photo keeps its own aspect ratio
	   (fixed height, width derived from the ratio) so nothing is cropped or
	   letterboxed; neighbours peek on both sides across the full page width. */
	.gallery {
		--h: 58vh;
		--max-w: 86vw;
		--gap: 14px;
	}
	@media (min-width: 640px) {
		.gallery {
			--h: 62vh;
			--max-w: 68vw;
			--gap: 20px;
		}
	}
	@media (min-width: 1024px) {
		.gallery {
			--h: min(64vh, 640px);
			--max-w: 52vw;
			--gap: 26px;
		}
	}
	.track {
		display: flex;
		align-items: center;
		gap: var(--gap);
		position: relative;
		min-height: var(--h);
	}
	.track.is-animating {
		transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
		will-change: transform;
	}
	@media (prefers-reduced-motion: reduce) {
		.track.is-animating,
		.slide {
			transition-duration: 1ms;
		}
	}
	.slide {
		/* As large as possible within (max-w × h) while preserving the photo's ratio. */
		width: min(var(--max-w), calc(var(--h) * var(--r)));
		aspect-ratio: var(--r);
		max-height: var(--h);
	}
	.slide-ratio-1333 {
		--r: 1.333;
	}
	.slide-ratio-750 {
		--r: 0.75;
	}
	.slide-ratio-563 {
		--r: 0.563;
	}
	.slide-ratio-709 {
		--r: 0.709;
	}
</style>
