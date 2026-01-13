import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import { useTranslation } from 'next-i18next';

interface Language {
  code: string;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
];

interface LanguageSwitcherProps {
  value?: string;
  onChange?: (lang: string) => void;
}

export default function LanguageSwitcher({ value, onChange }: LanguageSwitcherProps) {
  const router = useRouter();
  const { locale } = router;
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Use provided value or current locale
  const currentLang = value || locale;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const changeLanguage = (newLocale: string) => {
    // If onChange prop is provided, use it (for form integration)
    if (onChange) {
      onChange(newLocale);
    } else {
      // Otherwise, change the interface language
      Cookies.set('lang', newLocale);
      router.push(router.pathname, router.asPath, { locale: newLocale });
    }
    setOpen(false);
  };

  const currentLanguage = languages.find(lang => lang.code === currentLang) || languages[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
        title={t('changeLanguage')}
      >
        <span className="text-xl">{currentLanguage.flag}</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
          {currentLanguage.code.toUpperCase()}
        </span>
        <i className="bx bx-chevron-down text-gray-600 dark:text-gray-400 text-xs"></i>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-2">
            {languages.map((language) => {
              const isActive = currentLang === language.code;
              return (
                <button
                  type="button"
                  key={language.code}
                  onClick={() => changeLanguage(language.code)}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    isActive
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      : ''
                  }`}
                >
                  <span className="text-xl">{language.flag}</span>
                  <span className="flex-1 text-left font-medium text-gray-900 dark:text-gray-100 text-sm">
                    {language.name}
                  </span>
                  {isActive && (
                    <i className="bx bx-check text-red-600 dark:text-red-400"></i>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
