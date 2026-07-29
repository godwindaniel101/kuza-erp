import { ReactNode, useState } from 'react';
import { formatMenuPrice, PublicMenuItem } from '@/lib/menu-public';
import { MenuTheme, TemplateProps } from './types';
import {
  accentOf,
  Hamburger,
  ItemSheet,
  KuzaFooter,
  Preloader,
  SideDrawer,
  SoldOut,
  subGroups,
  TemplateRoot,
  useMenuPager,
} from './shared';

// Real theescape.ng assets, served from /public/menu/escape.
const ASSET = '/menu/escape';

/** Pick the closest category icon (theescape line-art set) by category name. */
function iconForCategory(name: string): string {
  const n = name.toLowerCase();
  if (/wine/.test(n)) return `${ASSET}/wine-icon.svg`;
  if (/cocktail/.test(n)) return `${ASSET}/cocktail-icon.svg`;
  if (/mocktail/.test(n)) return `${ASSET}/mocktail-icon.svg`;
  if (/happy\s*hour/.test(n)) return `${ASSET}/happy-hour-icon.svg`;
  if (/beer|beverage|drink|soft|juice|water|coffee|tea|smoothie|shake/.test(n)) return `${ASSET}/beverage-icon.svg`;
  if (/food|meal|main|starter|dessert|snack|dish|kitchen|grill|side|platter|special/.test(n)) return `${ASSET}/food-menu-icon.svg`;
  return `${ASSET}/GenericMenuIcon.svg`;
}

/**
 * A tile icon rendered from an SVG asset. Uses the SVG as a CSS mask so it takes
 * the theme accent color — an <img> would keep the file's baked-in fill and
 * ignore the theme entirely.
 */
function TileIcon({ src, color }: { src: string; color: string }) {
  return (
    <span
      aria-hidden="true"
      className="block h-16 w-16 sm:h-[72px] sm:w-[72px]"
      style={{
        backgroundColor: color,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  );
}

/** A large two-tone circular tile (dark dome + accent horizon crescent). */
function Tile({
  label,
  theme,
  accent,
  onClick,
  href,
  children,
}: {
  label: string;
  theme: MenuTheme;
  accent: string;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
}) {
  const inner = (
    <>
      <div
        className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-full"
        style={{ backgroundColor: theme.surface, boxShadow: `inset 0 0 0 1px ${accent}22` }}
      >
        {/* horizon crescent */}
        <div className="absolute inset-x-0 bottom-0 h-[42%] rounded-t-[100%]" style={{ backgroundColor: `${accent}26` }} />
        <div className="relative">{children}</div>
      </div>
      <span className="text-base font-bold" style={{ color: theme.text }}>
        {label}
      </span>
    </>
  );
  const cls = 'flex flex-col items-center gap-3 transition-transform active:scale-95';
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/**
 * ESCAPE — a faithful rebuild of menu.theescape.ng. Preloader → a doodle-lined
 * home of large circular tiles (one per category, plus Instagram & Feedback) →
 * a category page with a back button, a horizontal category rail and hairline
 * dish rows → bottom-sheet detail. A hamburger opens a "Get in touch" drawer.
 */
export default function EscapeTemplate({ data, theme }: TemplateProps) {
  const { venue } = data;
  const accent = accentOf(data, theme);
  const menuName = data.menus[0]?.name || venue.name;
  const categories = data.menus.flatMap((m) => m.categories);
  const { screen, setScreen, topRef } = useMenuPager({ name: 'home' });
  const [selected, setSelected] = useState<PublicMenuItem | null>(null);
  const [drawer, setDrawer] = useState(false);

  const activeId = screen.name === 'category' ? screen.categoryId : categories[0]?.id || '';
  const activeCategory = categories.find((c) => c.id === activeId) || null;

  const TopBar = (
    <div
      className="sticky top-0 z-30 flex items-center px-4 py-3"
      style={{ backgroundColor: `${theme.surface}F2`, backdropFilter: 'blur(6px)', borderBottom: `1px solid ${accent}22` }}
    >
      {screen.name === 'category' ? (
        // Inside a category: a back button (to the tile home) replaces the drawer.
        <button
          type="button"
          onClick={() => setScreen({ name: 'home' })}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none transition-transform active:scale-90"
          style={{ color: accent, border: `1px solid ${accent}44` }}
        >
          ‹
        </button>
      ) : (
        <Hamburger color={accent} onClick={() => setDrawer(true)} />
      )}
      <span className="flex-1 text-center text-lg font-black uppercase tracking-[0.15em]" style={{ color: accent }}>
        {screen.name === 'category' && activeCategory ? activeCategory.name : menuName}
      </span>
      <span className="w-10" aria-hidden="true" />
    </div>
  );

  return (
    <TemplateRoot theme={theme}>
      <Preloader theme={theme} accent={accent} venue={venue} title={menuName} />
      <div ref={topRef} />

      {/* Doodle backdrop (real theescape illustration) — a sticky, zero-height
          layer keeps it pinned to the scroll viewport in BOTH the real guest
          page and the preview device frame (position:fixed breaks inside the
          frame's transform ancestor). */}
      <div aria-hidden="true" className="pointer-events-none sticky top-0 z-0 h-0">
        <div
          className="absolute inset-x-0 top-0 h-[100svh]"
          style={{
            backgroundImage: `url(${ASSET}/bg-illustration.svg)`,
            backgroundRepeat: 'repeat',
            backgroundSize: '540px',
            opacity: theme.mode === 'dark' ? 0.1 : 0.14,
          }}
        />
      </div>

      <div className="min-h-[100svh]">
        <div className="relative z-10">
          {TopBar}

          {/* HOME — circular tile grid */}
          {screen.name === 'home' && (
            <div key="home" className="menu-page mx-auto w-full max-w-md px-6 py-8">
              <div className="menu-stagger grid grid-cols-2 gap-6">
                {categories.map((c) => (
                  <Tile key={c.id} label={c.name} theme={theme} accent={accent} onClick={() => setScreen({ name: 'category', categoryId: c.id })}>
                    <TileIcon src={iconForCategory(c.name)} color={accent} />
                  </Tile>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORY page */}
          {screen.name === 'category' && activeCategory && (
            <div key={activeId} className="menu-page-slide mx-auto w-full max-w-2xl">
              {/* horizontal category rail */}
              {categories.length > 1 && (
                <nav className="flex gap-2 overflow-x-auto px-5 py-3" style={{ scrollbarWidth: 'none' }} aria-label="Categories">
                  {categories.map((c) => {
                    const on = c.id === activeId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setScreen({ name: 'category', categoryId: c.id })}
                        className="shrink-0 whitespace-nowrap px-4 py-1.5 text-sm font-semibold uppercase tracking-wide transition-colors"
                        style={{
                          borderRadius: '9px',
                          border: `1px solid ${accent}`,
                          backgroundColor: on ? accent : 'transparent',
                          color: on ? theme.bg : accent,
                        }}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </nav>
              )}

              <main className="px-6 pb-4 pt-2">
                {subGroups(activeCategory.items).map((group, gi) => (
                  <div key={group.name ?? `__nogroup-${gi}`} className="flex flex-col">
                    {group.name && (
                      <h3
                        className="mt-6 mb-1 text-xs font-black uppercase tracking-[0.25em]"
                        style={{ color: accent }}
                      >
                        {group.name}
                      </h3>
                    )}
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelected(item)}
                        className="flex items-start gap-3 py-4 text-left transition-opacity active:opacity-70"
                        style={{ borderBottom: `1px solid ${theme.border}` }}
                      >
                        {item.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-bold uppercase leading-snug" style={{ color: theme.text, opacity: item.isAvailable ? 1 : 0.55 }}>
                            {item.name}
                            {!item.isAvailable && <SoldOut theme={theme} />}
                          </div>
                          {item.description && (
                            <p className="mt-1 text-sm leading-snug" style={{ color: theme.muted }}>
                              {item.description}
                            </p>
                          )}
                        </div>
                        {venue.showPrices && (
                          <div className="shrink-0 pt-0.5 text-[15px] font-semibold tabular-nums" style={{ color: accent }}>
                            {formatMenuPrice(item.price, venue.currency)}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </main>
            </div>
          )}

          <KuzaFooter theme={theme} />
        </div>
      </div>

      <SideDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        venue={venue}
        theme={theme}
        accent={accent}
        links={categories.map((c) => ({ id: c.id, label: c.name, onClick: () => setScreen({ name: 'category', categoryId: c.id }) }))}
      />

      <ItemSheet item={selected} venue={venue} theme={theme} accent={accent} onClose={() => setSelected(null)} />
    </TemplateRoot>
  );
}
