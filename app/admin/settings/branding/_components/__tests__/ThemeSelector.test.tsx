// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeSelector, { type ColorTheme } from '../ThemeSelector';
import { CUSTOM_THEME_KEY } from '@/lib/color-themes';

vi.mock('@iconify/react', () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`} />,
}));

describe('ThemeSelector', () => {
  it('renders preset themes from DEFAULT_COLOR_THEMES', () => {
    render(<ThemeSelector themes={{}} selectedTheme="" onThemeSelect={vi.fn()} />);
    // At minimum, multiple preset buttons should exist.
    expect(screen.getAllByRole('button').length).toBeGreaterThan(1);
  });

  it('clicking a preset theme calls onThemeSelect with just the key', async () => {
    const user = userEvent.setup();
    const onThemeSelect = vi.fn();
    render(
      <ThemeSelector
        themes={{}}
        selectedTheme=""
        onThemeSelect={onThemeSelect}
      />
    );
    // Find the first preset button and click it — its key doesn't matter.
    const buttons = screen.getAllByRole('button');
    const presetButton = buttons.find((b) => !/Custom Theme/.test(b.textContent || ''));
    expect(presetButton).toBeDefined();
    await user.click(presetButton!);
    expect(onThemeSelect).toHaveBeenCalled();
    const [key, customColors] = onThemeSelect.mock.calls[0];
    expect(typeof key).toBe('string');
    expect(customColors).toBeUndefined();
  });

  it('seeds custom inputs from an existing custom theme on mount', () => {
    const themes: Record<string, ColorTheme> = {
      [CUSTOM_THEME_KEY]: {
        name: 'Custom',
        primary: '#112233',
        secondary: '#445566',
        accent: '#778899',
        description: 'saved',
      },
    };
    render(<ThemeSelector themes={themes} selectedTheme="" onThemeSelect={vi.fn()} />);
    // The text hex inputs are plural; use getAllByDisplayValue for each.
    expect(screen.getAllByDisplayValue('#112233').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByDisplayValue('#445566').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByDisplayValue('#778899').length).toBeGreaterThanOrEqual(1);
  });

  it('Apply Custom Theme fires onThemeSelect with the CUSTOM key + current hex values', async () => {
    const user = userEvent.setup();
    const onThemeSelect = vi.fn();
    render(
      <ThemeSelector
        themes={{
          [CUSTOM_THEME_KEY]: {
            name: 'Custom',
            primary: '#aa0000',
            secondary: '#00aa00',
            accent: '#0000aa',
            description: '',
          },
        }}
        selectedTheme=""
        onThemeSelect={onThemeSelect}
      />
    );
    await user.click(screen.getByRole('button', { name: /Apply Custom Theme/ }));
    expect(onThemeSelect).toHaveBeenCalledWith(CUSTOM_THEME_KEY, {
      primary: '#aa0000',
      secondary: '#00aa00',
      accent: '#0000aa',
    });
  });

  it('shows "Update Custom Theme" when the custom theme is already active', () => {
    render(
      <ThemeSelector
        themes={{}}
        selectedTheme={CUSTOM_THEME_KEY}
        onThemeSelect={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /Update Custom Theme/ })
    ).toBeInTheDocument();
  });
});
