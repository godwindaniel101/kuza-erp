module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr', 'de', 'ha'],
  },
  // i18next options
  fallbackLng: 'en',
  returnEmptyString: false,
  // Locale catalogs are FLAT (dotted keys like `pos.itemCount` are literal keys,
  // not nested objects) and coexist with flat keys of the same root (e.g. `pos`).
  // Disable the separators so dotted/colon keys resolve as literal flat lookups.
  keySeparator: false,
  nsSeparator: false,
  localePath: './public/locales',
};

