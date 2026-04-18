// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useBrandingSettings } from '../useBrandingSettings';

// tenantFetch wraps fetch with tenant-impersonation headers; in tests we
// replace it with a controlled mock that drives the hook's network calls.
const tenantFetchMock = vi.fn();
vi.mock('@/lib/hooks/useTenantSwitcher', () => ({
  tenantFetch: (...args: Parameters<typeof fetch>) => tenantFetchMock(...args),
}));

function Harness() {
  const state = useBrandingSettings();
  const titleValue = state.settings.homepage_hero_title?.value ?? '';
  const heroEnabled = state.settings.homepage_hero_enabled?.value ?? '';
  const logo = state.settings.logo_url?.value ?? '';
  return (
    <div>
      <div data-testid="loading">{String(state.loading)}</div>
      <div data-testid="saving">{String(state.saving)}</div>
      <div data-testid="error">{state.error ?? ''}</div>
      <div data-testid="success">{String(state.success)}</div>
      <div data-testid="courses">{state.availableCourses.length}</div>
      <div data-testid="title">{titleValue}</div>
      <div data-testid="hero-enabled">{heroEnabled}</div>
      <div data-testid="logo">{logo}</div>

      <button onClick={() => state.updateField('homepage_hero_title', 'Hello')}>
        SetTitle
      </button>
      <button onClick={() => state.updateField('homepage_features', '{bad json')}>
        SetBadJson
      </button>
      <button onClick={() => state.updateField('logo_size', '200')}>
        SetBigLogo
      </button>
      <button onClick={() => state.toggleField('homepage_hero_enabled', true)}>
        EnableHero
      </button>
      <button
        onClick={async () => {
          try {
            await state.uploadImage(
              'logo',
              new File(['x'], 'x.png', { type: 'image/png' })
            );
          } catch {
            /* tests assert on error state */
          }
        }}
      >
        UploadLogo
      </button>
      <button onClick={() => state.save()}>Save</button>
    </div>
  );
}

describe('useBrandingSettings', () => {
  beforeEach(() => {
    tenantFetchMock.mockReset();
    // Default: initial GETs (settings + courses) return empty/no courses.
    tenantFetchMock.mockImplementation((url: string) => {
      if (url === '/api/admin/settings/branding') {
        return Promise.resolve({ ok: true, json: async () => ({ settings: {} }) });
      }
      if (url === '/api/courses?limit=100') {
        return Promise.resolve({ ok: true, json: async () => ({ courses: [] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches settings + courses on mount and exposes them', async () => {
    tenantFetchMock.mockImplementation((url: string) => {
      if (url === '/api/admin/settings/branding') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            settings: { homepage_hero_title: { value: 'Welcome' } },
          }),
        });
      }
      if (url === '/api/courses?limit=100') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            courses: [
              { id: 'c-1', title: 'A', description: null, thumbnail: null, published: true },
              { id: 'c-2', title: 'B', description: null, thumbnail: null, published: false },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: true });
    });

    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );
    expect(screen.getByTestId('title').textContent).toBe('Welcome');
    // Only the published course survives the filter.
    expect(screen.getByTestId('courses').textContent).toBe('1');
  });

  it('sets an error when the settings fetch fails', async () => {
    tenantFetchMock.mockImplementation((url: string) => {
      if (url === '/api/admin/settings/branding') {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({ ok: true, json: async () => ({ courses: [] }) });
    });

    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toBe('Failed to load settings')
    );
  });

  it('updateField writes the new value and clears success', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );

    await user.click(screen.getByRole('button', { name: 'SetTitle' }));
    expect(screen.getByTestId('title').textContent).toBe('Hello');
  });

  it('updateField rejects invalid JSON for homepage_features', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );

    await user.click(screen.getByRole('button', { name: 'SetBadJson' }));
    expect(screen.getByTestId('error').textContent).toContain(
      'Invalid JSON in homepage_features'
    );
  });

  it('updateField rejects out-of-range logo_size', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );

    await user.click(screen.getByRole('button', { name: 'SetBigLogo' }));
    expect(screen.getByTestId('error').textContent).toContain(
      'Logo size must be between 24 and 128 pixels'
    );
  });

  it('toggleField stores "true"/"false" strings', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );

    await user.click(screen.getByRole('button', { name: 'EnableHero' }));
    expect(screen.getByTestId('hero-enabled').textContent).toBe('true');
  });

  it('uploadImage POSTs FormData and writes the returned URL into the matching setting', async () => {
    const user = userEvent.setup();
    tenantFetchMock.mockImplementation((url: string, init: RequestInit | undefined) => {
      if (url === '/api/admin/settings/branding' && !init) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: {} }) });
      }
      if (url === '/api/courses?limit=100') {
        return Promise.resolve({ ok: true, json: async () => ({ courses: [] }) });
      }
      if (url === '/api/admin/upload/branding') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ url: 'https://cdn/new-logo.png' }),
        });
      }
      return Promise.resolve({ ok: true });
    });

    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );

    await user.click(screen.getByRole('button', { name: 'UploadLogo' }));
    await waitFor(() =>
      expect(screen.getByTestId('logo').textContent).toBe(
        'https://cdn/new-logo.png'
      )
    );

    const uploadCall = tenantFetchMock.mock.calls.find(
      ([u]) => u === '/api/admin/upload/branding'
    );
    expect(uploadCall).toBeDefined();
    expect(uploadCall![1].method).toBe('POST');
    expect(uploadCall![1].body).toBeInstanceOf(FormData);
  });

  it('uploadImage exposes error on failure', async () => {
    const user = userEvent.setup();
    tenantFetchMock.mockImplementation((url: string, init: RequestInit | undefined) => {
      if (url === '/api/admin/settings/branding' && !init) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: {} }) });
      }
      if (url === '/api/courses?limit=100') {
        return Promise.resolve({ ok: true, json: async () => ({ courses: [] }) });
      }
      if (url === '/api/admin/upload/branding') {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: 'too big' }),
        });
      }
      return Promise.resolve({ ok: true });
    });

    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );

    await user.click(screen.getByRole('button', { name: 'UploadLogo' }));
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toBe('too big')
    );
  });

  it('save PUTs the full settings object and flips success to true', async () => {
    const user = userEvent.setup();
    tenantFetchMock.mockImplementation((url: string, init: RequestInit | undefined) => {
      if (url === '/api/admin/settings/branding' && !init) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: {} }) });
      }
      if (url === '/api/admin/settings/branding' && init?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      if (url === '/api/courses?limit=100') {
        return Promise.resolve({ ok: true, json: async () => ({ courses: [] }) });
      }
      return Promise.resolve({ ok: true });
    });

    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );

    await user.click(screen.getByRole('button', { name: 'SetTitle' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(screen.getByTestId('success').textContent).toBe('true')
    );
    const putCall = tenantFetchMock.mock.calls.find(
      ([u, init]) => u === '/api/admin/settings/branding' && init?.method === 'PUT'
    );
    const body = JSON.parse(putCall![1].body);
    expect(body.settings.homepage_hero_title.value).toBe('Hello');
  });

  it('save surfaces the server error message on failure', async () => {
    const user = userEvent.setup();
    tenantFetchMock.mockImplementation((url: string, init: RequestInit | undefined) => {
      if (url === '/api/admin/settings/branding' && !init) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: {} }) });
      }
      if (url === '/api/admin/settings/branding' && init?.method === 'PUT') {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: 'not authorized' }),
        });
      }
      if (url === '/api/courses?limit=100') {
        return Promise.resolve({ ok: true, json: async () => ({ courses: [] }) });
      }
      return Promise.resolve({ ok: true });
    });

    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toBe('not authorized')
    );
    expect(screen.getByTestId('success').textContent).toBe('false');
  });

  it('re-fetches when a tenant-override-changed event fires', async () => {
    let settingsHits = 0;
    tenantFetchMock.mockImplementation((url: string) => {
      if (url === '/api/admin/settings/branding') {
        settingsHits++;
        return Promise.resolve({
          ok: true,
          json: async () => ({ settings: {} }),
        });
      }
      if (url === '/api/courses?limit=100') {
        return Promise.resolve({ ok: true, json: async () => ({ courses: [] }) });
      }
      return Promise.resolve({ ok: true });
    });

    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId('loading').textContent).toBe('false')
    );
    expect(settingsHits).toBe(1);

    await act(async () => {
      window.dispatchEvent(new CustomEvent('tenant-override-changed'));
    });
    await waitFor(() => expect(settingsHits).toBe(2));
  });
});
