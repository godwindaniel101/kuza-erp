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
 * MINIMAL — café / brunch. Left-aligned sans header, airy rounded cards,
 * soft shadows, quiet hierarchy. The default archetype.
 */
export default function MinimalTemplate({ data, theme }: TemplateProps) {
  const { venue } = data;
  const accent = accentOf(data, theme);

  return (
    <TemplateRoot theme={theme}>
      <div className="mx-auto max-w-xl px-4">
        <header className="pt-10 pb-6">
          <div className="flex items-center gap-4">
            {venue.logoUrl ? (
              <img
                src={venue.logoUrl}
                alt=""
                className="h-14 w-14 rounded-2xl object-cover"
                style={{ border: `1px solid ${theme.border}` }}
              />
            ) : (
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                {venue.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {venue.name}
              </h1>
              {venue.tagline && (
                <p className="mt-0.5 text-sm" style={{ color: theme.muted }}>
                  {venue.tagline}
                </p>
              )}
            </div>
          </div>
          {venue.address && (
            <p className="mt-3 text-xs" style={{ color: theme.muted }}>
              {venue.address}
            </p>
          )}
        </header>

        <CategoryNav sections={navSections(data)} theme={theme} accent={accent} />

        {data.menus.map((menu) => (
          <section key={menu.id} className="mt-8">
            {data.menus.length > 1 && (
              <h2
                className="text-xs font-bold uppercase tracking-[0.18em]"
                style={{ color: accent }}
              >
                {menu.name}
              </h2>
            )}

            {menu.categories.map((category) => (
              <div
                key={category.id}
                id={sectionId(category.id)}
                className="mt-6 scroll-mt-16"
              >
                <h3 className="mb-3 text-lg font-bold tracking-tight">
                  {category.name}
                </h3>

                <div
                  className="overflow-hidden"
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
                  {category.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-4 px-4 py-3.5"
                      style={{
                        borderTop:
                          idx > 0 ? `1px solid ${theme.border}` : 'none',
                        opacity: item.isAvailable ? 1 : 0.5,
                      }}
                    >
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold leading-snug">
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
                        <div
                          className="whitespace-nowrap text-[15px] font-semibold"
                          style={{ color: accent }}
                        >
                          {formatMenuPrice(item.price, venue.currency)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
