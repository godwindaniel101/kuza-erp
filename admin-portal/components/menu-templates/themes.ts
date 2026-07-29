import {
  MenuTheme,
  TemplateKey,
  SERIF_STACK,
  SANS_STACK,
  ROUNDED_STACK,
} from './types';

/**
 * 6 layout archetypes × 4 curated themes = 24 presets.
 * Every theme was checked for contrast (body text ≥ ~7:1 on bg,
 * muted ≥ ~4.5:1) in both light and dark sets.
 */

export type ArchetypeGroup =
  | 'Elegant'
  | 'Classic'
  | 'Modern'
  | 'Nightlife'
  | 'Cuisine';

/** Order in which groups are shown in the template picker. */
export const ARCHETYPE_GROUPS: ArchetypeGroup[] = [
  'Elegant',
  'Classic',
  'Modern',
  'Nightlife',
  'Cuisine',
];

export interface ArchetypeMeta {
  key: TemplateKey;
  name: string;
  tagline: string;
  group: ArchetypeGroup;
  themes: MenuTheme[];
}

const elegant: MenuTheme[] = [
  {
    key: 'porcelain',
    name: 'Porcelain',
    mode: 'light',
    bg: '#FDFCFA',
    surface: '#FFFFFF',
    text: '#211E19',
    muted: '#6E675C',
    accent: '#A8863C',
    border: '#E5DFD2',
    headingFont: SERIF_STACK,
    bodyFont: SERIF_STACK,
    radius: '2px',
  },
  {
    key: 'champagne',
    name: 'Champagne',
    mode: 'light',
    bg: '#F8F2E7',
    surface: '#FDFAF3',
    text: '#3B2F1E',
    muted: '#7C6D55',
    accent: '#8C6A3F',
    border: '#E4D8C2',
    headingFont: SERIF_STACK,
    bodyFont: SERIF_STACK,
    radius: '2px',
  },
  {
    key: 'ivy',
    name: 'Ivy',
    mode: 'light',
    bg: '#F5F7F2',
    surface: '#FDFEFB',
    text: '#1F2A20',
    muted: '#5C6B5E',
    accent: '#3E5C41',
    border: '#DCE3D8',
    headingFont: SERIF_STACK,
    bodyFont: SERIF_STACK,
    radius: '2px',
  },
  {
    key: 'slate-rose',
    name: 'Slate Rose',
    mode: 'light',
    bg: '#F8F5F6',
    surface: '#FFFFFF',
    text: '#2B2528',
    muted: '#6F6368',
    accent: '#A5586C',
    border: '#E7DEE1',
    headingFont: SERIF_STACK,
    bodyFont: SERIF_STACK,
    radius: '2px',
  },
];

const minimal: MenuTheme[] = [
  {
    key: 'cloud',
    name: 'Cloud',
    mode: 'light',
    bg: '#F5F6F8',
    surface: '#FFFFFF',
    text: '#14181F',
    muted: '#5A6472',
    accent: '#2563EB',
    border: '#E4E7EC',
    headingFont: SANS_STACK,
    bodyFont: SANS_STACK,
    radius: '16px',
  },
  {
    key: 'matcha',
    name: 'Matcha',
    mode: 'light',
    bg: '#F2F6EF',
    surface: '#FFFFFF',
    text: '#1B241A',
    muted: '#59685A',
    accent: '#4D7C4A',
    border: '#DFE8DB',
    headingFont: SANS_STACK,
    bodyFont: SANS_STACK,
    radius: '16px',
  },
  {
    key: 'peach-cream',
    name: 'Peach Cream',
    mode: 'light',
    bg: '#FBF4EE',
    surface: '#FFFFFF',
    text: '#2B211B',
    muted: '#77655A',
    accent: '#C2603E',
    border: '#EFE1D6',
    headingFont: SANS_STACK,
    bodyFont: SANS_STACK,
    radius: '16px',
  },
  {
    key: 'graphite',
    name: 'Graphite',
    mode: 'dark',
    bg: '#151619',
    surface: '#1F2126',
    text: '#EDEEF0',
    muted: '#9AA1AB',
    accent: '#8AB4F8',
    border: '#2C2F36',
    headingFont: SANS_STACK,
    bodyFont: SANS_STACK,
    radius: '16px',
  },
];

const noir: MenuTheme[] = [
  {
    key: 'midnight-gold',
    name: 'Midnight Gold',
    mode: 'dark',
    bg: '#0E0E10',
    surface: '#17171B',
    text: '#EDE8DD',
    muted: '#9C968A',
    accent: '#C9A227',
    border: '#2A2A2F',
    headingFont: SERIF_STACK,
    bodyFont: SANS_STACK,
    radius: '6px',
  },
  {
    key: 'velvet',
    name: 'Velvet',
    mode: 'dark',
    bg: '#170B12',
    surface: '#22121C',
    text: '#F2E6EC',
    muted: '#A8929E',
    accent: '#D0708F',
    border: '#3A2231',
    headingFont: SERIF_STACK,
    bodyFont: SANS_STACK,
    radius: '6px',
  },
  {
    key: 'smoke',
    name: 'Smoke',
    mode: 'dark',
    bg: '#111316',
    surface: '#1A1D21',
    text: '#E4E7EA',
    muted: '#8F98A1',
    accent: '#B9C4CC',
    border: '#2B3036',
    headingFont: SERIF_STACK,
    bodyFont: SANS_STACK,
    radius: '6px',
  },
  {
    key: 'neon',
    name: 'Neon',
    mode: 'dark',
    bg: '#0A0B10',
    surface: '#14161F',
    text: '#E8EAF6',
    muted: '#8B90A8',
    accent: '#22D3EE',
    border: '#252838',
    headingFont: SANS_STACK,
    bodyFont: SANS_STACK,
    radius: '6px',
  },
];

const gallery: MenuTheme[] = [
  {
    key: 'street',
    name: 'Street',
    mode: 'light',
    bg: '#FAFAF8',
    surface: '#FFFFFF',
    text: '#191817',
    muted: '#6A6661',
    accent: '#E11D48',
    border: '#E9E6E1',
    headingFont: SANS_STACK,
    bodyFont: SANS_STACK,
    radius: '18px',
  },
  {
    key: 'citrus',
    name: 'Citrus',
    mode: 'light',
    bg: '#FFFBF0',
    surface: '#FFFFFF',
    text: '#241E12',
    muted: '#75695A',
    accent: '#D97706',
    border: '#F0E7D2',
    headingFont: SANS_STACK,
    bodyFont: SANS_STACK,
    radius: '18px',
  },
  {
    key: 'charcoal-grill',
    name: 'Charcoal Grill',
    mode: 'dark',
    bg: '#151210',
    surface: '#1F1B18',
    text: '#F0EBE5',
    muted: '#A2988D',
    accent: '#F97316',
    border: '#312A24',
    headingFont: SANS_STACK,
    bodyFont: SANS_STACK,
    radius: '18px',
  },
  {
    key: 'ocean',
    name: 'Ocean',
    mode: 'light',
    bg: '#F0F6F8',
    surface: '#FFFFFF',
    text: '#132126',
    muted: '#54696F',
    accent: '#0E7490',
    border: '#DBE8EC',
    headingFont: SANS_STACK,
    bodyFont: SANS_STACK,
    radius: '18px',
  },
];

const bistro: MenuTheme[] = [
  {
    key: 'butcher-paper',
    name: 'Butcher Paper',
    mode: 'light',
    bg: '#F4EADA',
    surface: '#FBF4E8',
    text: '#4A3623',
    muted: '#84705A',
    accent: '#B0502D',
    border: '#E0D2BB',
    headingFont: ROUNDED_STACK,
    bodyFont: SANS_STACK,
    radius: '10px',
  },
  {
    key: 'chalkboard',
    name: 'Chalkboard',
    mode: 'dark',
    bg: '#252E29',
    surface: '#2D3832',
    text: '#F2F0E4',
    muted: '#AEB5A6',
    accent: '#E8C547',
    border: '#3D4A42',
    headingFont: ROUNDED_STACK,
    bodyFont: SANS_STACK,
    radius: '10px',
  },
  {
    key: 'olive-grove',
    name: 'Olive Grove',
    mode: 'light',
    bg: '#F4F2E7',
    surface: '#FBFAF2',
    text: '#31351F',
    muted: '#6E7358',
    accent: '#6B7A3A',
    border: '#E0DECB',
    headingFont: ROUNDED_STACK,
    bodyFont: SANS_STACK,
    radius: '10px',
  },
  {
    key: 'tomato',
    name: 'Tomato',
    mode: 'light',
    bg: '#FDF3EC',
    surface: '#FFFAF6',
    text: '#3A2019',
    muted: '#7E6157',
    accent: '#C63D2F',
    border: '#F0DDD2',
    headingFont: ROUNDED_STACK,
    bodyFont: SANS_STACK,
    radius: '10px',
  },
];

const grand: MenuTheme[] = [
  {
    key: 'royal-navy',
    name: 'Royal Navy',
    mode: 'light',
    bg: '#F6F7F9',
    surface: '#FFFFFF',
    text: '#1B2A4A',
    muted: '#5A6880',
    accent: '#B08D3E',
    border: '#DDE1E9',
    headingFont: SERIF_STACK,
    bodyFont: SERIF_STACK,
    radius: '4px',
  },
  {
    key: 'burgundy',
    name: 'Burgundy',
    mode: 'light',
    bg: '#FBF7F4',
    surface: '#FFFFFF',
    text: '#46212A',
    muted: '#87656E',
    accent: '#7B2D3B',
    border: '#EBDFD9',
    headingFont: SERIF_STACK,
    bodyFont: SERIF_STACK,
    radius: '4px',
  },
  {
    key: 'emerald-estate',
    name: 'Emerald Estate',
    mode: 'light',
    bg: '#F4F7F5',
    surface: '#FFFFFF',
    text: '#14352B',
    muted: '#587268',
    accent: '#1E6B54',
    border: '#DCE5DF',
    headingFont: SERIF_STACK,
    bodyFont: SERIF_STACK,
    radius: '4px',
  },
  {
    key: 'onyx',
    name: 'Onyx',
    mode: 'dark',
    bg: '#121316',
    surface: '#1B1D21',
    text: '#E9E7E2',
    muted: '#9B9890',
    accent: '#B08D3E',
    border: '#2C2F35',
    headingFont: SERIF_STACK,
    bodyFont: SERIF_STACK,
    radius: '4px',
  },
];

// ---- Premium, image-forward archetypes -------------------------------------

// Escape — deep, moody, teal (menu.theescape.ng). Rounded, uppercase labels.
const escape: MenuTheme[] = [
  {
    key: 'deep-teal', name: 'Deep Teal', mode: 'dark',
    bg: '#083344', surface: '#072a38', text: '#E4E4E4', muted: '#9FB4B9',
    accent: '#14b8a6', border: '#0b4055',
    headingFont: ROUNDED_STACK, bodyFont: ROUNDED_STACK, radius: '10px',
  },
  {
    key: 'onyx', name: 'Onyx', mode: 'dark',
    bg: '#0B0F14', surface: '#141A21', text: '#ECECEC', muted: '#9AA3AD',
    accent: '#E0B15A', border: '#232C36',
    headingFont: ROUNDED_STACK, bodyFont: ROUNDED_STACK, radius: '10px',
  },
  {
    key: 'plum-night', name: 'Plum Night', mode: 'dark',
    bg: '#1A1024', surface: '#241634', text: '#EDE7F2', muted: '#B39FC4',
    accent: '#C79BFF', border: '#37244B',
    headingFont: ROUNDED_STACK, bodyFont: ROUNDED_STACK, radius: '10px',
  },
];

// Botanical — cream editorial with leaf motifs, serif + script (Basil Leaf).
const botanical: MenuTheme[] = [
  {
    key: 'sage-cream', name: 'Sage Cream', mode: 'light',
    bg: '#F6F3EA', surface: '#FFFFFF', text: '#2B2E26', muted: '#6C7060',
    accent: '#4B6043', border: '#E2DDCC',
    headingFont: SERIF_STACK, bodyFont: SANS_STACK, radius: '14px',
  },
  {
    key: 'olive-linen', name: 'Olive Linen', mode: 'light',
    bg: '#EFEbDE', surface: '#FBF9F3', text: '#33301F', muted: '#726B54',
    accent: '#6B7A3A', border: '#DED7C3',
    headingFont: SERIF_STACK, bodyFont: SANS_STACK, radius: '14px',
  },
  {
    key: 'forest-night', name: 'Forest Night', mode: 'dark',
    bg: '#14211B', surface: '#1C2C24', text: '#EAF0EA', muted: '#A6B7A9',
    accent: '#9CC08B', border: '#2C3E33',
    headingFont: SERIF_STACK, bodyFont: SANS_STACK, radius: '14px',
  },
];

// Sakura — cream + coral, seigaiha wave pattern, icon category grid (Japanese).
const sakura: MenuTheme[] = [
  {
    key: 'coral-cream', name: 'Coral Cream', mode: 'light',
    bg: '#F4ECE1', surface: '#FBF6EE', text: '#2A2622', muted: '#7A7169',
    accent: '#F16B5A', border: '#E6DAC8',
    headingFont: SANS_STACK, bodyFont: SANS_STACK, radius: '16px',
  },
  {
    key: 'matcha', name: 'Matcha', mode: 'light',
    bg: '#EEF0E6', surface: '#F9FAF4', text: '#26291F', muted: '#6E7360',
    accent: '#7BA05B', border: '#DCE0CF',
    headingFont: SANS_STACK, bodyFont: SANS_STACK, radius: '16px',
  },
  {
    key: 'sumi', name: 'Sumi', mode: 'dark',
    bg: '#141210', surface: '#201C18', text: '#EFE9E1', muted: '#B0A597',
    accent: '#F16B5A', border: '#332C25',
    headingFont: SANS_STACK, bodyFont: SANS_STACK, radius: '16px',
  },
];

// Roast — warm beige/brown coffee-house, image product cards + price chips.
const roast: MenuTheme[] = [
  {
    key: 'latte', name: 'Latte', mode: 'light',
    bg: '#EAD9C2', surface: '#F6ECDD', text: '#3A2A1B', muted: '#7A6650',
    accent: '#6F4E37', border: '#DBC7AC',
    headingFont: ROUNDED_STACK, bodyFont: SANS_STACK, radius: '18px',
  },
  {
    key: 'flat-white', name: 'Flat White', mode: 'light',
    bg: '#F1E9DE', surface: '#FBF6EF', text: '#2E271F', muted: '#7C7061',
    accent: '#B07D45', border: '#E4D8C7',
    headingFont: ROUNDED_STACK, bodyFont: SANS_STACK, radius: '18px',
  },
  {
    key: 'espresso', name: 'Espresso', mode: 'dark',
    bg: '#1B1410', surface: '#271E17', text: '#EFE6DA', muted: '#B7A794',
    accent: '#D9A066', border: '#3A2D22',
    headingFont: ROUNDED_STACK, bodyFont: SANS_STACK, radius: '18px',
  },
];

// Space — a cosmic nightlife menu: void grounds, nebula accents, star-white text.
const space: MenuTheme[] = [
  {
    key: 'deep-space', name: 'Deep Space', mode: 'dark',
    bg: '#05060E', surface: '#0E1124', text: '#EAECFF', muted: '#9AA0C7',
    accent: '#8B5CF6', border: '#1C2044',
    headingFont: SANS_STACK, bodyFont: SANS_STACK, radius: '16px',
  },
  {
    key: 'nebula', name: 'Nebula', mode: 'dark',
    bg: '#0A0614', surface: '#170B28', text: '#F1E9FF', muted: '#B29FD6',
    accent: '#22D3EE', border: '#2C1A44',
    headingFont: SANS_STACK, bodyFont: SANS_STACK, radius: '16px',
  },
  {
    key: 'aurora', name: 'Aurora', mode: 'dark',
    bg: '#04100E', surface: '#0A1C19', text: '#E7FFF8', muted: '#93C7BC',
    accent: '#34D399', border: '#123029',
    headingFont: SANS_STACK, bodyFont: SANS_STACK, radius: '16px',
  },
];

export const ARCHETYPES: ArchetypeMeta[] = [
  {
    key: 'elegant',
    name: 'Elegant',
    tagline: 'Fine dining — serif, whitespace, hairline rules',
    group: 'Elegant',
    themes: elegant,
  },
  {
    key: 'grand',
    name: 'Grand',
    tagline: 'Hotel & banquet — formal, engraved, ceremonial',
    group: 'Elegant',
    themes: grand,
  },
  {
    key: 'botanical',
    name: 'Botanical',
    tagline: 'Farm-to-table — cream, leaf motifs, editorial',
    group: 'Classic',
    themes: botanical,
  },
  {
    key: 'bistro',
    name: 'Bistro',
    tagline: 'Neighbourhood eatery — warm, hand-drawn feel',
    group: 'Classic',
    themes: bistro,
  },
  {
    key: 'minimal',
    name: 'Minimal',
    tagline: 'Café & brunch — clean airy layout',
    group: 'Modern',
    themes: minimal,
  },
  {
    key: 'gallery',
    name: 'Gallery',
    tagline: 'Fast casual — bright, tile-led',
    group: 'Modern',
    themes: gallery,
  },
  {
    key: 'noir',
    name: 'Noir',
    tagline: 'Fine dining — dark, image-forward, gold accents',
    group: 'Nightlife',
    themes: noir,
  },
  {
    key: 'escape',
    name: 'Sketch',
    tagline: 'Lounge & bar — hand-drawn doodle backdrop, tile home',
    group: 'Nightlife',
    themes: escape,
  },
  {
    key: 'space',
    name: 'Space',
    tagline: 'Cosmic nightlife — starfield, orbits, neon glow',
    group: 'Nightlife',
    themes: space,
  },
  {
    key: 'sakura',
    name: 'Sakura',
    tagline: 'Sushi & Asian — coral, wave pattern, tile grid',
    group: 'Cuisine',
    themes: sakura,
  },
  {
    key: 'roast',
    name: 'Roast',
    tagline: 'Café & coffee — warm, photo product cards',
    group: 'Cuisine',
    themes: roast,
  },
];

export function getArchetype(templateKey: string): ArchetypeMeta {
  return ARCHETYPES.find((a) => a.key === templateKey) || ARCHETYPES[1]; // minimal
}

export function resolveTheme(templateKey: string, themeKey: string): MenuTheme {
  const archetype = getArchetype(templateKey);
  return (
    archetype.themes.find((t) => t.key === themeKey) || archetype.themes[0]
  );
}
