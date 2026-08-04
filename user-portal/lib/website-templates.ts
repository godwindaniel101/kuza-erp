import {
  WebsiteSection,
  newSection,
  HeroSection,
  TextSection,
  ProductsSection,
  GallerySection,
  CtaSection,
  ContactSection,
} from './website-sections';

/**
 * Hand-built starter templates. Each `sections()` returns FRESH blocks (unique
 * ids) so a template can be applied repeatedly. Picking a template seeds the
 * builder's canvas + accent color; the user then edits by drag-and-drop.
 */

const hero = (o: Partial<HeroSection>): HeroSection => ({ ...(newSection('hero') as HeroSection), ...o });
const text = (o: Partial<TextSection>): TextSection => ({ ...(newSection('text') as TextSection), ...o });
const products = (o: Partial<ProductsSection>): ProductsSection => ({ ...(newSection('products') as ProductsSection), ...o });
const gallery = (o: Partial<GallerySection>): GallerySection => ({ ...(newSection('gallery') as GallerySection), ...o });
const cta = (o: Partial<CtaSection>): CtaSection => ({ ...(newSection('cta') as CtaSection), ...o });
const contact = (o: Partial<ContactSection>): ContactSection => ({ ...(newSection('contact') as ContactSection), ...o });

export interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  /** The ordered block types, for the card thumbnail preview. */
  outline: string[];
  sections: () => WebsiteSection[];
}

export const WEBSITE_TEMPLATES: WebsiteTemplate[] = [
  {
    id: 'shop',
    name: 'Online Shop',
    description: 'Sell online and drive visitors to your store',
    accentColor: '#2563eb',
    outline: ['hero', 'products', 'text', 'cta', 'contact'],
    sections: () => [
      hero({ headline: 'Shop the collection', subtext: 'Quality products, delivered to your door.', ctaLabel: 'Shop now' }),
      products({ heading: 'Featured products' }),
      text({ heading: 'About us', body: 'Tell your story — who you are and why customers love you.' }),
      cta({ heading: 'Ready to order?', subtext: 'Browse the full catalog in our store.', buttonLabel: 'Shop now' }),
      contact({ heading: 'Get in touch' }),
    ],
  },
  {
    id: 'services',
    name: 'Services',
    description: 'Showcase what you do and get enquiries',
    accentColor: '#059669',
    outline: ['hero', 'text', 'text', 'cta', 'contact'],
    sections: () => [
      hero({ headline: 'Services you can trust', subtext: 'Professional work, on time, every time.', ctaLabel: 'Get a quote' }),
      text({ heading: 'What we do', body: 'Describe your core services here.' }),
      text({ heading: 'Why choose us', body: 'What sets you apart from the rest.' }),
      cta({ heading: 'Ready to start?', subtext: "Reach out and let's talk.", buttonLabel: 'Contact us' }),
      contact({ heading: 'Contact us' }),
    ],
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    description: 'Menu highlights, ambience and location',
    accentColor: '#d97706',
    outline: ['hero', 'gallery', 'text', 'contact'],
    sections: () => [
      hero({ headline: 'Good food, good mood', subtext: 'Fresh dishes made with love.', ctaLabel: 'See the menu' }),
      gallery({ heading: 'On the menu' }),
      text({ heading: 'Our story', body: 'A few words about your kitchen.' }),
      contact({ heading: 'Find us' }),
    ],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and simple — just the essentials',
    accentColor: '#111827',
    outline: ['hero', 'text', 'contact'],
    sections: () => [
      hero({ headline: 'Welcome', subtext: 'A short line about what you do.' }),
      text({ heading: 'About', body: 'Your story in a paragraph.' }),
      contact({ heading: 'Say hello' }),
    ],
  },
];
