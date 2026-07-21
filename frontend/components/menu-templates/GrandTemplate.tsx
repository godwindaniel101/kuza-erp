import { useState } from 'react';
import { formatMenuPrice, PublicMenuItem } from '@/lib/menu-public';
import { TemplateProps } from './types';
import {
  accentOf,
  Hamburger,
  IntroCover,
  ItemSheet,
  KuzaFooter,
  Preloader,
  SideDrawer,
  SoldOut,
  TemplateRoot,
  useMenuPager,
} from './shared';

/** A small engraved crest / monogram for the formal cover. */
function Crest({ color, letter }: { color: string; letter: string }) {
  return (
    <div className="relative mb-2 flex h-24 w-24 items-center justify-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="1" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="0.5" opacity="0.6" />
      </svg>
      <span className="text-3xl" style={{ color, fontVariant: 'small-caps' }}>
        {letter}
      </span>
    </div>
  );
}

/** A pair of hairlines with a diamond ornament between them — the engraved divider. */
function DoubleRule({ accent, width = 160 }: { accent: string; width?: number }) {
  return (
    <div className="mx-auto flex flex-col items-center gap-[3px]" style={{ maxWidth: width }}>
      <span className="h-px w-full" style={{ backgroundColor: accent }} />
      <span className="h-px w-full" style={{ backgroundColor: `${accent}55` }} />
    </div>
  );
}

/**
 * GRAND — a formal hotel / banquet menu. An engraved-crest cover, then a paged,
 * print-inspired sheet: a small-caps Table of Contents (HOME) whose rows each
 * navigate to a category page rendered as a centered, ceremonial list inside a
 * double-ruled frame. Deliberately typographic — serif, hairlines, small-caps,
 * NO photos.
 */
export default function GrandTemplate({ data, theme }: TemplateProps) {
  const { venue } = data;
  const accent = accentOf(data, theme);
  const menuName = data.menus[0]?.name || venue.name;
  const categories = data.menus.flatMap((m) => m.categories);
  const { screen, setScreen, topRef } = useMenuPager({ name: 'cover' });
  const [selected, setSelected] = useState<PublicMenuItem | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const activeId = screen.name === 'category' ? screen.categoryId : categories[0]?.id || '';
  const activeCategory = categories.find((c) => c.id === activeId) || null;

  /** The masthead / venue plate shared by HOME and category sheets. */
  const Masthead = (
    <header className="pb-6 text-center">
      {venue.logoUrl && !logoFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={venue.logoUrl}
          alt=""
          onError={() => setLogoFailed(true)}
          className="mx-auto mb-4 h-14 w-14 rounded-full object-cover"
          style={{ border: `1px solid ${theme.border}` }}
        />
      ) : (
        <div className="flex justify-center">
          <Crest color={accent} letter={menuName.charAt(0).toUpperCase()} />
        </div>
      )}
      <h2
        className="text-2xl tracking-wide"
        style={{ fontFamily: theme.headingFont, fontVariant: 'small-caps', color: theme.text }}
      >
        {menuName}
      </h2>
      {venue.tagline && (
        <p className="mt-2 text-[13px] italic" style={{ color: theme.muted }}>
          {venue.tagline}
        </p>
      )}
      <div className="mt-4">
        <DoubleRule accent={accent} />
      </div>
    </header>
  );

  return (
    <TemplateRoot theme={theme}>
      <div ref={topRef} />
      <Preloader theme={theme} accent={accent} venue={venue} />

      {/* COVER */}
      {screen.name === 'cover' && (
        <div key="cover" className="menu-fade">
          <IntroCover
            venue={venue}
            theme={theme}
            accent={accent}
            ctaLabel="Present Menu"
            onEnter={() => setScreen({ name: 'home' })}
          >
            {!venue.logoUrl && <Crest color={accent} letter={menuName.charAt(0).toUpperCase()} />}
            <p className="text-[10px] font-semibold uppercase tracking-[0.5em]" style={{ color: accent }}>
              The Menu
            </p>
            <h1
              className="mt-3 text-3xl tracking-wide sm:text-4xl"
              style={{ color: theme.text, fontFamily: theme.headingFont, fontVariant: 'small-caps' }}
            >
              {menuName}
            </h1>
            {venue.tagline && (
              <p className="mt-3 text-sm italic" style={{ color: theme.muted }}>
                {venue.tagline}
              </p>
            )}
            <div className="mt-6">
              <DoubleRule accent={accent} width={200} />
            </div>
          </IntroCover>
        </div>
      )}

      {/* HOME + CATEGORY share the framed-sheet chrome. */}
      {screen.name !== 'cover' && (
        <div className="relative min-h-[100svh]">
          {/* Slim top bar: hamburger + engraved wordmark. */}
          <div
            className="sticky top-0 z-30 flex items-center px-4 py-3"
            style={{
              backgroundColor: `${theme.bg}F2`,
              backdropFilter: 'blur(6px)',
              borderBottom: `1px solid ${theme.border}`,
            }}
          >
            <Hamburger color={accent} onClick={() => setDrawer(true)} />
            {screen.name === 'category' && (
              <button
                type="button"
                onClick={() => setScreen({ name: 'home' })}
                aria-label="Back to contents"
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none transition-transform active:scale-90"
                style={{ color: accent, border: `1px solid ${accent}44` }}
              >
                ‹
              </button>
            )}
            <span
              className="flex-1 text-center text-sm tracking-[0.3em]"
              style={{ color: accent, fontFamily: theme.headingFont, fontVariant: 'small-caps' }}
            >
              {menuName}
            </span>
            <span className="w-10" aria-hidden="true" />
          </div>

          <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
            <div
              className="px-5 py-8 sm:px-10 sm:py-12"
              style={{
                backgroundColor: theme.surface,
                border: `1px solid ${accent}`,
                outline: `1px solid ${accent}55`,
                outlineOffset: '4px',
                borderRadius: theme.radius,
              }}
            >
              {/* HOME — Table of Contents */}
              {screen.name === 'home' && (
                <div key="home" className="menu-fade">
                  {Masthead}

                  <p
                    className="mt-2 text-center text-[10px] uppercase tracking-[0.5em]"
                    style={{ color: theme.muted }}
                  >
                    Table of Contents
                  </p>

                  <ul className="menu-stagger mx-auto mt-8 max-w-md">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <button
                          type="button"
                          onClick={() => setScreen({ name: 'category', categoryId: category.id })}
                          className="group flex w-full items-baseline gap-3 py-4 text-left transition-opacity active:opacity-70"
                          style={{ borderBottom: `1px solid ${theme.border}` }}
                        >
                          <span
                            className="text-lg tracking-widest"
                            style={{
                              fontFamily: theme.headingFont,
                              fontVariant: 'small-caps',
                              color: theme.text,
                            }}
                          >
                            {category.name}
                          </span>
                          <span
                            className="mx-1 mb-1 h-px flex-1"
                            style={{ backgroundColor: theme.border }}
                            aria-hidden="true"
                          />
                          <span
                            className="text-[11px] uppercase tracking-[0.2em]"
                            style={{ color: accent }}
                          >
                            {category.items.length}{' '}
                            {category.items.length === 1 ? 'item' : 'items'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>

                  {venue.address && (
                    <p
                      className="mt-10 text-center text-[11px] uppercase tracking-[0.25em]"
                      style={{ color: theme.muted }}
                    >
                      {venue.address}
                    </p>
                  )}
                </div>
              )}

              {/* CATEGORY — a centered, ceremonial list. */}
              {screen.name === 'category' && activeCategory && (
                <div key={activeId} className="menu-page-slide">
                  {Masthead}

                  <h3
                    className="text-center text-lg tracking-[0.3em]"
                    style={{
                      fontFamily: theme.headingFont,
                      fontVariant: 'small-caps',
                      color: accent,
                    }}
                  >
                    {activeCategory.name}
                  </h3>
                  <div className="mx-auto mt-3 mb-8 h-px w-12" style={{ backgroundColor: theme.border }} />

                  {activeCategory.items.length === 0 ? (
                    <p className="text-center text-sm italic" style={{ color: theme.muted }}>
                      Selections to be announced.
                    </p>
                  ) : (
                    <ul className="menu-stagger mx-auto max-w-lg space-y-7">
                      {activeCategory.items.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setSelected(item)}
                            className="block w-full text-center transition-opacity active:opacity-70"
                            style={{ opacity: item.isAvailable ? 1 : 0.5 }}
                          >
                            <div
                              className="text-[16px] font-medium tracking-wide"
                              style={{ fontFamily: theme.headingFont, color: theme.text }}
                            >
                              {item.name}
                              {!item.isAvailable && <SoldOut theme={theme} />}
                            </div>
                            {item.description && (
                              <p
                                className="mx-auto mt-1 max-w-xs text-[13px] italic leading-relaxed"
                                style={{ color: theme.muted }}
                              >
                                {item.description}
                              </p>
                            )}
                            {venue.showPrices && (
                              <div
                                className="mt-1.5 text-[13px] font-semibold tracking-[0.2em]"
                                style={{ color: accent }}
                              >
                                {formatMenuPrice(item.price, venue.currency)}
                              </div>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-10">
                    <DoubleRule accent={accent} width={120} />
                  </div>
                </div>
              )}
            </div>

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
