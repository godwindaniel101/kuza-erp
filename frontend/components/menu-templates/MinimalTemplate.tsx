import { useState } from 'react';
import { formatMenuPrice, PublicMenuItem } from '@/lib/menu-public';
import { TemplateProps } from './types';
import {
  accentOf,
  BackBar,
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
 * MINIMAL — clean, airy café / brunch. Sans typography, soft rounded cards,
 * lots of light and whitespace, a single restrained accent. Paged like the
 * premium archetypes (no long single scroll): Preloader → soft IntroCover →
 * a HOME category index of quiet cards → an airy CATEGORY page with a back
 * affordance and item rows → bottom-sheet detail. A hamburger opens the drawer.
 *
 * This is also the fallback template for unbuilt keys, so it stays robust and
 * never crashes on empty categories / items.
 */
export default function MinimalTemplate({ data, theme }: TemplateProps) {
  const { venue } = data;
  const accent = accentOf(data, theme);
  const menuName = data.menus[0]?.name || venue.name;
  const categories = data.menus.flatMap((m) => m.categories);
  const { screen, setScreen, topRef } = useMenuPager({ name: 'cover' });
  const [selected, setSelected] = useState<PublicMenuItem | null>(null);
  const [drawer, setDrawer] = useState(false);

  const activeId =
    screen.name === 'category' ? screen.categoryId : categories[0]?.id || '';
  const activeCategory = categories.find((c) => c.id === activeId) || null;

  const drawerLinks = categories.map((c) => ({
    id: c.id,
    label: c.name,
    onClick: () => setScreen({ name: 'category', categoryId: c.id }),
  }));

  const thumbOf = (categoryId: string): string | null => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.items.find((i) => i.imageUrl)?.imageUrl || null;
  };

  return (
    <TemplateRoot theme={theme}>
      <div ref={topRef} />
      <Preloader theme={theme} accent={accent} venue={venue} />

      {/* COVER — soft, airy intro */}
      {screen.name === 'cover' && (
        <div key="cover" className="menu-fade">
          <IntroCover
            venue={venue}
            theme={theme}
            accent={accent}
            ctaLabel="View Menu"
            onEnter={() => setScreen({ name: 'home' })}
          >
            {!venue.logoUrl && (
              <div
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
                style={{ backgroundColor: `${accent}14`, color: accent }}
                aria-hidden="true"
              >
                {menuName.charAt(0).toUpperCase()}
              </div>
            )}
            <h1
              className="text-4xl font-bold tracking-tight sm:text-5xl"
              style={{ color: theme.text, fontFamily: theme.headingFont }}
            >
              {menuName}
            </h1>
            {venue.tagline && (
              <p
                className="mt-3 max-w-xs text-base leading-relaxed"
                style={{ color: theme.muted }}
              >
                {venue.tagline}
              </p>
            )}
          </IntroCover>
        </div>
      )}

      {/* HOME — clean category index of soft cards */}
      {screen.name === 'home' && (
        <div key="home" className="menu-page min-h-[100svh]">
          <div
            className="sticky top-0 z-30 flex items-center px-4 py-3"
            style={{
              backgroundColor: `${theme.bg}F2`,
              backdropFilter: 'blur(6px)',
              borderBottom: `1px solid ${theme.border}`,
            }}
          >
            <Hamburger color={accent} onClick={() => setDrawer(true)} />
            <span
              className="flex-1 truncate text-center text-base font-semibold tracking-tight"
              style={{ color: theme.text }}
            >
              {menuName}
            </span>
            <span className="w-10" aria-hidden="true" />
          </div>

          <div className="mx-auto w-full max-w-xl px-5 pb-6 pt-8">
            <header className="mb-7">
              <h2
                className="text-3xl font-bold tracking-tight"
                style={{ color: theme.text, fontFamily: theme.headingFont }}
              >
                Menu
              </h2>
              {venue.tagline && (
                <p className="mt-1.5 text-sm" style={{ color: theme.muted }}>
                  {venue.tagline}
                </p>
              )}
            </header>

            {categories.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center px-6 py-20 text-center"
                style={{
                  backgroundColor: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: theme.radius,
                }}
              >
                <p className="text-base font-semibold" style={{ color: theme.text }}>
                  Menu coming soon
                </p>
                <p className="mt-1.5 text-sm" style={{ color: theme.muted }}>
                  Check back shortly — we&apos;re still plating things up.
                </p>
              </div>
            ) : (
              <div className="menu-stagger flex flex-col gap-3">
                {categories.map((category) => {
                  const thumb = thumbOf(category.id);
                  const count = category.items.length;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() =>
                        setScreen({ name: 'category', categoryId: category.id })
                      }
                      className="flex items-center gap-4 px-4 py-4 text-left transition-transform active:scale-[0.99]"
                      style={{
                        backgroundColor: theme.surface,
                        border: `1px solid ${theme.border}`,
                        borderRadius: theme.radius,
                        boxShadow:
                          theme.mode === 'light'
                            ? '0 1px 3px rgba(16, 24, 40, 0.05)'
                            : 'none',
                      }}
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="h-16 w-16 shrink-0 object-cover"
                          style={{ borderRadius: theme.radius }}
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="flex h-16 w-16 shrink-0 items-center justify-center text-xl font-bold"
                          style={{
                            backgroundColor: `${accent}14`,
                            color: accent,
                            borderRadius: theme.radius,
                          }}
                          aria-hidden="true"
                        >
                          {category.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate text-lg font-semibold tracking-tight"
                          style={{ color: theme.text }}
                        >
                          {category.name}
                        </div>
                        <div
                          className="mt-0.5 text-sm"
                          style={{ color: theme.muted }}
                        >
                          {count} {count === 1 ? 'item' : 'items'}
                        </div>
                      </div>
                      <span
                        className="shrink-0 text-2xl leading-none"
                        style={{ color: accent }}
                        aria-hidden="true"
                      >
                        ›
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <KuzaFooter theme={theme} />
        </div>
      )}

      {/* CATEGORY page — airy item rows */}
      {screen.name === 'category' && activeCategory && (
        <div key={activeId} className="menu-page-slide min-h-[100svh]">
          <BackBar
            title={activeCategory.name}
            theme={theme}
            accent={accent}
            onBack={() => setScreen({ name: 'home' })}
          />

          <div className="mx-auto w-full max-w-xl px-5 pb-6 pt-6">
            <h2
              className="mb-5 text-3xl font-bold tracking-tight"
              style={{ color: theme.text, fontFamily: theme.headingFont }}
            >
              {activeCategory.name}
            </h2>

            {activeCategory.items.length === 0 ? (
              <p className="py-10 text-center text-sm" style={{ color: theme.muted }}>
                Nothing here just yet.
              </p>
            ) : (
              <div className="menu-stagger flex flex-col gap-2.5">
                {activeCategory.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    className="flex items-start gap-4 px-4 py-3.5 text-left transition-transform active:scale-[0.99]"
                    style={{
                      backgroundColor: theme.surface,
                      border: `1px solid ${theme.border}`,
                      borderRadius: theme.radius,
                      boxShadow:
                        theme.mode === 'light'
                          ? '0 1px 3px rgba(16, 24, 40, 0.05)'
                          : 'none',
                      opacity: item.isAvailable ? 1 : 0.55,
                    }}
                  >
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-16 w-16 shrink-0 object-cover"
                        style={{ borderRadius: theme.radius }}
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-[15px] font-semibold leading-snug"
                        style={{ color: theme.text }}
                      >
                        {item.name}
                        {!item.isAvailable && <SoldOut theme={theme} />}
                      </div>
                      {item.description && (
                        <p
                          className="mt-1 text-[13px] leading-relaxed"
                          style={{ color: theme.muted }}
                        >
                          {item.description}
                        </p>
                      )}
                    </div>
                    {venue.showPrices && (
                      <div
                        className="shrink-0 whitespace-nowrap pt-0.5 text-[15px] font-semibold tabular-nums"
                        style={{ color: accent }}
                      >
                        {formatMenuPrice(item.price, venue.currency)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <KuzaFooter theme={theme} />
        </div>
      )}

      <SideDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        venue={venue}
        theme={theme}
        accent={accent}
        links={drawerLinks}
      />

      <ItemSheet
        item={selected}
        venue={venue}
        theme={theme}
        accent={accent}
        onClose={() => setSelected(null)}
      />
    </TemplateRoot>
  );
}
