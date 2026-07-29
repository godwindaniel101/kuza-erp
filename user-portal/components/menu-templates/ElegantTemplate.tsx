import { useState } from 'react';
import { formatMenuPrice, PublicMenuItem } from '@/lib/menu-public';
import { MenuTheme, TemplateProps } from './types';
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

/**
 * ELEGANT — fine dining, minimalist and high-end. Serif throughout, generous
 * whitespace, hairline rules, a single restrained accent. Paged, not a long
 * scroll: Preloader → clean IntroCover → a spare centered category index →
 * a discreet category page (name + price on one hairline-ruled line). The
 * restraint is the design — no cards, no shadows, no loud chips.
 */
export default function ElegantTemplate({ data, theme }: TemplateProps) {
  const { venue } = data;
  const accent = accentOf(data, theme);
  const menuName = data.menus[0]?.name || venue.name;
  const categories = data.menus.flatMap((m) => m.categories);
  const { screen, setScreen, topRef } = useMenuPager({ name: 'cover' });
  const [selected, setSelected] = useState<PublicMenuItem | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  /** A clean serif monogram used when the venue has no (usable) uploaded logo. */
  const Monogram = (
    <div
      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl font-normal"
      style={{ backgroundColor: `${accent}12`, color: accent, border: `1px solid ${accent}`, fontFamily: theme.headingFont }}
      aria-hidden="true"
    >
      {menuName.charAt(0).toUpperCase()}
    </div>
  );

  const activeId = screen.name === 'category' ? screen.categoryId : categories[0]?.id || '';
  const activeCategory = categories.find((c) => c.id === activeId) || null;

  return (
    <TemplateRoot theme={theme}>
      <div ref={topRef} />
      <Preloader theme={theme} accent={accent} venue={venue} title={menuName} />

      {/* COVER — clean serif venue name + tagline + a thin hairline rule. */}
      {screen.name === 'cover' && (
        <div key="cover" className="menu-fade">
          <IntroCover
            venue={venue}
            theme={theme}
            accent={accent}
            ctaLabel="View Menu"
            onEnter={() => setScreen({ name: 'home' })}
          >
            {!venue.logoUrl && <div className="mb-6">{Monogram}</div>}
            <h1
              className="text-4xl sm:text-5xl font-normal tracking-wide"
              style={{ fontFamily: theme.headingFont }}
            >
              {menuName}
            </h1>
            <div className="mx-auto mt-6 h-px w-16" style={{ backgroundColor: accent }} />
            {venue.tagline && (
              <p
                className="mt-6 max-w-sm text-[15px] italic leading-relaxed"
                style={{ color: theme.muted }}
              >
                {venue.tagline}
              </p>
            )}
          </IntroCover>
        </div>
      )}

      {/* HOME — a spare, centered category index. */}
      {screen.name === 'home' && (
        <div key="home" className="menu-page min-h-[100svh]">
          <TopBar
            theme={theme}
            accent={accent}
            onMenu={() => setDrawer(true)}
          />

          <div className="mx-auto max-w-xl px-6 pb-8 pt-14 text-center">
            {venue.logoUrl && !logoFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={venue.logoUrl}
                alt=""
                onError={() => setLogoFailed(true)}
                className="mx-auto mb-6 h-16 w-16 rounded-full object-cover"
                style={{ border: `1px solid ${theme.border}` }}
              />
            ) : (
              <div className="mb-6">{Monogram}</div>
            )}
            <h1
              className="text-3xl sm:text-4xl font-normal tracking-wide"
              style={{ fontFamily: theme.headingFont }}
            >
              {menuName}
            </h1>
            <div className="mx-auto mt-5 h-px w-16" style={{ backgroundColor: accent }} />
            <p
              className="mt-5 text-[11px] uppercase tracking-[0.4em]"
              style={{ color: theme.muted }}
            >
              Menu
            </p>

            <ul className="menu-stagger mt-10 flex flex-col" style={{ borderTop: `1px solid ${theme.border}` }}>
              {categories.map((category) => (
                <li key={category.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <button
                    type="button"
                    onClick={() => setScreen({ name: 'category', categoryId: category.id })}
                    className="group flex w-full flex-col items-center gap-1.5 py-7 text-center transition-opacity active:opacity-60"
                  >
                    <span
                      className="text-2xl font-normal tracking-wide"
                      style={{ fontFamily: theme.headingFont }}
                    >
                      {category.name}
                    </span>
                    <span
                      className="text-[11px] uppercase tracking-[0.3em]"
                      style={{ color: theme.muted }}
                    >
                      {category.items.length}{' '}
                      {category.items.length === 1 ? 'dish' : 'dishes'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <KuzaFooter theme={theme} />
        </div>
      )}

      {/* CATEGORY — discreet back + an elegant hairline-ruled item list. */}
      {screen.name === 'category' && activeCategory && (
        <div key={activeId} className="menu-page-slide min-h-[100svh]">
          <TopBar
            theme={theme}
            accent={accent}
            onMenu={() => setDrawer(true)}
            onBack={() => setScreen({ name: 'home' })}
          />

          <main className="mx-auto max-w-2xl px-6 pb-6 pt-12">
            <header className="text-center">
              <h2
                className="text-3xl font-normal tracking-wide"
                style={{ fontFamily: theme.headingFont }}
              >
                {activeCategory.name}
              </h2>
              {activeCategory.description && (
                <p className="mt-2 text-sm italic" style={{ color: theme.muted }}>
                  {activeCategory.description}
                </p>
              )}
              <div className="mx-auto mt-5 h-px w-10" style={{ backgroundColor: accent }} />
            </header>

            <ul className="mt-10 flex flex-col">
              {activeCategory.items.map((item) => (
                <li key={item.id} style={{ borderTop: `1px solid ${theme.border}` }}>
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className="flex w-full flex-col py-6 text-left transition-opacity active:opacity-60"
                    style={{ opacity: item.isAvailable ? 1 : 0.5 }}
                  >
                    <div className="flex items-baseline gap-3">
                      <span
                        className="text-lg tracking-wide"
                        style={{ fontFamily: theme.headingFont }}
                      >
                        {item.name}
                        {!item.isAvailable && <SoldOut theme={theme} />}
                      </span>
                      {venue.showPrices && (
                        <>
                          <span
                            className="flex-1 translate-y-[-4px] border-b border-dotted"
                            style={{ borderColor: theme.border }}
                          />
                          <span
                            className="whitespace-nowrap text-[15px] tabular-nums"
                            style={{ color: accent }}
                          >
                            {formatMenuPrice(item.price, venue.currency)}
                          </span>
                        </>
                      )}
                    </div>
                    {item.description && (
                      <p
                        className="mt-1.5 pr-10 text-sm italic leading-relaxed"
                        style={{ color: theme.muted }}
                      >
                        {item.description}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </main>

          <KuzaFooter theme={theme} />
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

/**
 * A minimal top bar: hamburger on the right, an optional discreet back
 * affordance on the left. Kept airy and hairline-ruled to match the archetype.
 */
function TopBar({
  theme,
  accent,
  onMenu,
  onBack,
}: {
  theme: MenuTheme;
  accent: string;
  onMenu: () => void;
  onBack?: () => void;
}) {
  return (
    <div
      className="sticky top-0 z-30 flex items-center px-4 py-3"
      style={{
        backgroundColor: `${theme.bg}F2`,
        backdropFilter: 'blur(6px)',
        borderBottom: `1px solid ${theme.border}`,
      }}
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.3em] transition-opacity active:opacity-60"
          style={{ color: theme.muted }}
          aria-label="Back"
        >
          <span aria-hidden="true" style={{ color: accent }}>‹</span>
          Back
        </button>
      ) : (
        <span className="w-10" aria-hidden="true" />
      )}
      <span className="flex-1" aria-hidden="true" />
      <Hamburger color={accent} onClick={onMenu} />
    </div>
  );
}
