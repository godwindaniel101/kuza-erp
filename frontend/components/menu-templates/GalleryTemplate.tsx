import { formatMenuPrice } from '@/lib/menu-public';
import { TemplateProps } from './types';
import {
  accentOf,
  CategoryNav,
  ContactBar,
  KuzaFooter,
  navSections,
  sectionId,
  TemplateRoot,
  WifiCard,
} from './shared';

/**
 * GALLERY — food court / fast casual. Photo-forward two-up card grid
 * (3-up on desktop); items without photos get a warm generated placeholder
 * so the grid never looks broken. Images are lazy-loaded.
 */
export default function GalleryTemplate({ data, theme }: TemplateProps) {
  const { venue } = data;
  const accent = accentOf(data, theme);

  return (
    <TemplateRoot theme={theme}>
      <div className="mx-auto max-w-3xl px-4">
        <header className="pt-10 pb-6 text-center">
          {venue.logoUrl ? (
            <img
              src={venue.logoUrl}
              alt=""
              className="mx-auto mb-4 h-16 w-16 rounded-full object-cover"
              style={{ border: `2px solid ${accent}` }}
            />
          ) : (
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-extrabold text-white"
              style={{ backgroundColor: accent }}
            >
              {venue.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight">
            {venue.name}
          </h1>
          {venue.tagline && (
            <p className="mt-1.5 text-sm" style={{ color: theme.muted }}>
              {venue.tagline}
            </p>
          )}
        </header>

        <CategoryNav sections={navSections(data)} theme={theme} accent={accent} />

        {data.menus.map((menu) => (
          <section key={menu.id} className="mt-8">
            {data.menus.length > 1 && (
              <h2
                className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-white"
                style={{ backgroundColor: accent }}
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
                <h3 className="mb-3 text-xl font-extrabold tracking-tight">
                  {category.name}
                </h3>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {category.items.map((item) => (
                    <article
                      key={item.id}
                      className="flex flex-col overflow-hidden"
                      style={{
                        backgroundColor: theme.surface,
                        border: `1px solid ${theme.border}`,
                        borderRadius: theme.radius,
                        opacity: item.isAvailable ? 1 : 0.55,
                      }}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          loading="lazy"
                          className="aspect-[4/3] w-full object-cover"
                        />
                      ) : (
                        <div
                          className="flex aspect-[4/3] w-full items-center justify-center text-3xl font-extrabold"
                          style={{
                            background: `linear-gradient(135deg, ${accent}22, ${accent}44)`,
                            color: accent,
                          }}
                        >
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-1 flex-col p-3">
                        <h4 className="text-sm font-bold leading-snug">
                          {item.name}
                        </h4>
                        {item.description && (
                          <p
                            className="mt-0.5 text-xs leading-relaxed line-clamp-2"
                            style={{ color: theme.muted }}
                          >
                            {item.description}
                          </p>
                        )}
                        <div className="mt-auto flex items-center justify-between pt-2">
                          {venue.showPrices ? (
                            <span
                              className="text-sm font-extrabold"
                              style={{ color: accent }}
                            >
                              {formatMenuPrice(item.price, venue.currency)}
                            </span>
                          ) : (
                            <span />
                          )}
                          {!item.isAvailable && (
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider"
                              style={{ color: theme.muted }}
                            >
                              Sold out
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
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
