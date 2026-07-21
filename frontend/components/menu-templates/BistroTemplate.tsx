import { useState } from 'react';
import { formatMenuPrice, PublicMenuItem } from '@/lib/menu-public';
import { TemplateProps } from './types';
import {
  accentOf,
  IntroCover,
  ItemSheet,
  KuzaFooter,
  Preloader,
  SoldOut,
  subGroups,
  TemplateRoot,
  useMenuPager,
} from './shared';

/** Hand-drawn-style squiggle divider (inline SVG, stroke = accent). */
function Squiggle({ color, className = 'mx-auto mt-2 h-2.5 w-28' }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 120 10" className={className} preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M2 6 C 10 1, 18 9, 26 5 S 42 2, 50 6 S 66 9, 74 4 S 90 2, 98 6 S 112 8, 118 4"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Little hand-drawn star burst used beside the venue name. */
function Burst({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <g stroke={color} strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="3" x2="12" y2="8" />
        <line x1="12" y1="16" x2="12" y2="21" />
        <line x1="3" y1="12" x2="8" y2="12" />
        <line x1="16" y1="12" x2="21" y2="12" />
        <line x1="5.6" y1="5.6" x2="9" y2="9" />
        <line x1="15" y1="15" x2="18.4" y2="18.4" />
        <line x1="5.6" y1="18.4" x2="9" y2="15" />
        <line x1="15" y1="9" x2="18.4" y2="5.6" />
      </g>
    </svg>
  );
}

/** Hand-drawn fork + spoon placeholder for dishes without a photo. */
function DishDoodle({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3v7M5 3v4a2 2 0 0 0 4 0V3M7 10v11" />
      <path d="M16 3c-2 0-3 2.5-3 5s1 4 2 4v9" />
      <path d="M17 3v18" />
    </svg>
  );
}

/**
 * BISTRO — a warm neighbourhood eatery. Preloader → a friendly hand-drawn cover
 * (Burst beside the name, a Squiggle under it, a warm radial glow) → cozy
 * category pages with a rounded chip rail, a back button, and rounded dish rows
 * (photo thumbnail, bold name, muted description, filled price pill) that open a
 * tap-through detail sheet. Cream by day, chalkboard by night — effortless to
 * read either way.
 */
export default function BistroTemplate({ data, theme }: TemplateProps) {
  const { venue } = data;
  const accent = accentOf(data, theme);
  const menuName = data.menus[0]?.name || venue.name;
  const categories = data.menus.flatMap((m) => m.categories);
  const { screen, setScreen, topRef } = useMenuPager({ name: 'cover' });
  const [selected, setSelected] = useState<PublicMenuItem | null>(null);

  const pillText = theme.mode === 'dark' ? theme.bg : '#FFFFFF';
  const firstCategoryId = categories[0]?.id || '';
  const activeId = screen.name === 'category' ? screen.categoryId : firstCategoryId;
  const activeCategory = categories.find((c) => c.id === activeId) || null;

  const goToMenu = () =>
    firstCategoryId ? setScreen({ name: 'category', categoryId: firstCategoryId }) : undefined;

  return (
    <TemplateRoot theme={theme}>
      <Preloader theme={theme} accent={accent} venue={venue} />
      <div ref={topRef} />

      {/* COVER */}
      {screen.name === 'cover' && (
        <div key="cover" className="menu-fade">
          <IntroCover
            venue={venue}
            theme={theme}
            accent={accent}
            ctaLabel="See the Menu"
            onEnter={goToMenu}
            background={
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: `radial-gradient(circle at 50% 22%, ${accent}22, transparent 58%)` }}
              />
            }
          >
            <div className="flex items-center justify-center gap-3">
              <Burst color={accent} />
              <h1 className="text-4xl font-bold" style={{ color: theme.text, fontFamily: theme.headingFont }}>
                {menuName}
              </h1>
              <Burst color={accent} />
            </div>
            {venue.tagline && (
              <p className="mt-2 text-[15px]" style={{ color: theme.muted }}>
                {venue.tagline}
              </p>
            )}
            <Squiggle color={accent} className="mx-auto mt-4 h-3 w-32" />
          </IntroCover>
        </div>
      )}

      {/* CATEGORY page */}
      {screen.name === 'category' && activeCategory && (
        <div key={activeId} className="menu-page-slide relative min-h-[100svh]">
          {/* warm glow behind everything */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-64"
            style={{ background: `radial-gradient(circle at 50% 0%, ${accent}14, transparent 70%)` }}
          />

          {/* Top bar: back button only (drawer is reachable from the cover) */}
          <div
            className="sticky top-0 z-30 flex items-center gap-1 px-4 py-3"
            style={{ backgroundColor: `${theme.bg}F2`, backdropFilter: 'blur(6px)', borderBottom: `1px solid ${theme.border}` }}
          >
            <button
              type="button"
              onClick={() => setScreen({ name: 'cover' })}
              aria-label="Back"
              className="flex h-9 w-9 items-center justify-center text-xl leading-none transition-transform active:scale-90"
              style={{ borderRadius: '999px', border: `1.5px solid ${theme.border}`, color: accent }}
            >
              ‹
            </button>
            <span className="flex-1 truncate text-center text-lg font-bold" style={{ color: theme.text, fontFamily: theme.headingFont }}>
              {menuName}
            </span>
            <span className="w-10" aria-hidden="true" />
          </div>

          <div className="relative mx-auto w-full max-w-xl px-5">
            {/* Friendly chip rail */}
            {categories.length > 1 && (
              <nav
                className="-mx-5 flex gap-2 overflow-x-auto px-5 py-4"
                style={{ scrollbarWidth: 'none' }}
                aria-label="Categories"
              >
                {categories.map((c) => {
                  const on = c.id === activeId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setScreen({ name: 'category', categoryId: c.id })}
                      className="shrink-0 whitespace-nowrap px-4 py-1.5 text-sm font-bold transition-colors active:scale-95"
                      style={{
                        borderRadius: '999px',
                        border: `1.5px solid ${on ? accent : theme.border}`,
                        backgroundColor: on ? accent : theme.surface,
                        color: on ? pillText : theme.text,
                      }}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </nav>
            )}

            {/* Category heading */}
            <div className="pt-1 text-center">
              <h2 className="inline-block text-2xl font-bold" style={{ color: theme.text, fontFamily: theme.headingFont }}>
                {activeCategory.name}
              </h2>
              <Squiggle color={accent} />
            </div>

            {/* Dish rows, grouped by subcategory */}
            <div key={activeId} className="menu-stagger mt-5 space-y-6">
              {subGroups(activeCategory.items).map((group, gi) => (
                <div key={group.name ?? `__nogroup-${gi}`} className="space-y-3.5">
                  {group.name && (
                    <div className="pt-1 text-center">
                      <h3
                        className="inline-block text-lg font-bold"
                        style={{ color: accent, fontFamily: theme.headingFont }}
                      >
                        {group.name}
                      </h3>
                      <Squiggle color={accent} className="mx-auto mt-1 h-2 w-20" />
                    </div>
                  )}
                  <ul className="space-y-3.5">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(item)}
                          className="flex w-full items-center gap-3 px-3 py-3 text-left transition-transform active:scale-[0.99]"
                          style={{
                            backgroundColor: theme.surface,
                            border: `1.5px solid ${theme.border}`,
                            borderRadius: theme.radius,
                            opacity: item.isAvailable ? 1 : 0.5,
                          }}
                        >
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt=""
                              loading="lazy"
                              className="h-16 w-16 shrink-0 object-cover"
                              style={{ borderRadius: `calc(${theme.radius} - 3px)` }}
                            />
                          ) : (
                            <div
                              className="flex h-16 w-16 shrink-0 items-center justify-center"
                              style={{
                                borderRadius: `calc(${theme.radius} - 3px)`,
                                backgroundColor: `${accent}14`,
                                border: `1.5px dashed ${accent}55`,
                              }}
                            >
                              <DishDoodle color={accent} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-[16px] font-bold leading-snug" style={{ color: theme.text }}>
                              {item.name}
                              {!item.isAvailable && <SoldOut theme={theme} />}
                            </div>
                            {item.description && (
                              <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed" style={{ color: theme.muted }}>
                                {item.description}
                              </p>
                            )}
                          </div>
                          {venue.showPrices && (
                            <span
                              className="shrink-0 self-start whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-bold"
                              style={{ color: pillText, backgroundColor: accent }}
                            >
                              {formatMenuPrice(item.price, venue.currency)}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <KuzaFooter theme={theme} />
          </div>
        </div>
      )}

      <ItemSheet item={selected} venue={venue} theme={theme} accent={accent} onClose={() => setSelected(null)} />
    </TemplateRoot>
  );
}
