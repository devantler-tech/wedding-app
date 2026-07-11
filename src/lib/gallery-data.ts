export interface GalleryEntry {
  /** Asset file name under src/lib/assets/gallery/, resolved to build-time
   *  optimized sources by gallery-images.ts. Also the entry's stable identity
   *  for keyed each-blocks. */
  file: string;
  alt: string;
  caption: string;
  /** Intrinsic aspect ratio (width / height). Drives the carousel slide width so
   *  each photo is shown whole, at its natural shape — no cropping, no letterbox. */
  ratio: GalleryRatio;
}

// The CSP-safe carousel renders one static class per supported intrinsic ratio.
// Keeping the allowed values in the type makes a new ratio a build-time change
// instead of a render-path exception or a silent pre-hydration layout fallback.
export type GalleryRatio = 1.333 | 0.75 | 0.563 | 0.709;

export const galleryEntries: readonly GalleryEntry[] = [
  {
    file: 'koldinghus.jpg',
    alt: 'Koldinghus — aftenen hvor vi blev kærester',
    caption: 'Koldinghus — aftenen hvor vi blev kærester',
    ratio: 1.333
  },
  {
    file: 'kiel.jpg',
    alt: 'Kiel — vores første getaway sammen',
    caption: 'Kiel — vores første getaway sammen',
    ratio: 0.75
  },
  {
    file: 'syvaarsoerne-toerklaede.jpg',
    alt: 'Syvårsøerne - En vintergåtur som nyforelskede',
    caption: 'Syvårsøerne - En vintergåtur som nyforelskede',
    ratio: 0.75
  },
  {
    file: 'strand.jpg',
    alt: 'Gammelbro Camping - En romantisk aften ved Aarøsund strand',
    caption: 'Gammelbro Camping - En romantisk aften ved Aarøsund strand',
    ratio: 1.333
  },
  {
    file: 'hygge-sommerhus.jpg',
    alt: 'Ebeltoft - En stille stund i sommerhus med familien Damm',
    caption: 'Ebeltoft - En stille stund i sommerhus med familien Damm',
    ratio: 0.75
  },
  {
    file: 'pickaback-sommerhus.jpg',
    alt: 'Ebeltoft - Lidt spas på Nikolais fødselsdag',
    caption: 'Ebeltoft - Lidt spas på Nikolais fødselsdag',
    ratio: 0.75
  },
  {
    file: 'skotland-fly.jpg',
    alt: 'Kastrup Lufthavn - klar til et eventyr i Skotland',
    caption: 'Kastrup Lufthavn - klar til et eventyr i Skotland',
    ratio: 1.333
  },
  {
    file: 'skotland-faengsel.jpg',
    alt: 'Skotland - Bag tremmerne i Dunvegan Castle',
    caption: 'Skotland - Bag tremmerne i Dunvegan Castle',
    ratio: 1.333
  },
  {
    file: 'skye-storr.jpg',
    alt: 'Skotland - En regnfuld dag på Man of Storr på Isle of Skye',
    caption: 'Skotland - En regnfuld dag på Man of Storr på Isle of Skye',
    ratio: 0.75
  },
  {
    file: 'kongesoe-morgekaabe.jpg',
    alt: 'Königsee - På vej i poolen med bjergene i baggrunden',
    caption: 'Königsee - På vej i poolen med bjergene i baggrunden',
    ratio: 0.563
  },
  {
    file: 'kroatien-baad.jpg',
    alt: 'Kroatien - En romantisk sejltur',
    caption: 'Kroatien - En romantisk sejltur',
    ratio: 0.75
  },
  {
    file: 'plitvice.jpg',
    alt: 'Kroatien - En smuk dag i Plitvice nationalpark',
    caption: 'Kroatien - En smuk dag i Plitvice nationalpark',
    ratio: 0.75
  },
  {
    file: 'orangeri.jpg',
    alt: 'Kolding - En hyggelig frokost i geografisk have',
    caption: 'Kolding - En hyggelig frokost i geografisk have',
    ratio: 1.333
  },
  {
    file: 'andreas-bryllup.jpg',
    alt: 'Sønder Omme - En dag i bryllupsselskab',
    caption: 'Sønder Omme - En dag i bryllupsselskab',
    ratio: 0.75
  },
  {
    file: 'amsterdam.jpg',
    alt: 'Amsterdam - Forlovet 💍',
    caption: 'Amsterdam - Forlovet 💍',
    ratio: 0.563
  },
  {
    file: 'tyrsting.jpg',
    alt: 'Tyrsting - En gåtur i skinnende omgivelser 💍',
    caption: 'Tyrsting - En gåtur i skinnende omgivelser 💍',
    ratio: 0.75
  },
  {
    file: 'madsbjerg-legepark.jpg',
    alt: 'Madsbjerg legepark - En hyggelig dag med familien',
    caption: 'Madsbjerg legepark - En hyggelig dag med familien',
    ratio: 0.709
  },
  {
    file: 'zakynthos-heste.jpg',
    alt: 'Zakynthos - En ridetur i havet',
    caption: 'Zakynthos - En ridetur i havet',
    ratio: 0.75
  },
  {
    file: 'zakynthos-pool.jpg',
    alt: 'Zakynthos - En fjollet aften ved vores suites private pool',
    caption: 'Zakynthos - En fjollet aften ved vores suites private pool',
    ratio: 0.75
  }
];
