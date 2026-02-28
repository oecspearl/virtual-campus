'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import RoleGuard from '@/app/components/RoleGuard';
import { stripHtml } from '@/lib/utils';

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

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  published: boolean;
}

interface ColorTheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  description: string;
}

export default function BrandingSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<BrandingSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchAvailableCourses();
  }, []);

  const fetchAvailableCourses = async () => {
    try {
      setLoadingCourses(true);
      const response = await fetch('/api/courses?limit=100');
      if (response.ok) {
        const data = await response.json();
        // Filter to only published courses
        const publishedCourses = (data.courses || []).filter((c: Course) => c.published);
        setAvailableCourses(publishedCourses);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/branding');
      
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
  };

  const handleInputChange = (key: string, value: string) => {
    // Validate JSON for JSON-type settings
    if ((key === 'homepage_features' || key === 'homepage_testimonials') && value) {
      try {
        JSON.parse(value);
      } catch (e) {
        setError(`Invalid JSON in ${key}. Please check your JSON syntax.`);
        setTimeout(() => setError(null), 5000);
        return;
      }
    }
    
    // Validate logo size
    if (key === 'logo_size' && value) {
      const size = parseInt(value);
      if (isNaN(size) || size < 24 || size > 128) {
        setError('Logo size must be between 24 and 128 pixels');
        setTimeout(() => setError(null), 5000);
        return;
      }
    }
    
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key as keyof BrandingSettings], value }
    }));
    setSuccess(false);
    setError(null);
  };

  const handleToggleChange = (key: string, enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key as keyof BrandingSettings], value: enabled ? 'true' : 'false' }
    }));
    setSuccess(false);
    setError(null);
  };

  const handleImageUpload = async (imageType: string, file: File) => {
    try {
      setSaving(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('imageType', imageType);

      const response = await fetch('/api/admin/upload/branding', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      
      // Update the corresponding setting
      const settingKeyMap: Record<string, string> = {
        'logo': 'logo_url',
        'logo_header': 'logo_header_url',
        'homepage_background': 'homepage_header_background',
        'favicon': 'favicon_url'
      };

      const settingKey = settingKeyMap[imageType];
      if (settingKey) {
        handleInputChange(settingKey, data.url);
      }

      return data.url;
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch('/api/admin/settings/branding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      setSuccess(true);
      
      // Invalidate branding cache to force refresh
      if (typeof window !== 'undefined') {
        // Trigger a custom event to invalidate cache in all components
        window.dispatchEvent(new CustomEvent('branding-settings-updated'));
      }
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard roles={['admin', 'super_admin', 'curriculum_designer']}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <Icon icon="mdi:arrow-left" className="w-5 h-5 mr-2" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Branding Settings</h1>
            <p className="text-gray-600 mt-2">Manage your site's branding, logos, and visual identity</p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
              <Icon icon="mdi:alert-circle" className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <Icon icon="mdi:close" className="w-5 h-5" />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
              <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-green-700">Settings saved successfully!</span>
            </div>
          )}

          <div className="space-y-6">
            {/* Section Visibility */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Section Visibility</h2>
              <p className="text-sm text-gray-600 mb-6">Toggle sections on or off to customize your landing page layout.</p>
              
              <div className="space-y-4">
                <ToggleSwitch
                  label="Hero Section"
                  description="The main hero section with title, subtitle, and CTAs"
                  enabled={settings.homepage_hero_enabled?.value === 'true' || settings.homepage_hero_enabled?.value === undefined}
                  onChange={(enabled) => handleToggleChange('homepage_hero_enabled', enabled)}
                />
                <ToggleSwitch
                  label="Features Section"
                  description="The features showcase section"
                  enabled={settings.homepage_features_enabled?.value === 'true' || settings.homepage_features_enabled?.value === undefined}
                  onChange={(enabled) => handleToggleChange('homepage_features_enabled', enabled)}
                />
                <ToggleSwitch
                  label="Courses Section"
                  description="The featured courses section"
                  enabled={settings.homepage_courses_enabled?.value === 'true' || settings.homepage_courses_enabled?.value === undefined}
                  onChange={(enabled) => handleToggleChange('homepage_courses_enabled', enabled)}
                />
                <ToggleSwitch
                  label="Testimonials Section"
                  description="The customer testimonials section"
                  enabled={settings.homepage_testimonials_enabled?.value === 'true' || settings.homepage_testimonials_enabled?.value === undefined}
                  onChange={(enabled) => handleToggleChange('homepage_testimonials_enabled', enabled)}
                />
                <ToggleSwitch
                  label="Call to Action Section"
                  description="The final CTA section at the bottom"
                  enabled={settings.homepage_cta_enabled?.value === 'true' || settings.homepage_cta_enabled?.value === undefined}
                  onChange={(enabled) => handleToggleChange('homepage_cta_enabled', enabled)}
                />
              </div>
            </div>

            {/* Site Name */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Site Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={settings.site_name?.value || ''}
                    onChange={(e) => handleInputChange('site_name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="OECS MyPD"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Short Name
                  </label>
                  <input
                    type="text"
                    value={settings.site_short_name?.value || ''}
                    onChange={(e) => handleInputChange('site_short_name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="MyPD"
                  />
                </div>
              </div>
            </div>

            {/* Logo Images */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Logo Images</h2>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <ImageUploadSection
                    label="Main Logo"
                    description="Logo displayed in the navbar"
                    currentUrl={settings.logo_url?.value || '/mypdlogo.png'}
                    imageType="logo"
                    onUpload={handleImageUpload}
                    disabled={saving}
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo Size (pixels)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        min="24"
                        max="128"
                        step="4"
                        value={settings.logo_size?.value || '48'}
                        onChange={(e) => handleInputChange('logo_size', e.target.value)}
                        className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="48"
                      />
                      <span className="text-sm text-gray-500">px</span>
                      <div className="flex gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => handleInputChange('logo_size', '32')}
                          className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                          Small (32px)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange('logo_size', '48')}
                          className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                          Medium (48px)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange('logo_size', '64')}
                          className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                          Large (64px)
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Adjust the size of the main logo in the navbar (24-128 pixels)
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Show Header Logo
                      </label>
                      <p className="text-xs text-gray-500">Toggle visibility of the header logo section</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleChange('logo_header_enabled', !(settings.logo_header_enabled?.value === 'true' || settings.logo_header_enabled?.value === undefined))}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        (settings.logo_header_enabled?.value === 'true' || settings.logo_header_enabled?.value === undefined) ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      role="switch"
                      aria-checked={settings.logo_header_enabled?.value === 'true' || settings.logo_header_enabled?.value === undefined}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          (settings.logo_header_enabled?.value === 'true' || settings.logo_header_enabled?.value === undefined) ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <ImageUploadSection
                    label="Header Logo"
                    description="Logo displayed in the header section"
                    currentUrl={settings.logo_header_url?.value || '/Logo.png'}
                    imageType="logo_header"
                    onUpload={handleImageUpload}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* Homepage Settings */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Homepage Settings</h2>
              
              <div className="space-y-4">
                <ImageUploadSection
                  label="Header Background Image"
                  description="Background image for the homepage hero section"
                  currentUrl={settings.homepage_header_background?.value || '/oecsmypd.png'}
                  imageType="homepage_background"
                  onUpload={handleImageUpload}
                  disabled={saving}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hero Title
                  </label>
                  <input
                    type="text"
                    value={settings.homepage_hero_title?.value || ''}
                    onChange={(e) => handleInputChange('homepage_hero_title', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="The OECS Professional Development Platform"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hero Subtitle
                  </label>
                  <input
                    type="text"
                    value={settings.homepage_hero_subtitle?.value || ''}
                    onChange={(e) => handleInputChange('homepage_hero_subtitle', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Trusted by OECS Professionals"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hero Description
                  </label>
                  <textarea
                    value={settings.homepage_hero_description?.value || ''}
                    onChange={(e) => handleInputChange('homepage_hero_description', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Join the Caribbean's premier digital learning platform..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary CTA Text
                    </label>
                    <input
                      type="text"
                      value={settings.homepage_hero_cta_primary_text?.value || ''}
                      onChange={(e) => handleInputChange('homepage_hero_cta_primary_text', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Start Learning Free"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary CTA Text
                    </label>
                    <input
                      type="text"
                      value={settings.homepage_hero_cta_secondary_text?.value || ''}
                      onChange={(e) => handleInputChange('homepage_hero_cta_secondary_text', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Explore Courses"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Students Stat
                    </label>
                    <input
                      type="text"
                      value={settings.homepage_hero_stat_students?.value || ''}
                      onChange={(e) => handleInputChange('homepage_hero_stat_students', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="60K+"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Educators Stat
                    </label>
                    <input
                      type="text"
                      value={settings.homepage_hero_stat_educators?.value || ''}
                      onChange={(e) => handleInputChange('homepage_hero_stat_educators', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="4,000+"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Countries Stat
                    </label>
                    <input
                      type="text"
                      value={settings.homepage_hero_stat_countries?.value || ''}
                      onChange={(e) => handleInputChange('homepage_hero_stat_countries', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="15"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Features Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Features Section</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Badge Text
                  </label>
                  <input
                    type="text"
                    value={settings.homepage_features_badge?.value || ''}
                    onChange={(e) => handleInputChange('homepage_features_badge', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Why Choose OECS Virtual Campus?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={settings.homepage_features_title?.value || ''}
                      onChange={(e) => handleInputChange('homepage_features_title', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Everything You Need to"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title Highlight
                    </label>
                    <input
                      type="text"
                      value={settings.homepage_features_title_highlight?.value || ''}
                      onChange={(e) => handleInputChange('homepage_features_title_highlight', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Succeed in Learning"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={settings.homepage_features_description?.value || ''}
                    onChange={(e) => handleInputChange('homepage_features_description', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Our comprehensive platform provides..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Features (JSON)
                  </label>
                  <textarea
                    value={settings.homepage_features?.value || ''}
                    onChange={(e) => handleInputChange('homepage_features', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder='[{"icon": "material-symbols:security", "title": "Enterprise Security", ...}]'
                    rows={12}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    JSON array of feature objects with: icon, title, description, color
                  </p>
                </div>
              </div>
            </div>

            {/* Courses Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Courses Section</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Badge Text
                  </label>
                  <input
                    type="text"
                    value={settings.homepage_courses_badge?.value || ''}
                    onChange={(e) => handleInputChange('homepage_courses_badge', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Featured Courses"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={settings.homepage_courses_title?.value || ''}
                      onChange={(e) => handleInputChange('homepage_courses_title', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Discover Our"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title Highlight
                    </label>
                    <input
                      type="text"
                      value={settings.homepage_courses_title_highlight?.value || ''}
                      onChange={(e) => handleInputChange('homepage_courses_title_highlight', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Most Popular Courses"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={settings.homepage_courses_description?.value || ''}
                    onChange={(e) => handleInputChange('homepage_courses_description', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Hand-picked courses designed..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={settings.homepage_courses_cta_text?.value || ''}
                    onChange={(e) => handleInputChange('homepage_courses_cta_text', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="View All Courses"
                  />
                </div>

                {/* Featured Courses Selector */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Featured Courses</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select which courses to feature on the homepage. Leave empty to use automatic featured courses (courses marked as featured in the database).
                  </p>
                  
                  <FeaturedCourseSelector
                    availableCourses={availableCourses}
                    selectedCourseIds={(() => {
                      try {
                        return JSON.parse(settings.homepage_featured_course_ids?.value || '[]') as string[];
                      } catch {
                        return [];
                      }
                    })()}
                    onSelectionChange={(courseIds) => {
                      handleInputChange('homepage_featured_course_ids', JSON.stringify(courseIds));
                    }}
                    loading={loadingCourses}
                  />
                </div>
              </div>
            </div>

            {/* Testimonials Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Testimonials Section</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Badge Text
                  </label>
                  <input
                    type="text"
                    value={settings.homepage_testimonials_badge?.value || ''}
                    onChange={(e) => handleInputChange('homepage_testimonials_badge', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="What Our Community Says"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={settings.homepage_testimonials_title?.value || ''}
                      onChange={(e) => handleInputChange('homepage_testimonials_title', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Trusted by"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title Highlight
                    </label>
                    <input
                      type="text"
                      value={settings.homepage_testimonials_title_highlight?.value || ''}
                      onChange={(e) => handleInputChange('homepage_testimonials_title_highlight', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Thousands of Learners"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={settings.homepage_testimonials_description?.value || ''}
                    onChange={(e) => handleInputChange('homepage_testimonials_description', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Hear from students, instructors..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Testimonials (JSON)
                  </label>
                  <textarea
                    value={settings.homepage_testimonials?.value || ''}
                    onChange={(e) => handleInputChange('homepage_testimonials', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder='[{"quote": "...", "author": "...", "role": "...", ...}]'
                    rows={12}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    JSON array of testimonial objects with: quote, author, role, location, avatar, rating
                  </p>
                </div>
              </div>
            </div>

            {/* Call to Action Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Call to Action Section</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={settings.homepage_cta_title?.value || ''}
                      onChange={(e) => handleInputChange('homepage_cta_title', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ready to Transform Your"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title Highlight
                    </label>
                    <input
                      type="text"
                      value={settings.homepage_cta_title_highlight?.value || ''}
                      onChange={(e) => handleInputChange('homepage_cta_title_highlight', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Learning Experience?"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={settings.homepage_cta_description?.value || ''}
                    onChange={(e) => handleInputChange('homepage_cta_description', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Join thousands of Caribbean students..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary CTA Text
                    </label>
                    <input
                      type="text"
                      value={settings.homepage_cta_primary_text?.value || ''}
                      onChange={(e) => handleInputChange('homepage_cta_primary_text', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Start Learning Free"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary CTA Text
                    </label>
                    <input
                      type="text"
                      value={settings.homepage_cta_secondary_text?.value || ''}
                      onChange={(e) => handleInputChange('homepage_cta_secondary_text', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Browse Courses"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Color Theme Selection */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Color Theme</h2>
              <p className="text-sm text-gray-600 mb-6">Choose a color theme for your application. This will update the primary colors throughout the platform.</p>
              
              <ThemeSelector
                themes={(() => {
                  try {
                    return JSON.parse(settings.color_themes?.value || '{}') as Record<string, ColorTheme>;
                  } catch {
                    return {};
                  }
                })()}
                selectedTheme={settings.color_theme?.value || 'ocean-blue'}
                onThemeSelect={(themeKey) => handleInputChange('color_theme', themeKey)}
              />
            </div>

            {/* Footer Settings */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Footer Settings</h2>
              <p className="text-sm text-gray-600 mb-6">Customize the footer content, links, and information.</p>
              
              {/* Footer Section Visibility */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Section Visibility</h3>
                <p className="text-sm text-gray-600 mb-4">Toggle footer sections on or off to customize your footer layout.</p>
                <div className="space-y-3">
                  <ToggleSwitch
                    label="Brand Section"
                    description="Brand logo, title, description, and social media links"
                    enabled={settings.footer_brand_enabled?.value === 'true' || settings.footer_brand_enabled?.value === undefined}
                    onChange={(enabled) => handleToggleChange('footer_brand_enabled', enabled)}
                  />
                  <ToggleSwitch
                    label="Platforms Section"
                    description="Platform links section"
                    enabled={settings.footer_platforms_enabled?.value === 'true' || settings.footer_platforms_enabled?.value === undefined}
                    onChange={(enabled) => handleToggleChange('footer_platforms_enabled', enabled)}
                  />
                  <ToggleSwitch
                    label="Resources Section"
                    description="Resources links section"
                    enabled={settings.footer_resources_enabled?.value === 'true' || settings.footer_resources_enabled?.value === undefined}
                    onChange={(enabled) => handleToggleChange('footer_resources_enabled', enabled)}
                  />
                  <ToggleSwitch
                    label="Newsletter Section"
                    description="Newsletter subscription section"
                    enabled={settings.footer_newsletter_enabled?.value === 'true' || settings.footer_newsletter_enabled?.value === undefined}
                    onChange={(enabled) => handleToggleChange('footer_newsletter_enabled', enabled)}
                  />
                  <ToggleSwitch
                    label="Member States Section"
                    description="OECS member states display section"
                    enabled={settings.footer_member_states_enabled?.value === 'true' || settings.footer_member_states_enabled?.value === undefined}
                    onChange={(enabled) => handleToggleChange('footer_member_states_enabled', enabled)}
                  />
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Brand Section */}
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Brand Section</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Brand Title
                        </label>
                        <input
                          type="text"
                          value={settings.footer_brand_title?.value || ''}
                          onChange={(e) => handleInputChange('footer_brand_title', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="OECS Digital Learning"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Brand Subtitle
                        </label>
                        <input
                          type="text"
                          value={settings.footer_brand_subtitle?.value || ''}
                          onChange={(e) => handleInputChange('footer_brand_subtitle', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ecosystem"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Brand Description
                      </label>
                      <textarea
                        value={settings.footer_brand_description?.value || ''}
                        onChange={(e) => handleInputChange('footer_brand_description', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Transforming Caribbean education..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Newsletter Section */}
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Newsletter Section</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Newsletter Title
                      </label>
                      <input
                        type="text"
                        value={settings.footer_newsletter_title?.value || ''}
                        onChange={(e) => handleInputChange('footer_newsletter_title', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Stay Updated"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Newsletter Description
                      </label>
                      <textarea
                        value={settings.footer_newsletter_description?.value || ''}
                        onChange={(e) => handleInputChange('footer_newsletter_description', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Subscribe to our newsletter..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subscribe Button Text
                      </label>
                      <input
                        type="text"
                        value={settings.footer_newsletter_button_text?.value || ''}
                        onChange={(e) => handleInputChange('footer_newsletter_button_text', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Subscribe"
                      />
                    </div>
                  </div>
                </div>

                {/* Member States Section */}
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Member States Section</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Section Title
                        </label>
                        <input
                          type="text"
                          value={settings.footer_member_states_title?.value || ''}
                          onChange={(e) => handleInputChange('footer_member_states_title', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="OECS Member States"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Section Subtitle
                        </label>
                        <input
                          type="text"
                          value={settings.footer_member_states_subtitle?.value || ''}
                          onChange={(e) => handleInputChange('footer_member_states_subtitle', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="United in digital education transformation"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Member States (JSON Array)
                      </label>
                      <textarea
                        value={settings.footer_member_states?.value || ''}
                        onChange={(e) => handleInputChange('footer_member_states', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                        placeholder='["Antigua and Barbuda", "Dominica", ...]'
                        rows={6}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        JSON array of member state names
                      </p>
                    </div>
                  </div>
                </div>

                {/* Copyright */}
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Copyright</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Copyright Text
                    </label>
                    <input
                      type="text"
                      value={settings.footer_copyright?.value || ''}
                      onChange={(e) => handleInputChange('footer_copyright', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="© 2025 OECS Commission. All rights reserved."
                    />
                  </div>
                </div>

                {/* Links Sections */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media Links (JSON)</h3>
                    <textarea
                      value={settings.footer_social_links?.value || ''}
                      onChange={(e) => handleInputChange('footer_social_links', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      placeholder='[{"platform": "twitter", "url": "#", "enabled": true}, ...]'
                      rows={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      JSON array with platform (twitter, facebook, linkedin, pinterest), url, and enabled fields
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Platforms Links (JSON)</h3>
                    <textarea
                      value={settings.footer_platforms?.value || ''}
                      onChange={(e) => handleInputChange('footer_platforms', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      placeholder='[{"label": "Learning Hub", "url": "#", "enabled": true}, ...]'
                      rows={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      JSON array with label, url, and enabled fields
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Resources Links (JSON)</h3>
                    <textarea
                      value={settings.footer_resources?.value || ''}
                      onChange={(e) => handleInputChange('footer_resources', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      placeholder='[{"label": "Documentation", "url": "#", "enabled": true}, ...]'
                      rows={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      JSON array with label, url, and enabled fields
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Bottom Links (JSON)</h3>
                    <textarea
                      value={settings.footer_bottom_links?.value || ''}
                      onChange={(e) => handleInputChange('footer_bottom_links', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      placeholder='[{"label": "Privacy Policy", "url": "#", "enabled": true}, ...]'
                      rows={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      JSON array with label, url, and enabled fields
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:content-save" className="w-5 h-5 mr-2" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

// Theme Selector Component
function ThemeSelector({
  themes,
  selectedTheme,
  onThemeSelect
}: {
  themes: Record<string, ColorTheme>;
  selectedTheme: string;
  onThemeSelect: (themeKey: string) => void;
}) {
  const defaultThemes: Record<string, ColorTheme> = {
    'ocean-blue': {
      name: 'Ocean Blue',
      primary: '#3B82F6',
      secondary: '#6366F1',
      accent: '#60A5FA',
      description: 'Professional blue theme perfect for educational platforms'
    },
    'forest-green': {
      name: 'Forest Green',
      primary: '#10B981',
      secondary: '#059669',
      accent: '#34D399',
      description: 'Natural green theme representing growth and learning'
    },
    'sunset-orange': {
      name: 'Sunset Orange',
      primary: '#F59E0B',
      secondary: '#D97706',
      accent: '#FBBF24',
      description: 'Warm orange theme with energetic vibes'
    },
    'royal-purple': {
      name: 'Royal Purple',
      primary: '#8B5CF6',
      secondary: '#7C3AED',
      accent: '#A78BFA',
      description: 'Elegant purple theme for premium experiences'
    },
    'caribbean-teal': {
      name: 'Caribbean Teal',
      primary: '#14B8A6',
      secondary: '#0D9488',
      accent: '#5EEAD4',
      description: 'Fresh teal theme inspired by Caribbean waters'
    }
  };

  const availableThemes = Object.keys(themes).length > 0 ? themes : defaultThemes;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(availableThemes).map(([key, theme]) => (
        <button
          key={key}
          type="button"
          onClick={() => onThemeSelect(key)}
          className={`relative p-4 border-2 rounded-lg transition-all duration-200 text-left ${
            selectedTheme === key
              ? 'border-blue-600 bg-blue-50 shadow-md'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
          }`}
        >
          {selectedTheme === key && (
            <div className="absolute top-2 right-2">
              <Icon icon="mdi:check-circle" className="w-6 h-6 text-blue-600" />
            </div>
          )}
          
          <div className="flex items-center gap-3 mb-3">
            <div className="flex gap-1">
              <div
                className="w-8 h-8 rounded"
                style={{ backgroundColor: theme.primary }}
                title="Primary Color"
              />
              <div
                className="w-8 h-8 rounded"
                style={{ backgroundColor: theme.secondary }}
                title="Secondary Color"
              />
              <div
                className="w-8 h-8 rounded"
                style={{ backgroundColor: theme.accent }}
                title="Accent Color"
              />
            </div>
            <h3 className="font-semibold text-gray-900">{theme.name}</h3>
          </div>
          
          <p className="text-xs text-gray-600">{theme.description}</p>
          
          <div className="mt-3 flex gap-2 text-xs">
            <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">
              {theme.primary}
            </span>
            <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">
              {theme.secondary}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

// Featured Course Selector Component
function FeaturedCourseSelector({
  availableCourses,
  selectedCourseIds,
  onSelectionChange,
  loading
}: {
  availableCourses: Course[];
  selectedCourseIds: string[];
  onSelectionChange: (courseIds: string[]) => void;
  loading: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const toggleCourse = (courseId: string) => {
    if (selectedCourseIds.includes(courseId)) {
      onSelectionChange(selectedCourseIds.filter(id => id !== courseId));
    } else {
      onSelectionChange([...selectedCourseIds, courseId]);
    }
  };

  const filteredCourses = availableCourses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stripHtml(course.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <input
          type="text"
          placeholder="Search courses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading courses...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No courses found. {availableCourses.length === 0 ? 'No published courses available.' : 'Try a different search term.'}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">
              {selectedCourseIds.length} of {filteredCourses.length} courses selected
            </p>
            {selectedCourseIds.length > 0 && (
              <button
                type="button"
                onClick={() => onSelectionChange([])}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear Selection
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            <div className="divide-y divide-gray-200">
              {filteredCourses.map((course) => {
                const isSelected = selectedCourseIds.includes(course.id);
                return (
                  <div
                    key={course.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                    onClick={() => toggleCourse(course.id)}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCourse(course.id)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 mb-1">{course.title}</h4>
                        {course.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{stripHtml(course.description)}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {course.thumbnail && (
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="w-12 h-12 object-cover rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <span className="text-xs text-gray-500">
                            ID: {course.id.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <Icon icon="mdi:check-circle" className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedCourseIds.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">Selected Courses (in order):</p>
              <div className="flex flex-wrap gap-2">
                {selectedCourseIds.map((courseId, index) => {
                  const course = availableCourses.find(c => c.id === courseId);
                  return (
                    <div
                      key={courseId}
                      className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-blue-200"
                    >
                      <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                      <span className="text-xs text-gray-700">{course?.title || courseId.substring(0, 8)}</span>
                      <button
                        type="button"
                        onClick={() => toggleCourse(courseId)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Icon icon="mdi:close" className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-blue-700 mt-2">
                Tip: Courses will be displayed in the order they appear above. Drag to reorder (coming soon).
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Toggle Switch Component
function ToggleSwitch({
  label,
  description,
  enabled,
  onChange
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-900 mb-1">
          {label}
        </label>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// Image Upload Component
function ImageUploadSection({ 
  label, 
  description, 
  currentUrl, 
  imageType, 
  onUpload, 
  disabled 
}: { 
  label: string; 
  description: string; 
  currentUrl: string; 
  imageType: string; 
  onUpload: (type: string, file: File) => Promise<string>;
  disabled: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  useEffect(() => {
    setPreview(currentUrl);
  }, [currentUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setUploading(true);
      await onUpload(imageType, file);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt={label}
                className="w-32 h-32 object-contain border border-gray-300 rounded-lg bg-white"
                onError={() => setPreview(null)}
              />
            </div>
          ) : (
            <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
              <Icon icon="mdi:image" className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="hidden"
            id={`upload-${imageType}`}
          />
          <label
            htmlFor={`upload-${imageType}`}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
              disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Icon icon="mdi:upload" className="w-5 h-5 mr-2" />
                {preview ? 'Change Image' : 'Upload Image'}
              </>
            )}
          </label>
          <p className="text-xs text-gray-500 mt-2">
            Recommended: PNG, JPG, or WebP. Max 5MB.
          </p>
        </div>
      </div>
    </div>
  );
}

