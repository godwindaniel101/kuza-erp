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

/**
 * GRAND — hotel room-service / banquet. A formal framed sheet: double-rule
 * border, small-caps headings, two-column category flow on wider screens.
 * Print-friendly by construction (static, no shadows, hairlines only).
 */
export default function GrandTemplate({ data, theme }: TemplateProps) {
  const { venue } = data;
  const accent = accentOf(data, theme);

  return (
    <TemplateRoot theme={theme}>
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
          <header className="pb-8 text-center">
            {venue.logoUrl && (
              <img
                src={venue.logoUrl}
                alt=""
                className="mx-auto mb-5 h-14 w-14 rounded-full object-cover"
                style={{ border: `1px solid ${theme.border}` }}
              />
            )}
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.4em]"
              style={{ color: accent }}
            >
              Menu
            </p>
            <h1
              className="mt-3 text-3xl tracking-wide"
              style={{
                fontFamily: theme.headingFont,
                fontVariant: 'small-caps',
              }}
            >
              {venue.name}
            </h1>
            {venue.tagline && (
              <p
                className="mt-2 text-sm italic"
                style={{ color: theme.muted }}
              >
                {venue.tagline}
              </p>
            )}
            <div className="mx-auto mt-5 flex max-w-[200px] flex-col gap-[3px]">
              <span className="h-px w-full" style={{ backgroundColor: accent }} />
              <span
                className="h-px w-full"
                style={{ backgroundColor: `${accent}55` }}
              />
            </div>
          </header>

          <CategoryNav
            sections={navSections(data)}
            theme={theme}
            accent={accent}
          />

          {data.menus.map((menu) => (
            <section key={menu.id} className="mt-8">
              {data.menus.length > 1 && (
                <h2
                  className="text-center text-sm tracking-[0.3em] uppercase"
                  style={{ color: theme.muted }}
                >
                  {menu.name}
                </h2>
              )}

              {/* Two-column flow on md+; each category stays intact. */}
              <div className="mt-2 md:columns-2 md:gap-10">
                {menu.categories.map((category) => (
                  <div
                    key={category.id}
                    id={sectionId(category.id)}
                    className="mt-8 scroll-mt-16 break-inside-avoid"
                  >
                    <h3
                      className="text-center text-lg tracking-widest"
                      style={{
                        fontFamily: theme.headingFont,
                        fontVariant: 'small-caps',
                        color: accent,
                      }}
                    >
                      {category.name}
                    </h3>
                    <div
                      className="mx-auto mt-2 mb-5 h-px w-12"
                      style={{ backgroundColor: theme.border }}
                    />

                    <ul className="space-y-5">
                      {category.items.map((item) => (
                        <li
                          key={item.id}
                          className="text-center"
                          style={{ opacity: item.isAvailable ? 1 : 0.5 }}
                        >
                          <div
                            className="text-[15px] font-medium tracking-wide"
                            style={{ fontFamily: theme.headingFont }}
                          >
                            {item.name}
                            {!item.isAvailable && <SoldOut theme={theme} />}
                          </div>
                          {item.description && (
                            <p
                              className="mx-auto mt-0.5 max-w-xs text-[13px] italic leading-relaxed"
                              style={{ color: theme.muted }}
                            >
                              {item.description}
                            </p>
                          )}
                          {venue.showPrices && (
                            <div
                              className="mt-1 text-[13px] font-semibold tracking-[0.15em]"
                              style={{ color: accent }}
                            >
                              {formatMenuPrice(item.price, venue.currency)}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {venue.address && (
            <p
              className="mt-10 text-center text-[11px] uppercase tracking-[0.25em]"
              style={{ color: theme.muted }}
            >
              {venue.address}
            </p>
          )}

          <WifiCard venue={venue} theme={theme} accent={accent} />
          <ContactBar venue={venue} theme={theme} accent={accent} />
        </div>
        <KuzaFooter theme={theme} />
      </div>
    </TemplateRoot>
  );
}
