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
 * NOIR — lounge / bar / nightlife. Deep dark ground with a faint radial
 * glow, wide-tracked uppercase headings, metallic accent rules. Prices sit
 * in the accent color like backlit signage.
 */
export default function NoirTemplate({ data, theme }: TemplateProps) {
  const { venue } = data;
  const accent = accentOf(data, theme);

  return (
    <TemplateRoot theme={theme}>
      <div
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${accent}14, transparent)`,
        }}
      >
        <div className="mx-auto max-w-2xl px-6">
          <header className="pt-16 pb-10 text-center">
            {venue.logoUrl && (
              <img
                src={venue.logoUrl}
                alt=""
                className="mx-auto mb-6 h-16 w-16 rounded-full object-cover"
                style={{ border: `1px solid ${accent}55` }}
              />
            )}
            <div className="mb-6 flex items-center justify-center gap-3">
              <span className="h-px w-10" style={{ backgroundColor: `${accent}66` }} />
              <span
                className="h-1.5 w-1.5 rotate-45"
                style={{ backgroundColor: accent }}
              />
              <span className="h-px w-10" style={{ backgroundColor: `${accent}66` }} />
            </div>
            <h1
              className="text-2xl sm:text-3xl font-normal uppercase tracking-[0.3em]"
              style={{ fontFamily: theme.headingFont }}
            >
              {venue.name}
            </h1>
            {venue.tagline && (
              <p
                className="mt-4 text-sm tracking-wide"
                style={{ color: theme.muted }}
              >
                {venue.tagline}
              </p>
            )}
            {venue.address && (
              <p
                className="mt-2 text-[11px] uppercase tracking-[0.25em]"
                style={{ color: theme.muted }}
              >
                {venue.address}
              </p>
            )}
          </header>

          <CategoryNav sections={navSections(data)} theme={theme} accent={accent} />

          {data.menus.map((menu) => (
            <section key={menu.id} className="mt-10">
              {data.menus.length > 1 && (
                <h2
                  className="text-center text-[11px] font-semibold uppercase tracking-[0.4em]"
                  style={{ color: theme.muted }}
                >
                  — {menu.name} —
                </h2>
              )}

              {menu.categories.map((category) => (
                <div
                  key={category.id}
                  id={sectionId(category.id)}
                  className="mt-10 scroll-mt-16"
                >
                  <div className="mb-5 flex items-center gap-4">
                    <h3
                      className="text-base font-semibold uppercase tracking-[0.25em]"
                      style={{ color: accent }}
                    >
                      {category.name}
                    </h3>
                    <span
                      className="h-px flex-1"
                      style={{
                        background: `linear-gradient(to right, ${accent}66, transparent)`,
                      }}
                    />
                  </div>

                  <ul className="space-y-5">
                    {category.items.map((item) => (
                      <li
                        key={item.id}
                        className="px-4 py-3.5"
                        style={{
                          backgroundColor: theme.surface,
                          border: `1px solid ${theme.border}`,
                          borderRadius: theme.radius,
                          opacity: item.isAvailable ? 1 : 0.45,
                        }}
                      >
                        <div className="flex items-baseline justify-between gap-4">
                          <span className="text-[15px] font-medium tracking-wide">
                            {item.name}
                            {!item.isAvailable && <SoldOut theme={theme} />}
                          </span>
                          {venue.showPrices && (
                            <span
                              className="whitespace-nowrap text-[15px] font-semibold tracking-wide"
                              style={{ color: accent }}
                            >
                              {formatMenuPrice(item.price, venue.currency)}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p
                            className="mt-1 text-[13px] leading-relaxed"
                            style={{ color: theme.muted }}
                          >
                            {item.description}
                          </p>
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
      </div>
    </TemplateRoot>
  );
}
