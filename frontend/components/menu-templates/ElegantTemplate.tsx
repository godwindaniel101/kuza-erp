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
 * ELEGANT — fine dining. Centered composition, serif throughout, generous
 * whitespace, hairline rules, dotted price leaders. No cards, no shadows:
 * the restraint is the design.
 */
export default function ElegantTemplate({ data, theme }: TemplateProps) {
  const { venue } = data;
  const accent = accentOf(data, theme);

  return (
    <TemplateRoot theme={theme}>
      <div className="mx-auto max-w-2xl px-6">
        {/* Masthead */}
        <header className="pt-14 pb-8 text-center">
          {venue.logoUrl && (
            <img
              src={venue.logoUrl}
              alt=""
              className="mx-auto mb-5 h-16 w-16 rounded-full object-cover"
              style={{ border: `1px solid ${theme.border}` }}
            />
          )}
          <div
            className="mx-auto mb-5 h-px w-16"
            style={{ backgroundColor: accent }}
          />
          <h1
            className="text-3xl sm:text-4xl font-normal tracking-wide"
            style={{ fontFamily: theme.headingFont }}
          >
            {venue.name}
          </h1>
          {venue.tagline && (
            <p
              className="mt-3 italic text-[15px] leading-relaxed"
              style={{ color: theme.muted }}
            >
              {venue.tagline}
            </p>
          )}
          {venue.address && (
            <p
              className="mt-2 text-xs uppercase tracking-[0.2em]"
              style={{ color: theme.muted }}
            >
              {venue.address}
            </p>
          )}
          <div
            className="mx-auto mt-5 h-px w-16"
            style={{ backgroundColor: accent }}
          />
        </header>

        <CategoryNav sections={navSections(data)} theme={theme} accent={accent} />

        {data.menus.map((menu) => (
          <section key={menu.id} className="mt-10">
            {data.menus.length > 1 && (
              <h2
                className="text-center text-xs font-semibold uppercase tracking-[0.35em]"
                style={{ color: accent }}
              >
                {menu.name}
              </h2>
            )}

            {menu.categories.map((category) => (
              <div
                key={category.id}
                id={sectionId(category.id)}
                className="mt-10 scroll-mt-16"
              >
                <h3
                  className="text-center text-xl tracking-wide"
                  style={{ fontFamily: theme.headingFont }}
                >
                  {category.name}
                </h3>
                {category.description && (
                  <p
                    className="mt-1 text-center text-sm italic"
                    style={{ color: theme.muted }}
                  >
                    {category.description}
                  </p>
                )}
                <div
                  className="mx-auto mt-3 mb-6 h-px w-10"
                  style={{ backgroundColor: theme.border }}
                />

                <ul className="space-y-6">
                  {category.items.map((item) => (
                    <li
                      key={item.id}
                      style={{ opacity: item.isAvailable ? 1 : 0.5 }}
                    >
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-[17px]"
                          style={{ fontFamily: theme.headingFont }}
                        >
                          {item.name}
                          {!item.isAvailable && <SoldOut theme={theme} />}
                        </span>
                        {venue.showPrices && (
                          <>
                            <span
                              className="flex-1 border-b border-dotted translate-y-[-3px]"
                              style={{ borderColor: theme.border }}
                            />
                            <span
                              className="text-[15px] whitespace-nowrap"
                              style={{ color: accent }}
                            >
                              {formatMenuPrice(item.price, venue.currency)}
                            </span>
                          </>
                        )}
                      </div>
                      {item.description && (
                        <p
                          className="mt-1 pr-10 text-sm italic leading-relaxed"
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
    </TemplateRoot>
  );
}
