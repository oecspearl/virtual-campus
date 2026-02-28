'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Globe, Check, ChevronDown } from 'lucide-react';

interface Locale {
  code: string;
  name: string;
  native_name: string;
  is_rtl: boolean;
}

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'buttons' | 'minimal';
  showNativeName?: boolean;
  className?: string;
}

export default function LanguageSelector({
  variant = 'dropdown',
  showNativeName = true,
  className = '',
}: LanguageSelectorProps) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('profile');
  const [isOpen, setIsOpen] = useState(false);
  const [locales, setLocales] = useState<Locale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Default locales as fallback
  const defaultLocales: Locale[] = [
    { code: 'en', name: 'English', native_name: 'English', is_rtl: false },
    { code: 'es', name: 'Spanish', native_name: 'Español', is_rtl: false },
    { code: 'fr', name: 'French', native_name: 'Français', is_rtl: false },
  ];

  useEffect(() => {
    // Fetch supported locales
    async function fetchLocales() {
      try {
        const response = await fetch('/api/i18n/locales');
        const data = await response.json();
        setLocales(data.locales || defaultLocales);
      } catch (error) {
        console.error('Failed to fetch locales:', error);
        setLocales(defaultLocales);
      }
    }
    fetchLocales();
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocaleChange = async (newLocale: string) => {
    if (newLocale === locale || isLoading) return;

    setIsLoading(true);
    try {
      // Save locale preference
      await fetch('/api/i18n/locale', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale }),
      });

      // Refresh the page to apply the new locale
      router.refresh();
      window.location.reload();
    } catch (error) {
      console.error('Failed to change locale:', error);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const currentLocale = locales.find(l => l.code === locale) || defaultLocales[0];

  // Minimal variant - just an icon with tooltip
  if (variant === 'minimal') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={t('language')}
          title={t('language')}
        >
          <Globe className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
            {locales.map((loc) => (
              <button
                key={loc.code}
                onClick={() => handleLocaleChange(loc.code)}
                disabled={isLoading}
                className={`w-full px-4 py-2 text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  loc.code === locale ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  {showNativeName ? loc.native_name : loc.name}
                </span>
                {loc.code === locale && (
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Buttons variant - horizontal row of buttons
  if (variant === 'buttons') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {locales.map((loc) => (
          <button
            key={loc.code}
            onClick={() => handleLocaleChange(loc.code)}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              loc.code === locale
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loc.code.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <span className="text-sm text-gray-700 dark:text-gray-200">
          {showNativeName ? currentLocale.native_name : currentLocale.name}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-full min-w-[160px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
          role="listbox"
        >
          {locales.map((loc) => (
            <button
              key={loc.code}
              onClick={() => handleLocaleChange(loc.code)}
              disabled={isLoading}
              role="option"
              aria-selected={loc.code === locale}
              className={`w-full px-4 py-2 text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                loc.code === locale ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  {showNativeName ? loc.native_name : loc.name}
                </span>
                {showNativeName && loc.native_name !== loc.name && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    ({loc.name})
                  </span>
                )}
              </div>
              {loc.code === locale && (
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
