import { useState } from 'react';
import { formatMenuPrice, PublicMenuItem } from '@/lib/menu-public';
import { TemplateProps } from './types';
import {
  accentOf,
  CoffeeBeanField,
  Hamburger,
  IntroCover,
  ItemSheet,
  DishImage,
  KuzaFooter,
  Preloader,
  SideDrawer,
  SoldOut,
  subGroups,
  TemplateRoot,
  useMenuPager,
} from './shared';

/**
 * ROAST — a café / coffee-house menu (inspired by "CupfulCanvas"). Warm beige
 * ground with a coffee-bean watermark. Preloader → a cover → one page per
 * category driven by a sticky chip bar (each chip loads that category's page)
 * → a grid of photo product cards with price chips and a bottom-sheet detail.
 * A hamburger opens the "Get in touch" drawer.
 */
export default function RoastTemplate({ data, theme }: TemplateProps) {
  const { venue } = data;
  const accent = accentOf(data, theme);
  const menuName = data.menus[0]?.name || venue.name;
  const categories = data.menus.flatMap((m) => m.categories);
  const { screen, setScreen, topRef } = useMenuPager();
  const [selected, setSelected] = useState<PublicMenuItem | null>(null);
  const [drawer, setDrawer] = useState(false);

  const firstId = categories[0]?.id || '';
  const activeId = screen.name === 'category' ? screen.categoryId : firstId;
  const activeCategory = categories.find((c) => c.id === activeId) || null;

  return (
    <TemplateRoot theme={theme}>
      <Preloader theme={theme} accent={accent} venue={venue} title={menuName} />
      <div ref={topRef} />

      {/* Screen: cover */}
      {screen.name === 'cover' && (
        <div key="cover" className="menu-fade">
          <IntroCover
            venue={venue}
            theme={theme}
            accent={accent}
            ctaLabel="Order Menu"
            onEnter={() => firstId && setScreen({ name: 'category', categoryId: firstId })}
            background={<CoffeeBeanField color={accent} opacity={0.1} className="absolute inset-0" />}
          >
            {!venue.logoUrl && (
              <div
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full text-2xl"
                style={{ backgroundColor: `${accent}14`, color: accent, border: `1px solid ${accent}55`, fontFamily: theme.headingFont, fontWeight: 800 }}
                aria-hidden="true"
              >
                {menuName.charAt(0).toUpperCase()}
              </div>
            )}
            <h1 className="text-4xl leading-none tracking-tight sm:text-5xl" style={{ color: theme.text, fontFamily: theme.headingFont, fontWeight: 800 }}>
              {menuName}
            </h1>
            {venue.tagline && (
              <p className="mt-3 text-sm" style={{ color: theme.muted }}>
                {venue.tagline}
              </p>
            )}
          </IntroCover>
        </div>
      )}

      {/* Screen: category pages */}
      {screen.name === 'category' && activeCategory && (
        <div className="relative min-h-[100svh]">
          <CoffeeBeanField color={accent} opacity={0.05} className="pointer-events-none absolute inset-0" />

          <div className="relative mx-auto w-full px-5" style={{ maxWidth: '780px' }}>
            {/* Top bar: hamburger + back + venue name */}
            <div
              className="sticky top-0 z-30 -mx-5 flex items-center gap-1 px-4 py-3"
              style={{ backgroundColor: `${theme.bg}F2`, backdropFilter: 'blur(6px)', borderBottom: `1px solid ${theme.border}` }}
            >
              <button
                type="button"
                onClick={() => setScreen({ name: 'cover' })}
                aria-label="Back"
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none transition-transform active:scale-90"
                style={{ border: `1px solid ${theme.border}`, color: accent }}
              >
                ‹
              </button>
              <span className="flex-1 truncate text-center text-lg" style={{ color: theme.text, fontFamily: theme.headingFont, fontWeight: 800 }}>
                {menuName}
              </span>
              <span className="w-10" aria-hidden="true" />
            </div>

            {/* Sticky category chips */}
            <nav
              className="sticky top-[57px] z-20 -mx-5 flex gap-2 overflow-x-auto px-5 py-3"
              style={{ backgroundColor: `${theme.bg}F2`, backdropFilter: 'blur(6px)', scrollbarWidth: 'none' }}
              aria-label="Menu categories"
            >
              {categories.map((c) => {
                const on = c.id === activeId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setScreen({ name: 'category', categoryId: c.id })}
                    className="shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold transition-colors"
                    style={{
                      borderRadius: '999px',
                      border: `1px solid ${on ? accent : theme.border}`,
                      backgroundColor: on ? accent : theme.surface,
                      color: on ? theme.bg : theme.text,
                    }}
                  >
                    {c.name}
                  </button>
                );
              })}
            </nav>

            {/* Active category grid — keyed so it re-animates on navigation */}
            <main key={activeId} className="menu-page-slide pt-5">
              <h1 className="mb-4 text-2xl" style={{ color: theme.text, fontFamily: theme.headingFont, fontWeight: 800 }}>
                {activeCategory.name}
              </h1>
              {subGroups(activeCategory.items).map((group, gi) => (
                <div key={group.name ?? `__none-${gi}`} className={gi > 0 ? 'mt-6' : undefined}>
                  {group.name && (
                    <h2
                      className="mb-3 text-lg font-bold"
                      style={{ color: theme.text, fontFamily: theme.headingFont }}
                    >
                      {group.name}
                    </h2>
                  )}
                  <div className="menu-stagger grid grid-cols-2 gap-3">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelected(item)}
                        className="flex flex-col overflow-hidden text-left transition-transform active:scale-[0.98]"
                        style={{ backgroundColor: theme.surface, borderRadius: theme.radius, border: `1px solid ${theme.border}` }}
                      >
                        <div className="relative w-full" style={{ aspectRatio: '1 / 1', backgroundColor: `${accent}12` }}>
                          <DishImage
                            src={item.imageUrl}
                            className="h-full w-full object-cover"
                            style={{ opacity: item.isAvailable ? 1 : 0.5 }}
                            fallback={
                              <div className="flex h-full items-center justify-center">
                                <CoffeeBeanField color={accent} opacity={0.18} className="absolute inset-0" />
                                <span className="relative text-4xl font-bold" style={{ color: accent, fontFamily: theme.headingFont }}>
                                  {item.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            }
                          />
                          {venue.showPrices && (
                            <span
                              className="absolute bottom-2 right-2 px-2.5 py-1 text-xs font-bold tabular-nums shadow-sm"
                              style={{ backgroundColor: accent, color: theme.bg, borderRadius: '999px' }}
                            >
                              {formatMenuPrice(item.price, venue.currency)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-3">
                          <div className="font-bold leading-snug" style={{ color: theme.text, opacity: item.isAvailable ? 1 : 0.55 }}>
                            {item.name}
                            {!item.isAvailable && <SoldOut theme={theme} />}
                          </div>
                          {item.description && (
                            <p className="mt-1 line-clamp-2 text-xs leading-snug" style={{ color: theme.muted }}>
                              {item.description}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </main>

            <KuzaFooter theme={theme} />
          </div>
        </div>
      )}

      <ItemSheet item={selected} venue={venue} theme={theme} accent={accent} onClose={() => setSelected(null)} />
    </TemplateRoot>
  );
}
