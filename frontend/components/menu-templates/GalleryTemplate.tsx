import { useState } from 'react';
import { formatMenuPrice, PublicMenuItem } from '@/lib/menu-public';
import { TemplateProps } from './types';
import {
  accentOf,
  BackBar,
  Hamburger,
  ItemSheet,
  KuzaFooter,
  Preloader,
  SideDrawer,
  TemplateRoot,
  useMenuPager,
} from './shared';

/**
 * GALLERY — a bright, photo-forward fast-casual / food-court menu with a
 * modern delivery-app vibe. Preloader → straight to HOME (a colorful promo
 * ribbon + a grid of photo category tiles) → a CATEGORY page (BackBar + a
 * photo dish-card grid with floating price chips) → bottom-sheet dish detail.
 * A hamburger opens the category/contact side drawer. Bold, rounded, energetic.
 */
export default function GalleryTemplate({ data, theme }: TemplateProps) {
  const { venue } = data;
  const accent = accentOf(data, theme);
  const menuName = data.menus[0]?.name || venue.name;
  const categories = data.menus.flatMap((m) => m.categories);
  const { screen, setScreen, topRef } = useMenuPager({ name: 'home' });
  const [selected, setSelected] = useState<PublicMenuItem | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const activeId = screen.name === 'category' ? screen.categoryId : categories[0]?.id || '';
  const activeCategory = categories.find((c) => c.id === activeId) || null;

  /** First available item image in a category, used as the tile photo. */
  const tilePhoto = (items: PublicMenuItem[]) => items.find((i) => i.imageUrl)?.imageUrl || null;

  return (
    <TemplateRoot theme={theme}>
      <Preloader theme={theme} accent={accent} venue={venue} title={menuName} />
      <div ref={topRef} />

      {/* Sticky brand header + hamburger — shared across screens */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: `${theme.bg}F2`, backdropFilter: 'blur(8px)', borderBottom: `1px solid ${theme.border}` }}
      >
        <Hamburger color={accent} onClick={() => setDrawer(true)} />
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {venue.logoUrl && !logoFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={venue.logoUrl} alt="" onError={() => setLogoFailed(true)} className="h-8 w-8 shrink-0 rounded-full object-cover" style={{ border: `1.5px solid ${accent}` }} />
          ) : (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center text-sm font-black text-white"
              style={{ backgroundColor: accent, borderRadius: theme.radius }}
            >
              {menuName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="truncate text-lg font-black tracking-tight" style={{ color: theme.text }}>
            {menuName}
          </span>
        </div>
        <span className="w-10" aria-hidden="true" />
      </header>

      {/* HOME — promo ribbon + category photo tiles */}
      {screen.name === 'home' && (
        <div key="home" className="menu-page mx-auto w-full max-w-3xl px-4 pt-4">
          {/* Promo ribbon */}
          <div
            className="menu-fade relative flex items-center gap-4 overflow-hidden px-5 py-4"
            style={{ background: `linear-gradient(120deg, ${accent}, ${accent}cc)`, borderRadius: theme.radius }}
          >
            <span className="text-3xl drop-shadow">🍽️</span>
            <div className="min-w-0">
              <div className="text-base font-black leading-tight text-white">Fresh &amp; made to order</div>
              <div className="truncate text-xs font-medium text-white/85">
                {venue.tagline || 'Pick a category to start browsing'}
              </div>
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
            />
          </div>

          <h2 className="mb-3 mt-6 text-xl font-black tracking-tight" style={{ color: theme.text }}>
            Categories
          </h2>

          <div className="menu-stagger grid grid-cols-2 gap-3 pb-4 sm:grid-cols-3">
            {categories.map((category) => {
              const photo = tilePhoto(category.items);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setScreen({ name: 'category', categoryId: category.id })}
                  className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden text-left transition-transform active:scale-[0.97]"
                  style={{ borderRadius: theme.radius, border: `1px solid ${theme.border}`, backgroundColor: theme.surface }}
                >
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center text-5xl font-black"
                      style={{ background: `linear-gradient(135deg, ${accent}, ${accent}77)`, color: 'rgba(255,255,255,0.92)' }}
                    >
                      {category.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* legibility scrim */}
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 45%, transparent 70%)' }}
                  />
                  <div className="relative p-3">
                    <div className="text-sm font-black leading-tight text-white drop-shadow-sm sm:text-base">
                      {category.name}
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-white/80">
                      {category.items.length} {category.items.length === 1 ? 'item' : 'items'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <KuzaFooter theme={theme} />
        </div>
      )}

      {/* CATEGORY page — BackBar + photo dish-card grid */}
      {screen.name === 'category' && activeCategory && (
        <div key={activeId} className="menu-page-slide mx-auto w-full max-w-3xl">
          <BackBar title={activeCategory.name} theme={theme} accent={accent} onBack={() => setScreen({ name: 'home' })} />

          <main className="menu-stagger grid grid-cols-2 gap-3 px-4 pt-4 sm:grid-cols-3">
            {activeCategory.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                className="flex flex-col overflow-hidden text-left transition-transform active:scale-[0.97]"
                style={{
                  backgroundColor: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: theme.radius,
                  opacity: item.isAvailable ? 1 : 0.6,
                }}
              >
                <div className="relative">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                  ) : (
                    <div
                      className="flex aspect-square w-full items-center justify-center text-4xl font-black"
                      style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}55)`, color: accent }}
                    >
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {venue.showPrices && (
                    <span
                      className="absolute bottom-2 right-2 px-2.5 py-1 text-xs font-black tabular-nums shadow-md"
                      style={{ backgroundColor: accent, color: '#FFFFFF', borderRadius: '999px' }}
                    >
                      {formatMenuPrice(item.price, venue.currency)}
                    </span>
                  )}
                  {!item.isAvailable && (
                    <span
                      className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: theme.bg, color: theme.muted }}
                    >
                      Sold out
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <h4 className="text-sm font-bold leading-snug" style={{ color: theme.text }}>
                    {item.name}
                  </h4>
                  {item.description && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: theme.muted }}>
                      {item.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </main>

          <div className="mx-auto w-full max-w-3xl px-4">
            <KuzaFooter theme={theme} />
          </div>
        </div>
      )}

      <SideDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        venue={venue}
        theme={theme}
        accent={accent}
        links={[
          { id: '__home', label: 'Home', onClick: () => setScreen({ name: 'home' }) },
          ...categories.map((c) => ({
            id: c.id,
            label: c.name,
            onClick: () => setScreen({ name: 'category', categoryId: c.id }),
          })),
        ]}
      />

      <ItemSheet item={selected} venue={venue} theme={theme} accent={accent} onClose={() => setSelected(null)} />
    </TemplateRoot>
  );
}
