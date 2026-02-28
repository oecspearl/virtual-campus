'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_COLOR_THEMES, getThemeColors as resolveThemeColors, type ColorTheme } from '@/lib/color-themes';

interface Feature {
  icon: string;
  title: string;
  description: string;
  color: string;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  location: string;
  avatar: string;
  rating: number;
}

interface FooterLink {
  label: string;
  url: string;
  enabled: boolean;
}

interface SocialLink {
  platform: string;
  url: string;
  enabled: boolean;
}

interface BrandingSettings {
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

// ColorTheme imported from @/lib/color-themes

// Tenant-aware cache for branding settings (keyed by tenant context)
const brandingCacheMap: Map<string, { settings: BrandingSettings; timestamp: number }> = new Map();
const CACHE_DURATION = 300000; // 5 minutes

function getTenantCacheKey(): string {
  if (typeof window === 'undefined') return 'default';
  // Check for tenant override (super_admin switching context)
  try {
    const stored = localStorage.getItem('tenant_override');
    if (stored) {
      const { tenantId } = JSON.parse(stored);
      if (tenantId) return tenantId;
    }
  } catch { /* ignore */ }
  // Fall back to hostname (each subdomain = different tenant)
  return window.location.hostname;
}

export function useBranding() {
  const [settings, setSettings] = useState<BrandingSettings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      const cacheKey = getTenantCacheKey();
      const now = Date.now();

      // Check tenant-specific cache
      const cached = brandingCacheMap.get(cacheKey);
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        setSettings(cached.settings);
        setLoading(false);
        return;
      }

      try {
        // Include tenant override header if active
        const headers: Record<string, string> = {};
        try {
          const stored = localStorage.getItem('tenant_override');
          if (stored) {
            const { tenantId } = JSON.parse(stored);
            if (tenantId) headers['x-tenant-override'] = tenantId;
          }
        } catch { /* ignore */ }

        const response = await fetch('/api/settings/branding', {
          cache: 'no-store',
          headers,
        });
        if (response.ok) {
          const data = await response.json();
          const fetchedSettings = data.settings || {};
          setSettings(fetchedSettings);
          // Update tenant-specific cache
          brandingCacheMap.set(cacheKey, { settings: fetchedSettings, timestamp: now });
        } else {
          // Use defaults on error
          setSettings({
            site_name: { value: 'OECS Virtual Campus' },
            site_short_name: { value: 'OECS Virtual Campus' },
            logo_url: { value: '/oecs-logo.png' },
            logo_header_url: { value: '/oecs-logo.png' },
            homepage_header_background: { value: '/oecsmypd.png' }
          });
        }
      } catch (error) {
        console.error('Error fetching branding:', error);
        // Use defaults on error
        setSettings({
          site_name: { value: 'OECS Virtual Campus' },
          site_short_name: { value: 'OECS Virtual Campus' },
          logo_url: { value: '/oecs-logo.png' },
          logo_header_url: { value: '/oecs-logo.png' },
          homepage_header_background: { value: '/oecsmypd.png' }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();

    // Listen for cache invalidation events (branding saved or tenant switched)
    const handleCacheInvalidation = () => {
      brandingCacheMap.clear();
      fetchBranding();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('branding-settings-updated', handleCacheInvalidation);
      window.addEventListener('tenant-override-changed', handleCacheInvalidation);
      return () => {
        window.removeEventListener('branding-settings-updated', handleCacheInvalidation);
        window.removeEventListener('tenant-override-changed', handleCacheInvalidation);
      };
    }
  }, []);

  // Helper function to get a setting value with fallback
  const getSetting = (key: keyof BrandingSettings, fallback: string = ''): string => {
    return settings[key]?.value || fallback;
  };

  // Helper function to get a boolean setting value with fallback
  const getBooleanSetting = (key: keyof BrandingSettings, fallback: boolean = true): boolean => {
    const value = settings[key]?.value;
    if (!value) return fallback;
    return value.toLowerCase() === 'true';
  };

  // Helper function to parse JSON settings
  const getJsonSetting = <T>(key: keyof BrandingSettings, fallback: T): T => {
    const value = settings[key]?.value;
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  };

  return {
    settings,
    loading,
    siteName: getSetting('site_name', 'OECS Virtual Campus'),
    siteShortName: getSetting('site_short_name', 'OECS Virtual Campus'),
    logoUrl: getSetting('logo_url', '/oecs-logo.png'),
    logoHeaderUrl: getSetting('logo_header_url', '/oecs-logo.png'),
    homepageHeaderBackground: getSetting('homepage_header_background', '/oecsmypd.png'),
    homepageHeroTitle: getSetting('homepage_hero_title', 'OECS Virtual Campus'),
    homepageHeroSubtitle: getSetting('homepage_hero_subtitle', 'Powered by Learnboard'),
    homepageHeroDescription: getSetting('homepage_hero_description', 'Join the Caribbean\'s premier digital learning platform. Access world-class courses, connect with expert instructors, and advance your career with our comprehensive educational ecosystem.'),
    homepageHeroCtaPrimaryText: getSetting('homepage_hero_cta_primary_text', 'Start Learning Free'),
    homepageHeroCtaSecondaryText: getSetting('homepage_hero_cta_secondary_text', 'Explore Courses'),
    homepageHeroStatStudents: getSetting('homepage_hero_stat_students', '60K+'),
    homepageHeroStatEducators: getSetting('homepage_hero_stat_educators', '4,000+'),
    homepageHeroStatCountries: getSetting('homepage_hero_stat_countries', '15'),
    homepageFeaturesBadge: getSetting('homepage_features_badge', 'Why Choose OECS Virtual Campus?'),
    homepageFeaturesTitle: getSetting('homepage_features_title', 'Everything You Need to'),
    homepageFeaturesTitleHighlight: getSetting('homepage_features_title_highlight', 'Succeed in Learning'),
    homepageFeaturesDescription: getSetting('homepage_features_description', 'Our comprehensive platform provides all the tools and resources you need for effective online learning, teaching, and collaboration across the Caribbean region.'),
    homepageFeatures: getJsonSetting<Feature[]>('homepage_features', []),
    homepageCoursesBadge: getSetting('homepage_courses_badge', 'Featured Courses'),
    homepageCoursesTitle: getSetting('homepage_courses_title', 'Discover Our'),
    homepageCoursesTitleHighlight: getSetting('homepage_courses_title_highlight', 'Most Popular Courses'),
    homepageCoursesDescription: getSetting('homepage_courses_description', 'Hand-picked courses designed specifically for Caribbean students and professionals, covering everything from academic subjects to professional development.'),
    homepageCoursesCtaText: getSetting('homepage_courses_cta_text', 'View All Courses'),
    homepageTestimonialsBadge: getSetting('homepage_testimonials_badge', 'What Our Community Says'),
    homepageTestimonialsTitle: getSetting('homepage_testimonials_title', 'Trusted by'),
    homepageTestimonialsTitleHighlight: getSetting('homepage_testimonials_title_highlight', 'Thousands of Learners'),
    homepageTestimonialsDescription: getSetting('homepage_testimonials_description', 'Hear from students, instructors, and administrators across the Caribbean region who are transforming education with LearnBoard.'),
    homepageTestimonials: getJsonSetting<Testimonial[]>('homepage_testimonials', []),
    homepageCtaTitle: getSetting('homepage_cta_title', 'Ready to Transform Your'),
    homepageCtaTitleHighlight: getSetting('homepage_cta_title_highlight', 'Learning Experience?'),
    homepageCtaDescription: getSetting('homepage_cta_description', 'Join thousands of Caribbean students and professionals who are already advancing their careers with LearnBoard. Start your journey today!'),
    homepageCtaPrimaryText: getSetting('homepage_cta_primary_text', 'Start Learning Free'),
    homepageCtaSecondaryText: getSetting('homepage_cta_secondary_text', 'Browse Courses'),
    homepageHeroEnabled: getBooleanSetting('homepage_hero_enabled', true),
    homepageFeaturesEnabled: getBooleanSetting('homepage_features_enabled', true),
    homepageCoursesEnabled: getBooleanSetting('homepage_courses_enabled', true),
    homepageTestimonialsEnabled: getBooleanSetting('homepage_testimonials_enabled', true),
    homepageCtaEnabled: getBooleanSetting('homepage_cta_enabled', true),
    logoHeaderEnabled: getBooleanSetting('logo_header_enabled', true),
    logoSize: getSetting('logo_size', '48'),
    colorTheme: getSetting('color_theme', 'ocean-blue'),
    colorThemes: getJsonSetting<Record<string, ColorTheme>>('color_themes', {}),
    themePrimaryColor: getSetting('theme_primary_color', '#3B82F6'),
    themeSecondaryColor: getSetting('theme_secondary_color', '#6366F1'),
    // Get current theme colors based on selected theme (merges with shared defaults)
    getThemeColors: () => {
      const themeKey = getSetting('color_theme', 'ocean-blue');
      const savedThemes = getJsonSetting<Record<string, ColorTheme>>('color_themes', {});
      const mergedThemes = { ...DEFAULT_COLOR_THEMES, ...savedThemes };
      const currentTheme = resolveThemeColors(themeKey, mergedThemes);
      return {
        primary: currentTheme.primary,
        secondary: currentTheme.secondary,
        accent: currentTheme.accent,
        name: currentTheme.name
      };
    },
    // Footer settings
    footerBrandTitle: getSetting('footer_brand_title', 'OECS Digital Learning'),
    footerBrandSubtitle: getSetting('footer_brand_subtitle', 'Ecosystem'),
    footerBrandDescription: getSetting('footer_brand_description', 'Transforming Caribbean education through digital innovation and regional collaboration.'),
    footerCopyright: getSetting('footer_copyright', '© 2025 OECS Commission. All rights reserved.'),
    footerNewsletterTitle: getSetting('footer_newsletter_title', 'Stay Updated'),
    footerNewsletterDescription: getSetting('footer_newsletter_description', 'Subscribe to our newsletter for the latest updates, insights, and educational resources.'),
    footerNewsletterButtonText: getSetting('footer_newsletter_button_text', 'Subscribe'),
    footerMemberStatesTitle: getSetting('footer_member_states_title', 'OECS Member States'),
    footerMemberStatesSubtitle: getSetting('footer_member_states_subtitle', 'United in digital education transformation'),
    footerSocialLinks: getJsonSetting<SocialLink[]>('footer_social_links', []),
    footerPlatforms: getJsonSetting<FooterLink[]>('footer_platforms', []),
    footerResources: getJsonSetting<FooterLink[]>('footer_resources', []),
    footerBottomLinks: getJsonSetting<FooterLink[]>('footer_bottom_links', []),
    footerMemberStates: getJsonSetting<string[]>('footer_member_states', []),
    footerBrandEnabled: getBooleanSetting('footer_brand_enabled', true),
    footerPlatformsEnabled: getBooleanSetting('footer_platforms_enabled', true),
    footerResourcesEnabled: getBooleanSetting('footer_resources_enabled', true),
    footerNewsletterEnabled: getBooleanSetting('footer_newsletter_enabled', true),
    footerMemberStatesEnabled: getBooleanSetting('footer_member_states_enabled', true),
    homepageFeaturedCourseIds: getJsonSetting<string[]>('homepage_featured_course_ids', []),
    invalidateCache: () => {
      brandingCacheMap.clear();
    }
  };
}

