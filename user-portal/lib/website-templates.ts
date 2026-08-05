import {
  WebsiteSection,
  HeroVariant,
  newSection,
  HeroSection,
  TextSection,
  FeaturesSection,
  FeatureItem,
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
 * Each block also carries a `bg` surface (light / warm / dark / tint) so the page
 * reads with mood — the SAME thing the editor canvas and the public page render
 * (SiteBlocks.tsx), so the preview mockup, the editor and the live site agree.
 * Every image below is a plain <img> src on a normal Next page — no next/image
 * domain config or CSP is involved. Images are decorative defaults the user can
 * replace at any time.
 */

/** Build a stable Unsplash CDN URL for a known-good photo id. */
const U = (id: string, w = 1600): string =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const hero = (o: Partial<HeroSection>): HeroSection => ({ ...(newSection('hero') as HeroSection), ...o });
const text = (o: Partial<TextSection>): TextSection => ({ ...(newSection('text') as TextSection), ...o });
const features = (o: Partial<FeaturesSection>): FeaturesSection => ({ ...(newSection('features') as FeaturesSection), ...o });
const products = (o: Partial<ProductsSection>): ProductsSection => ({ ...(newSection('products') as ProductsSection), ...o });
const gallery = (o: Partial<GallerySection>): GallerySection => ({ ...(newSection('gallery') as GallerySection), ...o });
const cta = (o: Partial<CtaSection>): CtaSection => ({ ...(newSection('cta') as CtaSection), ...o });
const contact = (o: Partial<ContactSection>): ContactSection => ({ ...(newSection('contact') as ContactSection), ...o });
const feat = (title: string, body: string, icon: string): FeatureItem => ({ title, body, icon });

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
  /**
   * Optional path to a full-page design mockup (served from public/templates/).
   * When set, the gallery card previews this real design and the Preview modal
   * shows it full-size. Backward compatible — older callers ignore it.
   */
  preview?: string;
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
    outline: ['hero', 'products', 'features', 'text', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'split',
        eyebrow: 'New season',
        headline: 'Dressed for the moment',
        subtext: 'A tightly-edited wardrobe of modern essentials, made in small runs and built to last.',
        imageUrl: U('1441984904996-e0b6ba687e04'),
        ctaLabel: 'Shop the edit',
        ctaHref: '#',
      }),
      products({ heading: 'New arrivals' }),
      features({
        bg: 'tint', layout: 'icons', heading: 'The house standard',
        subtext: 'Two drops a year, made properly.',
        items: [
          feat('Small runs', 'Limited quantities, never mass-produced.', 'bx-hash'),
          feat('Natural fibres', 'Deadstock and natural cloth, cut to last.', 'bx-leaf'),
          feat('Honest pricing', 'Priced from the cost of making it well.', 'bx-purchase-tag'),
        ],
      }),
      text({
        heading: 'Considered, never disposable',
        body: 'We drop two collections a year — no more. Each piece is cut from deadstock and natural fibres, sampled on real bodies, and priced honestly. Buy less, wear it for years.',
        imageUrl: U('1483985988355-763728e1935b', 1200),
      }),
      gallery({
        bg: 'warm', heading: 'Lookbook',
        images: [U('1490481651871-ab68de25d43d', 1200), U('1489987707025-afc232f7ea0f', 1200), U('1441986300917-64674bd600d8', 1200)],
      }),
      cta({ heading: 'Join the list', subtext: 'Early access to drops, restocks and members-only pricing.', buttonLabel: 'Sign me up', buttonHref: '#' }),
      contact({ heading: 'Visit the studio' }),
    ],
  },

  /* ── 2. Electronics & Audio (premium, minimal, numbered features) ────── */
  {
    id: 'electronics',
    name: 'Electronics & Audio',
    description: 'Premium audio & gadgets — minimal, silver, numbered features',
    accentColor: '#1F2937',
    theme: { heroStyle: 'split', surface: 'light' },
    preview: '/templates/0238647e47e4c4e8352c7204a525bce4.jpg',
    outline: ['hero', 'features', 'products', 'text', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'split',
        eyebrow: 'Premium audio',
        headline: 'Crafted for focus, designed for life',
        subtext: 'Headphones, earbuds and wearables engineered for pure sound — a timeless silhouette that fits seamlessly into your day.',
        imageUrl: U('1505740420928-5e560c06d30e'),
        ctaLabel: 'Explore the experience',
        ctaHref: '#',
      }),
      features({
        bg: 'light', layout: 'numbered', heading: 'Engineered, detail by detail',
        subtext: 'Every part is tuned to disappear, so the sound is all that’s left.',
        items: [
          feat('Adaptive noise control', 'Reads the room and adjusts in real time — silence when you want it, awareness when you need it.', 'bx-volume-mute'),
          feat('40-hour battery', 'A full week of listening on one charge, and a five-minute top-up for four more hours.', 'bx-battery'),
          feat('Studio-grade drivers', 'Custom acoustic architecture for clean lows, honest mids and a treble that never fatigues.', 'bx-music'),
        ],
      }),
      products({ bg: 'tint', heading: 'The lineup' }),
      text({
        heading: 'Engineered for pure performance',
        body: 'Every detail is precisely tuned to deliver exceptional sound, comfort and clarity. Advanced acoustic architecture, intelligent noise control, and a minimal design built to last for years, not seasons.',
        imageUrl: U('1484704849700-f032a568e944', 1200),
      }),
      gallery({
        heading: 'In your world',
        images: [U('1546435770-a3e426bf472b', 1200), U('1583394838336-acd977736f90', 1200), U('1618366712010-f4ae9c647dcb', 1200)],
      }),
      cta({ heading: 'Sound that inspires. Design that lasts.', subtext: 'Join the future of premium audio — genuine stock, real warranties, next-day delivery.', buttonLabel: 'Discover more', buttonHref: '#' }),
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
    outline: ['hero', 'products', 'features', 'gallery', 'text', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'centered',
        bg: 'warm',
        eyebrow: 'Clean beauty',
        headline: 'Glow that starts with you',
        subtext: 'Clean, cruelty-free skincare and colour, formulated for melanin-rich skin and every shade in between.',
        imageUrl: U('1596462502278-27bfdc403348'),
        ctaLabel: 'Shop the range',
        ctaHref: '#',
      }),
      products({ bg: 'warm', heading: 'Bestsellers' }),
      features({
        bg: 'tint', layout: 'icons', heading: 'What we promise',
        items: [
          feat('Cruelty-free', 'Never tested on animals — certified, always.', 'bx-heart'),
          feat('Dermatologist-tested', 'Formulated and proven kind to sensitive skin.', 'bx-check-shield'),
          feat('Refillable', 'Refill pouches that cut packaging by 70%.', 'bx-recycle'),
        ],
      }),
      gallery({
        bg: 'warm', heading: 'Before & after',
        images: [U('1522335789203-aabd1fc54bc9', 1200), U('1571875257727-256c39da42af', 1200), U('1596704017254-9b121068fb31', 1200)],
      }),
      text({
        bg: 'warm',
        heading: 'Kind to skin, kinder to the planet',
        body: 'No parabens, no sulphates, no animal testing. Just dermatologist-tested formulas in refillable packaging, made in small batches so nothing sits on a shelf for a year.',
        imageUrl: U('1571875257727-256c39da42af', 1200),
      }),
      cta({ bg: 'warm', heading: 'Get 15% off your first order', subtext: 'Join the glow list for launches, tips and members-only sets.', buttonLabel: 'Claim my discount', buttonHref: '#' }),
      contact({ bg: 'warm', heading: 'Talk to us' }),
    ],
  },

  /* ── 4. Jewelry (luxe dark, gold) ────────────────────────────────────── */
  {
    id: 'jewelry',
    name: 'Jewelry',
    description: 'Luxe dark site with gold accents for fine pieces',
    accentColor: '#C9A227',
    theme: { heroStyle: 'fullbleed', surface: 'dark' },
    outline: ['hero', 'products', 'features', 'text', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'fullbleed',
        eyebrow: 'Fine jewellery',
        headline: 'Made to be handed down',
        subtext: 'Fine gold and diamond pieces, handcrafted by our master jewellers and finished to order.',
        imageUrl: U('1515562141207-7a88fb7ce338'),
        ctaLabel: 'Explore the collection',
        ctaHref: '#',
      }),
      products({ bg: 'dark', heading: 'Signature pieces' }),
      features({
        bg: 'dark', layout: 'numbered', heading: 'From sketch to heirloom',
        items: [
          feat('Hand-sketched', 'Every piece starts as a drawing at our bench.', 'bx-pencil'),
          feat('Conflict-free stones', 'Solid recycled gold, ethically sourced stones.', 'bx-diamond'),
          feat('Engraved & certified', 'Yours to keep, with certification and free engraving.', 'bx-badge-check'),
        ],
      }),
      text({
        bg: 'dark',
        heading: 'Craft you can feel',
        body: 'Each piece begins as a hand-drawn sketch and is cast, set and polished in our own atelier. We source conflict-free stones and solid recycled gold, and every purchase is engraved and certified.',
        imageUrl: U('1611652022419-a9419f74343d', 1200),
      }),
      gallery({
        bg: 'dark', heading: 'The atelier',
        images: [U('1605100804763-247f67b3557e', 1200), U('1611652022419-a9419f74343d', 1200), U('1515562141207-7a88fb7ce338', 1200)],
      }),
      cta({ bg: 'dark', heading: 'Book a private viewing', subtext: 'One-to-one appointments for engagement rings and bespoke commissions.', buttonLabel: 'Request an appointment', buttonHref: '#' }),
      contact({ bg: 'dark', heading: 'Find our showroom' }),
    ],
  },

  /* ── 5. Sneakers / Streetwear (Urban Fit, dark) ──────────────────────── */
  {
    id: 'sneakers',
    name: 'Sneakers & Streetwear',
    description: 'Bold streetwear drop culture — black, tan, editorial hero',
    accentColor: '#B08D57',
    theme: { heroStyle: 'fullbleed', surface: 'dark' },
    preview: '/templates/0c6260b6ee78857f703c363e6118939e.jpg',
    outline: ['hero', 'products', 'features', 'gallery', 'text', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'fullbleed',
        eyebrow: 'Summer drop — live now',
        headline: 'Summer essentials, built for the street',
        subtext: 'The new collection has landed. Hoodies, sneakers and outerwear — up to 50% off launch week only.',
        imageUrl: U('1552346154-21d32810aba3'),
        ctaLabel: 'Shop now',
        ctaHref: '#',
      }),
      products({ bg: 'dark', heading: 'This week’s heat' }),
      features({
        bg: 'dark', layout: 'icons', heading: 'Why cop from us',
        items: [
          feat('100% authenticated', 'Every pair verified and sealed before it ships.', 'bx-check-shield'),
          feat('Deadstock only', 'Original box, unworn, or your money back.', 'bx-box'),
          feat('Fast shipping', 'Out the door same day, tracked to your door.', 'bx-rocket'),
        ],
      }),
      gallery({
        bg: 'dark', heading: 'On feet',
        images: [U('1460353581641-37baddab0fa2', 1200), U('1600185365483-26d7a4cc7519', 1200), U('1595950653106-6c9ebd614d3a', 1200)],
      }),
      text({
        bg: 'dark',
        heading: '100% authenticated. No fakes.',
        body: 'Every pair is verified by our in-house team and sealed with a tamper-proof tag before it ships. Deadstock condition, original box, or your money back — no questions.',
        imageUrl: U('1479064555552-3ef4979f8908', 1200),
      }),
      cta({ bg: 'dark', heading: 'Never miss a drop', subtext: 'Turn on drop alerts and get first dibs before the public restock.', buttonLabel: 'Get drop alerts', buttonHref: '#' }),
      contact({ bg: 'dark', heading: 'Pull up' }),
    ],
  },

  /* ── 6. Grocery / Market ─────────────────────────────────────────────── */
  {
    id: 'grocery',
    name: 'Grocery & Market',
    description: 'Fresh produce and daily essentials, split hero',
    accentColor: '#16A34A',
    theme: { heroStyle: 'split', surface: 'light' },
    outline: ['hero', 'features', 'products', 'text', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'split',
        eyebrow: 'Fresh, daily',
        headline: 'Farm-fresh, delivered daily',
        subtext: 'Fruit, veg, pantry staples and household basics — picked this morning, at your door by evening.',
        imageUrl: U('1542838132-92c53300491e'),
        ctaLabel: 'Start your basket',
        ctaHref: '#',
      }),
      features({
        bg: 'tint', layout: 'icons', heading: 'Shopping, sorted',
        items: [
          feat('Same-day delivery', 'Order by 2pm, at your door by evening.', 'bx-time-five'),
          feat('From local farms', 'Bought direct, within a day of harvest.', 'bx-leaf'),
          feat('Fair prices', 'Money that stays in the community.', 'bx-purchase-tag'),
        ],
      }),
      products({ heading: 'In season now' }),
      text({
        heading: 'Straight from local farms',
        body: 'We buy directly from smallholder farmers and pay them fairly, so produce reaches you within a day of harvest. Fresher food, longer shelf life, and money that stays in the community.',
        imageUrl: U('1488459716781-31db52582fe9', 1200),
      }),
      gallery({
        bg: 'warm', heading: 'On the shelves',
        images: [U('1550989460-0adf9ea622e2', 1200), U('1556228720-195a672e8a03', 1200), U('1553530666-ba11a7da3888', 1200)],
      }),
      cta({ heading: 'Free delivery over ₦20,000', subtext: 'Order your weekly shop and skip the queue.', buttonLabel: 'Shop groceries', buttonHref: '#' }),
      contact({ heading: 'Store & delivery hours' }),
    ],
  },

  /* ── 7. Restaurant (dark, moody) ─────────────────────────────────────── */
  {
    id: 'restaurant',
    name: 'Restaurant',
    description: 'Moody full-bleed hero with menu gallery',
    accentColor: '#B91C1C',
    theme: { heroStyle: 'fullbleed', surface: 'dark' },
    outline: ['hero', 'features', 'gallery', 'text', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'fullbleed',
        eyebrow: 'Dinner · Tue–Sun',
        headline: 'A table worth staying for',
        subtext: 'Seasonal plates, an open kitchen and a wine list built for lingering.',
        imageUrl: U('1517248135467-4c7edcad34c4'),
        ctaLabel: 'Reserve a table',
        ctaHref: '#',
      }),
      features({
        bg: 'dark', layout: 'icons', heading: 'What to expect',
        items: [
          feat('Seasonal menu', 'Changes with the market, every week.', 'bx-restaurant'),
          feat('Open kitchen', 'Watch every plate cooked over fire.', 'bx-dish'),
          feat('Natural wine', 'A tight, low-intervention list to linger over.', 'bx-wine'),
        ],
      }),
      gallery({
        bg: 'dark', heading: 'From the kitchen',
        images: [U('1504674900247-0877df9cc836', 1200), U('1414235077428-338989a2e8c0', 1200), U('1554412933-514a83d2f3c8', 1200)],
      }),
      text({
        bg: 'dark',
        heading: 'Cooked over fire, served with care',
        body: 'Our menu changes with the market — whatever the farms and boats bring us that morning. Everything is made in-house, from the sourdough to the ice cream, by a kitchen that cooks like it’s feeding family.',
        imageUrl: U('1414235077428-338989a2e8c0', 1200),
      }),
      cta({ bg: 'dark', heading: 'Book your evening', subtext: 'Walk-ins welcome at the bar; reservations recommended for dinner.', buttonLabel: 'Reserve now', buttonHref: '#' }),
      contact({ bg: 'dark', heading: 'Find us & opening hours' }),
    ],
  },

  /* ── 8. Café & Bakery (warm) ─────────────────────────────────────────── */
  {
    id: 'cafe',
    name: 'Café & Bakery',
    description: 'Warm, cosy centered hero for coffee & bakes',
    accentColor: '#8B5E3C',
    theme: { heroStyle: 'centered', surface: 'warm' },
    preview: '/templates/06538f5beec0636d3bac7fe52b901cbf.jpg',
    outline: ['hero', 'features', 'gallery', 'text', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'centered',
        bg: 'warm',
        eyebrow: 'Open since sunrise',
        headline: 'Your morning, made better',
        subtext: 'Slow-brewed coffee, bread baked before sunrise, and a corner that feels like home.',
        imageUrl: U('1495474472287-4d71bcdd2085'),
        ctaLabel: 'See the menu',
        ctaHref: '#',
      }),
      features({
        bg: 'warm', layout: 'icons', heading: 'Why we’re your local',
        items: [
          feat('Roasted in-house', 'Beans roasted and ground on-site, daily.', 'bx-coffee'),
          feat('Baked before dawn', 'Bread and pastries proved overnight.', 'bx-baguette'),
          feat('Order ahead', 'Your usual, ready and waiting.', 'bx-mobile'),
        ],
      }),
      gallery({
        bg: 'warm', heading: 'Fresh out of the oven',
        images: [U('1509440159596-0249088772ff', 1200), U('1502741224143-90386d7f8c82', 1200), U('1467003909585-2f8a72700288', 1200)],
      }),
      text({
        bg: 'warm',
        heading: 'Baked here, every single day',
        body: 'We mill some of our own flour and let every loaf prove overnight, so the crust cracks and the crumb stays soft. Pair it with beans we roast in-house and pull as a proper flat white.',
        imageUrl: U('1442512595331-e89e73853f31', 1200),
      }),
      cta({ bg: 'warm', heading: 'Order ahead', subtext: 'Skip the line — have your usual ready and waiting.', buttonLabel: 'Order & collect', buttonHref: '#' }),
      contact({ bg: 'warm', heading: 'Pop in' }),
    ],
  },

  /* ── 9. Food Delivery (warm, how-it-works) ───────────────────────────── */
  {
    id: 'food-delivery',
    name: 'Food Delivery',
    description: 'Order-online kitchen with a warm split hero',
    accentColor: '#C87F3A',
    theme: { heroStyle: 'split', surface: 'warm' },
    preview: '/templates/a55f4c867c1d2af6a57616d3a21c915d.jpg',
    outline: ['hero', 'features', 'products', 'text', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'split',
        bg: 'warm',
        eyebrow: 'Order online',
        headline: 'Today is special — order now',
        subtext: 'Chef-made plates cooked to order and delivered while they’re still steaming. Easy to order, fast delivery, secured payment.',
        imageUrl: U('1543168256-418811576931'),
        ctaLabel: 'Get now',
        ctaHref: '#',
      }),
      features({
        bg: 'warm', layout: 'numbered', heading: 'How it works',
        items: [
          feat('Pick your meal', 'Browse today’s menu and build your order.', 'bx-restaurant'),
          feat('We cook to order', 'Your food fires the moment you check out.', 'bx-dish'),
          feat('Delivered hot', 'Vented, leak-proof boxes, tracked to your door.', 'bx-cycling'),
        ],
      }),
      products({ bg: 'warm', heading: 'Today’s menu' }),
      text({
        bg: 'warm',
        heading: 'Made when you order, not before',
        body: 'No heat lamps, no sitting trays. Every order fires the moment it lands, gets packed in vented, leak-proof boxes, and rides straight to you. Track it live from wok to doorstep.',
        imageUrl: U('1526367790999-0150786686a2', 1200),
      }),
      cta({ bg: 'warm', heading: 'Free delivery on your first order', subtext: 'Hungry now? Beat the rush and order ahead.', buttonLabel: 'Browse the menu', buttonHref: '#' }),
      contact({ bg: 'warm', heading: 'Delivery area & hours' }),
    ],
  },

  /* ── 10. Salon & Spa (warm) ──────────────────────────────────────────── */
  {
    id: 'salon-spa',
    name: 'Salon & Spa',
    description: 'Calm, centered hero for hair, nails & wellness',
    accentColor: '#9333EA',
    theme: { heroStyle: 'centered', surface: 'warm' },
    outline: ['hero', 'features', 'gallery', 'text', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'centered',
        bg: 'warm',
        eyebrow: 'Hair · Nails · Spa',
        headline: 'An hour that’s just for you',
        subtext: 'Hair, nails, facials and massage — expert hands and a space designed to help you exhale.',
        imageUrl: U('1560750588-73207b1ef5b8'),
        ctaLabel: 'Book an appointment',
        ctaHref: '#',
      }),
      features({
        bg: 'tint', layout: 'icons', heading: 'The little things',
        items: [
          feat('Expert stylists', 'A team that trains continuously.', 'bx-cut'),
          feat('A calm space', 'Designed to help you switch off.', 'bx-spa'),
          feat('Honest advice', 'Only what your hair and skin need.', 'bx-message-rounded-check'),
        ],
      }),
      gallery({
        bg: 'warm', heading: 'The experience',
        images: [U('1600334089648-b0d9d3028eb2', 1200), U('1556909212-d5b604d0c90d', 1200), U('1583864697784-a0efc8379f70', 1200)],
      }),
      text({
        bg: 'warm',
        heading: 'Skilled hands, honest advice',
        body: 'Our stylists and therapists train continuously and only recommend what your hair and skin actually need. Come in for a consultation and leave with a plan — not just a treatment.',
        imageUrl: U('1522337660859-02fbefca4702', 1200),
      }),
      cta({ bg: 'warm', heading: 'Treat yourself, or someone you love', subtext: 'Gift cards and package deals available all year round.', buttonLabel: 'Book now', buttonHref: '#' }),
      contact({ bg: 'warm', heading: 'Booking & location' }),
    ],
  },

  /* ── 11. Gym & Fitness (dark) ────────────────────────────────────────── */
  {
    id: 'gym',
    name: 'Gym & Fitness',
    description: 'High-energy dark hero for training studios',
    accentColor: '#DC2626',
    theme: { heroStyle: 'fullbleed', surface: 'dark' },
    outline: ['hero', 'features', 'text', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'fullbleed',
        eyebrow: 'First session free',
        headline: 'Stronger starts today',
        subtext: 'Coached classes, serious kit and a community that shows up. Your first session is on us.',
        imageUrl: U('1534438327276-14e5300c3a48'),
        ctaLabel: 'Claim your free pass',
        ctaHref: '#',
      }),
      features({
        bg: 'dark', layout: 'icons', heading: 'Train with intent',
        items: [
          feat('Coached classes', 'A qualified coach on the floor, every session.', 'bx-dumbbell'),
          feat('A plan for you', 'Assessed and programmed around your goals.', 'bx-target-lock'),
          feat('Real community', 'People who show up and cheer you on.', 'bx-group'),
        ],
      }),
      text({
        bg: 'dark',
        heading: 'Train with a plan, not a guess',
        body: 'Every member gets an assessment and a programme built around their goals — strength, fat loss or just moving better. Our coaches are on the floor every session, correcting form and pushing you past comfortable.',
        imageUrl: U('1571019613454-1cb2f99b2d8b', 1200),
      }),
      gallery({
        bg: 'dark', heading: 'Inside the box',
        images: [U('1517836357463-d25dfeac3438', 1200), U('1534438327276-14e5300c3a48', 1200), U('1571019613454-1cb2f99b2d8b', 1200)],
      }),
      cta({ bg: 'dark', heading: 'Ready to commit?', subtext: 'No joining fee this month. Cancel any time.', buttonLabel: 'See membership plans', buttonHref: '#' }),
      contact({ bg: 'dark', heading: 'Visit the gym' }),
    ],
  },

  /* ── 12. Photography Portfolio (dark) ────────────────────────────────── */
  {
    id: 'photography',
    name: 'Photography',
    description: 'Dark, image-first portfolio for photographers',
    accentColor: '#0F172A',
    theme: { heroStyle: 'fullbleed', surface: 'dark' },
    outline: ['hero', 'gallery', 'features', 'text', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'fullbleed',
        eyebrow: 'Portfolio',
        headline: 'Moments, kept forever',
        subtext: 'Weddings, portraits and brand stories — shot with a quiet eye and delivered with care.',
        imageUrl: U('1452587925148-ce544e77e70d'),
        ctaLabel: 'View portfolio',
        ctaHref: '#',
      }),
      gallery({
        bg: 'dark', heading: 'Selected work',
        images: [U('1493863641943-9b68992a8d07', 1200), U('1470259078422-826894b933aa', 1200), U('1471341971476-ae15ff5dd4ea', 1200)],
      }),
      features({
        bg: 'dark', layout: 'numbered', heading: 'How I work',
        items: [
          feat('Documentary style', 'The glances and the in-between — the real ones.', 'bx-camera'),
          feat('Hand-edited', 'Hundreds of high-resolution images, edited by me.', 'bx-image'),
          feat('Full print rights', 'Yours to print and keep, with an album on request.', 'bx-photo-album'),
        ],
      }),
      text({
        bg: 'dark',
        heading: 'The story, not just the photos',
        body: 'I shoot documentary-style — the glances, the in-between, the real ones. You get a gallery of hundreds of high-resolution images, hand-edited, with full print rights and an heirloom album on request.',
        imageUrl: U('1493863641943-9b68992a8d07', 1200),
      }),
      cta({ bg: 'dark', heading: 'Let’s make something', subtext: 'Booking dates for the season now — tell me about your day.', buttonLabel: 'Check availability', buttonHref: '#' }),
      contact({ bg: 'dark', heading: 'Get in touch' }),
    ],
  },

  /* ── 13. Real Estate ─────────────────────────────────────────────────── */
  {
    id: 'real-estate',
    name: 'Real Estate',
    description: 'Trust-building split hero for agents & listings',
    accentColor: '#0E7490',
    theme: { heroStyle: 'split', surface: 'light' },
    outline: ['hero', 'gallery', 'features', 'text', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'split',
        eyebrow: 'Homes & lettings',
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
      features({
        bg: 'tint', layout: 'icons', heading: 'Why buyers choose us',
        items: [
          feat('Handpicked listings', 'Every home viewed and vetted by us first.', 'bx-home-heart'),
          feat('Hard negotiation', 'We push for your price, not the quick deal.', 'bx-trending-down'),
          feat('Local knowledge', 'Every street, school and shortcut on the map.', 'bx-map-alt'),
        ],
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

  /* ── 14. Agency & Studio ─────────────────────────────────────────────── */
  {
    id: 'agency',
    name: 'Agency & Studio',
    description: 'Confident centered hero for creative teams',
    accentColor: '#6366F1',
    theme: { heroStyle: 'centered', surface: 'light' },
    outline: ['hero', 'features', 'text', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'centered',
        eyebrow: 'Design studio',
        headline: 'Brands, built to be remembered',
        subtext: 'A small studio doing strategy, identity and websites for ambitious teams across Africa.',
        imageUrl: U('1497366216548-37526070297c'),
        ctaLabel: 'Start a project',
        ctaHref: '#',
      }),
      features({
        bg: 'tint', layout: 'icons', heading: 'What we do',
        items: [
          feat('Strategy', 'Positioning, naming and the story you’ll tell.', 'bx-bulb'),
          feat('Identity', 'Logo, type and a system that scales.', 'bx-palette'),
          feat('Websites', 'Fast, considered sites that convert.', 'bx-code-alt'),
        ],
      }),
      text({
        heading: 'Sharp thinking, then sharp design',
        body: 'We start with the hard questions — who you’re for, why you matter, what you want people to feel. Then we turn the answers into an identity, a website and the assets to launch it, all shipped on time.',
        imageUrl: U('1522071820081-009f0129c71c', 1200),
      }),
      gallery({
        bg: 'dark', heading: 'Recent work',
        images: [U('1600880292203-757bb62b4baf', 1200), U('1487958449943-2429e8be8625', 1200), U('1487222477894-8943e31ef7b2', 1200)],
      }),
      cta({ heading: 'Have a brief?', subtext: 'Tell us what you’re building and we’ll come back within a day.', buttonLabel: 'Book a call', buttonHref: '#' }),
      contact({ heading: 'Work with us' }),
    ],
  },

  /* ── 15. Patisserie & Desserts (warm, dusty rose) ────────────────────── */
  {
    id: 'patisserie',
    name: 'Patisserie & Desserts',
    description: 'Dusty-rose dessert café with a soft, sweet hero',
    accentColor: '#8C6A6A',
    theme: { heroStyle: 'centered', surface: 'warm' },
    preview: '/templates/4e09c45e262c596f7a12833f581f5d9c.jpg',
    outline: ['hero', 'products', 'features', 'gallery', 'text', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'centered',
        bg: 'warm',
        eyebrow: 'Fresh each morning',
        headline: 'Sweet moments start here',
        subtext: 'Hand-finished cakes, pastries and slow-poured coffee — made fresh each morning in our little corner of the city.',
        imageUrl: U('1509440159596-0249088772ff'),
        ctaLabel: 'See the menu',
        ctaHref: '#',
      }),
      products({ bg: 'warm', heading: 'Today’s bakes' }),
      features({
        bg: 'tint', layout: 'icons', heading: 'Made properly',
        items: [
          feat('Real butter', 'No shortcuts, no substitutes — ever.', 'bx-cookie'),
          feat('Seasonal fruit', 'Whatever’s ripe, folded in fresh.', 'bx-lemon'),
          feat('Small batches', 'Baked in the morning, gone by close.', 'bx-cake'),
        ],
      }),
      gallery({
        bg: 'warm', heading: 'From the counter',
        images: [U('1550439062-609e1531270e', 1200), U('1571260899304-425eee4c7efc', 1200), U('1467003909585-2f8a72700288', 1200)],
      }),
      text({
        bg: 'warm',
        heading: 'Made by hand, every single day',
        body: 'We bake in small batches with real butter, seasonal fruit and single-origin chocolate — nothing frozen, nothing rushed. Pull up a chair, order a slice, and let the afternoon slow right down.',
        imageUrl: U('1442512595331-e89e73853f31', 1200),
      }),
      cta({ bg: 'warm', heading: 'Order a celebration cake', subtext: 'Custom cakes for birthdays, weddings and everything worth marking.', buttonLabel: 'Enquire now', buttonHref: '#' }),
      contact({ bg: 'warm', heading: 'Find the café' }),
    ],
  },

  /* ── 16. Coffee House (dark, navy) ───────────────────────────────────── */
  {
    id: 'coffee-house',
    name: 'Coffee House',
    description: 'Deep-navy coffee brand with a bold full-bleed hero',
    accentColor: '#3B82F6',
    theme: { heroStyle: 'fullbleed', surface: 'dark' },
    preview: '/templates/aae276f58aba66811c153b4b8e5247a1.jpg',
    outline: ['hero', 'features', 'products', 'text', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'fullbleed',
        eyebrow: 'Coffee, done properly',
        headline: 'Your daily ritual, upgraded',
        subtext: 'Signature blends, iced classics and rich mochas — pulled fresh, served fast, and made to be your daily ritual.',
        imageUrl: U('1495474472287-4d71bcdd2085'),
        ctaLabel: 'Order ahead',
        ctaHref: '#',
      }),
      features({
        bg: 'dark', layout: 'icons', heading: 'What’s in your cup',
        items: [
          feat('Small-lot roast', 'Roasted in small lots for consistency.', 'bx-coffee-togo'),
          feat('Dialled-in shots', 'The same great cup, first to fourth.', 'bx-slider'),
          feat('Order ahead', 'Skip the queue from the app.', 'bx-mobile-alt'),
        ],
      }),
      products({ bg: 'dark', heading: 'The menu' }),
      text({
        bg: 'dark',
        heading: 'Beans we’re proud of',
        body: 'We roast in small lots and dial in every shot, so your cup tastes the same whether it’s your first of the day or your fourth. Ethically sourced, freshly ground, never bitter.',
        imageUrl: U('1502741224143-90386d7f8c82', 1200),
      }),
      gallery({
        bg: 'dark', heading: 'In the cup',
        images: [U('1509440159596-0249088772ff', 1200), U('1467003909585-2f8a72700288', 1200), U('1442512595331-e89e73853f31', 1200)],
      }),
      cta({ bg: 'dark', heading: 'Grab yours to go', subtext: 'Order from the app and skip the queue — your usual, ready when you are.', buttonLabel: 'Start an order', buttonHref: '#' }),
      contact({ bg: 'dark', heading: 'Opening hours' }),
    ],
  },

  /* ── 17. Specialty Coffee (warm, sage green) ─────────────────────────── */
  {
    id: 'specialty-coffee',
    name: 'Specialty Coffee',
    description: 'Calm sage-green specialty roaster with a split hero',
    accentColor: '#5E7C5E',
    theme: { heroStyle: 'split', surface: 'warm' },
    preview: '/templates/ae4caa9abfa790a32a147688a32c76e2.jpg',
    outline: ['hero', 'products', 'features', 'text', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'split',
        bg: 'warm',
        eyebrow: 'Specialty roaster',
        headline: 'Coffee you’ll fall for from the first sip',
        subtext: 'Specialty beans, fresh bakes and a calm space in the heart of the city. 100% arabica, roasted in small batches every week.',
        imageUrl: U('1495474472287-4d71bcdd2085'),
        ctaLabel: 'View the menu',
        ctaHref: '#',
      }),
      products({ bg: 'warm', heading: 'Popular drinks' }),
      features({
        bg: 'tint', layout: 'icons', heading: 'Our promise',
        items: [
          feat('100% arabica', 'Only the top of the crop, ever.', 'bx-leaf'),
          feat('Roasted weekly', 'Small batches, always fresh in the bag.', 'bx-calendar'),
          feat('Direct trade', 'From the farm to your cup, fairly.', 'bx-transfer'),
        ],
      }),
      text({
        bg: 'warm',
        heading: 'Beans we’re proud of',
        body: 'We travel, we taste, we choose the best — then roast with care to bring out the flavour in every cup. Direct from the farm, roasted to order, and fresh in every bag.',
        imageUrl: U('1442512595331-e89e73853f31', 1200),
      }),
      gallery({
        bg: 'warm', heading: 'Recommended to try',
        images: [U('1467003909585-2f8a72700288', 1200), U('1502741224143-90386d7f8c82', 1200), U('1509440159596-0249088772ff', 1200)],
      }),
      cta({ bg: 'warm', heading: 'Reserve a table', subtext: 'Bright, quiet and welcoming — your new favourite spot to work or unwind.', buttonLabel: 'Book a table', buttonHref: '#' }),
      contact({ bg: 'warm', heading: 'Visit us' }),
    ],
  },

  /* ── 18. Sneaker Lab / Collab Drop (playful, light) ──────────────────── */
  {
    id: 'sneaker-lab',
    name: 'Sneaker Lab',
    description: 'Playful primary-colour hype for limited collab drops',
    accentColor: '#E4002B',
    theme: { heroStyle: 'centered', surface: 'light' },
    preview: '/templates/ed2c4b9a350631b70270f9c14b38ed3a.jpg',
    outline: ['hero', 'products', 'features', 'text', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'centered',
        bg: 'tint',
        eyebrow: 'Limited collab drop',
        headline: 'You’re never too old to play',
        subtext: 'A limited collaboration drop — playful colourways, archival silhouettes and instantly recognisable design. Once they’re gone, they’re gone.',
        imageUrl: U('1552346154-21d32810aba3'),
        ctaLabel: 'Shop the collab',
        ctaHref: '#',
      }),
      products({ heading: 'The collection' }),
      features({
        bg: 'tint', layout: 'icons', heading: 'The drop in numbers',
        items: [
          feat('Numbered pairs', 'Each pair numbered, one per person.', 'bx-hash'),
          feat('Premium suede', 'Chunky soles, block colour, real suede.', 'bx-diamond'),
          feat('Ships worldwide', 'Boxed, sealed and tracked everywhere.', 'bx-world'),
        ],
      }),
      text({
        heading: 'Built to be noticed',
        body: 'Every pair pairs a heritage silhouette with a bold, block-colour build — premium suede, chunky soles and details that turn heads. Numbered, boxed and shipped worldwide.',
        imageUrl: U('1595950653106-6c9ebd614d3a', 1200),
      }),
      gallery({
        heading: 'On feet',
        images: [U('1460353581641-37baddab0fa2', 1200), U('1600185365483-26d7a4cc7519', 1200), U('1556742049-0cfed4f6a45d', 1200)],
      }),
      cta({ heading: 'Join the raffle', subtext: 'Limited stock, one pair per person. Enter now for your shot at the drop.', buttonLabel: 'Enter the raffle', buttonHref: '#' }),
      contact({ heading: 'Stockist & support' }),
    ],
  },

  /* ── 19. E-Learning / Education (forest green) ───────────────────────── */
  {
    id: 'education',
    name: 'E-Learning',
    description: 'Friendly forest-green platform for courses & training',
    accentColor: '#2E7D5B',
    theme: { heroStyle: 'split', surface: 'light' },
    preview: '/templates/1600928881d270ac98ad36f04f9a286c.jpg',
    outline: ['hero', 'features', 'products', 'text', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'split',
        eyebrow: 'Learn online',
        headline: 'Learn at your pace, from beginner to advanced',
        subtext: 'Self-paced courses, live support and downloadable materials — a clear pathway from your first lesson to real, job-ready skills.',
        imageUrl: U('1523240795612-9a054b0db644'),
        ctaLabel: 'Start learning',
        ctaHref: '#',
      }),
      features({
        bg: 'tint', layout: 'icons', heading: 'Built for real progress',
        items: [
          feat('Self-paced', 'Learn on any device, pick up where you left off.', 'bx-play-circle'),
          feat('Mentor feedback', 'Projects reviewed by people who’ve done it.', 'bx-message-rounded-dots'),
          feat('Certificates', 'Earn a shareable certificate on every track.', 'bx-award'),
        ],
      }),
      products({ heading: 'Featured courses' }),
      text({
        heading: 'A pathway, not just a playlist',
        body: 'Every track is structured beginner-to-advanced with quizzes, projects and mentor feedback. Learn on any device, pick up where you left off, and earn a certificate you can share.',
        imageUrl: U('1524178232363-1fb2b075b655', 1200),
      }),
      gallery({
        heading: 'Inside the platform',
        images: [U('1517048676732-d65bc937f952', 1200), U('1522202176988-66273c2fd55f', 1200), U('1434030216411-0b793f4b4173', 1200)],
      }),
      cta({ heading: 'Try your first course free', subtext: 'No card required — start today and upgrade only when you’re ready.', buttonLabel: 'Get started', buttonHref: '#' }),
      contact({ heading: 'Talk to our team' }),
    ],
  },

  /* ── 20. SaaS / Digital Product (violet) ─────────────────────────────── */
  {
    id: 'saas',
    name: 'SaaS & Software',
    description: 'Modern violet product site with a centered hero',
    accentColor: '#6D5EF6',
    theme: { heroStyle: 'centered', surface: 'light' },
    preview: '/templates/3ac8da5a7b98b519737d1f32c8a800de.jpg',
    outline: ['hero', 'features', 'text', 'products', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'centered',
        bg: 'tint',
        eyebrow: 'Smart digital solutions',
        headline: 'Grow your business with one smart platform',
        subtext: 'One platform to manage, automate and scale — powerful tools, a clean dashboard and insights that actually move the numbers.',
        imageUrl: U('1551288049-bebda4e38f71'),
        ctaLabel: 'Get started',
        ctaHref: '#',
      }),
      features({
        bg: 'light', layout: 'icons', heading: 'Everything in one place',
        subtext: 'Connect your tools, track what matters and automate the busywork.',
        items: [
          feat('Automate busywork', 'Set rules once and let the platform run them.', 'bx-cog'),
          feat('Real-time analytics', 'Live dashboards on the numbers that matter.', 'bx-line-chart'),
          feat('Secure by default', 'Encrypted, role-based and audit-logged.', 'bx-lock-alt'),
        ],
      }),
      text({
        heading: 'Everything in one place',
        body: 'Connect your tools, track what matters and automate the busywork. Real-time analytics, secure by default, and built to scale from your first customer to your millionth.',
        imageUrl: U('1460925895917-afdab827c52f', 1200),
      }),
      products({ bg: 'tint', heading: 'Plans & pricing' }),
      gallery({
        heading: 'Inside the product',
        images: [U('1517245386807-bb43f82c33c4', 1200), U('1531973576160-7125cd663d86', 1200), U('1519389950473-47ba0277781c', 1200)],
      }),
      cta({ heading: 'Ready to get started?', subtext: 'Free 14-day trial, no credit card. Cancel any time.', buttonLabel: 'Start free trial', buttonHref: '#' }),
      contact({ heading: 'Contact sales' }),
    ],
  },

  /* ── 21. Business / Consulting (yellow & black) ──────────────────────── */
  {
    id: 'business',
    name: 'Business & Consulting',
    description: 'Bold yellow-on-black corporate services site',
    accentColor: '#F5B301',
    theme: { heroStyle: 'fullbleed', surface: 'dark' },
    preview: '/templates/5f26f27889573194ef6b17740f29d8ef.jpg',
    outline: ['hero', 'features', 'text', 'products', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'fullbleed',
        eyebrow: 'Strategy · Operations · Growth',
        headline: 'Solutions that move your business forward',
        subtext: 'Consulting for ambitious teams — a clear plan, measurable results and a partner who stays in it with you.',
        imageUrl: U('1454165804606-c3d57bc86b40'),
        ctaLabel: 'Book a consultation',
        ctaHref: '#',
      }),
      features({
        bg: 'dark', layout: 'numbered', heading: 'A proven process, end to end',
        items: [
          feat('Research', 'We learn your business, market and numbers.', 'bx-search-alt'),
          feat('Plan', 'A clear roadmap with owners and milestones.', 'bx-map'),
          feat('Execute & measure', 'We deliver and track the results, together.', 'bx-line-chart'),
        ],
      }),
      text({
        bg: 'dark',
        heading: 'A partner, not just a report',
        body: 'We research, plan, execute and measure — clear steps from where you are to where you want to be. No jargon, no guesswork, just a roadmap and the hands to deliver it.',
        imageUrl: U('1552581234-26160f608093', 1200),
      }),
      products({ bg: 'dark', heading: 'Our services' }),
      gallery({
        bg: 'dark', heading: 'The team at work',
        images: [U('1531403009284-440f080d1e12', 1200), U('1600880292089-90a7e086ee0c', 1200), U('1497215728101-856f4ea42174', 1200)],
      }),
      cta({ bg: 'dark', heading: 'Let’s talk about your goals', subtext: 'Book a free 30-minute strategy call and leave with three things to action.', buttonLabel: 'Schedule a call', buttonHref: '#' }),
      contact({ bg: 'dark', heading: 'Get in touch' }),
    ],
  },

  /* ── 22. Plant Shop / Garden (dark green) ────────────────────────────── */
  {
    id: 'plants',
    name: 'Plant Shop',
    description: 'Lush green plant store with an immersive dark hero',
    accentColor: '#3F6B3F',
    theme: { heroStyle: 'fullbleed', surface: 'dark' },
    preview: '/templates/84d2610706125d9ee89afb3c340c7e4b.jpg',
    outline: ['hero', 'products', 'features', 'text', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({
        variant: 'fullbleed',
        eyebrow: 'Houseplants & greenery',
        headline: 'Bring the outside in',
        subtext: 'Easy-care houseplants, statement greenery and everything they need to thrive — delivered potted and ready to grow.',
        imageUrl: U('1485955900006-10f4d324d411'),
        ctaLabel: 'Shop plants',
        ctaHref: '#',
      }),
      products({ bg: 'dark', heading: 'Bestselling plants' }),
      features({
        bg: 'dark', layout: 'icons', heading: 'Delivered to thrive',
        items: [
          feat('Nursery-grown', 'Hand-picked and matched to your light.', 'bx-leaf'),
          feat('Care card included', 'Simple, plant-specific care in every box.', 'bx-note'),
          feat('Message us anytime', 'A leaf looks unsure? We’re one message away.', 'bx-message-rounded'),
        ],
      }),
      text({
        bg: 'dark',
        heading: 'Chosen to thrive, not just survive',
        body: 'Every plant is nursery-grown, hand-picked and matched to your light and space. We ship them carefully potted with a care card, and our team is one message away if a leaf ever looks unsure.',
        imageUrl: U('1416879595882-3373a0480b5b', 1200),
      }),
      gallery({
        bg: 'dark', heading: 'The collection',
        images: [U('1466692476868-aef1dfb1e735', 1200), U('1512428813834-c702c7702b78', 1200), U('1462530260150-162092dbf011', 1200)],
      }),
      cta({ bg: 'dark', heading: 'New to plants?', subtext: 'Take our two-minute quiz and we’ll match you with hard-to-kill greenery.', buttonLabel: 'Find my plant', buttonHref: '#' }),
      contact({ bg: 'dark', heading: 'Visit the nursery' }),
    ],
  },
];
