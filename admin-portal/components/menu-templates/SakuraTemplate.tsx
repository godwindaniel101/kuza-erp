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
  Seigaiha,
  SideDrawer,
  SoldOut,
  subGroups,
  TemplateRoot,
  useMenuPager,
} from './shared';

/**
 * SAKURA — a sushi / pan-Asian menu (inspired by the Japanese restaurant kit).
 * Preloader → a seigaiha wave cover → a tile grid of categories → a dedicated
 * category page (back bar). Dishes show their photo and open a bottom-sheet
 * detail. A hamburger opens the "Get in touch" drawer. Category links navigate
 * pages, never a long scroll.
 */
export default function SakuraTemplate({ data, theme }: TemplateProps) {
  const { venue } = data;
  const accent = accentOf(data, theme);
  const menuName = data.menus[0]?.name || venue.name;
  const categories = data.menus.flatMap((m) => m.categories);
  const { screen, setScreen, topRef } = useMenuPager();
  const [selected, setSelected] = useState<PublicMenuItem | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const activeCategory =
    screen.name === 'category'
      ? categories.find((c) => c.id === screen.categoryId) || null
      : null;

  const CompactHeader = (
    <header className="flex items-center gap-3 px-5 pt-5 pb-1">
      <Hamburger color={accent} onClick={() => setDrawer(true)} />
      {venue.logoUrl && !logoFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={venue.logoUrl} alt="" onError={() => setLogoFailed(true)} className="h-9 w-9 rounded-full object-cover" style={{ border: `1px solid ${accent}` }} />
      ) : (
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
          style={{ backgroundColor: `${accent}14`, color: accent, border: `1px solid ${accent}` }}
          aria-hidden="true"
        >
          ◗
        </span>
      )}
      <span className="text-lg font-black uppercase tracking-tight" style={{ color: theme.text }}>
        {menuName}
      </span>
    </header>
  );

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
            ctaLabel="Menu"
            onEnter={() => setScreen({ name: 'home' })}
            background={
              <>
                <div className="absolute inset-x-0 top-0 h-1/2">
                  <Seigaiha color={accent} opacity={0.28} className="h-full w-full" />
                </div>
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 top-1/2"
                  style={{ background: `linear-gradient(${theme.bg}00, ${theme.bg})` }}
                />
              </>
            }
          >
            {!venue.logoUrl && (
              <div
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
                style={{ backgroundColor: `${accent}14`, color: accent, border: `1px solid ${accent}` }}
                aria-hidden="true"
              >
                ◗
              </div>
            )}
            <h1 className="text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl" style={{ color: theme.text }}>
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

      {/* Screen: home (category grid) */}
      {screen.name === 'home' && (
        <div key="home" className="menu-page mx-auto w-full" style={{ maxWidth: '760px' }}>
          {CompactHeader}
          <div className="px-5 pt-4">
            <div className="mb-5 flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: accent }}>
                Explore
              </span>
              <span className="h-px flex-1" style={{ backgroundColor: theme.border }} />
            </div>
            <div className="menu-stagger grid grid-cols-2 gap-3 sm:grid-cols-3">
              {categories.map((c) => {
                const thumb = c.items.find((i) => i.imageUrl)?.imageUrl || null;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setScreen({ name: 'category', categoryId: c.id })}
                    className="flex flex-col overflow-hidden text-left transition-transform active:scale-[0.98]"
                    style={{ backgroundColor: theme.surface, borderRadius: theme.radius, border: `1px solid ${theme.border}` }}
                  >
                    <div className="relative h-24 w-full overflow-hidden" style={{ backgroundColor: `${accent}1A` }}>
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Seigaiha color={accent} opacity={0.35} className="absolute inset-0" />
                          <span className="relative text-2xl" style={{ color: accent }}>◗</span>
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-2.5">
                      <div className="truncate text-sm font-bold uppercase tracking-wide" style={{ color: theme.text }}>
                        {c.name}
                      </div>
                      <div className="text-xs" style={{ color: theme.muted }}>
                        {c.items.length} {c.items.length === 1 ? 'item' : 'items'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <KuzaFooter theme={theme} />
        </div>
      )}

      {/* Screen: category page */}
      {screen.name === 'category' && activeCategory && (
        <div key={activeCategory.id} className="menu-page-slide mx-auto w-full" style={{ maxWidth: '760px' }}>
          <BackBar title={activeCategory.name} theme={theme} accent={accent} onBack={() => setScreen({ name: 'home' })} />
          <div className="px-5 pt-5">
            <h1 className="mb-4 text-2xl font-black uppercase tracking-wide" style={{ color: accent }}>
              {activeCategory.name}
            </h1>
            <div className="menu-stagger flex flex-col gap-3">
              {subGroups(activeCategory.items).map((group, gi) => (
                <div key={group.name ?? `__nogroup-${gi}`} className="flex flex-col gap-3">
                  {group.name && (
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: accent }}>
                        {group.name}
                      </span>
                      <span className="h-px flex-1" style={{ backgroundColor: `${accent}40` }} />
                    </div>
                  )}
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelected(item)}
                      className="flex items-center gap-4 p-3 text-left transition-transform active:scale-[0.99]"
                      style={{ backgroundColor: theme.surface, borderRadius: theme.radius, border: `1px solid ${theme.border}` }}
                    >
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt=""
                          loading="lazy"
                          className="shrink-0 object-cover"
                          style={{ height: '72px', width: '72px', borderRadius: `calc(${theme.radius} - 4px)`, opacity: item.isAvailable ? 1 : 0.5 }}
                        />
                      ) : (
                        <div
                          className="flex shrink-0 items-center justify-center"
                          style={{ height: '72px', width: '72px', borderRadius: `calc(${theme.radius} - 4px)`, backgroundColor: `${accent}14`, color: accent }}
                        >
                          <span className="text-xl">◗</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold" style={{ color: theme.text, opacity: item.isAvailable ? 1 : 0.55 }}>
                          {item.name}
                          {!item.isAvailable && <SoldOut theme={theme} />}
                        </div>
                        {item.description && (
                          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug" style={{ color: theme.muted }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                      {venue.showPrices && (
                        <div className="shrink-0 text-base font-bold tabular-nums" style={{ color: accent }}>
                          {formatMenuPrice(item.price, venue.currency)}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
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
        links={categories.map((c) => ({ id: c.id, label: c.name, onClick: () => setScreen({ name: 'category', categoryId: c.id }) }))}
      />
      <ItemSheet item={selected} venue={venue} theme={theme} accent={accent} onClose={() => setSelected(null)} />
    </TemplateRoot>
  );
}
