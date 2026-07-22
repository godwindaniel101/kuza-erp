import { useState } from 'react';
import { formatMenuPrice, PublicMenuItem } from '@/lib/menu-public';
import { TemplateProps } from './types';
import {
  accentOf,
  DishImage,
  Hamburger,
  IntroCover,
  ItemSheet,
  KuzaFooter,
  Preloader,
  SideDrawer,
  SoldOut,
  subGroups,
  TemplateRoot,
  useMenuPager,
} from './shared';

/** Soft out-of-focus "bokeh" dots for the dark cover. */
function Bokeh({ color }: { color: string }) {
  const dots = [
    { x: 12, y: 18, r: 46, o: 0.16 },
    { x: 82, y: 12, r: 30, o: 0.22 },
    { x: 68, y: 40, r: 60, o: 0.1 },
    { x: 24, y: 66, r: 38, o: 0.14 },
    { x: 90, y: 74, r: 24, o: 0.2 },
    { x: 46, y: 88, r: 52, o: 0.08 },
  ];
  return (
    <svg aria-hidden="true" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
      {dots.map((d, i) => (
        <circle key={i} cx={`${d.x}%`} cy={`${d.y}%`} r={d.r} fill={color} opacity={d.o} />
      ))}
    </svg>
  );
}

/** Small — ◆ — divider used under headings. */
function DiamondRule({ accent }: { accent: string }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <span className="h-px w-10" style={{ backgroundColor: `${accent}66` }} />
      <span className="h-1.5 w-1.5 rotate-45" style={{ backgroundColor: accent }} />
      <span className="h-px w-10" style={{ backgroundColor: `${accent}66` }} />
    </div>
  );
}

/**
 * NOIR — a premium dark restaurant / lounge. Cinematic dark ground with a warm
 * bokeh glow: Preloader → an IntroCover (PREMIUM eyebrow, diamond rule, serif
 * uppercase venue name) → paged category screens with a sticky gold-outlined
 * tab rail, a back button to the cover, image-forward dish cards, and a
 * bottom-sheet dish detail. A hamburger opens the contact drawer.
 */
export default function NoirTemplate({ data, theme }: TemplateProps) {
  const { venue } = data;
  const accent = accentOf(data, theme);
  const menuName = data.menus[0]?.name || venue.name;
  const categories = data.menus.flatMap((m) => m.categories);
  const { screen, setScreen, topRef } = useMenuPager({ name: 'cover' });
  const [selected, setSelected] = useState<PublicMenuItem | null>(null);
  const [drawer, setDrawer] = useState(false);

  const firstId = categories[0]?.id || '';
  const activeId = screen.name === 'category' ? screen.categoryId : firstId;
  const activeCategory = categories.find((c) => c.id === activeId) || null;

  const initial = menuName.charAt(0).toUpperCase();

  return (
    <TemplateRoot theme={theme}>
      <Preloader theme={theme} accent={accent} venue={venue} title={menuName} />
      <div ref={topRef} />

      {/* COVER */}
      {screen.name === 'cover' && (
        <div key="cover" className="menu-fade">
          <IntroCover
            venue={venue}
            theme={theme}
            accent={accent}
            ctaLabel="View Menu"
            onEnter={firstId ? () => setScreen({ name: 'category', categoryId: firstId }) : undefined}
            background={
              <>
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{ background: `radial-gradient(ellipse 70% 50% at 50% 30%, ${accent}22, transparent)` }}
                />
                <Bokeh color={accent} />
              </>
            }
          >
            {!venue.logoUrl && (
              <div
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full text-2xl uppercase"
                style={{ color: accent, border: `1px solid ${accent}`, fontFamily: theme.headingFont }}
                aria-hidden="true"
              >
                {initial}
              </div>
            )}
            <p className="text-[11px] font-semibold uppercase tracking-[0.5em]" style={{ color: accent }}>
              Premium
            </p>
            <div className="my-5">
              <DiamondRule accent={accent} />
            </div>
            <h1
              className="text-3xl font-normal uppercase leading-tight tracking-[0.3em] sm:text-4xl"
              style={{ color: theme.text, fontFamily: theme.headingFont }}
            >
              {menuName}
            </h1>
            {venue.tagline && (
              <p className="mt-4 text-sm tracking-wide" style={{ color: theme.muted }}>
                {venue.tagline}
              </p>
            )}
          </IntroCover>
        </div>
      )}

      {/* CATEGORY PAGES */}
      {screen.name === 'category' && activeCategory && (
        <div
          className="relative min-h-[100svh]"
          style={{ background: `radial-gradient(ellipse 80% 40% at 50% -5%, ${accent}12, transparent)` }}
        >
          {/* Top bar: back to cover + hamburger */}
          <div
            className="sticky top-0 z-30 flex items-center gap-2 px-4 py-3"
            style={{ backgroundColor: `${theme.bg}F2`, backdropFilter: 'blur(6px)', borderBottom: `1px solid ${accent}22` }}
          >
            <button
              type="button"
              onClick={() => setScreen({ name: 'cover' })}
              aria-label="Back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl leading-none transition-transform active:scale-90"
              style={{ color: accent, border: `1px solid ${accent}44` }}
            >
              ‹
            </button>
            <span
              className="flex-1 truncate text-center text-sm font-normal uppercase tracking-[0.3em]"
              style={{ color: accent, fontFamily: theme.headingFont }}
            >
              {menuName}
            </span>
            <Hamburger color={accent} onClick={() => setDrawer(true)} className="shrink-0" />
          </div>

          {/* Sticky gold-outlined tab rail */}
          {categories.length > 1 && (
            <nav
              className="sticky top-[65px] z-20 flex gap-2 overflow-x-auto px-4 py-3"
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
                    className="shrink-0 whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition-colors"
                    style={{
                      borderRadius: theme.radius,
                      border: `1px solid ${on ? accent : `${accent}44`}`,
                      color: on ? accent : theme.muted,
                      backgroundColor: on ? `${accent}14` : 'transparent',
                    }}
                  >
                    {c.name}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Dish list — keyed so it re-animates on navigation */}
          <div key={activeId} className="menu-page-slide mx-auto w-full max-w-2xl px-6 pt-6">
            <div className="mb-5 flex items-center gap-4">
              <h2 className="text-base font-semibold uppercase tracking-[0.25em]" style={{ color: accent }}>
                {activeCategory.name}
              </h2>
              <span className="h-px flex-1" style={{ background: `linear-gradient(to right, ${accent}66, transparent)` }} />
            </div>
            {activeCategory.description && (
              <p className="-mt-2 mb-5 text-[13px] leading-relaxed" style={{ color: theme.muted }}>
                {activeCategory.description}
              </p>
            )}

            <ul className="menu-stagger space-y-3">
              {subGroups(activeCategory.items).map((group) => (
                <li key={group.name ?? '__nosub'} className="space-y-3">
                  {group.name && (
                    <div className="flex items-center gap-3 pt-2">
                      <span
                        className="text-[11px] font-semibold uppercase tracking-[0.35em]"
                        style={{ color: accent }}
                      >
                        {group.name}
                      </span>
                      <span
                        className="h-px flex-1"
                        style={{ background: `linear-gradient(to right, ${accent}44, transparent)` }}
                      />
                    </div>
                  )}
                  <ul className="space-y-3">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(item)}
                          className="flex h-28 w-full items-stretch gap-4 overflow-hidden text-left transition-transform active:scale-[0.99]"
                          style={{
                            backgroundColor: theme.surface,
                            border: `1px solid ${theme.border}`,
                            borderRadius: theme.radius,
                            opacity: item.isAvailable ? 1 : 0.5,
                          }}
                        >
                          <DishImage
                            src={item.imageUrl}
                            className="h-full w-28 shrink-0 object-cover"
                            fallback={
                              <div
                                className="flex h-full w-28 shrink-0 items-center justify-center text-2xl"
                                style={{ background: `linear-gradient(135deg, ${accent}22, transparent)`, color: accent, fontFamily: theme.headingFont }}
                              >
                                {initial}
                              </div>
                            }
                          />
                          <div className="flex min-w-0 flex-1 flex-col justify-center py-3 pr-4">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-[15px] font-medium tracking-wide" style={{ fontFamily: theme.headingFont }}>
                                {item.name}
                                {!item.isAvailable && <SoldOut theme={theme} />}
                              </span>
                              {venue.showPrices && (
                                <span className="whitespace-nowrap text-[15px] font-semibold tracking-wide" style={{ color: accent }}>
                                  {formatMenuPrice(item.price, venue.currency)}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed" style={{ color: theme.muted }}>
                                {item.description}
                              </p>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

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
        links={categories.map((c) => ({
          id: c.id,
          label: c.name,
          onClick: () => setScreen({ name: 'category', categoryId: c.id }),
        }))}
      />

      <ItemSheet item={selected} venue={venue} theme={theme} accent={accent} onClose={() => setSelected(null)} />
    </TemplateRoot>
  );
}
