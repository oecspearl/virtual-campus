'use client';

import { useCallback, useEffect, useState } from 'react';
import { tenantFetch } from '@/lib/hooks/useTenantSwitcher';
import type { FeaturedCourse as Course } from './FeaturedCourseSelector';

// Every branding setting is stored as { value: string } in the settings
// table — the wrapper lets us attach metadata later without reshaping every
// field. All fields are optional because a fresh tenant starts with none.
export interface BrandingSettings {
  site_name?: { value: string };
  site_short_name?: { value: string };
  logo_url?: { value: string };
  logo_header_url?: { value: string };
  homepage_header_background?: { value: string };
  homepage_hero_title?: { value: string };
  homepage_hero_subtitle?: { value: string };
  homepage_hero_description?: { value: string };
  homepage_hero_cta_primary_text?: { value: string };
  homepage_hero_cta_secondary_text?: { value: string };
  homepage_hero_stat_students?: { value: string };
  homepage_hero_stat_educators?: { value: string };
  homepage_hero_stat_countries?: { value: string };
  homepage_features_badge?: { value: string };
  homepage_features_title?: { value: string };
  homepage_features_title_highlight?: { value: string };
  homepage_features_description?: { value: string };
  homepage_features?: { value: string };
  homepage_courses_badge?: { value: string };
  homepage_courses_title?: { value: string };
  homepage_courses_title_highlight?: { value: string };
  homepage_courses_description?: { value: string };
  homepage_courses_cta_text?: { value: string };
  homepage_testimonials_badge?: { value: string };
  homepage_testimonials_title?: { value: string };
  homepage_testimonials_title_highlight?: { value: string };
  homepage_testimonials_description?: { value: string };
  homepage_testimonials?: { value: string };
  homepage_cta_title?: { value: string };
  homepage_cta_title_highlight?: { value: string };
  homepage_cta_description?: { value: string };
  homepage_cta_primary_text?: { value: string };
  homepage_cta_secondary_text?: { value: string };
  homepage_hero_enabled?: { value: string };
  homepage_features_enabled?: { value: string };
  homepage_courses_enabled?: { value: string };
  homepage_testimonials_enabled?: { value: string };
  homepage_cta_enabled?: { value: string };
  logo_header_enabled?: { value: string };
  logo_size?: { value: string };
  color_theme?: { value: string };
  color_themes?: { value: string };
  theme_primary_color?: { value: string };
  theme_secondary_color?: { value: string };
  footer_brand_title?: { value: string };
  footer_brand_subtitle?: { value: string };
  footer_brand_description?: { value: string };
  footer_copyright?: { value: string };
  footer_newsletter_title?: { value: string };
  footer_newsletter_description?: { value: string };
  footer_newsletter_button_text?: { value: string };
  footer_member_states_title?: { value: string };
  footer_member_states_subtitle?: { value: string };
  footer_social_links?: { value: string };
  footer_platforms?: { value: string };
  footer_resources?: { value: string };
  footer_bottom_links?: { value: string };
  footer_member_states?: { value: string };
  footer_brand_enabled?: { value: string };
  footer_platforms_enabled?: { value: string };
  footer_resources_enabled?: { value: string };
  footer_newsletter_enabled?: { value: string };
  footer_member_states_enabled?: { value: string };
  homepage_featured_course_ids?: { value: string };
}

export interface UseBrandingSettingsResult {
  settings: BrandingSettings;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: boolean;
  availableCourses: Course[];
  loadingCourses: boolean;
  /** Update a single settings field. Runs light validation for JSON + logo_size. */
  updateField: (key: string, value: string) => void;
  /** Toggle a boolean-shaped setting (stored as "true"/"false" strings). */
  toggleField: (key: string, enabled: boolean) => void;
  /** Clear the current error banner (used by the banner's close button). */
  clearError: () => void;
  /** Upload a branding image; returns the new URL and updates the matching field. */
  uploadImage: (imageType: string, file: File) => Promise<string>;
  /** PUT the full settings object back; shows a transient success flag for 3s. */
  save: () => Promise<void>;
}

// Maps the logical image type used by the upload API to the branding
// settings field that should store the resulting URL.
const IMAGE_TYPE_TO_SETTING_KEY: Record<string, string> = {
  logo: 'logo_url',
  logo_header: 'logo_header_url',
  homepage_background: 'homepage_header_background',
  favicon: 'favicon_url',
};

/**
 * Owns the entire branding-settings data layer: initial fetch of both
 * settings and published courses, the per-field edit helpers (with
 * validation for JSON + logo size), the image-upload flow, and the full
 * PUT save. Also wires up the `tenant-override-changed` listener so the
 * view refreshes whenever the admin switches tenant.
 */
export function useBrandingSettings(): UseBrandingSettingsResult {
  const [settings, setSettings] = useState<BrandingSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const fetchAvailableCourses = useCallback(async () => {
    try {
      setLoadingCourses(true);
      const response = await tenantFetch('/api/courses?limit=100');
      if (response.ok) {
        const data = await response.json();
        const publishedCourses = (data.courses || []).filter(
          (c: Course) => c.published
        );
        setAvailableCourses(publishedCourses);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await tenantFetch('/api/admin/settings/branding');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data = await response.json();
      setSettings(data.settings || {});
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchAvailableCourses();

    const handleTenantChange = () => {
      fetchSettings();
      fetchAvailableCourses();
    };
    window.addEventListener('tenant-override-changed', handleTenantChange);
    return () =>
      window.removeEventListener('tenant-override-changed', handleTenantChange);
  }, [fetchSettings, fetchAvailableCourses]);

  const updateField = useCallback((key: string, value: string) => {
    // Validate JSON-shaped fields — the API will reject bad JSON anyway,
    // but catching it at input time keeps the user close to their typo.
    if ((key === 'homepage_features' || key === 'homepage_testimonials') && value) {
      try {
        JSON.parse(value);
      } catch {
        setError(`Invalid JSON in ${key}. Please check your JSON syntax.`);
        setTimeout(() => setError(null), 5000);
        return;
      }
    }

    if (key === 'logo_size' && value) {
      const size = parseInt(value);
      if (isNaN(size) || size < 24 || size > 128) {
        setError('Logo size must be between 24 and 128 pixels');
        setTimeout(() => setError(null), 5000);
        return;
      }
    }

    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key as keyof BrandingSettings], value },
    }));
    setSuccess(false);
    setError(null);
  }, []);

  const toggleField = useCallback((key: string, enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key as keyof BrandingSettings],
        value: enabled ? 'true' : 'false',
      },
    }));
    setSuccess(false);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const uploadImage = useCallback(
    async (imageType: string, file: File): Promise<string> => {
      try {
        setSaving(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('imageType', imageType);

        const response = await tenantFetch('/api/admin/upload/branding', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const data = await response.json();
        const settingKey = IMAGE_TYPE_TO_SETTING_KEY[imageType];
        if (settingKey) {
          setSettings((prev) => ({
            ...prev,
            [settingKey]: {
              ...prev[settingKey as keyof BrandingSettings],
              value: data.url,
            },
          }));
          setSuccess(false);
        }
        return data.url;
      } catch (err) {
        console.error('Upload error:', err);
        setError(err instanceof Error ? err.message : 'Upload failed');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const save = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await tenantFetch('/api/admin/settings/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      setSuccess(true);

      // Let any component that reads branding (Navbar, footer, etc.) know
      // that it should refresh its cache.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('branding-settings-updated'));
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [settings]);

  return {
    settings,
    loading,
    saving,
    error,
    success,
    availableCourses,
    loadingCourses,
    updateField,
    toggleField,
    clearError,
    uploadImage,
    save,
  };
}
