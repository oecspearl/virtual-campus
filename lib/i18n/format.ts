'use client';

import { useFormatter, useLocale, useNow } from 'next-intl';

/**
 * Hook for locale-aware date and time formatting
 * Replaces all hardcoded toLocaleDateString('en-US') calls
 */
export function useDateFormat() {
  const format = useFormatter();
  const locale = useLocale();
  const now = useNow();

  return {
    /**
     * Format a date (e.g., "Jan 15, 2024")
     */
    formatDate: (date: Date | string | null | undefined) => {
      if (!date) return '';
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      return format.dateTime(d, { dateStyle: 'medium' });
    },

    /**
     * Format a date with time (e.g., "Jan 15, 2024, 3:30 PM")
     */
    formatDateTime: (date: Date | string | null | undefined) => {
      if (!date) return '';
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      return format.dateTime(d, { dateStyle: 'medium', timeStyle: 'short' });
    },

    /**
     * Format time only (e.g., "3:30 PM")
     */
    formatTime: (date: Date | string | null | undefined) => {
      if (!date) return '';
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      return format.dateTime(d, { timeStyle: 'short' });
    },

    /**
     * Format relative time (e.g., "2 hours ago", "in 3 days")
     */
    formatRelative: (date: Date | string | null | undefined) => {
      if (!date) return '';
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      return format.relativeTime(d);
    },

    /**
     * Format a short date (e.g., "1/15/24")
     */
    formatShortDate: (date: Date | string | null | undefined) => {
      if (!date) return '';
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      return format.dateTime(d, { dateStyle: 'short' });
    },

    /**
     * Format a long date (e.g., "January 15, 2024")
     */
    formatLongDate: (date: Date | string | null | undefined) => {
      if (!date) return '';
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      return format.dateTime(d, { dateStyle: 'long' });
    },

    /**
     * Format a full date with day name (e.g., "Monday, January 15, 2024")
     */
    formatFullDate: (date: Date | string | null | undefined) => {
      if (!date) return '';
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      return format.dateTime(d, { dateStyle: 'full' });
    },

    /**
     * Get the current locale
     */
    locale,

    /**
     * Get current time (updated every minute)
     */
    now,
  };
}

/**
 * Hook for locale-aware number formatting
 */
export function useNumberFormat() {
  const format = useFormatter();

  return {
    /**
     * Format a number with locale-specific separators
     */
    formatNumber: (value: number | null | undefined) => {
      if (value === null || value === undefined) return '';
      return format.number(value);
    },

    /**
     * Format a percentage (e.g., "85%")
     */
    formatPercent: (value: number | null | undefined) => {
      if (value === null || value === undefined) return '';
      return format.number(value / 100, { style: 'percent' });
    },

    /**
     * Format currency
     */
    formatCurrency: (value: number | null | undefined, currency = 'USD') => {
      if (value === null || value === undefined) return '';
      return format.number(value, { style: 'currency', currency });
    },

    /**
     * Format a compact number (e.g., "1.2K", "3.5M")
     */
    formatCompact: (value: number | null | undefined) => {
      if (value === null || value === undefined) return '';
      return format.number(value, { notation: 'compact' });
    },
  };
}

/**
 * Hook for list formatting
 */
export function useListFormat() {
  const format = useFormatter();

  return {
    /**
     * Format a list with "and" conjunction (e.g., "A, B, and C")
     */
    formatList: (items: string[]) => {
      if (!items || items.length === 0) return '';
      return format.list(items, { type: 'conjunction' });
    },

    /**
     * Format a list with "or" disjunction (e.g., "A, B, or C")
     */
    formatListOr: (items: string[]) => {
      if (!items || items.length === 0) return '';
      return format.list(items, { type: 'disjunction' });
    },
  };
}
