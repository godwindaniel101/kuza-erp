import { useState } from 'react';
import { formatMenuPrice, PublicMenuCategory, PublicMenuItem } from '@/lib/menu-public';
import { TemplateProps } from './types';
import {
  accentOf,
  BackBar,
  Hamburger,
  IntroCover,
  ItemSheet,
  KuzaFooter,
  LeafBranch,
  Preloader,
  SideDrawer,
  SoldOut,
  TemplateRoot,
  useMenuPager,
  WifiCard,
} from './shared';

/** — ◆ — divider, echoing a printed bill of fare. Kept from the original. */
function DiamondRule({ color, className = '' }: { color: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden="true">
      <span className="h-px w-10" style={{ backgroundColor: color }} />
      <span className="text-[8px]" style={{ color }}>◆</span>
      <span className="h-px w-10" style={{ backgroundColor: color }} />
    </div>
  );
}

/** A small florish mark (❧ sprig) used as an eyebrow ornament. Kept touch. */
function Sprig({ color }: { color: string }) {
  return (
    <span className="text-base" style={{ color }} aria-hidden="true">
      ❧
    </span>
  );
}

/** First item image in a category, used as its thumbnail / section accent photo. */
function categoryImage(category: PublicMenuCategory): string | null {
  return category.items.find((i) => i.imageUrl)?.imageUrl || null;
}

/**
 * BOTANICAL — a farm-to-table editorial menu (inspired by "The Basil Leaf").
 * A multi-page, app-style flow on a cream ground with serif display type:
 * Preloader → an IntroCover with a faint leaf motif → an elegant category index
 * (HOME) → a category page with classic dotted-leader price rows, an accent
 * section photo and a green thank-you band. Leaf-branch corner ornaments and
 * diamond section rules run throughout. Tapping a dish opens a bottom sheet.
 */
export default function BotanicalTemplate({ data, theme }: TemplateProps) {
  const { venue } = data;
  const accent = accentOf(data, theme);
  const menuName = data.menus[0]?.name || venue.name;
  const categories = data.menus.flatMap((m) => m.categories);
  const { screen, setScreen, topRef } = useMenuPager({ name: 'cover' });
  const [selected, setSelected] = useState<PublicMenuItem | null>(null);
  const [drawer, setDrawer] = useState(false);

  const activeId = screen.name === 'category' ? screen.categoryId : categories[0]?.id || '';
  const activeCategory = categories.find((c) => c.id === activeId) || null;
  const bandText = theme.mode === 'dark' ? theme.bg : '#FFFFFF';

  /** Faint botanical backdrop: a soft radial glow plus a mirrored leaf branch. */
  const LeafBackground = (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(60% 50% at 50% 30%, ${accent}18, transparent 70%)` }}
        aria-hidden="true"
      />
      <LeafBranch color={accent} className="pointer-events-none absolute -left-4 top-6 opacity-20" />
      <LeafBranch color={accent} className="pointer-events-none absolute -right-4 bottom-10 -scale-x-100 opacity-20" />
    </>
  );

  return (
    <TemplateRoot theme={theme}>
      <div ref={topRef} />
      <Preloader theme={theme} accent={accent} venue={venue} title={menuName} />

      {/* COVER */}
      {screen.name === 'cover' && (
        <div key="cover" className="menu-fade">
          <IntroCover
            venue={venue}
            theme={theme}
            accent={accent}
            background={LeafBackground}
            ctaLabel="View Menu"
            onEnter={() => setScreen({ name: 'home' })}
          >
            <div className="mb-3 flex justify-center">
              <Sprig color={accent} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.45em]" style={{ color: theme.muted }}>
              The
            </p>
            <h1
              className="mt-2 text-5xl font-bold uppercase leading-none tracking-tight sm:text-6xl"
              style={{ color: theme.text, fontFamily: theme.headingFont, textWrap: 'balance' }}
            >
              {menuName}
            </h1>
            <DiamondRule color={accent} className="mt-5" />
            {venue.tagline && (
              <p className="mt-5 text-xl italic" style={{ color: accent, fontFamily: theme.headingFont }}>
                {venue.tagline}
              </p>
            )}
          </IntroCover>
        </div>
      )}

      {/* HOME — editorial category index */}
      {screen.name === 'home' && (
        <div key="home" className="menu-page relative mx-auto min-h-[100svh] w-full" style={{ maxWidth: '720px' }}>
          <LeafBranch color={accent} className="pointer-events-none absolute right-1 top-1 opacity-30" />

          <div className="flex items-center px-5 py-4">
            <Hamburger color={accent} onClick={() => setDrawer(true)} />
            <span className="w-10" aria-hidden="true" />
          </div>

          <header className="px-6 pb-4 pt-2 text-center">
            <div className="mb-3 flex justify-center">
              <Sprig color={accent} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em]" style={{ color: theme.muted }}>
              The
            </p>
            <h1
              className="mt-1 text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl"
              style={{ color: theme.text, fontFamily: theme.headingFont, textWrap: 'balance' }}
            >
              {menuName}
            </h1>
            {venue.tagline && (
              <p className="mt-3 text-lg italic" style={{ color: accent, fontFamily: theme.headingFont }}>
                {venue.tagline}
              </p>
            )}
            <DiamondRule color={theme.border} className="mt-6" />
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.4em]" style={{ color: theme.muted }}>
              Our Menu
            </p>
          </header>

          <ul className="menu-stagger mt-2 flex flex-col px-6 pb-4">
            {categories.map((c) => {
              const thumb = categoryImage(c);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setScreen({ name: 'category', categoryId: c.id })}
                    className="group flex w-full items-center gap-4 py-5 text-left transition-opacity active:opacity-70"
                    style={{ borderBottom: `1px solid ${theme.border}` }}
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        loading="lazy"
                        className="h-16 w-16 shrink-0 rounded-full object-cover"
                        style={{ border: `1px solid ${theme.border}` }}
                      />
                    ) : (
                      <span
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg"
                        style={{ border: `1px solid ${theme.border}`, color: accent }}
                        aria-hidden="true"
                      >
                        ❧
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2
                        className="truncate text-2xl font-bold"
                        style={{ color: theme.text, fontFamily: theme.headingFont }}
                      >
                        {c.name}
                      </h2>
                      {c.description ? (
                        <p className="mt-0.5 truncate text-sm italic" style={{ color: theme.muted }}>
                          {c.description}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs uppercase tracking-[0.25em]" style={{ color: theme.muted }}>
                          {c.items.length} {c.items.length === 1 ? 'dish' : 'dishes'}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-2xl leading-none" style={{ color: accent }} aria-hidden="true">
                      ›
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <WifiCard venue={venue} theme={theme} accent={accent} />
          <KuzaFooter theme={theme} />
        </div>
      )}

      {/* CATEGORY page */}
      {screen.name === 'category' && activeCategory && (
        <div
          key={activeId}
          className="menu-page-slide relative mx-auto min-h-[100svh] w-full"
          style={{ maxWidth: '720px' }}
        >
          <BackBar
            title={activeCategory.name}
            theme={theme}
            accent={accent}
            onBack={() => setScreen({ name: 'home' })}
          />
          <LeafBranch color={accent} className="pointer-events-none absolute right-1 top-16 opacity-20" />

          <header className="px-6 pb-2 pt-8 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em]" style={{ color: accent }}>
              The
            </p>
            <h1
              className="mt-1 text-4xl font-bold leading-tight"
              style={{ color: theme.text, fontFamily: theme.headingFont, textWrap: 'balance' }}
            >
              {activeCategory.name}
            </h1>
            {activeCategory.description && (
              <p className="mx-auto mt-3 max-w-md text-base italic" style={{ color: theme.muted }}>
                {activeCategory.description}
              </p>
            )}
            <DiamondRule color={theme.border} className="mt-5" />
          </header>

          {/* Accent section photo (first item image) */}
          {categoryImage(activeCategory) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={categoryImage(activeCategory) as string}
              alt=""
              loading="lazy"
              className="mx-6 mt-6 h-48 w-[calc(100%-3rem)] object-cover sm:h-56"
              style={{ borderRadius: theme.radius }}
            />
          )}

          <main className="px-6 pb-4 pt-6">
            <ul className="flex flex-col gap-6">
              {activeCategory.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className="flex w-full items-start gap-4 text-left transition-opacity active:opacity-70"
                  >
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        loading="lazy"
                        className="h-14 w-14 shrink-0 rounded-full object-cover"
                        style={{ border: `1px solid ${theme.border}` }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-lg font-semibold"
                          style={{
                            color: theme.text,
                            fontFamily: theme.headingFont,
                            opacity: item.isAvailable ? 1 : 0.55,
                          }}
                        >
                          {item.name}
                        </span>
                        {!item.isAvailable && <SoldOut theme={theme} />}
                        <span
                          className="mb-1 flex-1"
                          style={{ borderBottom: `1px dotted ${theme.border}` }}
                          aria-hidden="true"
                        />
                        {venue.showPrices && (
                          <span
                            className="shrink-0 text-[15px] font-semibold tabular-nums"
                            style={{ color: accent }}
                          >
                            {formatMenuPrice(item.price, venue.currency)}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-1 text-sm italic leading-relaxed" style={{ color: theme.muted }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </main>

          {/* Green thank-you band near the footer */}
          <div className="mt-10 px-6 py-8 text-center" style={{ backgroundColor: accent }}>
            <p className="text-2xl italic" style={{ color: bandText, fontFamily: theme.headingFont }}>
              Thank you!
            </p>
            <p
              className="mt-1 text-xs font-semibold uppercase tracking-[0.25em]"
              style={{ color: bandText, opacity: 0.85 }}
            >
              We appreciate your support
            </p>
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
