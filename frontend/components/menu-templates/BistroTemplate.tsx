import { formatMenuPrice } from '@/lib/menu-public';
import { TemplateProps } from './types';
import {
  accentOf,
  CategoryNav,
  ContactBar,
  KuzaFooter,
  navSections,
  sectionId,
  SoldOut,
  TemplateRoot,
  WifiCard,
} from './shared';

/** Hand-drawn-style squiggle divider (inline SVG, stroke = accent). */
function Squiggle({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 120 10"
      className="mx-auto mt-2 h-2.5 w-28"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
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

/**
 * BISTRO — neighbourhood eatery. Warm cream (or chalkboard) ground,
 * rounded friendly type, hand-drawn SVG squiggles between sections and
 * price pills. Feels hand-made, reads effortlessly.
 */
export default function BistroTemplate({ data, theme }: TemplateProps) {
  const { venue } = data;
  const accent = accentOf(data, theme);

  return (
    <TemplateRoot theme={theme}>
      <div className="mx-auto max-w-xl px-5">
        <header className="pt-12 pb-6 text-center">
          {venue.logoUrl && (
            <img
              src={venue.logoUrl}
              alt=""
              className="mx-auto mb-4 h-16 w-16 rounded-full object-cover"
              style={{ border: `2px dashed ${accent}` }}
            />
          )}
          <div className="flex items-center justify-center gap-3">
            <Burst color={accent} />
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: theme.headingFont }}
            >
              {venue.name}
            </h1>
            <Burst color={accent} />
          </div>
          {venue.tagline && (
            <p className="mt-2 text-[15px]" style={{ color: theme.muted }}>
              {venue.tagline}
            </p>
          )}
          {venue.address && (
            <p className="mt-1.5 text-xs" style={{ color: theme.muted }}>
              {venue.address}
            </p>
          )}
          <Squiggle color={accent} />
        </header>

        <CategoryNav sections={navSections(data)} theme={theme} accent={accent} />

        {data.menus.map((menu) => (
          <section key={menu.id} className="mt-8">
            {data.menus.length > 1 && (
              <h2
                className="text-center text-sm font-bold uppercase tracking-[0.2em]"
                style={{ color: theme.muted }}
              >
                {menu.name}
              </h2>
            )}

            {menu.categories.map((category) => (
              <div
                key={category.id}
                id={sectionId(category.id)}
                className="mt-8 scroll-mt-16"
              >
                <div className="text-center">
                  <h3
                    className="inline-block text-2xl font-bold"
                    style={{ fontFamily: theme.headingFont }}
                  >
                    {category.name}
                  </h3>
                  <Squiggle color={accent} />
                </div>

                <ul className="mt-5 space-y-4">
                  {category.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 px-4 py-3"
                      style={{
                        backgroundColor: theme.surface,
                        border: `1.5px solid ${theme.border}`,
                        borderRadius: theme.radius,
                        opacity: item.isAvailable ? 1 : 0.5,
                      }}
                    >
                      <div className="min-w-0">
                        <div className="text-[16px] font-bold leading-snug">
                          {item.name}
                          {!item.isAvailable && <SoldOut theme={theme} />}
                        </div>
                        {item.description && (
                          <p
                            className="mt-0.5 text-[13px] leading-relaxed"
                            style={{ color: theme.muted }}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>
                      {venue.showPrices && (
                        <span
                          className="whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-bold"
                          style={{
                            color: theme.mode === 'dark' ? theme.bg : '#FFFFFF',
                            backgroundColor: accent,
                          }}
                        >
                          {formatMenuPrice(item.price, venue.currency)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}

        <WifiCard venue={venue} theme={theme} accent={accent} />
        <ContactBar venue={venue} theme={theme} accent={accent} />
        <KuzaFooter theme={theme} />
      </div>
    </TemplateRoot>
  );
}
