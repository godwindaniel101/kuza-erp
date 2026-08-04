import {
  WebsiteSection,
  HeroVariant,
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
 *
 * Templates ship with real Unsplash CDN imagery (stable, keyless direct URLs) and
 * industry-specific copy so a freshly-picked template looks designed immediately.
 * Every image below is a plain <img> src on a normal Next page — no next/image
 * domain config or CSP is involved. Images are decorative defaults the user can
 * replace at any time.
 */

/** Build a stable Unsplash CDN URL for a known-good photo id. */
const U = (id: string, w = 1600): string =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const hero = (o: Partial<HeroSection>): HeroSection => ({ ...(newSection('hero') as HeroSection), ...o });
const text = (o: Partial<TextSection>): TextSection => ({ ...(newSection('text') as TextSection), ...o });
const products = (o: Partial<ProductsSection>): ProductsSection => ({ ...(newSection('products') as ProductsSection), ...o });
const gallery = (o: Partial<GallerySection>): GallerySection => ({ ...(newSection('gallery') as GallerySection), ...o });
const cta = (o: Partial<CtaSection>): CtaSection => ({ ...(newSection('cta') as CtaSection), ...o });
const contact = (o: Partial<ContactSection>): ContactSection => ({ ...(newSection('contact') as ContactSection), ...o });

/** Light styling hints that ride along with a template. */
export interface WebsiteTheme {
  /** Layout treatment for the hero block; also written onto the hero section. */
  heroStyle: HeroVariant;
  /** Overall mood — informs the gallery card + centered-hero gradient. */
  surface: 'light' | 'warm' | 'dark';
}

export interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  /** Optional styling hints (backward compatible — older callers ignore it). */
  theme?: WebsiteTheme;
  /** The ordered block types, for the card thumbnail preview. */
  outline: string[];
  sections: () => WebsiteSection[];
}

export const WEBSITE_TEMPLATES: WebsiteTemplate[] = [
  /* ── 1. Boutique / Fashion ───────────────────────────────────────────── */
  {
    id: 'boutique',
    name: 'Boutique',
    description: 'Minimal fashion label with a split, editorial hero',
    accentColor: '#111827',
    theme: { heroStyle: 'split', surface: 'light' },
    outline: ['hero', 'products', 'text', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'split',
        headline: 'Dressed for the moment',
        subtext: 'A tightly-edited wardrobe of modern essentials, made in small runs and built to last.',
        imageUrl: U('1441984904996-e0b6ba687e04'),
        ctaLabel: 'Shop the edit',
        ctaHref: '#',
      }),
      products({ heading: 'New arrivals' }),
      text({
        heading: 'Considered, never disposable',
        body: 'We drop two collections a year — no more. Each piece is cut from deadstock and natural fibres, sampled on real bodies, and priced honestly. Buy less, wear it for years.',
        imageUrl: U('1483985988355-763728e1935b', 1200),
      }),
      gallery({
        heading: 'Lookbook',
        images: [U('1490481651871-ab68de25d43d', 1200), U('1489987707025-afc232f7ea0f', 1200), U('1441986300917-64674bd600d8', 1200)],
      }),
      cta({ heading: 'Join the list', subtext: 'Early access to drops, restocks and members-only pricing.', buttonLabel: 'Sign me up', buttonHref: '#' }),
      contact({ heading: 'Visit the studio' }),
    ],
  },

  /* ── 2. Electronics Store ────────────────────────────────────────────── */
  {
    id: 'electronics',
    name: 'Electronics Store',
    description: 'Gadgets and tech with a bold full-bleed hero',
    accentColor: '#2563eb',
    theme: { heroStyle: 'fullbleed', surface: 'light' },
    outline: ['hero', 'products', 'text', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'fullbleed',
        headline: 'Tech that keeps up with you',
        subtext: 'Phones, audio and accessories from the brands you trust — genuine stock, real warranties, next-day delivery.',
        imageUrl: U('1498049794561-7780e7231661'),
        ctaLabel: 'Shop gadgets',
        ctaHref: '#',
      }),
      products({ heading: 'Trending this week' }),
      text({
        heading: 'Only the real thing',
        body: 'Every device is sourced directly from official distributors and comes sealed, with a manufacturer warranty and our own 7-day swap guarantee. No refurbished units sold as new — ever.',
        imageUrl: U('1526738549149-8e07eca6c147', 1200),
      }),
      cta({ heading: 'Need it today?', subtext: 'Order before 2pm for same-day delivery across the city.', buttonLabel: 'Start shopping', buttonHref: '#' }),
      contact({ heading: 'Visit our store' }),
    ],
  },

  /* ── 3. Beauty & Cosmetics ───────────────────────────────────────────── */
  {
    id: 'beauty',
    name: 'Beauty & Cosmetics',
    description: 'Soft, centered hero for skincare and makeup',
    accentColor: '#DB2777',
    theme: { heroStyle: 'centered', surface: 'warm' },
    outline: ['hero', 'products', 'gallery', 'text', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'centered',
        headline: 'Glow that starts with you',
        subtext: 'Clean, cruelty-free skincare and colour, formulated for melanin-rich skin and every shade in between.',
        imageUrl: U('1596462502278-27bfdc403348'),
        ctaLabel: 'Shop the range',
        ctaHref: '#',
      }),
      products({ heading: 'Bestsellers' }),
      gallery({
        heading: 'Before & after',
        images: [U('1522335789203-aabd1fc54bc9', 1200), U('1571875257727-256c39da42af', 1200), U('1596704017254-9b121068fb31', 1200)],
      }),
      text({
        heading: 'Kind to skin, kinder to the planet',
        body: 'No parabens, no sulphates, no animal testing. Just dermatologist-tested formulas in refillable packaging, made in small batches so nothing sits on a shelf for a year.',
        imageUrl: U('1571875257727-256c39da42af', 1200),
      }),
      cta({ heading: 'Get 15% off your first order', subtext: 'Join the glow list for launches, tips and members-only sets.', buttonLabel: 'Claim my discount', buttonHref: '#' }),
      contact({ heading: 'Talk to us' }),
    ],
  },

  /* ── 4. Jewelry (luxe dark) ──────────────────────────────────────────── */
  {
    id: 'jewelry',
    name: 'Jewelry',
    description: 'Luxe dark hero with gold accents for fine pieces',
    accentColor: '#C9A227',
    theme: { heroStyle: 'fullbleed', surface: 'dark' },
    outline: ['hero', 'products', 'text', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'fullbleed',
        headline: 'Made to be handed down',
        subtext: 'Fine gold and diamond pieces, handcrafted by our master jewellers and finished to order.',
        imageUrl: U('1515562141207-7a88fb7ce338'),
        ctaLabel: 'Explore the collection',
        ctaHref: '#',
      }),
      products({ heading: 'Signature pieces' }),
      text({
        heading: 'Craft you can feel',
        body: 'Each piece begins as a hand-drawn sketch and is cast, set and polished in our own atelier. We source conflict-free stones and solid recycled gold, and every purchase is engraved and certified.',
        imageUrl: U('1611652022419-a9419f74343d', 1200),
      }),
      gallery({
        heading: 'The atelier',
        images: [U('1605100804763-247f67b3557e', 1200), U('1611652022419-a9419f74343d', 1200), U('1515562141207-7a88fb7ce338', 1200)],
      }),
      cta({ heading: 'Book a private viewing', subtext: 'One-to-one appointments for engagement rings and bespoke commissions.', buttonLabel: 'Request an appointment', buttonHref: '#' }),
      contact({ heading: 'Find our showroom' }),
    ],
  },

  /* ── 5. Sneakers / Streetwear ────────────────────────────────────────── */
  {
    id: 'sneakers',
    name: 'Sneakers & Streetwear',
    description: 'High-energy drop culture with a bold hero',
    accentColor: '#F97316',
    theme: { heroStyle: 'fullbleed', surface: 'dark' },
    outline: ['hero', 'products', 'gallery', 'text', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'fullbleed',
        headline: 'Cop the drop before it’s gone',
        subtext: 'Limited pairs, authenticated grails and exclusive colourways — restocked every Friday at noon.',
        imageUrl: U('1552346154-21d32810aba3'),
        ctaLabel: 'Shop the latest drop',
        ctaHref: '#',
      }),
      products({ heading: 'This week’s heat' }),
      gallery({
        heading: 'On feet',
        images: [U('1460353581641-37baddab0fa2', 1200), U('1600185365483-26d7a4cc7519', 1200), U('1595950653106-6c9ebd614d3a', 1200)],
      }),
      text({
        heading: '100% authenticated. No fakes.',
        body: 'Every pair is verified by our in-house team and sealed with a tamper-proof tag before it ships. Deadstock condition, original box, or your money back — no questions.',
        imageUrl: U('1479064555552-3ef4979f8908', 1200),
      }),
      cta({ heading: 'Never miss a drop', subtext: 'Turn on drop alerts and get first dibs before the public restock.', buttonLabel: 'Get drop alerts', buttonHref: '#' }),
      contact({ heading: 'Pull up' }),
    ],
  },

  /* ── 6. Grocery / Market ─────────────────────────────────────────────── */
  {
    id: 'grocery',
    name: 'Grocery & Market',
    description: 'Fresh produce and daily essentials, split hero',
    accentColor: '#16A34A',
    theme: { heroStyle: 'split', surface: 'light' },
    outline: ['hero', 'products', 'text', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'split',
        headline: 'Farm-fresh, delivered daily',
        subtext: 'Fruit, veg, pantry staples and household basics — picked this morning, at your door by evening.',
        imageUrl: U('1542838132-92c53300491e'),
        ctaLabel: 'Start your basket',
        ctaHref: '#',
      }),
      products({ heading: 'In season now' }),
      text({
        heading: 'Straight from local farms',
        body: 'We buy directly from smallholder farmers and pay them fairly, so produce reaches you within a day of harvest. Fresher food, longer shelf life, and money that stays in the community.',
        imageUrl: U('1488459716781-31db52582fe9', 1200),
      }),
      gallery({
        heading: 'On the shelves',
        images: [U('1550989460-0adf9ea622e2', 1200), U('1556228720-195a672e8a03', 1200), U('1553530666-ba11a7da3888', 1200)],
      }),
      cta({ heading: 'Free delivery over ₦20,000', subtext: 'Order your weekly shop and skip the queue.', buttonLabel: 'Shop groceries', buttonHref: '#' }),
      contact({ heading: 'Store & delivery hours' }),
    ],
  },

  /* ── 7. Restaurant ───────────────────────────────────────────────────── */
  {
    id: 'restaurant',
    name: 'Restaurant',
    description: 'Moody full-bleed hero with menu gallery',
    accentColor: '#B91C1C',
    theme: { heroStyle: 'fullbleed', surface: 'dark' },
    outline: ['hero', 'gallery', 'text', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'fullbleed',
        headline: 'A table worth staying for',
        subtext: 'Seasonal plates, an open kitchen and a wine list built for lingering. Dinner, Tuesday to Sunday.',
        imageUrl: U('1517248135467-4c7edcad34c4'),
        ctaLabel: 'Reserve a table',
        ctaHref: '#',
      }),
      gallery({
        heading: 'From the kitchen',
        images: [U('1504674900247-0877df9cc836', 1200), U('1414235077428-338989a2e8c0', 1200), U('1554412933-514a83d2f3c8', 1200)],
      }),
      text({
        heading: 'Cooked over fire, served with care',
        body: 'Our menu changes with the market — whatever the farms and boats bring us that morning. Everything is made in-house, from the sourdough to the ice cream, by a kitchen that cooks like it’s feeding family.',
        imageUrl: U('1414235077428-338989a2e8c0', 1200),
      }),
      cta({ heading: 'Book your evening', subtext: 'Walk-ins welcome at the bar; reservations recommended for dinner.', buttonLabel: 'Reserve now', buttonHref: '#' }),
      contact({ heading: 'Find us & opening hours' }),
    ],
  },

  /* ── 8. Café / Bakery ────────────────────────────────────────────────── */
  {
    id: 'cafe',
    name: 'Café & Bakery',
    description: 'Warm, cosy centered hero for coffee & bakes',
    accentColor: '#B45309',
    theme: { heroStyle: 'centered', surface: 'warm' },
    outline: ['hero', 'gallery', 'text', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'centered',
        headline: 'Your morning, made better',
        subtext: 'Slow-brewed coffee, bread baked before sunrise, and a corner that feels like home.',
        imageUrl: U('1495474472287-4d71bcdd2085'),
        ctaLabel: 'See the menu',
        ctaHref: '#',
      }),
      gallery({
        heading: 'Fresh out of the oven',
        images: [U('1509440159596-0249088772ff', 1200), U('1502741224143-90386d7f8c82', 1200), U('1467003909585-2f8a72700288', 1200)],
      }),
      text({
        heading: 'Baked here, every single day',
        body: 'We mill some of our own flour and let every loaf prove overnight, so the crust cracks and the crumb stays soft. Pair it with beans we roast in-house and pull as a proper flat white.',
        imageUrl: U('1442512595331-e89e73853f31', 1200),
      }),
      cta({ heading: 'Order ahead', subtext: 'Skip the line — have your usual ready and waiting.', buttonLabel: 'Order & collect', buttonHref: '#' }),
      contact({ heading: 'Pop in' }),
    ],
  },

  /* ── 9. Food Delivery ────────────────────────────────────────────────── */
  {
    id: 'food-delivery',
    name: 'Food Delivery',
    description: 'Order-online kitchen with a split hero',
    accentColor: '#EA580C',
    theme: { heroStyle: 'split', surface: 'warm' },
    outline: ['hero', 'products', 'text', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'split',
        headline: 'Hot meals, at your door in 30',
        subtext: 'Chef-made bowls, wraps and sides — cooked to order and delivered while they’re still steaming.',
        imageUrl: U('1543168256-418811576931'),
        ctaLabel: 'Order now',
        ctaHref: '#',
      }),
      products({ heading: 'Today’s menu' }),
      text({
        heading: 'Made when you order, not before',
        body: 'No heat lamps, no sitting trays. Every order fires the moment it lands, gets packed in vented, leak-proof boxes, and rides straight to you. Track it live from wok to doorstep.',
        imageUrl: U('1526367790999-0150786686a2', 1200),
      }),
      cta({ heading: 'Free delivery on your first order', subtext: 'Hungry now? Beat the rush and order ahead.', buttonLabel: 'Browse the menu', buttonHref: '#' }),
      contact({ heading: 'Delivery area & hours' }),
    ],
  },

  /* ── 10. Salon / Spa ─────────────────────────────────────────────────── */
  {
    id: 'salon-spa',
    name: 'Salon & Spa',
    description: 'Calm, centered hero for hair, nails & wellness',
    accentColor: '#9333EA',
    theme: { heroStyle: 'centered', surface: 'warm' },
    outline: ['hero', 'gallery', 'text', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'centered',
        headline: 'An hour that’s just for you',
        subtext: 'Hair, nails, facials and massage — expert hands and a space designed to help you exhale.',
        imageUrl: U('1560750588-73207b1ef5b8'),
        ctaLabel: 'Book an appointment',
        ctaHref: '#',
      }),
      gallery({
        heading: 'The experience',
        images: [U('1600334089648-b0d9d3028eb2', 1200), U('1556909212-d5b604d0c90d', 1200), U('1583864697784-a0efc8379f70', 1200)],
      }),
      text({
        heading: 'Skilled hands, honest advice',
        body: 'Our stylists and therapists train continuously and only recommend what your hair and skin actually need. Come in for a consultation and leave with a plan — not just a treatment.',
        imageUrl: U('1522337660859-02fbefca4702', 1200),
      }),
      cta({ heading: 'Treat yourself, or someone you love', subtext: 'Gift cards and package deals available all year round.', buttonLabel: 'Book now', buttonHref: '#' }),
      contact({ heading: 'Booking & location' }),
    ],
  },

  /* ── 11. Gym / Fitness ───────────────────────────────────────────────── */
  {
    id: 'gym',
    name: 'Gym & Fitness',
    description: 'High-energy dark hero for training studios',
    accentColor: '#DC2626',
    theme: { heroStyle: 'fullbleed', surface: 'dark' },
    outline: ['hero', 'text', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'fullbleed',
        headline: 'Stronger starts today',
        subtext: 'Coached classes, serious kit and a community that shows up. Your first session is on us.',
        imageUrl: U('1534438327276-14e5300c3a48'),
        ctaLabel: 'Claim your free pass',
        ctaHref: '#',
      }),
      text({
        heading: 'Train with a plan, not a guess',
        body: 'Every member gets an assessment and a programme built around their goals — strength, fat loss or just moving better. Our coaches are on the floor every session, correcting form and pushing you past comfortable.',
        imageUrl: U('1571019613454-1cb2f99b2d8b', 1200),
      }),
      gallery({
        heading: 'Inside the box',
        images: [U('1517836357463-d25dfeac3438', 1200), U('1534438327276-14e5300c3a48', 1200), U('1571019613454-1cb2f99b2d8b', 1200)],
      }),
      cta({ heading: 'Ready to commit?', subtext: 'No joining fee this month. Cancel any time.', buttonLabel: 'See membership plans', buttonHref: '#' }),
      contact({ heading: 'Visit the gym' }),
    ],
  },

  /* ── 12. Photography Portfolio ───────────────────────────────────────── */
  {
    id: 'photography',
    name: 'Photography',
    description: 'Dark, image-first portfolio for photographers',
    accentColor: '#0F172A',
    theme: { heroStyle: 'fullbleed', surface: 'dark' },
    outline: ['hero', 'gallery', 'text', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'fullbleed',
        headline: 'Moments, kept forever',
        subtext: 'Weddings, portraits and brand stories — shot with a quiet eye and delivered with care.',
        imageUrl: U('1452587925148-ce544e77e70d'),
        ctaLabel: 'View portfolio',
        ctaHref: '#',
      }),
      gallery({
        heading: 'Selected work',
        images: [U('1493863641943-9b68992a8d07', 1200), U('1470259078422-826894b933aa', 1200), U('1471341971476-ae15ff5dd4ea', 1200)],
      }),
      text({
        heading: 'The story, not just the photos',
        body: 'I shoot documentary-style — the glances, the in-between, the real ones. You get a gallery of hundreds of high-resolution images, hand-edited, with full print rights and an heirloom album on request.',
        imageUrl: U('1493863641943-9b68992a8d07', 1200),
      }),
      cta({ heading: 'Let’s make something', subtext: 'Booking dates for the season now — tell me about your day.', buttonLabel: 'Check availability', buttonHref: '#' }),
      contact({ heading: 'Get in touch' }),
    ],
  },

  /* ── 13. Real Estate ─────────────────────────────────────────────────── */
  {
    id: 'real-estate',
    name: 'Real Estate',
    description: 'Trust-building split hero for agents & listings',
    accentColor: '#0E7490',
    theme: { heroStyle: 'split', surface: 'light' },
    outline: ['hero', 'gallery', 'text', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'split',
        headline: 'Find the place you’ll call home',
        subtext: 'Handpicked homes and honest advice, from a team that knows every street on the map.',
        imageUrl: U('1560518883-ce09059eeffa'),
        ctaLabel: 'Browse listings',
        ctaHref: '#',
      }),
      gallery({
        heading: 'Featured homes',
        images: [U('1512917774080-9991f1c4c750', 1200), U('1600585154340-be6161a56a0c', 1200), U('1540555700478-4be289fbecef', 1200)],
      }),
      text({
        heading: 'Guidance from viewing to keys',
        body: 'Buying or renting, we walk it with you — arranging viewings, negotiating hard on your behalf, and handling the paperwork so there are no surprises at signing. Local knowledge, no pressure.',
        imageUrl: U('1524758631624-e2822e304c36', 1200),
      }),
      cta({ heading: 'Thinking of selling?', subtext: 'Get a free, no-obligation valuation of your property.', buttonLabel: 'Request a valuation', buttonHref: '#' }),
      contact({ heading: 'Talk to an agent' }),
    ],
  },

  /* ── 14. Agency / Studio ─────────────────────────────────────────────── */
  {
    id: 'agency',
    name: 'Agency & Studio',
    description: 'Confident centered hero for creative teams',
    accentColor: '#6366F1',
    theme: { heroStyle: 'centered', surface: 'light' },
    outline: ['hero', 'text', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'centered',
        headline: 'Brands, built to be remembered',
        subtext: 'A small studio doing strategy, identity and websites for ambitious teams across Africa.',
        imageUrl: U('1497366216548-37526070297c'),
        ctaLabel: 'Start a project',
        ctaHref: '#',
      }),
      text({
        heading: 'Sharp thinking, then sharp design',
        body: 'We start with the hard questions — who you’re for, why you matter, what you want people to feel. Then we turn the answers into an identity, a website and the assets to launch it, all shipped on time.',
        imageUrl: U('1522071820081-009f0129c71c', 1200),
      }),
      gallery({
        heading: 'Recent work',
        images: [U('1600880292203-757bb62b4baf', 1200), U('1487958449943-2429e8be8625', 1200), U('1487222477894-8943e31ef7b2', 1200)],
      }),
      cta({ heading: 'Have a brief?', subtext: 'Tell us what you’re building and we’ll come back within a day.', buttonLabel: 'Book a call', buttonHref: '#' }),
      contact({ heading: 'Work with us' }),
    ],
  },
];
