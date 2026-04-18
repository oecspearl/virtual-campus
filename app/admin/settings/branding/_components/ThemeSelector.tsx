'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import {
  DEFAULT_COLOR_THEMES,
  CUSTOM_THEME_KEY,
} from '@/lib/color-themes';

export interface ColorTheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  description: string;
}

export interface ThemeSelectorProps {
  /** Currently saved themes (merged over DEFAULT_COLOR_THEMES). */
  themes: Record<string, ColorTheme>;
  /** Key of the currently selected theme — either a preset key or CUSTOM_THEME_KEY. */
  selectedTheme: string;
  /** Called when the user picks a preset, or clicks "Apply Custom Theme". */
  onThemeSelect: (
    themeKey: string,
    customColors?: { primary: string; secondary: string; accent: string }
  ) => void;
}

/**
 * Palette picker for the admin branding page. Shows every preset theme in
 * a grid and a separate "Custom Colors" editor where the user can pick
 * arbitrary primary/secondary/accent hex values.
 *
 * Custom colors are seeded from the existing saved custom theme on mount
 * (if any) so the picker starts on the user's last value rather than the
 * generic defaults.
 */
export default function ThemeSelector({
  themes,
  selectedTheme,
  onThemeSelect,
}: ThemeSelectorProps) {
  const [customPrimary, setCustomPrimary] = useState('#3B82F6');
  const [customSecondary, setCustomSecondary] = useState('#6366F1');
  const [customAccent, setCustomAccent] = useState('#60A5FA');

  useEffect(() => {
    const saved =
      themes[CUSTOM_THEME_KEY] ||
      DEFAULT_COLOR_THEMES[CUSTOM_THEME_KEY as keyof typeof DEFAULT_COLOR_THEMES];
    if (saved) {
      setCustomPrimary(saved.primary);
      setCustomSecondary(saved.secondary);
      setCustomAccent(saved.accent);
    }
  }, [themes]);

  const availableThemes = { ...DEFAULT_COLOR_THEMES, ...themes };
  const { [CUSTOM_THEME_KEY]: _custom, ...presetThemes } = availableThemes;
  void _custom;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Preset Themes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(presetThemes).map(([key, theme]) => (
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

              <div className="flex h-3 rounded-full overflow-hidden mb-3">
                <div className="flex-1" style={{ backgroundColor: theme.primary }} />
                <div className="flex-1" style={{ backgroundColor: theme.secondary }} />
                <div className="flex-1" style={{ backgroundColor: theme.accent }} />
              </div>

              <div className="flex items-center gap-2 mb-1">
                <div className="flex gap-1">
                  <div
                    className="w-5 h-5 rounded-full border border-gray-200"
                    style={{ backgroundColor: theme.primary }}
                    title="Primary"
                  />
                  <div
                    className="w-5 h-5 rounded-full border border-gray-200"
                    style={{ backgroundColor: theme.secondary }}
                    title="Secondary"
                  />
                  <div
                    className="w-5 h-5 rounded-full border border-gray-200"
                    style={{ backgroundColor: theme.accent }}
                    title="Accent"
                  />
                </div>
                <h4 className="font-medium text-sm text-gray-900">{theme.name}</h4>
              </div>

              <p className="text-xs text-gray-500 line-clamp-1">{theme.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div
        className={`border-2 rounded-lg p-5 transition-all duration-200 ${
          selectedTheme === CUSTOM_THEME_KEY
            ? 'border-blue-600 bg-blue-50 shadow-md'
            : 'border-gray-200'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:palette" className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900">Custom Colors</h3>
          </div>
          {selectedTheme === CUSTOM_THEME_KEY && (
            <Icon icon="mdi:check-circle" className="w-6 h-6 text-blue-600" />
          )}
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Pick your own colors for primary, secondary, and accent. Click &quot;Apply Custom
          Theme&quot; to activate.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <CustomColorInput
            label="Primary Color"
            value={customPrimary}
            onChange={setCustomPrimary}
            placeholder="#3B82F6"
          />
          <CustomColorInput
            label="Secondary Color"
            value={customSecondary}
            onChange={setCustomSecondary}
            placeholder="#6366F1"
          />
          <CustomColorInput
            label="Accent Color"
            value={customAccent}
            onChange={setCustomAccent}
            placeholder="#60A5FA"
          />
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-3 rounded-full overflow-hidden flex-1">
            <div className="flex-1" style={{ backgroundColor: customPrimary }} />
            <div className="flex-1" style={{ backgroundColor: customSecondary }} />
            <div className="flex-1" style={{ backgroundColor: customAccent }} />
          </div>
          <span className="text-xs text-gray-500">Preview</span>
        </div>

        <button
          type="button"
          onClick={() =>
            onThemeSelect(CUSTOM_THEME_KEY, {
              primary: customPrimary,
              secondary: customSecondary,
              accent: customAccent,
            })
          }
          className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            selectedTheme === CUSTOM_THEME_KEY
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {selectedTheme === CUSTOM_THEME_KEY ? 'Update Custom Theme' : 'Apply Custom Theme'}
        </button>
      </div>
    </div>
  );
}

interface CustomColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

function CustomColorInput({ label, value, onChange, placeholder }: CustomColorInputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
          aria-label={`${label} color picker`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded font-mono"
          placeholder={placeholder}
          aria-label={`${label} hex value`}
        />
      </div>
    </div>
  );
}
