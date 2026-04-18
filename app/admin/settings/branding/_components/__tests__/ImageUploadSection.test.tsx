// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageUploadSection from '../ImageUploadSection';

vi.mock('@iconify/react', () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`} />,
}));

vi.mock('@/app/components/ui/LoadingIndicator', () => ({
  __esModule: true,
  default: () => <div data-testid="loading-indicator" />,
  InlineLoader: () => <span data-testid="inline-loader" />,
}));

function makeFile(
  type = 'image/png',
  name = 'pic.png',
  content = 'abc'
): File {
  return new File([content], name, { type });
}

describe('ImageUploadSection', () => {
  const originalAlert = global.alert;

  beforeEach(() => {
    global.alert = vi.fn();
  });

  afterEach(() => {
    global.alert = originalAlert;
    vi.restoreAllMocks();
  });

  it('renders current image when currentUrl is set', () => {
    render(
      <ImageUploadSection
        label="Logo"
        description="Header logo"
        currentUrl="https://example.com/logo.png"
        imageType="logo"
        onUpload={vi.fn()}
        disabled={false}
      />
    );
    const img = screen.getByAltText('Logo') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/logo.png');
  });

  it('shows a placeholder icon when no current URL', () => {
    render(
      <ImageUploadSection
        label="Logo"
        description="Header logo"
        currentUrl=""
        imageType="logo"
        onUpload={vi.fn()}
        disabled={false}
      />
    );
    expect(screen.getByTestId('icon-mdi:image')).toBeInTheDocument();
  });

  it('calls onUpload with the imageType + file when a valid image is chosen', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn().mockResolvedValue('https://example.com/new.png');
    render(
      <ImageUploadSection
        label="Logo"
        description="Header logo"
        currentUrl=""
        imageType="logo_header"
        onUpload={onUpload}
        disabled={false}
      />
    );
    const input = document.getElementById('upload-logo_header') as HTMLInputElement;
    const file = makeFile();
    await user.upload(input, file);
    await waitFor(() => expect(onUpload).toHaveBeenCalledWith('logo_header', file));
  });

  it('alerts and skips upload when a non-image file is chosen', async () => {
    // user-event's `upload` respects the input's `accept="image/*"` by
    // default — we deliberately want to force a non-matching file through
    // to verify the component's own guard runs, so disable applyAccept.
    const user = userEvent.setup({ applyAccept: false });
    const onUpload = vi.fn();
    render(
      <ImageUploadSection
        label="Logo"
        description="Header logo"
        currentUrl=""
        imageType="logo"
        onUpload={onUpload}
        disabled={false}
      />
    );
    const input = document.getElementById('upload-logo') as HTMLInputElement;
    const pdf = new File(['bin'], 'doc.pdf', { type: 'application/pdf' });
    await user.upload(input, pdf);
    expect(global.alert).toHaveBeenCalledWith('Please select an image file');
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('updates the preview when the currentUrl prop changes', async () => {
    const { rerender } = render(
      <ImageUploadSection
        label="Logo"
        description="Header logo"
        currentUrl="https://example.com/a.png"
        imageType="logo"
        onUpload={vi.fn()}
        disabled={false}
      />
    );
    expect((screen.getByAltText('Logo') as HTMLImageElement).src).toBe(
      'https://example.com/a.png'
    );
    rerender(
      <ImageUploadSection
        label="Logo"
        description="Header logo"
        currentUrl="https://example.com/b.png"
        imageType="logo"
        onUpload={vi.fn()}
        disabled={false}
      />
    );
    expect((screen.getByAltText('Logo') as HTMLImageElement).src).toBe(
      'https://example.com/b.png'
    );
  });
});
