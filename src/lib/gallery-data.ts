export interface GalleryEntry {
  src: string;
  alt: string;
  caption: string;
  /** Intrinsic aspect ratio (width / height). Drives the carousel slide width so
   *  each photo is shown whole, at its natural shape — no cropping, no letterbox. */
  ratio: number;
}

export const galleryEntries: readonly GalleryEntry[] = [
  {
    src: '/gallery/koldinghus.jpg',
    alt: 'Koldinghus — aftenen hvor vi blev kærester',
    caption: 'Koldinghus — aftenen hvor vi blev kærester',
    ratio: 1.333
  },
  {
    src: '/gallery/kiel.jpg',
    alt: 'Kiel — vores første getaway sammen',
    caption: 'Kiel — vores første getaway sammen',
    ratio: 0.75
  },
  {
    src: '/gallery/syvaarsoerne-toerklaede.jpg',
    alt: 'Syvårsøerne - En vintergåtur som nyforelskede',
    caption: 'Syvårsøerne - En vintergåtur som nyforelskede',
    ratio: 0.75
  },
  {
    src: '/gallery/strand.jpg',
    alt: 'Gammelbro Camping - En romantisk aften ved Aarøsund strand',
    caption: 'Gammelbro Camping - En romantisk aften ved Aarøsund strand',
    ratio: 1.333
  },
  {
    src: '/gallery/hygge-sommerhus.jpg',
    alt: 'Ebeltoft - En stille stund i sommerhus med familien Damm',
    caption: 'Ebeltoft - En stille stund i sommerhus med familien Damm',
    ratio: 0.75
  },
  {
    src: '/gallery/pickaback-sommerhus.jpg',
    alt: 'Ebeltoft - Lidt spas på Nikolais fødselsdag',
    caption: 'Ebeltoft - Lidt spas på Nikolais fødselsdag',
    ratio: 0.75
  },
  {
    src: '/gallery/skotland-fly.jpg',
    alt: 'Kastrup Lufthavn - klar til et eventyr i Skotland',
    caption: 'Kastrup Lufthavn - klar til et eventyr i Skotland',
    ratio: 1.333
  },
  {
    src: '/gallery/skotland-faengsel.jpg',
    alt: 'Skotland - Bag tremmerne i Dunvegan Castle',
    caption: 'Skotland - Bag tremmerne i Dunvegan Castle',
    ratio: 1.333
  },
  {
    src: '/gallery/skye-storr.jpg',
    alt: 'Skotland - En regnfuld dag på Man of Storr på Isle of Skye',
    caption: 'Skotland - En regnfuld dag på Man of Storr på Isle of Skye',
    ratio: 0.75
  },
  {
    src: '/gallery/kongesoe-morgekaabe.jpg',
    alt: 'Königsee - På vej i poolen med bjergene i baggrunden',
    caption: 'Königsee - På vej i poolen med bjergene i baggrunden',
    ratio: 0.563
  },
  {
    src: '/gallery/kroatien-baad.jpg',
    alt: 'Kroatien - En romantisk sejltur',
    caption: 'Kroatien - En romantisk sejltur',
    ratio: 0.75
  },
  {
    src: '/gallery/plitvice.jpg',
    alt: 'Kroatien - En smuk dag i Plitvice nationalpark',
    caption: 'Kroatien - En smuk dag i Plitvice nationalpark',
    ratio: 0.75
  },
  {
    src: '/gallery/orangeri.jpg',
    alt: 'Kolding - En hyggelig frokost i geografisk have',
    caption: 'Kolding - En hyggelig frokost i geografisk have',
    ratio: 1.333
  },
  {
    src: '/gallery/andreas-bryllup.jpg',
    alt: 'Sønder Omme - En dag i bryllupsselskab',
    caption: 'Sønder Omme - En dag i bryllupsselskab',
    ratio: 0.75
  },
  {
    src: '/gallery/amsterdam.jpg',
    alt: 'Amsterdam - Forlovet 💍',
    caption: 'Amsterdam - Forlovet 💍',
    ratio: 0.563
  },
  {
    src: '/gallery/tyrsting.jpg',
    alt: 'Tyrsting - En gåtur i skinnende omgivelser 💍',
    caption: 'Tyrsting - En gåtur i skinnende omgivelser 💍',
    ratio: 0.75
  },
  {
    src: '/gallery/madsbjerg-legepark.jpg',
    alt: 'Madsbjerg legepark - En hyggelig dag med familien',
    caption: 'Madsbjerg legepark - En hyggelig dag med familien',
    ratio: 0.709
  },
  {
    src: '/gallery/zakynthos-heste.jpg',
    alt: 'Zakynthos - En ridetur i havet',
    caption: 'Zakynthos - En ridetur i havet',
    ratio: 0.75
  },
  {
    src: '/gallery/zakynthos-pool.jpg',
    alt: 'Zakynthos - En fjollet aften ved vores suites private pool',
    caption: 'Zakynthos - En fjollet aften ved vores suites private pool',
    ratio: 0.75
  }
];
