import {
  WebsiteSection,
  HeroVariant,
  newSection,
  HeroSection,
  TextSection,
  FeaturesSection,
  FeatureItem,
  StatsSection,
  MenuSection,
  TestimonialSection,
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
 * Every template is built on a DIFFERENT architecture (block sequence + per-block
 * layout variant + surface mood), modelled on its design mockup — a restaurant is
 * menu-led, a boutique is an editorial statement, a portfolio is masonry-led, a
 * SaaS leans on stats + pricing. Same block model, genuinely different websites.
 * The editor canvas and the public page render the SAME blocks (SiteBlocks.tsx),
 * so the preview, the editor and the live site agree.
 */

/** Build a stable Unsplash CDN URL for a known-good photo id. */
const U = (id: string, w = 1600): string =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const hero = (o: Partial<HeroSection>): HeroSection => ({ ...(newSection('hero') as HeroSection), ...o });
const text = (o: Partial<TextSection>): TextSection => ({ ...(newSection('text') as TextSection), ...o });
const features = (o: Partial<FeaturesSection>): FeaturesSection => ({ ...(newSection('features') as FeaturesSection), ...o });
const stats = (o: Partial<StatsSection>): StatsSection => ({ ...(newSection('stats') as StatsSection), ...o });
const menu = (o: Partial<MenuSection>): MenuSection => ({ ...(newSection('menu') as MenuSection), ...o });
const testimonial = (o: Partial<TestimonialSection>): TestimonialSection => ({ ...(newSection('testimonial') as TestimonialSection), ...o });
const products = (o: Partial<ProductsSection>): ProductsSection => ({ ...(newSection('products') as ProductsSection), ...o });
const gallery = (o: Partial<GallerySection>): GallerySection => ({ ...(newSection('gallery') as GallerySection), ...o });
const cta = (o: Partial<CtaSection>): CtaSection => ({ ...(newSection('cta') as CtaSection), ...o });
const contact = (o: Partial<ContactSection>): ContactSection => ({ ...(newSection('contact') as ContactSection), ...o });
const feat = (title: string, body: string, icon?: string, image?: string): FeatureItem => ({ title, body, icon, image });
const stat = (value: string, label: string) => ({ value, label });

/** Light styling hints that ride along with a template. */
export interface WebsiteTheme {
  heroStyle: HeroVariant;
  surface: 'light' | 'warm' | 'dark';
}

export interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  theme?: WebsiteTheme;
  /** Optional full-page design mockup (served from public/templates/). */
  preview?: string;
  /** The ordered block types, for the card thumbnail preview. */
  outline: string[];
  sections: () => WebsiteSection[];
}

export const WEBSITE_TEMPLATES: WebsiteTemplate[] = [
  /* ── 1. Boutique — editorial statement, minimal ──────────────────────── */
  {
    id: 'boutique',
    name: 'Boutique',
    description: 'Editorial fashion label — big type, statement, masonry lookbook',
    accentColor: '#111827',
    theme: { heroStyle: 'minimal', surface: 'light' },
    outline: ['hero', 'text', 'products', 'gallery', 'testimonial', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'minimal', eyebrow: 'New season', headline: 'Dressed for the moment', subtext: 'A tightly-edited wardrobe of modern essentials, made in small runs and built to last.', ctaLabel: 'Shop the edit', ctaHref: '#' }),
      text({ variant: 'statement', heading: 'Buy less. Wear it for years.', body: 'We drop two collections a year — no more. Each piece is cut from deadstock and natural fibres, sampled on real bodies, and priced honestly.' }),
      products({ variant: 'showcase', heading: 'New arrivals' }),
      gallery({ variant: 'masonry', bg: 'warm', heading: 'Lookbook', images: [U('1490481651871-ab68de25d43d', 1200), U('1489987707025-afc232f7ea0f', 1200), U('1441986300917-64674bd600d8', 1200), U('1483985988355-763728e1935b', 1200), U('1485462537746-965f33f7f6a7', 1200), U('1487412720507-e7ab37603c6f', 1200)] }),
      testimonial({ bg: 'tint', quote: 'The best-made pieces in my wardrobe — I reach for them every week.', author: 'Amara O.', role: 'Lagos' }),
      cta({ variant: 'split', heading: 'Join the list', subtext: 'Early access to drops, restocks and members-only pricing.', buttonLabel: 'Sign me up', buttonHref: '#' }),
      contact({ heading: 'Visit the studio' }),
    ],
  },

  /* ── 2. Electronics — split hero, zigzag numbered features, banner ───── */
  {
    id: 'electronics',
    name: 'Electronics & Audio',
    description: 'Premium audio — split hero, alternating numbered features, product grid',
    accentColor: '#1F2937',
    theme: { heroStyle: 'split', surface: 'light' },
    preview: '/templates/0238647e47e4c4e8352c7204a525bce4.jpg',
    outline: ['hero', 'features', 'products', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'split', eyebrow: 'Premium audio', headline: 'Crafted for focus, designed for life', subtext: 'Headphones, earbuds and wearables engineered for pure sound — a timeless silhouette that fits seamlessly into your day.', imageUrl: U('1505740420928-5e560c06d30e'), ctaLabel: 'Explore the experience', ctaHref: '#' }),
      features({
        layout: 'numbered', bg: 'light', heading: 'Engineered, detail by detail', subtext: 'Every part is tuned to disappear, so the sound is all that’s left.',
        items: [
          feat('Engineered for pure performance', 'Precisely crafted to deliver exceptional sound, comfort and clarity.', undefined, U('1484704849700-f032a568e944', 1200)),
          feat('Technology that elevates every moment', 'Advanced acoustic architecture for immersive sound and intelligent noise control.', undefined, U('1583394838336-acd977736f90', 1200)),
          feat('Minimal design, maximum impact', 'A timeless silhouette that fits seamlessly into your life and your world.', undefined, U('1546435770-a3e426bf472b', 1200)),
        ],
      }),
      products({ variant: 'grid', bg: 'tint', heading: 'The lineup' }),
      cta({ variant: 'banner', heading: 'Sound that inspires. Design that lasts.', subtext: 'Genuine stock, real warranties, next-day delivery.', buttonLabel: 'Discover more', buttonHref: '#' }),
      contact({ heading: 'Visit our store' }),
    ],
  },

  /* ── 3. Beauty — soft warm, testimonial, card CTA ────────────────────── */
  {
    id: 'beauty',
    name: 'Beauty & Cosmetics',
    description: 'Soft warm skincare — centered hero, icon benefits, testimonial',
    accentColor: '#DB2777',
    theme: { heroStyle: 'centered', surface: 'warm' },
    outline: ['hero', 'products', 'features', 'gallery', 'testimonial', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'centered', bg: 'warm', eyebrow: 'Clean beauty', headline: 'Glow that starts with you', subtext: 'Clean, cruelty-free skincare and colour, formulated for melanin-rich skin and every shade in between.', imageUrl: U('1596462502278-27bfdc403348'), ctaLabel: 'Shop the range', ctaHref: '#' }),
      products({ variant: 'grid', bg: 'warm', heading: 'Bestsellers' }),
      features({ layout: 'icons', bg: 'tint', heading: 'What we promise', items: [feat('Cruelty-free', 'Never tested on animals — certified, always.', 'bx-heart'), feat('Dermatologist-tested', 'Proven kind to sensitive skin.', 'bx-check-shield'), feat('Refillable', 'Refill pouches that cut packaging by 70%.', 'bx-recycle')] }),
      gallery({ variant: 'grid', bg: 'warm', heading: 'Before & after', images: [U('1522335789203-aabd1fc54bc9', 1200), U('1571875257727-256c39da42af', 1200), U('1596704017254-9b121068fb31', 1200)] }),
      testimonial({ bg: 'warm', quote: 'My skin has never looked better — and it’s the only range that matches my shade.', author: 'Zainab A.', role: 'Verified customer' }),
      cta({ variant: 'card', bg: 'warm', heading: 'Get 15% off your first order', subtext: 'Join the glow list for launches, tips and members-only sets.', buttonLabel: 'Claim my discount', buttonHref: '#' }),
      contact({ bg: 'warm', heading: 'Talk to us' }),
    ],
  },

  /* ── 4. Jewelry — luxe dark, quote, showcase, split CTA ──────────────── */
  {
    id: 'jewelry',
    name: 'Jewelry',
    description: 'Luxe dark & gold — quote, showcase grid, numbered craft',
    accentColor: '#C9A227',
    theme: { heroStyle: 'fullbleed', surface: 'dark' },
    outline: ['hero', 'text', 'products', 'features', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'fullbleed', eyebrow: 'Fine jewellery', headline: 'Made to be handed down', subtext: 'Fine gold and diamond pieces, handcrafted by our master jewellers and finished to order.', imageUrl: U('1515562141207-7a88fb7ce338'), ctaLabel: 'Explore the collection', ctaHref: '#' }),
      text({ variant: 'quote', bg: 'dark', body: 'A piece of jewellery is the one gift that outlives the moment it was given.', heading: 'Our founder' }),
      products({ variant: 'showcase', bg: 'dark', heading: 'Signature pieces' }),
      features({ layout: 'numbered', bg: 'dark', heading: 'From sketch to heirloom', items: [feat('Hand-sketched', 'Every piece starts as a drawing at our bench.', 'bx-pencil'), feat('Conflict-free stones', 'Solid recycled gold, ethically sourced stones.', 'bx-diamond'), feat('Engraved & certified', 'Yours to keep, with certification and free engraving.', 'bx-badge-check')] }),
      gallery({ variant: 'wide', bg: 'dark', heading: 'The atelier', images: [U('1605100804763-247f67b3557e', 1200), U('1611652022419-a9419f74343d', 1200)] }),
      cta({ variant: 'split', bg: 'dark', heading: 'Book a private viewing', subtext: 'One-to-one appointments for engagement rings and bespoke commissions.', buttonLabel: 'Request an appointment', buttonHref: '#' }),
      contact({ bg: 'dark', heading: 'Find our showroom' }),
    ],
  },

  /* ── 5. Sneakers (Urban Fit) — light cream commerce, strip lookbook ──── */
  {
    id: 'sneakers',
    name: 'Sneakers & Streetwear',
    description: 'Cream streetwear store — icon strip, product grid, shop-the-look',
    accentColor: '#B08D57',
    theme: { heroStyle: 'split', surface: 'warm' },
    preview: '/templates/0c6260b6ee78857f703c363e6118939e.jpg',
    outline: ['hero', 'features', 'products', 'cta', 'gallery', 'contact'],
    sections: () => [
      hero({ variant: 'split', bg: 'warm', eyebrow: 'New collection', headline: 'Summer essentials — drop now live', subtext: 'Hoodies, sneakers and outerwear built for the street. Up to 50% off launch week only.', imageUrl: U('1552346154-21d32810aba3'), ctaLabel: 'Shop now', ctaHref: '#' }),
      features({ layout: 'icons', bg: 'tint', heading: '', items: [feat('Trending now', 'Hot right now', 'bx-trending-up'), feat('Best sellers', 'Top picks', 'bx-star'), feat('New arrivals', 'New styles added', 'bx-box'), feat('Fast delivery', 'Across the world', 'bx-package')] }),
      products({ variant: 'grid', heading: 'This week’s heat' }),
      cta({ variant: 'banner', heading: 'Limited time — up to 50% off', subtext: 'Free shipping worldwide on orders over ₦30,000.', buttonLabel: 'Shop the sale', buttonHref: '#' }),
      gallery({ variant: 'strip', bg: 'warm', heading: 'Shop the look', images: [U('1483985988355-763728e1935b', 1200), U('1479064555552-3ef4979f8908', 1200), U('1490481651871-ab68de25d43d', 1200), U('1600185365483-26d7a4cc7519', 1200)] }),
      contact({ heading: 'Pull up' }),
    ],
  },

  /* ── 6. Grocery — fresh light, icon features, image-left ──────────────── */
  {
    id: 'grocery',
    name: 'Grocery & Market',
    description: 'Fresh produce — split hero, benefits, image-left story',
    accentColor: '#16A34A',
    theme: { heroStyle: 'split', surface: 'light' },
    outline: ['hero', 'features', 'products', 'text', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'split', eyebrow: 'Fresh, daily', headline: 'Farm-fresh, delivered daily', subtext: 'Fruit, veg, pantry staples and household basics — picked this morning, at your door by evening.', imageUrl: U('1542838132-92c53300491e'), ctaLabel: 'Start your basket', ctaHref: '#' }),
      features({ layout: 'icons', bg: 'tint', heading: 'Shopping, sorted', items: [feat('Same-day delivery', 'Order by 2pm, at your door by evening.', 'bx-time-five'), feat('From local farms', 'Bought direct, within a day of harvest.', 'bx-leaf'), feat('Fair prices', 'Money that stays in the community.', 'bx-purchase-tag')] }),
      products({ variant: 'grid', heading: 'In season now' }),
      text({ variant: 'image-left', heading: 'Straight from local farms', body: 'We buy directly from smallholder farmers and pay them fairly, so produce reaches you within a day of harvest — fresher food, longer shelf life.', imageUrl: U('1488459716781-31db52582fe9', 1200) }),
      cta({ variant: 'banner', heading: 'Free delivery over ₦20,000', subtext: 'Order your weekly shop and skip the queue.', buttonLabel: 'Shop groceries', buttonHref: '#' }),
      contact({ heading: 'Store & delivery hours' }),
    ],
  },

  /* ── 7. Restaurant — dark, MENU-led, split reservation CTA ───────────── */
  {
    id: 'restaurant',
    name: 'Restaurant',
    description: 'Moody dark restaurant — real menu list, gallery, reservations',
    accentColor: '#B91C1C',
    theme: { heroStyle: 'fullbleed', surface: 'dark' },
    outline: ['hero', 'menu', 'gallery', 'text', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'fullbleed', eyebrow: 'Dinner · Tue–Sun', headline: 'A table worth staying for', subtext: 'Seasonal plates, an open kitchen and a wine list built for lingering.', imageUrl: U('1517248135467-4c7edcad34c4'), ctaLabel: 'Reserve a table', ctaHref: '#' }),
      menu({
        bg: 'dark', heading: 'The menu',
        groups: [
          { title: 'To start', items: [{ name: 'Charred sourdough', description: 'Cultured butter, sea salt', price: '₦3,500' }, { name: 'Burrata & tomatoes', description: 'Basil oil, aged balsamic', price: '₦6,000' }] },
          { title: 'Mains', items: [{ name: 'Fire-grilled sea bass', description: 'Seasonal greens, salsa verde', price: '₦12,000' }, { name: 'Dry-aged ribeye', description: '400g, bone marrow, fries', price: '₦18,500' }] },
        ],
      }),
      gallery({ variant: 'wide', bg: 'dark', heading: 'From the kitchen', images: [U('1504674900247-0877df9cc836', 1200), U('1414235077428-338989a2e8c0', 1200)] }),
      text({ variant: 'quote', bg: 'dark', body: 'We cook whatever the farms and boats bring us that morning — like we’re feeding family.', heading: 'Head chef' }),
      cta({ variant: 'split', bg: 'dark', heading: 'Book your evening', subtext: 'Walk-ins welcome at the bar; reservations recommended for dinner.', buttonLabel: 'Reserve now', buttonHref: '#' }),
      contact({ bg: 'dark', heading: 'Find us & opening hours' }),
    ],
  },

  /* ── 8. Café & Bakery — warm, MENU, card CTA ─────────────────────────── */
  {
    id: 'cafe',
    name: 'Café & Bakery',
    description: 'Warm cosy café — coffee menu, icon features, gallery',
    accentColor: '#8B5E3C',
    theme: { heroStyle: 'centered', surface: 'warm' },
    preview: '/templates/06538f5beec0636d3bac7fe52b901cbf.jpg',
    outline: ['hero', 'menu', 'features', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'centered', bg: 'warm', eyebrow: 'Open since sunrise', headline: 'Your morning, made better', subtext: 'Slow-brewed coffee, bread baked before sunrise, and a corner that feels like home.', imageUrl: U('1495474472287-4d71bcdd2085'), ctaLabel: 'See the menu', ctaHref: '#' }),
      menu({
        bg: 'warm', heading: 'On the menu',
        groups: [
          { title: 'Coffee', items: [{ name: 'Flat white', description: 'House blend, silky milk', price: '₦2,000' }, { name: 'Cold brew', description: 'Steeped 18 hours', price: '₦2,500' }] },
          { title: 'From the oven', items: [{ name: 'Butter croissant', description: 'Laminated in-house', price: '₦1,800' }, { name: 'Sourdough loaf', description: 'Proved overnight', price: '₦3,200' }] },
        ],
      }),
      features({ layout: 'icons', bg: 'warm', heading: 'Why we’re your local', items: [feat('Roasted in-house', 'Beans roasted and ground on-site, daily.', 'bx-coffee'), feat('Baked before dawn', 'Bread and pastries proved overnight.', 'bx-baguette'), feat('Order ahead', 'Your usual, ready and waiting.', 'bx-mobile')] }),
      gallery({ variant: 'grid', bg: 'warm', heading: 'Fresh out of the oven', images: [U('1509440159596-0249088772ff', 1200), U('1502741224143-90386d7f8c82', 1200), U('1467003909585-2f8a72700288', 1200)] }),
      cta({ variant: 'card', bg: 'warm', heading: 'Order ahead', subtext: 'Skip the line — have your usual ready and waiting.', buttonLabel: 'Order & collect', buttonHref: '#' }),
      contact({ bg: 'warm', heading: 'Pop in' }),
    ],
  },

  /* ── 9. Food Delivery (testyfo) — warm, icon features, banner ────────── */
  {
    id: 'food-delivery',
    name: 'Food Delivery',
    description: 'Warm order-online kitchen — easy-order features, product menu',
    accentColor: '#C87F3A',
    theme: { heroStyle: 'split', surface: 'warm' },
    preview: '/templates/a55f4c867c1d2af6a57616d3a21c915d.jpg',
    outline: ['hero', 'features', 'menu', 'text', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'split', bg: 'warm', eyebrow: 'Order online', headline: 'Today is special — order now', subtext: 'Chef-made plates cooked to order and delivered while they’re still steaming.', imageUrl: U('1543168256-418811576931'), ctaLabel: 'Get now', ctaHref: '#' }),
      features({ layout: 'icons', bg: 'warm', heading: 'Why order with us', items: [feat('Easy to order', 'Just a few clicks and you’re done.', 'bx-mouse'), feat('Fast delivery', 'Food delivered right to your door.', 'bx-cycling'), feat('Secured payment', 'Every card accepted, safely.', 'bx-lock-alt')] }),
      menu({
        bg: 'warm', heading: 'Today’s menu',
        groups: [
          { title: 'Mains', items: [{ name: 'Soya stir fry', description: 'Stir-fry sauce with a subtle glaze', price: '₦4,500' }, { name: 'Grilled beef & fries', description: 'House grill, crispy fries', price: '₦5,500' }] },
          { title: 'Sides & drinks', items: [{ name: 'Jollof rice', description: 'Smoky, party-style', price: '₦2,500' }, { name: 'Chapman', description: 'Chilled, house mix', price: '₦1,500' }] },
        ],
      }),
      text({ variant: 'image-left', bg: 'warm', heading: 'Made when you order, not before', body: 'No heat lamps, no sitting trays. Every order fires the moment it lands, gets packed in vented boxes, and rides straight to you.', imageUrl: U('1526367790999-0150786686a2', 1200) }),
      cta({ variant: 'banner', heading: 'Free delivery on your first order', subtext: 'Hungry now? Beat the rush and order ahead.', buttonLabel: 'Browse the menu', buttonHref: '#' }),
      contact({ bg: 'warm', heading: 'Delivery area & hours' }),
    ],
  },

  /* ── 10. Salon & Spa — warm, split features, masonry, card CTA ───────── */
  {
    id: 'salon-spa',
    name: 'Salon & Spa',
    description: 'Calm warm wellness — split features, masonry, testimonial',
    accentColor: '#9333EA',
    theme: { heroStyle: 'centered', surface: 'warm' },
    outline: ['hero', 'features', 'gallery', 'testimonial', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'centered', bg: 'warm', eyebrow: 'Hair · Nails · Spa', headline: 'An hour that’s just for you', subtext: 'Hair, nails, facials and massage — expert hands and a space designed to help you exhale.', imageUrl: U('1560750588-73207b1ef5b8'), ctaLabel: 'Book an appointment', ctaHref: '#' }),
      features({ layout: 'split', bg: 'tint', heading: 'The little things', subtext: 'What keeps our chairs full and our clients coming back.', items: [feat('Expert stylists', 'A team that trains continuously.', 'bx-cut'), feat('A calm space', 'Designed to help you switch off.', 'bx-spa'), feat('Honest advice', 'Only what your hair and skin need.', 'bx-message-rounded-check')] }),
      gallery({ variant: 'masonry', bg: 'warm', heading: 'The experience', images: [U('1600334089648-b0d9d3028eb2', 1200), U('1556909212-d5b604d0c90d', 1200), U('1583864697784-a0efc8379f70', 1200), U('1522337660859-02fbefca4702', 1200), U('1560066984-138dadb4c035', 1200), U('1487412947147-5cebf100ffc2', 1200)] }),
      testimonial({ bg: 'warm', quote: 'I leave feeling like a new person every single time. My happy place.', author: 'Chioma E.', role: 'Regular client' }),
      cta({ variant: 'card', bg: 'warm', heading: 'Treat yourself, or someone you love', subtext: 'Gift cards and package deals available all year round.', buttonLabel: 'Book now', buttonHref: '#' }),
      contact({ bg: 'warm', heading: 'Booking & location' }),
    ],
  },

  /* ── 11. Gym — dark, stats-led, strip, testimonial, banner ───────────── */
  {
    id: 'gym',
    name: 'Gym & Fitness',
    description: 'High-energy dark gym — big stats, strip, member testimonial',
    accentColor: '#DC2626',
    theme: { heroStyle: 'fullbleed', surface: 'dark' },
    outline: ['hero', 'stats', 'features', 'gallery', 'testimonial', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'fullbleed', eyebrow: 'First session free', headline: 'Stronger starts today', subtext: 'Coached classes, serious kit and a community that shows up. Your first session is on us.', imageUrl: U('1534438327276-14e5300c3a48'), ctaLabel: 'Claim your free pass', ctaHref: '#' }),
      stats({ bg: 'dark', heading: '', items: [stat('60+', 'Classes a week'), stat('12', 'Expert coaches'), stat('2,400', 'Members strong'), stat('4.9★', 'Member rating')] }),
      features({ layout: 'icons', bg: 'dark', heading: 'Train with intent', items: [feat('Coached classes', 'A qualified coach on the floor, every session.', 'bx-dumbbell'), feat('A plan for you', 'Assessed and programmed around your goals.', 'bx-target-lock'), feat('Real community', 'People who show up and cheer you on.', 'bx-group')] }),
      gallery({ variant: 'strip', bg: 'dark', heading: 'Inside the box', images: [U('1517836357463-d25dfeac3438', 1200), U('1534438327276-14e5300c3a48', 1200), U('1571019613454-1cb2f99b2d8b', 1200), U('1534367610401-9f5ed68180aa', 1200)] }),
      testimonial({ bg: 'dark', quote: 'Down 14kg and stronger than I’ve ever been. The coaches actually care.', author: 'Tunde B.', role: 'Member, 2 years' }),
      cta({ variant: 'banner', heading: 'Ready to commit?', subtext: 'No joining fee this month. Cancel any time.', buttonLabel: 'See membership plans', buttonHref: '#' }),
      contact({ bg: 'dark', heading: 'Visit the gym' }),
    ],
  },

  /* ── 12. Photography — dark, masonry-led portfolio, quote, stats ─────── */
  {
    id: 'photography',
    name: 'Photography',
    description: 'Dark image-first portfolio — masonry, quote, split booking',
    accentColor: '#0F172A',
    theme: { heroStyle: 'fullbleed', surface: 'dark' },
    outline: ['hero', 'gallery', 'text', 'stats', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'fullbleed', eyebrow: 'Portfolio', headline: 'Moments, kept forever', subtext: 'Weddings, portraits and brand stories — shot with a quiet eye and delivered with care.', imageUrl: U('1452587925148-ce544e77e70d'), ctaLabel: 'View portfolio', ctaHref: '#' }),
      gallery({ variant: 'masonry', bg: 'dark', heading: 'Selected work', images: [U('1493863641943-9b68992a8d07', 1200), U('1470259078422-826894b933aa', 1200), U('1471341971476-ae15ff5dd4ea', 1200), U('1519741497674-611481863552', 1200), U('1465495976277-4387d4b0b4c6', 1200), U('1519225421980-715cb0215aed', 1200)] }),
      text({ variant: 'quote', bg: 'dark', body: 'I shoot the glances and the in-between — the real ones you’ll want to keep.', heading: 'About my work' }),
      stats({ bg: 'dark', heading: '', items: [stat('300+', 'Weddings shot'), stat('10 yrs', 'Behind the lens'), stat('48h', 'Sneak-peek delivery')] }),
      cta({ variant: 'split', bg: 'dark', heading: 'Let’s make something', subtext: 'Booking dates for the season now — tell me about your day.', buttonLabel: 'Check availability', buttonHref: '#' }),
      contact({ bg: 'dark', heading: 'Get in touch' }),
    ],
  },

  /* ── 13. Real Estate — light, stats, wide listings, split features ───── */
  {
    id: 'real-estate',
    name: 'Real Estate',
    description: 'Trust-first agency — stats, wide listings, testimonial',
    accentColor: '#0E7490',
    theme: { heroStyle: 'split', surface: 'light' },
    outline: ['hero', 'stats', 'gallery', 'features', 'testimonial', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'split', eyebrow: 'Homes & lettings', headline: 'Find the place you’ll call home', subtext: 'Handpicked homes and honest advice, from a team that knows every street on the map.', imageUrl: U('1560518883-ce09059eeffa'), ctaLabel: 'Browse listings', ctaHref: '#' }),
      stats({ bg: 'tint', heading: '', items: [stat('1,200+', 'Homes sold'), stat('18 days', 'Average time to sell'), stat('₦0', 'Upfront valuation'), stat('4.8★', 'Client rating')] }),
      gallery({ variant: 'wide', heading: 'Featured homes', images: [U('1512917774080-9991f1c4c750', 1200), U('1600585154340-be6161a56a0c', 1200), U('1540555700478-4be289fbecef', 1200), U('1512918728675-ed5a9ecdebfd', 1200)] }),
      features({ layout: 'split', heading: 'Why buyers choose us', subtext: 'From first viewing to keys in hand.', items: [feat('Handpicked listings', 'Every home viewed and vetted by us first.', 'bx-home-heart'), feat('Hard negotiation', 'We push for your price, not the quick deal.', 'bx-trending-down'), feat('Local knowledge', 'Every street, school and shortcut on the map.', 'bx-map-alt')] }),
      testimonial({ bg: 'tint', quote: 'They found us a home two streets from where we grew up — and got it under asking.', author: 'The Okoye family', role: 'Buyers' }),
      cta({ variant: 'banner', heading: 'Thinking of selling?', subtext: 'Get a free, no-obligation valuation of your property.', buttonLabel: 'Request a valuation', buttonHref: '#' }),
      contact({ heading: 'Talk to an agent' }),
    ],
  },

  /* ── 14. Agency — light, minimal hero, stats, work, split CTA ────────── */
  {
    id: 'agency',
    name: 'Agency & Studio',
    description: 'Creative studio — big-type hero, stats, work grid, testimonial',
    accentColor: '#6366F1',
    theme: { heroStyle: 'minimal', surface: 'light' },
    outline: ['hero', 'stats', 'features', 'gallery', 'testimonial', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'minimal', eyebrow: 'Design studio', headline: 'Brands, built to be remembered', subtext: 'A small studio doing strategy, identity and websites for ambitious teams across Africa.', ctaLabel: 'Start a project', ctaHref: '#' }),
      stats({ bg: 'tint', heading: '', items: [stat('80+', 'Brands shipped'), stat('9 yrs', 'In the game'), stat('12', 'Design awards')] }),
      features({ layout: 'icons', heading: 'What we do', items: [feat('Strategy', 'Positioning, naming and the story you’ll tell.', 'bx-bulb'), feat('Identity', 'Logo, type and a system that scales.', 'bx-palette'), feat('Websites', 'Fast, considered sites that convert.', 'bx-code-alt')] }),
      gallery({ variant: 'grid', heading: 'Recent work', images: [U('1600880292203-757bb62b4baf', 1200), U('1487958449943-2429e8be8625', 1200), U('1487222477894-8943e31ef7b2', 1200)] }),
      testimonial({ bg: 'dark', quote: 'They rebranded us in six weeks and our inbound doubled. Genuinely great partners.', author: 'Ifeoma N.', role: 'Founder, Kadi' }),
      cta({ variant: 'split', heading: 'Have a brief?', subtext: 'Tell us what you’re building and we’ll come back within a day.', buttonLabel: 'Book a call', buttonHref: '#' }),
      contact({ heading: 'Work with us' }),
    ],
  },

  /* ── 15. Patisserie — warm rose, product cards, image-left, card CTA ─── */
  {
    id: 'patisserie',
    name: 'Patisserie & Desserts',
    description: 'Dusty-rose dessert café — quick features, dessert cards, story',
    accentColor: '#8C6A6A',
    theme: { heroStyle: 'centered', surface: 'warm' },
    preview: '/templates/4e09c45e262c596f7a12833f581f5d9c.jpg',
    outline: ['hero', 'features', 'menu', 'text', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'centered', bg: 'warm', eyebrow: 'Fresh each morning', headline: 'Sweet moments start here', subtext: 'Hand-finished cakes, pastries and slow-poured coffee — made fresh each morning in our corner of the city.', imageUrl: U('1509440159596-0249088772ff'), ctaLabel: 'See the menu', ctaHref: '#' }),
      features({ layout: 'icons', bg: 'tint', heading: 'Made properly', items: [feat('Real butter', 'No shortcuts, no substitutes — ever.', 'bx-cookie'), feat('Seasonal fruit', 'Whatever’s ripe, folded in fresh.', 'bx-lemon'), feat('Small batches', 'Baked in the morning, gone by close.', 'bx-cake')] }),
      menu({
        bg: 'warm', heading: 'Today’s bakes',
        groups: [
          { title: 'Cakes & slices', items: [{ name: 'Vanilla bean slice', description: 'Layered sponge, silky cream', price: '₦2,200' }, { name: 'Chocolate fudge', description: 'Rich ganache, sea salt', price: '₦2,600' }] },
          { title: 'Pastries', items: [{ name: 'Butter croissant', description: 'Laminated in-house', price: '₦1,800' }, { name: 'Cinnamon roll', description: 'Warm, gooey, glazed', price: '₦2,000' }] },
        ],
      }),
      text({ variant: 'image-left', bg: 'warm', heading: 'Made by hand, every single day', body: 'We bake in small batches with real butter, seasonal fruit and single-origin chocolate — nothing frozen, nothing rushed. Pull up a chair and let the afternoon slow right down.', imageUrl: U('1442512595331-e89e73853f31', 1200) }),
      cta({ variant: 'card', bg: 'warm', heading: 'Order a celebration cake', subtext: 'Custom cakes for birthdays, weddings and everything worth marking.', buttonLabel: 'Enquire now', buttonHref: '#' }),
      contact({ bg: 'warm', heading: 'Find the café' }),
    ],
  },

  /* ── 16. Coffee House — dark navy, split product hero, MENU, banner ──── */
  {
    id: 'coffee-house',
    name: 'Coffee House',
    description: 'Deep-navy coffee brand — split product hero, coffee menu',
    accentColor: '#3B82F6',
    theme: { heroStyle: 'split', surface: 'dark' },
    preview: '/templates/aae276f58aba66811c153b4b8e5247a1.jpg',
    outline: ['hero', 'menu', 'features', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'split', bg: 'dark', eyebrow: 'Coffee, done properly', headline: 'Your daily ritual, upgraded', subtext: 'Signature blends, iced classics and rich mochas — pulled fresh, served fast.', imageUrl: U('1461023058943-07fcbe16d735'), ctaLabel: 'Order ahead', ctaHref: '#' }),
      menu({
        bg: 'dark', heading: 'The menu',
        groups: [
          { title: 'Hot', items: [{ name: 'Signature latte', description: 'House blend, velvet milk', price: '₦2,200' }, { name: 'Cortado', description: 'Equal parts, bold', price: '₦2,000' }] },
          { title: 'Iced', items: [{ name: 'Iced mocha', description: 'Dark chocolate, cold milk', price: '₦2,600' }, { name: 'Cold brew', description: 'Steeped 18 hours', price: '₦2,500' }] },
        ],
      }),
      features({ layout: 'icons', bg: 'dark', heading: 'What’s in your cup', items: [feat('Small-lot roast', 'Roasted in small lots for consistency.', 'bx-coffee-togo'), feat('Dialled-in shots', 'The same great cup, first to fourth.', 'bx-slider'), feat('Order ahead', 'Skip the queue from the app.', 'bx-mobile-alt')] }),
      gallery({ variant: 'wide', bg: 'dark', heading: 'In the cup', images: [U('1509440159596-0249088772ff', 1200), U('1442512595331-e89e73853f31', 1200)] }),
      cta({ variant: 'banner', heading: 'Grab yours to go', subtext: 'Order from the app and skip the queue — your usual, ready when you are.', buttonLabel: 'Start an order', buttonHref: '#' }),
      contact({ bg: 'dark', heading: 'Opening hours' }),
    ],
  },

  /* ── 17. Specialty Coffee — warm sage, 4 features, MENU, split CTA ───── */
  {
    id: 'specialty-coffee',
    name: 'Specialty Coffee',
    description: 'Sage-green roaster — icon features, drinks menu, dessert grid',
    accentColor: '#5E7C5E',
    theme: { heroStyle: 'split', surface: 'warm' },
    preview: '/templates/ae4caa9abfa790a32a147688a32c76e2.jpg',
    outline: ['hero', 'features', 'menu', 'products', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'split', bg: 'warm', eyebrow: 'Specialty roaster', headline: 'Coffee you’ll fall for from the first sip', subtext: 'Specialty beans, fresh bakes and a calm space in the heart of the city. 100% arabica, roasted every week.', imageUrl: U('1495474472287-4d71bcdd2085'), ctaLabel: 'View the menu', ctaHref: '#' }),
      features({ layout: 'icons', bg: 'warm', heading: '', items: [feat('Hand-picked beans', 'Only proven plantations and specialty lots.', 'bx-leaf'), feat('Fresh roast', 'Small batches, roasted every week.', 'bx-package'), feat('Skilled baristas', 'Made with care and attention.', 'bx-user-check'), feat('Cosy space', 'Bright, calm — your place to work.', 'bx-coffee')] }),
      menu({
        bg: 'tint', heading: 'Popular drinks',
        groups: [
          { title: 'Drinks', items: [{ name: 'Latte', description: 'Smooth and creamy', price: '₦2,500' }, { name: 'Matcha latte', description: 'Green harmony', price: '₦2,800' }, { name: 'Iced filter', description: 'Bright and light', price: '₦2,600' }] },
        ],
      }),
      products({ variant: 'grid', bg: 'warm', heading: 'Recommended to try' }),
      cta({ variant: 'split', bg: 'warm', heading: 'Reserve a table', subtext: 'Bright, quiet and welcoming — your new favourite spot to work or unwind.', buttonLabel: 'Book a table', buttonHref: '#' }),
      contact({ bg: 'warm', heading: 'Visit us' }),
    ],
  },

  /* ── 18. Sneaker Lab — cream editorial statement drop ────────────────── */
  {
    id: 'sneaker-lab',
    name: 'Sneaker Lab',
    description: 'Editorial collab drop — centered statement, showcase, card CTA',
    accentColor: '#E4002B',
    theme: { heroStyle: 'centered', surface: 'light' },
    preview: '/templates/ed2c4b9a350631b70270f9c14b38ed3a.jpg',
    outline: ['hero', 'text', 'products', 'gallery', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'centered', bg: 'tint', eyebrow: 'Limited collab drop', headline: 'You’re never too old to play', ctaLabel: 'Shop the collab', ctaHref: '#', subtext: '' }),
      text({ variant: 'statement', heading: 'A playful take on an archival icon', body: 'For this drop we teamed up on a playful reimagining of a heritage silhouette — instantly recognisable colour, premium suede and details that turn heads. Numbered, boxed and shipped worldwide. Once they’re gone, they’re gone.' }),
      products({ variant: 'showcase', heading: 'The collection' }),
      gallery({ variant: 'wide', bg: 'tint', heading: 'On feet', images: [U('1460353581641-37baddab0fa2', 1200), U('1600185365483-26d7a4cc7519', 1200), U('1595950653106-6c9ebd614d3a', 1200), U('1556742049-0cfed4f6a45d', 1200)] }),
      cta({ variant: 'card', heading: 'Join the raffle', subtext: 'Limited stock, one pair per person. Enter now for your shot at the drop.', buttonLabel: 'Enter the raffle', buttonHref: '#' }),
      contact({ heading: 'Stockist & support' }),
    ],
  },

  /* ── 19. E-Learning — green, split features, stats, courses, banner ──── */
  {
    id: 'education',
    name: 'E-Learning',
    description: 'Forest-green platform — feature list, learner stats, courses',
    accentColor: '#2E7D5B',
    theme: { heroStyle: 'split', surface: 'light' },
    preview: '/templates/1600928881d270ac98ad36f04f9a286c.jpg',
    outline: ['hero', 'features', 'stats', 'products', 'testimonial', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'split', eyebrow: 'Learn online', headline: 'Learn at your pace, beginner to advanced', subtext: 'Self-paced courses, live support and downloadable materials — a clear pathway to real, job-ready skills.', imageUrl: U('1523240795612-9a054b0db644'), ctaLabel: 'Start learning', ctaHref: '#' }),
      features({ layout: 'split', bg: 'tint', heading: 'Everything you need to finish', subtext: 'Not just videos — a structured pathway with real support.', items: [feat('Beginner-to-advanced pathway', 'A structured track, not a random playlist.', 'bx-git-branch'), feat('Live support', 'Ask questions and get unstuck fast.', 'bx-message-rounded-dots'), feat('Downloadable materials', 'Slides, projects and notes to keep.', 'bx-download')] }),
      stats({ heading: '', items: [stat('764+', 'Active learners'), stat('40', 'Courses'), stat('92%', 'Completion rate'), stat('4.9★', 'Student rating')] }),
      products({ variant: 'grid', heading: 'Featured courses' }),
      testimonial({ bg: 'tint', quote: 'I went from zero to my first paid project in four months. Worth every naira.', author: 'Samuel A.', role: 'Graduate' }),
      cta({ variant: 'banner', heading: 'Try your first course free', subtext: 'No card required — start today and upgrade only when you’re ready.', buttonLabel: 'Get started', buttonHref: '#' }),
      contact({ heading: 'Talk to our team' }),
    ],
  },

  /* ── 20. SaaS — violet, stats, features, pricing, testimonial, banner ── */
  {
    id: 'saas',
    name: 'SaaS & Software',
    description: 'Violet product site — stats, feature grid, pricing, testimonial',
    accentColor: '#6D5EF6',
    theme: { heroStyle: 'centered', surface: 'light' },
    preview: '/templates/3ac8da5a7b98b519737d1f32c8a800de.jpg',
    outline: ['hero', 'stats', 'features', 'text', 'products', 'testimonial', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'centered', bg: 'tint', eyebrow: 'Smart digital solutions', headline: 'Grow your business with one smart platform', subtext: 'One platform to manage, automate and scale — powerful tools, a clean dashboard and insights that move the numbers.', imageUrl: U('1551288049-bebda4e38f71'), ctaLabel: 'Get started', ctaHref: '#' }),
      stats({ heading: '', items: [stat('99.9%', 'Uptime'), stat('20k+', 'Teams'), stat('2×', 'Faster workflows'), stat('4.8★', 'G2 rating')] }),
      features({ layout: 'icons', heading: 'Everything in one place', subtext: 'Connect your tools, track what matters and automate the busywork.', items: [feat('Automate busywork', 'Set rules once and let the platform run them.', 'bx-cog'), feat('Real-time analytics', 'Live dashboards on the numbers that matter.', 'bx-line-chart'), feat('Secure by default', 'Encrypted, role-based and audit-logged.', 'bx-lock-alt')] }),
      text({ variant: 'image-right', heading: 'Built to scale with you', body: 'From your first customer to your millionth — the same clean workflow, now with the automation and controls a bigger team needs.', imageUrl: U('1460925895917-afdab827c52f', 1200) }),
      products({ variant: 'grid', bg: 'tint', heading: 'Plans & pricing' }),
      testimonial({ bg: 'dark', quote: 'We replaced four tools with this and saved a full day a week. No regrets.', author: 'Grace M.', role: 'COO, Paylane' }),
      cta({ variant: 'banner', heading: 'Ready to get started?', subtext: 'Free 14-day trial, no credit card. Cancel any time.', buttonLabel: 'Start free trial', buttonHref: '#' }),
      contact({ heading: 'Contact sales' }),
    ],
  },

  /* ── 21. Business — yellow/black numbered process, stats, split CTA ──── */
  {
    id: 'business',
    name: 'Business & Consulting',
    description: 'Bold yellow-on-black — numbered process, stats, services',
    accentColor: '#F5B301',
    theme: { heroStyle: 'fullbleed', surface: 'dark' },
    preview: '/templates/5f26f27889573194ef6b17740f29d8ef.jpg',
    outline: ['hero', 'features', 'stats', 'products', 'testimonial', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'fullbleed', eyebrow: 'Strategy · Operations · Growth', headline: 'Solutions that move your business forward', subtext: 'Consulting for ambitious teams — a clear plan, measurable results and a partner who stays in it with you.', imageUrl: U('1454165804606-c3d57bc86b40'), ctaLabel: 'Book a consultation', ctaHref: '#' }),
      features({ layout: 'numbered', bg: 'dark', heading: 'A proven process, end to end', items: [feat('Research', 'We learn your business, market and numbers.', 'bx-search-alt'), feat('Plan', 'A clear roadmap with owners and milestones.', 'bx-map'), feat('Execute', 'We roll up our sleeves and deliver with you.', 'bx-cog'), feat('Measure', 'We track results and adjust, in the open.', 'bx-line-chart'), feat('Grow', 'Compounding wins, quarter after quarter.', 'bx-trophy')] }),
      stats({ bg: 'dark', heading: '', items: [stat('120+', 'Clients served'), stat('₦4.2b', 'Revenue unlocked'), stat('15 yrs', 'Advising teams')] }),
      products({ variant: 'grid', bg: 'dark', heading: 'Our services' }),
      testimonial({ bg: 'dark', quote: 'They turned a vague ambition into a plan and then actually helped us hit it.', author: 'Emeka U.', role: 'CEO, Northbridge' }),
      cta({ variant: 'split', bg: 'dark', heading: 'Let’s talk about your goals', subtext: 'Book a free 30-minute strategy call and leave with three things to action.', buttonLabel: 'Schedule a call', buttonHref: '#' }),
      contact({ bg: 'dark', heading: 'Get in touch' }),
    ],
  },

  /* ── 22. Plant Shop — dark green, product-GRID-led, banner ───────────── */
  {
    id: 'plants',
    name: 'Plant Shop',
    description: 'Dark-green plant store — product-grid led, care features',
    accentColor: '#3F6B3F',
    theme: { heroStyle: 'minimal', surface: 'dark' },
    outline: ['hero', 'products', 'features', 'text', 'cta', 'contact'],
    sections: () => [
      hero({ variant: 'minimal', bg: 'dark', eyebrow: 'Houseplants & greenery', headline: 'Bring the outside in', subtext: 'Easy-care houseplants and statement greenery — delivered potted and ready to grow.', ctaLabel: 'Shop plants', ctaHref: '#' }),
      products({ variant: 'grid', bg: 'dark', heading: 'Shop the collection', limit: 8 }),
      features({ layout: 'icons', bg: 'dark', heading: 'Delivered to thrive', items: [feat('Nursery-grown', 'Hand-picked and matched to your light.', 'bx-leaf'), feat('Care card included', 'Simple, plant-specific care in every box.', 'bx-note'), feat('Message us anytime', 'A leaf looks unsure? We’re one message away.', 'bx-message-rounded')] }),
      text({ variant: 'image-left', bg: 'dark', heading: 'Chosen to thrive, not just survive', body: 'Every plant is nursery-grown, hand-picked and matched to your light and space. We ship them carefully potted with a care card.', imageUrl: U('1416879595882-3373a0480b5b', 1200) }),
      cta({ variant: 'banner', heading: 'New to plants?', subtext: 'Take our two-minute quiz and we’ll match you with hard-to-kill greenery.', buttonLabel: 'Find my plant', buttonHref: '#' }),
      contact({ bg: 'dark', heading: 'Visit the nursery' }),
    ],
  },
];
